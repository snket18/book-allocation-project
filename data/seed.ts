import fs from 'node:fs';
import path from 'node:path';
import { Book, LibraryState } from '@smart-library/shared';
import { CppEngineService } from '../apps/api/src/services/cppEngine';
import { StorageService } from '../apps/api/src/services/storage';
import { config } from '../apps/api/src/config';

const sampleBooksRaw: Omit<Book, 'shelfPage' | 'shelfRow' | 'shelfSlot' | 'popularityScore'>[] = [
  // Computer Science (14 books)
  { bookId: 'CS-001', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', genre: 'Computer Science', borrowCount: 92, availability: true },
  { bookId: 'CS-002', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Computer Science', borrowCount: 88, availability: true },
  { bookId: 'CS-003', title: 'Operating System Concepts', author: 'Abraham Silberschatz', genre: 'Computer Science', borrowCount: 75, availability: true },
  { bookId: 'CS-004', title: 'Design Patterns: Elements of Reusable Object-Oriented Software', author: 'Erich Gamma et al.', genre: 'Computer Science', borrowCount: 75, availability: false }, // Equal borrow to test tie-breaker
  { bookId: 'CS-005', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', genre: 'Computer Science', borrowCount: 64, availability: true },
  { bookId: 'CS-006', title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', genre: 'Computer Science', borrowCount: 58, availability: true },
  { bookId: 'CS-007', title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell', genre: 'Computer Science', borrowCount: 52, availability: true },
  { bookId: 'CS-008', title: 'Database System Concepts', author: 'Abraham Silberschatz', genre: 'Computer Science', borrowCount: 47, availability: true },
  { bookId: 'CS-009', title: 'Compilers: Principles, Techniques, and Tools', author: 'Alfred V. Aho', genre: 'Computer Science', borrowCount: 41, availability: true },
  { bookId: 'CS-010', title: 'The Pragmatic Programmer', author: 'David Thomas', genre: 'Computer Science', borrowCount: 39, availability: true },
  { bookId: 'CS-011', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', genre: 'Computer Science', borrowCount: 33, availability: true },
  { bookId: 'CS-012', title: 'Computer Architecture: A Quantitative Approach', author: 'John L. Hennessy', genre: 'Computer Science', borrowCount: 28, availability: true },
  { bookId: 'CS-013', title: 'C Programming Language', author: 'Brian W. Kernighan', genre: 'Computer Science', borrowCount: 22, availability: true },
  { bookId: 'CS-014', title: 'Algorithms Unlocked', author: 'Thomas H. Cormen', genre: 'Computer Science', borrowCount: 15, availability: true },

  // Fiction (13 books)
  { bookId: 'FIC-001', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Fiction', borrowCount: 95, availability: true },
  { bookId: 'FIC-002', title: '1984', author: 'George Orwell', genre: 'Fiction', borrowCount: 91, availability: false },
  { bookId: 'FIC-003', title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Fiction', borrowCount: 84, availability: true },
  { bookId: 'FIC-004', title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'Fiction', borrowCount: 78, availability: true },
  { bookId: 'FIC-005', title: 'The Catcher in the Rye', author: 'J.D. Salinger', genre: 'Fiction', borrowCount: 71, availability: true },
  { bookId: 'FIC-006', title: 'Brave New World', author: 'Aldous Huxley', genre: 'Fiction', borrowCount: 65, availability: true },
  { bookId: 'FIC-007', title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'Fiction', borrowCount: 65, availability: true }, // Equal borrow to test tie-breaker
  { bookId: 'FIC-008', title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', genre: 'Fiction', borrowCount: 54, availability: true },
  { bookId: 'FIC-009', title: 'One Hundred Years of Solitude', author: 'Gabriel García Márquez', genre: 'Fiction', borrowCount: 48, availability: true },
  { bookId: 'FIC-010', title: 'Fahrenheit 451', author: 'Ray Bradbury', genre: 'Fiction', borrowCount: 42, availability: true },
  { bookId: 'FIC-011', title: 'Jane Eyre', author: 'Charlotte Brontë', genre: 'Fiction', borrowCount: 36, availability: true },
  { bookId: 'FIC-012', title: 'Wuthering Heights', author: 'Emily Brontë', genre: 'Fiction', borrowCount: 30, availability: true },
  { bookId: 'FIC-013', title: 'Animal Farm', author: 'George Orwell', genre: 'Fiction', borrowCount: 25, availability: true },

  // Mathematics (11 books)
  { bookId: 'MATH-001', title: 'Calculus: Early Transcendentals', author: 'James Stewart', genre: 'Mathematics', borrowCount: 82, availability: true },
  { bookId: 'MATH-002', title: 'Linear Algebra and Its Applications', author: 'Gilbert Strang', genre: 'Mathematics', borrowCount: 76, availability: true },
  { bookId: 'MATH-003', title: 'Discrete Mathematics and Its Applications', author: 'Kenneth H. Rosen', genre: 'Mathematics', borrowCount: 69, availability: true },
  { bookId: 'MATH-004', title: 'Introduction to Probability', author: 'Dimitri P. Bertsekas', genre: 'Mathematics', borrowCount: 61, availability: true },
  { bookId: 'MATH-005', title: 'Principles of Mathematical Analysis', author: 'Walter Rudin', genre: 'Mathematics', borrowCount: 55, availability: true },
  { bookId: 'MATH-006', title: 'Abstract Algebra', author: 'David S. Dummit', genre: 'Mathematics', borrowCount: 49, availability: true },
  { bookId: 'MATH-007', title: 'Differential Equations and Linear Algebra', author: 'Stephen W. Goode', genre: 'Mathematics', borrowCount: 43, availability: true },
  { bookId: 'MATH-008', title: 'Complex Analysis', author: 'Lars Ahlfors', genre: 'Mathematics', borrowCount: 37, availability: true },
  { bookId: 'MATH-009', title: 'Topology', author: 'James Munkres', genre: 'Mathematics', borrowCount: 31, availability: true },
  { bookId: 'MATH-010', title: 'Elementary Number Theory', author: 'David M. Burton', genre: 'Mathematics', borrowCount: 26, availability: true },
  { bookId: 'MATH-011', title: 'Concrete Mathematics', author: 'Ronald L. Graham', genre: 'Mathematics', borrowCount: 20, availability: true },

  // Physics (11 books)
  { bookId: 'PHYS-001', title: 'The Feynman Lectures on Physics', author: 'Richard P. Feynman', genre: 'Physics', borrowCount: 89, availability: true },
  { bookId: 'PHYS-002', title: 'University Physics with Modern Physics', author: 'Hugh D. Young', genre: 'Physics', borrowCount: 80, availability: true },
  { bookId: 'PHYS-003', title: 'Introduction to Electrodynamics', author: 'David J. Griffiths', genre: 'Physics', borrowCount: 73, availability: true },
  { bookId: 'PHYS-004', title: 'Introduction to Quantum Mechanics', author: 'David J. Griffiths', genre: 'Physics', borrowCount: 68, availability: true },
  { bookId: 'PHYS-005', title: 'Classical Mechanics', author: 'Herbert Goldstein', genre: 'Physics', borrowCount: 60, availability: true },
  { bookId: 'PHYS-006', title: 'Thermal Physics', author: 'Charles Kittel', genre: 'Physics', borrowCount: 53, availability: true },
  { bookId: 'PHYS-007', title: 'Optics', author: 'Eugene Hecht', genre: 'Physics', borrowCount: 46, availability: true },
  { bookId: 'PHYS-008', title: 'Spacetime and Geometry: An Introduction to General Relativity', author: 'Sean M. Carroll', genre: 'Physics', borrowCount: 38, availability: true },
  { bookId: 'PHYS-009', title: 'Solid State Physics', author: 'Neil W. Ashcroft', genre: 'Physics', borrowCount: 32, availability: true },
  { bookId: 'PHYS-010', title: 'Subatomic Physics', author: 'Ernest M. Henley', genre: 'Physics', borrowCount: 27, availability: true },
  { bookId: 'PHYS-011', title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Physics', borrowCount: 19, availability: true },

  // History (11 books)
  { bookId: 'HIST-001', title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', genre: 'History', borrowCount: 94, availability: true },
  { bookId: 'HIST-002', title: 'Guns, Germs, and Steel', author: 'Jared Diamond', genre: 'History', borrowCount: 83, availability: true },
  { bookId: 'HIST-003', title: 'The Silk Roads: A New History of the World', author: 'Peter Frankopan', genre: 'History', borrowCount: 74, availability: true },
  { bookId: 'HIST-004', title: 'A People\'s History of the United States', author: 'Howard Zinn', genre: 'History', borrowCount: 66, availability: true },
  { bookId: 'HIST-005', title: 'The Second World War', author: 'Antony Beevor', genre: 'History', borrowCount: 59, availability: true },
  { bookId: 'HIST-006', title: 'SPQR: A History of Ancient Rome', author: 'Mary Beard', genre: 'History', borrowCount: 51, availability: true },
  { bookId: 'HIST-007', title: 'Postwar: A History of Europe Since 1945', author: 'Tony Judt', genre: 'History', borrowCount: 44, availability: true },
  { bookId: 'HIST-008', title: 'The Origins of Totalitarianism', author: 'Hannah Arendt', genre: 'History', borrowCount: 35, availability: true },
  { bookId: 'HIST-009', title: 'The Crusades: The Authoritative History', author: 'Thomas Asbridge', genre: 'History', borrowCount: 29, availability: true },
  { bookId: 'HIST-010', title: 'The Cold War: A New History', author: 'John Lewis Gaddis', genre: 'History', borrowCount: 23, availability: true },
  { bookId: 'HIST-011', title: 'The History of the Ancient World', author: 'Susan Wise Bauer', genre: 'History', borrowCount: 17, availability: true },
];

async function seed() {
  console.log(`[Seed] Generating ${sampleBooksRaw.length} sample books across 5 genres...`);

  const books: Book[] = sampleBooksRaw.map((b) => {
    const score = Math.min(100, Math.max(0, Math.round(Math.log2(b.borrowCount + 1) * 15)));
    return {
      ...b,
      popularityScore: score,
      shelfPage: 0,
      shelfRow: 0,
      shelfSlot: 0,
    };
  });

  // Run initial C++ DSA engine optimization to assign organized physical shelf coordinates
  const cppEngine = new CppEngineService(config.cppEnginePath);
  console.log(`[Seed] Calling C++ DSA engine at: ${config.cppEnginePath}`);
  const result = await cppEngine.optimizeShelves(books);

  const finalState: LibraryState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    books: result.assignments,
    activeShelfPages: result.shelfPages,
    pendingProposal: null,
  };

  const targetFile = config.dataFilePath;
  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(targetFile, JSON.stringify(finalState, null, 2), 'utf-8');
  console.log(`✓ [Seed] Successfully seeded ${finalState.books.length} books into: ${targetFile}`);
  console.log(`✓ [Seed] Active shelf pages initialized: ${finalState.activeShelfPages.length} pages (60 total physical slots)`);
}

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
