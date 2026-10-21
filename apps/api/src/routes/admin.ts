import { Router, Request, Response } from 'express';
import { ApiResponse, AuthUser, Book, OptimizationProposal } from '@smart-library/shared';
import { StorageService } from '../services/storage';
import { ShelfService } from '../services/shelf';
import { AuthService, defaultAuth, requireAdmin } from '../services/auth';
import { config } from '../config';

export const createAdminRouter = (
  storage: StorageService,
  shelfService: ShelfService,
  authService: AuthService = defaultAuth
): Router => {
  const router = Router();

  /**
   * Helper to compute popularity score consistently
   */
  const computePopularity = (borrows: number): number => {
    if (borrows <= 0) return 0;
    const score = Math.round(Math.log2(borrows + 1) * 15);
    return Math.min(100, Math.max(0, score));
  };

  /**
   * POST /api/admin/login
   * Authenticate admin credentials and issue signed token
   */
  router.post('/login', (req: Request, res: Response<ApiResponse<AuthUser>>) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!authService.checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many failed login attempts. Please wait 1 minute before trying again.',
        },
      });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Both username and password are required.',
        },
      });
    }

    const expectedUser = config.adminUsername;
    const expectedHash = AuthService.hashPassword(config.adminPassword);
    const providedHash = AuthService.hashPassword(password);

    if (username !== expectedUser || providedHash !== expectedHash) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid administrative username or password.',
        },
      });
    }

    // Reset rate limiter on successful login
    authService.resetRateLimit(clientIp);

    const authData = AuthService.generateToken(username);
    return res.json({
      success: true,
      data: authData,
      message: 'Admin authenticated successfully.',
    });
  });

  /**
   * POST /api/admin/logout
   */
  router.post('/logout', (_req: Request, res: Response<ApiResponse<{ message: string }>>) => {
    return res.json({
      success: true,
      data: { message: 'Admin logged out successfully.' },
    });
  });

  // --- Protected Endpoints (Require valid Bearer token) ---

  /**
   * POST /api/admin/books
   * Add a new book to the catalog
   */
  router.post('/books', requireAdmin, async (req: Request, res: Response<ApiResponse<Book>>) => {
    try {
      const { bookId, title, author, genre, borrowCount = 0 } = req.body || {};

      if (!bookId || typeof bookId !== 'string' || !bookId.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: "Field 'bookId' is required and must be non-empty." },
        });
      }

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: "Field 'title' is required and must be non-empty." },
        });
      }

      if (!genre || typeof genre !== 'string' || !genre.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: "Field 'genre' is required and must be non-empty." },
        });
      }

      const cleanBorrows = Math.max(0, parseInt(borrowCount, 10) || 0);

      // Check duplicate ID
      if (storage.getBookById(bookId.trim())) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_BOOK_ID',
            message: `A book with ID '${bookId.trim()}' already exists.`,
          },
        });
      }

      const newBook: Book = {
        bookId: bookId.trim(),
        title: title.trim(),
        author: (author || 'Unknown Author').trim(),
        genre: genre.trim(),
        borrowCount: cleanBorrows,
        popularityScore: computePopularity(cleanBorrows),
        availability: true,
        shelfPage: 0,
        shelfRow: 0,
        shelfSlot: 0,
      };

      await storage.saveState((s) => {
        s.books.push(newBook);
        s.version += 1; // Invalidate any pending proposal
      });

      return res.status(201).json({
        success: true,
        data: newBook,
        message: 'Book added to catalog. Generate a shelf proposal to assign physical placement.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add book';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * PATCH /api/admin/books/:id
   * Edit existing book details
   */
  router.patch('/books/:id', requireAdmin, async (req: Request, res: Response<ApiResponse<Book>>) => {
    try {
      const { id } = req.params;
      const { title, author, genre, borrowCount, availability } = req.body || {};

      const existing = storage.getBookById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book '${id}' not found.` },
        });
      }

      let updatedBook: Book = { ...existing };

      await storage.saveState((s) => {
        const book = s.books.find((b) => b.bookId === id);
        if (!book) return;

        if (title !== undefined && typeof title === 'string') book.title = title.trim();
        if (author !== undefined && typeof author === 'string') book.author = author.trim();
        if (genre !== undefined && typeof genre === 'string') book.genre = genre.trim();
        if (borrowCount !== undefined && typeof borrowCount === 'number') {
          book.borrowCount = Math.max(0, borrowCount);
          book.popularityScore = computePopularity(book.borrowCount);
        }
        if (availability !== undefined && typeof availability === 'boolean') {
          book.availability = availability;
        }

        s.version += 1;
        updatedBook = { ...book };
      });

      return res.json({
        success: true,
        data: updatedBook,
        message: 'Book updated successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update book';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * DELETE /api/admin/books/:id
   * Remove a book from the catalog
   */
  router.delete('/books/:id', requireAdmin, async (req: Request, res: Response<ApiResponse<{ bookId: string }>>) => {
    try {
      const { id } = req.params;
      const existing = storage.getBookById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book '${id}' not found.` },
        });
      }

      await storage.saveState((s) => {
        s.books = s.books.filter((b) => b.bookId !== id);
        s.activeShelfPages = StorageService.buildShelfPagesFromBooks(s.books);
        s.version += 1;
      });

      return res.json({
        success: true,
        data: { bookId: id },
        message: `Book '${id}' removed from library.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete book';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * POST /api/admin/books/:id/borrow
   * Simulate a student borrowing a book -> auto-calculates pending shelf proposal!
   */
  router.post('/books/:id/borrow', requireAdmin, async (req: Request, res: Response<ApiResponse<{
    book: Book;
    proposalGenerated: boolean;
    proposal?: OptimizationProposal;
  }>>) => {
    try {
      const { id } = req.params;
      const existing = storage.getBookById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book '${id}' not found.` },
        });
      }

      if (!existing.availability) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BOOK_ALREADY_BORROWED',
            message: `Book '${existing.title}' (${id}) is already currently borrowed.`,
          },
        });
      }

      let updatedBook: Book = { ...existing };

      // 1. Update book state
      await storage.saveState((s) => {
        const book = s.books.find((b) => b.bookId === id);
        if (book) {
          book.borrowCount += 1;
          book.popularityScore = computePopularity(book.borrowCount);
          book.availability = false;
          updatedBook = { ...book };
        }
      });

      // 2. Automatically trigger C++ engine to generate a pending proposal
      let proposal: OptimizationProposal | undefined;
      try {
        proposal = await shelfService.generateProposal();
      } catch (cppErr) {
        console.error('[Borrow Workflow] C++ optimization failed:', cppErr);
      }

      return res.json({
        success: true,
        data: {
          book: updatedBook,
          proposalGenerated: !!proposal,
          proposal,
        },
        message: `Book '${updatedBook.title}' borrowed successfully. Borrow count increased to ${updatedBook.borrowCount}. A new proposed shelf layout has been calculated and is awaiting your review.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Borrow operation failed';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * POST /api/admin/books/:id/return
   * Simulate returning a book -> auto-calculates pending shelf proposal!
   */
  router.post('/books/:id/return', requireAdmin, async (req: Request, res: Response<ApiResponse<{
    book: Book;
    proposalGenerated: boolean;
    proposal?: OptimizationProposal;
  }>>) => {
    try {
      const { id } = req.params;
      const existing = storage.getBookById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book '${id}' not found.` },
        });
      }

      if (existing.availability) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BOOK_ALREADY_AVAILABLE',
            message: `Book '${existing.title}' (${id}) is already available on the shelf.`,
          },
        });
      }

      let updatedBook: Book = { ...existing };

      // 1. Update availability
      await storage.saveState((s) => {
        const book = s.books.find((b) => b.bookId === id);
        if (book) {
          book.availability = true;
          updatedBook = { ...book };
        }
      });

      // 2. Automatically calculate shelf proposal
      let proposal: OptimizationProposal | undefined;
      try {
        proposal = await shelfService.generateProposal();
      } catch (cppErr) {
        console.error('[Return Workflow] C++ optimization failed:', cppErr);
      }

      return res.json({
        success: true,
        data: {
          book: updatedBook,
          proposalGenerated: !!proposal,
          proposal,
        },
        message: `Book '${updatedBook.title}' returned successfully and marked available on shelf.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Return operation failed';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * POST /api/admin/shelves/optimize
   * Explicitly trigger C++ optimization to generate a fresh proposal
   */
  router.post('/shelves/optimize', requireAdmin, async (_req: Request, res: Response<ApiResponse<OptimizationProposal>>) => {
    try {
      const proposal = await shelfService.generateProposal();
      return res.json({
        success: true,
        data: proposal,
        message: 'Shelf optimization proposal generated successfully via C++ engine.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Optimization failed';
      return res.status(500).json({
        success: false,
        error: { code: 'OPTIMIZATION_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/admin/shelves/proposal
   * Retrieve current pending optimization proposal
   */
  router.get('/shelves/proposal', requireAdmin, (_req: Request, res: Response<ApiResponse<OptimizationProposal | null>>) => {
    try {
      const proposal = storage.getPendingProposal();
      return res.json({
        success: true,
        data: proposal,
        message: proposal ? 'Active pending proposal retrieved.' : 'No proposal currently pending.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve proposal';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * PATCH /api/admin/shelves/proposal
   * Adjust proposed assignments before approval
   */
  router.patch('/shelves/proposal', requireAdmin, async (req: Request, res: Response<ApiResponse<OptimizationProposal>>) => {
    try {
      const { books } = req.body || {};

      if (!books || !Array.isArray(books)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: "Request body must contain an array of adjusted 'books'.",
          },
        });
      }

      const updatedProposal = await shelfService.adjustProposal(books);
      return res.json({
        success: true,
        data: updatedProposal,
        message: 'Proposal positions adjusted successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to adjust proposal';
      return res.status(400).json({
        success: false,
        error: { code: 'ADJUSTMENT_FAILED', message: msg },
      });
    }
  });

  /**
   * POST /api/admin/shelves/proposal/approve
   * Approve proposal -> commits new coordinates to active shelves!
   */
  router.post('/shelves/proposal/approve', requireAdmin, async (_req: Request, res: Response<ApiResponse<{ message: string; appliedCount: number }>>) => {
    try {
      const result = await shelfService.approveProposal();
      return res.json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      const status = msg.includes('STALE_PROPOSAL') ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: { code: 'APPROVAL_FAILED', message: msg },
      });
    }
  });

  /**
   * POST /api/admin/shelves/proposal/reject
   * Reject proposal -> discards proposal without modifying active layout
   */
  router.post('/shelves/proposal/reject', requireAdmin, async (_req: Request, res: Response<ApiResponse<{ message: string }>>) => {
    try {
      const result = await shelfService.rejectProposal();
      return res.json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection failed';
      return res.status(400).json({
        success: false,
        error: { code: 'REJECTION_FAILED', message: msg },
      });
    }
  });

  return router;
};
