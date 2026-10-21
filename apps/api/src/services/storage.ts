import fs from 'node:fs';
import path from 'node:path';
import { Book, LibraryState, OptimizationProposal, ShelfPage, ShelfSlot } from '@smart-library/shared';
import { config } from '../config';

export class StorageService {
  private filePath: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(customFilePath?: string) {
    this.filePath = customFilePath || config.dataFilePath;
    this.ensureInitialized();
  }

  /**
   * Helper to construct empty 4x5 shelf pages
   */
  public static createEmptyShelfPages(totalPages: number = 1): ShelfPage[] {
    const pages: ShelfPage[] = [];
    const count = Math.max(1, totalPages);

    for (let p = 1; p <= count; p++) {
      const slots: ShelfSlot[] = [];
      for (let r = 1; r <= 4; r++) {
        for (let s = 1; s <= 5; s++) {
          slots.push({
            row: r,
            slot: s,
            isOccupied: false,
            bookId: null,
          });
        }
      }
      pages.push({
        page: p,
        rows: 4,
        slotsPerRow: 5,
        slots,
      });
    }

    return pages;
  }

  /**
   * Builds active shelf pages directly from an assigned book collection
   */
  public static buildShelfPagesFromBooks(books: Book[]): ShelfPage[] {
    const maxAssignedPage = books.reduce((max, b) => Math.max(max, b.shelfPage || 1), 1);
    const totalPages = Math.max(1, Math.ceil(books.length / 20), maxAssignedPage);
    const pages = StorageService.createEmptyShelfPages(totalPages);

    for (const book of books) {
      if (book.shelfPage >= 1 && book.shelfPage <= totalPages &&
          book.shelfRow >= 1 && book.shelfRow <= 4 &&
          book.shelfSlot >= 1 && book.shelfSlot <= 5) {
        const pageObj = pages[book.shelfPage - 1];
        const targetSlot = pageObj.slots.find(
          (s) => s.row === book.shelfRow && s.slot === book.shelfSlot
        );
        if (targetSlot) {
          targetSlot.isOccupied = true;
          targetSlot.bookId = book.bookId;
          targetSlot.title = book.title;
          targetSlot.author = book.author;
          targetSlot.genre = book.genre;
          targetSlot.borrowCount = book.borrowCount;
          targetSlot.popularityScore = book.popularityScore;
        }
      }
    }

    return pages;
  }

  /**
   * Ensures the file and directory exist with a valid LibraryState structure
   */
  private ensureInitialized(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      const initialState: LibraryState = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        books: [],
        activeShelfPages: StorageService.createEmptyShelfPages(1),
        pendingProposal: null,
      };
      this.writeSyncAtomic(initialState);
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8').trim();
      if (!raw) {
        throw new Error('Empty file');
      }
      const parsed = JSON.parse(raw);

      // Backwards compatibility: If file was an array of books, upgrade to LibraryState
      if (Array.isArray(parsed)) {
        const books = parsed as Book[];
        const upgradedState: LibraryState = {
          version: 1,
          lastUpdated: new Date().toISOString(),
          books,
          activeShelfPages: StorageService.buildShelfPagesFromBooks(books),
          pendingProposal: null,
        };
        this.writeSyncAtomic(upgradedState);
      }
    } catch {
      // Re-initialize corrupted or unreadable JSON
      const resetState: LibraryState = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        books: [],
        activeShelfPages: StorageService.createEmptyShelfPages(1),
        pendingProposal: null,
      };
      this.writeSyncAtomic(resetState);
    }
  }

  /**
   * Atomic file write using a temporary file and atomic rename
   */
  private writeSyncAtomic(data: LibraryState): void {
    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, this.filePath);
  }

  /**
   * Helper to normalize book records ensuring availability is strictly boolean
   */
  private normalizeState(state: LibraryState): LibraryState {
    if (Array.isArray(state.books)) {
      for (const b of state.books) {
        if (typeof b.availability === 'string') {
          b.availability = (b.availability === 'available' || b.availability === 'true');
        } else {
          b.availability = Boolean(b.availability);
        }
      }
    }
    if (state.pendingProposal && Array.isArray(state.pendingProposal.books)) {
      for (const b of state.pendingProposal.books) {
        if (typeof b.availability === 'string') {
          b.availability = (b.availability === 'available' || b.availability === 'true');
        } else {
          b.availability = Boolean(b.availability);
        }
      }
    }
    return state;
  }

  /**
   * Load the current library state safely
   */
  public getState(): LibraryState {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.books)) {
        return this.normalizeState(parsed as LibraryState);
      }
      throw new Error('Invalid state structure');
    } catch {
      this.ensureInitialized();
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return this.normalizeState(JSON.parse(raw) as LibraryState);
    }
  }

  /**
   * Save library state sequentially to prevent race condition corruption
   */
  public async saveState(mutator: (state: LibraryState) => void): Promise<LibraryState> {
    let nextResolve: () => void = () => {};
    const currentLock = this.writeLock;
    this.writeLock = new Promise<void>((resolve) => {
      nextResolve = resolve;
    });

    await currentLock;

    try {
      const state = this.getState();
      mutator(state);
      state.lastUpdated = new Date().toISOString();
      this.writeSyncAtomic(state);
      return JSON.parse(JSON.stringify(state));
    } finally {
      nextResolve();
    }
  }

  // --- Convenience Accessors ---

  public getBooks(): Book[] {
    return this.getState().books;
  }

  public getBookById(id: string): Book | undefined {
    return this.getState().books.find((b) => b.bookId === id);
  }

  public getActiveShelfPages(): ShelfPage[] {
    const state = this.getState();
    if (state.activeShelfPages && state.activeShelfPages.length > 0) {
      return state.activeShelfPages;
    }
    return StorageService.buildShelfPagesFromBooks(state.books);
  }

  public getPendingProposal(): OptimizationProposal | null {
    return this.getState().pendingProposal;
  }

  public getVersion(): number {
    return this.getState().version;
  }
}

export const defaultStorage = new StorageService();
