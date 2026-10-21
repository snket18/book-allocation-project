import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { StorageService } from '../src/services/storage';
import { CppEngineService } from '../src/services/cppEngine';
import { AuthService } from '../src/services/auth';
import { Book } from '@smart-library/shared';
import { config } from '../src/config';

describe('Smart Library Backend API Test Suite', () => {
  const testDataFile = path.resolve('/tmp', `test-library-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`);
  let storage: StorageService;
  let cppEngine: CppEngineService;
  let authService: AuthService;
  let app: ReturnType<typeof createApp>;
  let adminToken: string;

  before(async () => {
    // Setup isolated storage and services
    storage = new StorageService(testDataFile);
    cppEngine = new CppEngineService(config.cppEnginePath);
    authService = new AuthService();
    app = createApp({ storage, cppEngine, authService });

    // Seed 3 test books into isolated storage
    const initialBooks: Book[] = [
      {
        bookId: 'CS-001',
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        genre: 'Computer Science',
        borrowCount: 20,
        popularityScore: 66,
        availability: true,
        shelfPage: 1,
        shelfRow: 1,
        shelfSlot: 1,
      },
      {
        bookId: 'CS-002',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        genre: 'Computer Science',
        borrowCount: 15,
        popularityScore: 60,
        availability: true,
        shelfPage: 1,
        shelfRow: 1,
        shelfSlot: 2,
      },
      {
        bookId: 'FIC-001',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        genre: 'Fiction',
        borrowCount: 35,
        popularityScore: 78,
        availability: true,
        shelfPage: 1,
        shelfRow: 1,
        shelfSlot: 3,
      },
    ];

    await storage.saveState((s) => {
      s.books = initialBooks;
      s.activeShelfPages = StorageService.buildShelfPagesFromBooks(initialBooks);
    });
  });

  after(() => {
    // Clean up temporary test file
    if (fs.existsSync(testDataFile)) {
      fs.unlinkSync(testDataFile);
    }
  });

  // 1. Authentication and Authorization Tests
  describe('Authentication & Authorization', () => {
    test('POST /api/admin/login with correct credentials returns valid Bearer token', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'adminpassword123' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      adminToken = res.body.data.token;
    });

    test('POST /api/admin/login with invalid credentials returns 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('Protected admin route without authorization header returns 401', async () => {
      const res = await request(app).post('/api/admin/books').send({ bookId: 'TEST-1' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('Protected admin route with forged/tampered token returns 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/admin/books')
        .set('Authorization', 'Bearer forged.invalid.token')
        .send({ bookId: 'TEST-1' });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });
  });

  // 2. Book Catalog & Student API Tests
  describe('Student Catalog & Search APIs', () => {
    test('GET /api/books returns paginated book collection', async () => {
      const res = await request(app).get('/api/books');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.books.length, 3);
      assert.equal(res.body.data.total, 3);
    });

    test('GET /api/books/:id returns existing book details', async () => {
      const res = await request(app).get('/api/books/CS-001');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, 'Introduction to Algorithms');
    });

    test('GET /api/books/:id with non-existent ID returns 404 BOOK_NOT_FOUND', async () => {
      const res = await request(app).get('/api/books/DOES-NOT-EXIST');
      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'BOOK_NOT_FOUND');
    });

    test('GET /api/genres returns distinct genres and counts', async () => {
      const res = await request(app).get('/api/genres');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 2); // Computer Science, Fiction
    });

    test('GET /api/shelves/active returns approved active 4x5 shelf grid', async () => {
      const res = await request(app).get('/api/shelves/active');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.pages.length, 1);
      assert.equal(res.body.data.pages[0].rows, 4);
      assert.equal(res.body.data.pages[0].slotsPerRow, 5);
      assert.equal(res.body.data.totalOccupied, 3);
    });

    test('GET /api/search?q=Gatsby&type=title searches title correctly', async () => {
      const res = await request(app).get('/api/search?q=Gatsby&type=title');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].bookId, 'FIC-001');
    });

    test('GET /api/search?q=CS-002&type=id utilizes C++ Hash Table lookup', async () => {
      const res = await request(app).get('/api/search?q=CS-002&type=id');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].title, 'Clean Code');
    });

    test('GET /api/search?q=Fiction&type=genre utilizes C++ BST lookup', async () => {
      const res = await request(app).get('/api/search?q=Fiction&type=genre');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].genre, 'Fiction');
    });
  });

  // 3. Admin CRUD Operations Tests
  describe('Admin CRUD Operations', () => {
    test('POST /api/admin/books adds a new book successfully', async () => {
      const res = await request(app)
        .post('/api/admin/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookId: 'PHYS-001',
          title: 'Quantum Mechanics',
          author: 'David J. Griffiths',
          genre: 'Physics',
          borrowCount: 12,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.bookId, 'PHYS-001');
      assert.equal(res.body.data.popularityScore, 56);
    });

    test('POST /api/admin/books rejects duplicate book ID with 409', async () => {
      const res = await request(app)
        .post('/api/admin/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bookId: 'PHYS-001',
          title: 'Duplicate Title',
          author: 'Author',
          genre: 'Physics',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'DUPLICATE_BOOK_ID');
    });

    test('PATCH /api/admin/books/:id updates metadata', async () => {
      const res = await request(app)
        .patch('/api/admin/books/PHYS-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Principles of Quantum Mechanics' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, 'Principles of Quantum Mechanics');
    });

    test('DELETE /api/admin/books/:id removes book', async () => {
      const res = await request(app)
        .delete('/api/admin/books/PHYS-001')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(storage.getBookById('PHYS-001'), undefined);
    });
  });

  // 4. Borrowing & Return Simulation Workflow Tests
  describe('Borrow and Return Simulation Workflow', () => {
    test('POST /api/admin/books/:id/borrow marks book borrowed and triggers proposal', async () => {
      const res = await request(app)
        .post('/api/admin/books/CS-001/borrow')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.book.availability, false);
      assert.equal(res.body.data.book.borrowCount, 21); // incremented from 20
      assert.equal(res.body.data.proposalGenerated, true);
      assert.ok(storage.getPendingProposal());
    });

    test('POST /api/admin/books/:id/borrow on already-borrowed book returns 400', async () => {
      const res = await request(app)
        .post('/api/admin/books/CS-001/borrow')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'BOOK_ALREADY_BORROWED');
    });

    test('POST /api/admin/books/:id/return marks book available again', async () => {
      const res = await request(app)
        .post('/api/admin/books/CS-001/return')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.book.availability, true);
    });

    test('POST /api/admin/books/:id/return on already-available book returns 400', async () => {
      const res = await request(app)
        .post('/api/admin/books/CS-001/return')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'BOOK_ALREADY_AVAILABLE');
    });
  });

  // 5. C++ Engine Invocation & Integration Tests
  describe('C++ DSA Engine Integration', () => {
    test('Real C++ binary processes optimizeShelves and returns valid layout', async () => {
      const books = storage.getBooks();
      const res = await cppEngine.optimizeShelves(books);

      assert.equal(res.success, true);
      assert.equal(res.assignments.length, books.length);
      assert.equal(res.shelfPages.length, 1);
      assert.equal(res.shelfPages[0].slots.length, 20);
    });

    test('CppEngineService handles missing executable gracefully with helpful error', async () => {
      const badEngine = new CppEngineService('/invalid/path/to/shelf_engine');
      await assert.rejects(
        async () => {
          await badEngine.optimizeShelves([]);
        },
        (err: Error) => {
          return err.message.includes('C++ engine executable not found');
        }
      );
    });
  });

  // 6. Proposal Workflow, Adjustments, Approval, and Stale Protection
  describe('Proposal Workflow & Stale Protection', () => {
    test('POST /api/admin/shelves/optimize generates a pending proposal without modifying active layout', async () => {
      const activeBefore = storage.getActiveShelfPages();

      const res = await request(app)
        .post('/api/admin/shelves/optimize')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);

      // Verify active layout was untouched
      const activeAfter = storage.getActiveShelfPages();
      assert.deepEqual(activeBefore, activeAfter);
    });

    test('PATCH /api/admin/shelves/proposal rejects slot collision (two books in same slot)', async () => {
      const proposal = storage.getPendingProposal();
      assert.ok(proposal);

      // Force two books into Page 1, Row 1, Slot 1
      const collidingBooks = proposal.books.map((b, idx) => ({
        ...b,
        shelfPage: 1,
        shelfRow: 1,
        shelfSlot: idx === 0 ? 1 : (idx === 1 ? 1 : 3), // Colliding slot 1!
      }));

      const res = await request(app)
        .patch('/api/admin/shelves/proposal')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ books: collidingBooks });

      assert.equal(res.status, 400);
      assert.ok(res.body.error.message.includes('Slot conflict detected'));
    });

    test('Stale proposal detection: book modification invalidates pending proposal', async () => {
      // 1. Generate fresh proposal
      await request(app)
        .post('/api/admin/shelves/optimize')
        .set('Authorization', `Bearer ${adminToken}`);

      // 2. Modify book state to increment version
      await request(app)
        .post('/api/admin/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bookId: 'NEW-TEMP', title: 'Temporary', genre: 'Temp' });

      // 3. Attempting to approve the older proposal must be rejected as stale
      const approveRes = await request(app)
        .post('/api/admin/shelves/proposal/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(approveRes.status, 409);
      assert.ok(approveRes.body.error.message.includes('STALE_PROPOSAL'));

      // Clean up temp book
      await storage.saveState((s) => {
        s.books = s.books.filter((b) => b.bookId !== 'NEW-TEMP');
      });
    });

    test('POST /api/admin/shelves/proposal/approve commits new coordinates to active shelves', async () => {
      // 1. Generate fresh proposal matching current version
      await request(app)
        .post('/api/admin/shelves/optimize')
        .set('Authorization', `Bearer ${adminToken}`);

      // 2. Approve proposal
      const res = await request(app)
        .post('/api/admin/shelves/proposal/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(storage.getPendingProposal(), null); // Cleared
      assert.equal(res.body.data.appliedCount, 3);
    });

    test('POST /api/admin/shelves/proposal/reject discards pending proposal', async () => {
      // 1. Generate proposal
      await request(app)
        .post('/api/admin/shelves/optimize')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.ok(storage.getPendingProposal());

      // 2. Reject proposal
      const res = await request(app)
        .post('/api/admin/shelves/proposal/reject')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(storage.getPendingProposal(), null);
    });
  });

  // 7. JSON Persistence and Error Recovery Tests
  describe('JSON Persistence & Recovery', () => {
    test('StorageService recovers gracefully from empty or malformed files', () => {
      const malformedPath = path.resolve('/tmp', `malformed-${Date.now()}.json`);
      fs.writeFileSync(malformedPath, 'NOT_JSON{!!}', 'utf-8');

      const recoveryStorage = new StorageService(malformedPath);
      const state = recoveryStorage.getState();

      assert.ok(state);
      assert.equal(state.version, 1);
      assert.equal(state.books.length, 0);

      if (fs.existsSync(malformedPath)) fs.unlinkSync(malformedPath);
    });
  });

  // 8. Barcode Scanner — Book Lookup & Auth-Protected Borrow/Return
  describe('Barcode Scanner Workflow', () => {
    // --- Book lookup (used by the scanner page via GET /api/books/:id) ---

    test('GET /api/books/:id - valid barcode ID returns full book record with all fields', async () => {
      const res = await request(app).get('/api/books/CS-001');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const book = res.body.data;
      assert.equal(book.bookId, 'CS-001');
      assert.equal(typeof book.title, 'string');
      assert.equal(typeof book.author, 'string');
      assert.equal(typeof book.genre, 'string');
      assert.equal(typeof book.borrowCount, 'number');
      assert.equal(typeof book.availability, 'boolean');
      assert.equal(typeof book.shelfPage, 'number');
      assert.equal(typeof book.shelfRow, 'number');
      assert.equal(typeof book.shelfSlot, 'number');
    });

    test('GET /api/books/:id - unknown barcode ID returns 404 BOOK_NOT_FOUND', async () => {
      const res = await request(app).get('/api/books/UNKNOWN-9999');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'BOOK_NOT_FOUND');
      assert.ok(res.body.error.message.includes('UNKNOWN-9999'));
    });

    test('GET /api/books/ (no ID) returns the paginated list, not a 404', async () => {
      // An empty barcode path resolves to the list endpoint — it must 200, not 500
      const res = await request(app).get('/api/books/');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.books));
    });

    // --- Borrow action requires admin token ---

    test('POST borrow without Authorization header returns 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/admin/books/CS-002/borrow');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('POST borrow with forged token returns 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/admin/books/CS-002/borrow')
        .set('Authorization', 'Bearer forged.token');
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    test('POST borrow with valid admin token borrows an available book', async () => {
      const before = await request(app).get('/api/books/CS-002');
      assert.equal(before.body.data.availability, true);

      const res = await request(app)
        .post('/api/admin/books/CS-002/borrow')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.book.availability, false);
      assert.equal(res.body.data.book.borrowCount, before.body.data.borrowCount + 1);
      assert.ok(typeof res.body.data.proposalGenerated === 'boolean');
    });

    test('POST borrow on already-borrowed book returns 400 BOOK_ALREADY_BORROWED', async () => {
      // CS-002 was borrowed in the previous test
      const res = await request(app)
        .post('/api/admin/books/CS-002/borrow')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'BOOK_ALREADY_BORROWED');
    });

    // --- Return action requires admin token ---

    test('POST return without Authorization header returns 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/admin/books/CS-002/return');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('POST return with valid admin token returns a borrowed book', async () => {
      const res = await request(app)
        .post('/api/admin/books/CS-002/return')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.book.availability, true);
    });

    test('POST return on already-available book returns 400 BOOK_ALREADY_AVAILABLE', async () => {
      // CS-002 was returned in the previous test
      const res = await request(app)
        .post('/api/admin/books/CS-002/return')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'BOOK_ALREADY_AVAILABLE');
    });

    // --- Edit action requires admin token ---

    test('PATCH book without Authorization header returns 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .patch('/api/admin/books/FIC-001')
        .send({ title: 'New Title' });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('PATCH book with valid admin token updates metadata (scanner edit button)', async () => {
      const res = await request(app)
        .patch('/api/admin/books/FIC-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'The Great Gatsby (Scanner Edit)', author: 'F. Scott Fitzgerald' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, 'The Great Gatsby (Scanner Edit)');
      assert.equal(res.body.data.bookId, 'FIC-001'); // bookId must be immutable

      // Restore original title
      await request(app)
        .patch('/api/admin/books/FIC-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'The Great Gatsby' });
    });

    // --- Active shelf layout must survive a borrow-return cycle ---

    test('Active shelf grid coordinates are unchanged after a scanner borrow-return cycle', async () => {
      const shelfBefore = await request(app).get('/api/shelves/active');
      const pagesBefore = JSON.stringify(shelfBefore.body.data.pages);

      await request(app)
        .post('/api/admin/books/CS-002/borrow')
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app)
        .post('/api/admin/books/CS-002/return')
        .set('Authorization', `Bearer ${adminToken}`);

      const shelfAfter = await request(app).get('/api/shelves/active');
      const pagesAfter = JSON.stringify(shelfAfter.body.data.pages);

      // Active physical layout must be identical — only a proposal changes
      assert.equal(pagesAfter, pagesBefore);
    });
  });

  // 9. Student Profile & Role Separation
  describe('Student Profile & Role Separation', () => {
    let studentToken: string;

    test('POST /api/auth/student-login returns valid student token with student role', async () => {
      const res = await request(app)
        .post('/api/auth/student-login')
        .send({ studentId: 'STU-2026-099', name: 'Priya Sharma', department: 'Data Science' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.role, 'student');
      assert.equal(res.body.data.studentId, 'STU-2026-099');
      assert.ok(typeof res.body.data.token === 'string');
      studentToken = res.body.data.token;
    });

    test('Student token CANNOT access admin-only endpoints (Strict Authorization: 403 FORBIDDEN)', async () => {
      // Student tries to add a book
      const res = await request(app)
        .post('/api/admin/books')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          bookId: 'HACK-01',
          title: 'Unauthorized Book',
          author: 'Attacker',
          genre: 'Security',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    test('Student token CANNOT access admin shelf optimization endpoint', async () => {
      const res = await request(app)
        .post('/api/admin/shelves/optimize')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    test('GET /api/student/profile returns student details, borrowed books with shelf return coordinates', async () => {
      const res = await request(app)
        .get('/api/student/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.profile.studentId, 'STU-2026-099');
      assert.equal(res.body.data.profile.name, 'Priya Sharma');
      assert.ok(Array.isArray(res.body.data.borrowedBooks));
      assert.ok(Array.isArray(res.body.data.recommendedBooks));
      assert.ok(typeof res.body.data.stats.availableQuota === 'number');
    });
  });
});


