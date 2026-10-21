import { Router, Request, Response } from 'express';
import { ApiResponse, Book, ShelfPage } from '@smart-library/shared';
import { StorageService } from '../services/storage';
import { CppEngineService } from '../services/cppEngine';
import { AuthService } from '../services/auth';

export const createStudentRouter = (
  storage: StorageService,
  cppEngine: CppEngineService
): Router => {
  const router = Router();

  /**
   * GET /api/books
   * Paginated, filterable, and searchable list of books
   */
  router.get('/books', (req: Request, res: Response<ApiResponse<{
    books: Book[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>>) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
      const genre = req.query.genre as string | undefined;
      const availableOnly = req.query.available === 'true';
      const search = (req.query.search as string | undefined)?.toLowerCase().trim();
      const sortBy = (req.query.sortBy as string) || 'borrowCount'; // borrowCount, title, id
      const order = req.query.order === 'asc' ? 'asc' : 'desc';

      let books = storage.getBooks();

      // Filters
      if (genre && genre !== 'All') {
        books = books.filter((b) => b.genre.toLowerCase() === genre.toLowerCase());
      }

      if (availableOnly) {
        books = books.filter((b) => b.availability);
      }

      if (search) {
        books = books.filter(
          (b) =>
            b.title.toLowerCase().includes(search) ||
            b.bookId.toLowerCase().includes(search) ||
            b.author.toLowerCase().includes(search) ||
            b.genre.toLowerCase().includes(search)
        );
      }

      // Sorting
      books.sort((a, b) => {
        if (sortBy === 'borrowCount') {
          return order === 'asc' ? a.borrowCount - b.borrowCount : b.borrowCount - a.borrowCount;
        }
        if (sortBy === 'title') {
          return order === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
        }
        if (sortBy === 'id') {
          return order === 'asc' ? a.bookId.localeCompare(b.bookId) : b.bookId.localeCompare(a.bookId);
        }
        return 0;
      });

      const total = books.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedBooks = books.slice(startIndex, startIndex + limit);

      return res.json({
        success: true,
        data: {
          books: paginatedBooks,
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve books';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/books/:id
   * Retrieve a single book record by ID
   */
  router.get('/books/:id', (req: Request, res: Response<ApiResponse<Book>>) => {
    try {
      const { id } = req.params;
      const book = storage.getBookById(id);

      if (!book) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BOOK_NOT_FOUND',
            message: `Book with ID '${id}' does not exist in the catalog.`,
          },
        });
      }

      return res.json({ success: true, data: book });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error retrieving book';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/search?q=...&type=title|id|genre
   * Search powered by C++ DSA engine components
   */
  router.get('/search', async (req: Request, res: Response<ApiResponse<Book[]>>) => {
    try {
      const query = (req.query.q as string | undefined)?.trim();
      const type = ((req.query.type as string) || 'title').toLowerCase();

      if (!query) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: "Query parameter 'q' is required for searching.",
          },
        });
      }

      const allBooks = storage.getBooks();

      // C++ Hash Table lookup for ID
      if (type === 'id') {
        const found = await cppEngine.searchById(allBooks, query);
        return res.json({
          success: true,
          data: found ? [found] : [],
          message: found ? 'Book located via C++ Hash Table index' : 'No matching book found',
        });
      }

      // C++ Binary Search Tree lookup for Genre
      if (type === 'genre') {
        const booksInGenre = await cppEngine.searchByGenre(allBooks, query);
        return res.json({
          success: true,
          data: booksInGenre,
          message: `Retrieved ${booksInGenre.length} book(s) via C++ Genre BST traversal`,
        });
      }

      // Default: Substring search across title and author
      const titleMatches = allBooks.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.author.toLowerCase().includes(query.toLowerCase())
      );

      return res.json({
        success: true,
        data: titleMatches,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search operation failed';
      return res.status(500).json({
        success: false,
        error: { code: 'SEARCH_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/genres
   * Returns list of available genres and their book counts
   */
  router.get('/genres', (_req: Request, res: Response<ApiResponse<{ genre: string; count: number }[]>>) => {
    try {
      const books = storage.getBooks();
      const genreMap = new Map<string, number>();

      for (const b of books) {
        genreMap.set(b.genre, (genreMap.get(b.genre) || 0) + 1);
      }

      const genres = Array.from(genreMap.entries())
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => a.genre.localeCompare(b.genre));

      return res.json({ success: true, data: genres });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve genres';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/shelves/active
   * Retrieves the currently active and approved physical shelf grid layout
   */
  router.get('/shelves/active', (_req: Request, res: Response<ApiResponse<{
    pages: ShelfPage[];
    totalBooks: number;
    totalPages: number;
    totalOccupied: number;
    totalCapacity: number;
  }>>) => {
    try {
      const books = storage.getBooks();
      const pages = storage.getActiveShelfPages();
      const totalCapacity = pages.length * 20;
      const totalOccupied = books.filter((b) => b.shelfPage > 0).length;

      return res.json({
        success: true,
        data: {
          pages,
          totalBooks: books.length,
          totalPages: pages.length,
          totalOccupied,
          totalCapacity,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve active shelf layout';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/analytics
   * Summary metrics for dashboards and statistics
   */
  router.get('/analytics', (_req: Request, res: Response) => {
    try {
      const books = storage.getBooks();
      const totalBooks = books.length;
      const borrowedCount = books.filter((b) => !b.availability).length;
      const availableCount = totalBooks - borrowedCount;

      const totalBorrows = books.reduce((acc, b) => acc + b.borrowCount, 0);
      const avgBorrows = totalBooks > 0 ? Math.round((totalBorrows / totalBooks) * 10) / 10 : 0;

      // Genre distribution
      const genreCounts: Record<string, number> = {};
      for (const b of books) {
        genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
      }

      // Top 5 most-borrowed books
      const mostBorrowed = [...books]
        .sort((a, b) => b.borrowCount - a.borrowCount)
        .slice(0, 5);

      const activePages = storage.getActiveShelfPages();
      const totalCapacity = activePages.length * 20;

      return res.json({
        success: true,
        data: {
          totalBooks,
          availableCount,
          borrowedCount,
          totalBorrows,
          avgBorrows,
          genreCounts,
          mostBorrowed,
          shelfCapacity: {
            totalPages: activePages.length,
            totalCapacity,
            occupiedSlots: totalBooks,
            occupancyRate: totalCapacity > 0 ? Math.round((totalBooks / totalCapacity) * 100) : 0,
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve analytics';
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: msg },
      });
    }
  });

  /**
   * POST /api/auth/student-login
   * Quick student authentication for library borrowing & catalog browsing
   */
  router.post('/auth/student-login', (req: Request, res: Response) => {
    try {
      const { studentId, name, department } = req.body || {};
      const actualId = (studentId && String(studentId).trim()) || 'STU-2026-042';
      const actualName = (name && String(name).trim()) || 'Alex Rivera';
      const actualDept = (department && String(department).trim()) || 'Computer Science & Engineering';

      const authData = AuthService.generateToken(actualName, 'student', {
        studentId: actualId,
        department: actualDept,
        name: actualName,
      });

      return res.json({
        success: true,
        data: authData,
        message: 'Student authenticated successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Student login failed';
      return res.status(500).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: msg },
      });
    }
  });

  /**
   * GET /api/student/profile
   * Returns authenticated student profile, borrowed books, and recommended books
   */
  router.get('/student/profile', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      let studentUser = {
        studentId: 'STU-2026-042',
        name: 'Alex Rivera',
        department: 'Computer Science & Engineering',
        memberSince: 'Fall 2024',
        cardStatus: 'Active',
        maxAllowed: 4,
      };

      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
        const verified = AuthService.verifyToken(token);
        if (verified && verified.role === 'student') {
          studentUser = {
            studentId: verified.studentId || 'STU-2026-042',
            name: verified.name || verified.username || 'Student',
            department: verified.department || 'Computer Science & Engineering',
            memberSince: 'Fall 2024',
            cardStatus: 'Active',
            maxAllowed: 4,
          };
        }
      }

      const allBooks = storage.getBooks();

      // Find borrowed books in the collection for student demo
      const currentlyBorrowed = allBooks
        .filter((b) => !b.availability)
        .slice(0, 2)
        .map((b, idx) => ({
          ...b,
          borrowDate: new Date(Date.now() - (idx + 1) * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + (14 - (idx + 1) * 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Checked Out',
        }));

      // Top recommended books for this student
      const recommended = allBooks
        .filter((b) => b.availability)
        .sort((a, b) => b.borrowCount - a.borrowCount)
        .slice(0, 4);

      return res.json({
        success: true,
        data: {
          profile: studentUser,
          borrowedBooks: currentlyBorrowed,
          recommendedBooks: recommended,
          stats: {
            borrowedCount: currentlyBorrowed.length,
            availableQuota: studentUser.maxAllowed - currentlyBorrowed.length,
            fineAmount: '$0.00',
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve profile';
      return res.status(500).json({
        success: false,
        error: { code: 'PROFILE_ERROR', message: msg },
      });
    }
  });

  return router;
};

