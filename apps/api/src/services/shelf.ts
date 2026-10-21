import { Book, OptimizationProposal, ProposedMove, ShelfPosition } from '@smart-library/shared';
import { StorageService } from './storage';
import { CppEngineService } from './cppEngine';

export class ShelfService {
  private storage: StorageService;
  private cppEngine: CppEngineService;

  constructor(storage: StorageService, cppEngine: CppEngineService) {
    this.storage = storage;
    this.cppEngine = cppEngine;
  }

  /**
   * Generates a new proposed shelf layout via the C++ DSA Engine.
   * Does NOT alter the active layout.
   */
  public async generateProposal(): Promise<OptimizationProposal> {
    const state = this.storage.getState();
    const books = state.books;

    // Execute C++ DSA Engine optimization
    const result = await this.cppEngine.optimizeShelves(books);

    // Build the proposal object tagged with the current dataset baseVersion
    const proposal: OptimizationProposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      baseVersion: state.version,
      books: result.assignments,
      shelfPages: result.shelfPages,
      moves: result.moves,
      metadata: result.metadata,
    };

    // Store as pending proposal without altering active books or activeShelfPages
    await this.storage.saveState((s) => {
      s.pendingProposal = proposal;
    });

    return proposal;
  }

  /**
   * Manually fine-tunes proposed positions prior to approval
   */
  public async adjustProposal(adjustedBooks: Book[]): Promise<OptimizationProposal> {
    const state = this.storage.getState();
    const proposal = state.pendingProposal;

    if (!proposal) {
      throw new Error('NO_PENDING_PROPOSAL: There is no active proposal to adjust.');
    }

    if (proposal.baseVersion !== state.version) {
      throw new Error(
        'STALE_PROPOSAL: The proposal is stale because book data has changed. Please regenerate the proposal.'
      );
    }

    // Validation 1: Book count matches
    if (adjustedBooks.length !== proposal.books.length) {
      throw new Error(
        `INVALID_ADJUSTMENT: Adjusted list must contain all ${proposal.books.length} books. Received ${adjustedBooks.length}.`
      );
    }

    // Validation 2: All book IDs present
    const originalIds = new Set(proposal.books.map((b) => b.bookId));
    for (const b of adjustedBooks) {
      if (!originalIds.has(b.bookId)) {
        throw new Error(`INVALID_ADJUSTMENT: Unknown bookId '${b.bookId}' in adjustment.`);
      }
    }

    // Validation 3: Coordinate bounds and strict uniqueness (No two books in same slot)
    const occupiedSlots = new Set<string>();
    const totalPages = Math.max(1, Math.ceil(adjustedBooks.length / 20));

    for (const b of adjustedBooks) {
      if (b.shelfPage < 1 || b.shelfPage > totalPages) {
        throw new Error(
          `INVALID_COORDINATE: Book ${b.bookId} shelfPage (${b.shelfPage}) must be between 1 and ${totalPages}.`
        );
      }
      if (b.shelfRow < 1 || b.shelfRow > 4) {
        throw new Error(
          `INVALID_COORDINATE: Book ${b.bookId} shelfRow (${b.shelfRow}) must be between 1 and 4.`
        );
      }
      if (b.shelfSlot < 1 || b.shelfSlot > 5) {
        throw new Error(
          `INVALID_COORDINATE: Book ${b.bookId} shelfSlot (${b.shelfSlot}) must be between 1 and 5.`
        );
      }

      const slotKey = `${b.shelfPage}:${b.shelfRow}:${b.shelfSlot}`;
      if (occupiedSlots.has(slotKey)) {
        throw new Error(
          `SLOT_COLLISION: Slot conflict detected at Page ${b.shelfPage}, Row ${b.shelfRow}, Slot ${b.shelfSlot}. Multiple books cannot occupy the same shelf slot.`
        );
      }
      occupiedSlots.add(slotKey);
    }

    // Rebuild shelfPages grid and movements
    const newShelfPages = StorageService.buildShelfPagesFromBooks(adjustedBooks);
    const newMoves: ProposedMove[] = [];

    // Compare with current active layout
    const activeMap = new Map<string, ShelfPosition>();
    for (const b of state.books) {
      if (b.shelfPage > 0 && b.shelfRow > 0 && b.shelfSlot > 0) {
        activeMap.set(b.bookId, {
          shelfPage: b.shelfPage,
          shelfRow: b.shelfRow,
          shelfSlot: b.shelfSlot,
        });
      }
    }

    for (const b of adjustedBooks) {
      const current = activeMap.get(b.bookId);
      if (current) {
        if (current.shelfPage !== b.shelfPage || current.shelfRow !== b.shelfRow || current.shelfSlot !== b.shelfSlot) {
          newMoves.push({
            bookId: b.bookId,
            title: b.title,
            genre: b.genre,
            borrowCount: b.borrowCount,
            from: current,
            to: { shelfPage: b.shelfPage, shelfRow: b.shelfRow, shelfSlot: b.shelfSlot },
          });
        }
      }
    }

    proposal.books = adjustedBooks;
    proposal.shelfPages = newShelfPages;
    proposal.moves = newMoves;

    await this.storage.saveState((s) => {
      s.pendingProposal = proposal;
    });

    return proposal;
  }

  /**
   * Approves the pending proposal, replacing active shelf assignments
   */
  public async approveProposal(): Promise<{ message: string; appliedCount: number }> {
    const state = this.storage.getState();
    const proposal = state.pendingProposal;

    if (!proposal) {
      throw new Error('NO_PENDING_PROPOSAL: No proposal is awaiting approval.');
    }

    if (proposal.baseVersion !== state.version) {
      throw new Error(
        'STALE_PROPOSAL: The proposal is stale because book data was modified since generation. Please regenerate the proposal.'
      );
    }

    let appliedCount = 0;

    await this.storage.saveState((s) => {
      // Map proposed coordinates onto existing books
      const proposalBookMap = new Map(proposal.books.map((b) => [b.bookId, b]));

      for (const book of s.books) {
        const prop = proposalBookMap.get(book.bookId);
        if (prop) {
          book.shelfPage = prop.shelfPage;
          book.shelfRow = prop.shelfRow;
          book.shelfSlot = prop.shelfSlot;
          appliedCount++;
        }
      }

      s.activeShelfPages = proposal.shelfPages;
      s.pendingProposal = null; // Clear proposal
      s.version += 1; // Increment version
    });

    return {
      message: `Proposal approved successfully. ${appliedCount} books updated with new active shelf positions.`,
      appliedCount,
    };
  }

  /**
   * Rejects and discards the pending proposal without touching the active layout
   */
  public async rejectProposal(): Promise<{ message: string }> {
    const state = this.storage.getState();

    if (!state.pendingProposal) {
      throw new Error('NO_PENDING_PROPOSAL: No proposal is awaiting approval.');
    }

    await this.storage.saveState((s) => {
      s.pendingProposal = null;
    });

    return {
      message: 'Pending shelf proposal was rejected and discarded. Active shelf layout remains unchanged.',
    };
  }
}
