# Smart Library Shelf Optimization System

> **College DSA Final Project**  
> A full-stack library management system that optimizes physical bookshelf placement using genuine Data Structures and Algorithms implemented in C++.

---

## 1. Project Overview

Physical libraries face an ergonomic and logistical challenge: high-demand books are often placed on inconvenient shelves (top or bottom rows), leading to congestion, slow retrieval times, and excessive physical stretching or crouching.

This project solves that by algorithmically organizing books onto physical shelves:
- Categorized into genres using a **Binary Search Tree (BST)**.
- Ranked by circulation popularity using a custom **Quick Sort**.
- Mapped onto a **Two-Dimensional Shelf Array** (4 rows × 5 slots = 20 slots/page) where eye-level rows (Row 1 for this prototype) receive the most popular books.
- Instant $O(1)$ barcode/Book ID lookup powered by a custom **Hash Table** with separate chaining.
- Librarians can preview, fine-tune, and approve/reject proposed shelf reorganizations before altering physical shelf state.

---

## 2. System Architecture & Tech Stack

```
+------------------------------------------------------------------+
|                    Browser / Mobile (React + Vite)               |
|      Student Search Portal  |  Admin Layout Visualizer & Diff    |
+---------------------------------+--------------------------------+
                                  | HTTP REST / JSON
                                  v
+------------------------------------------------------------------+
|                  Backend Service (Node.js + Express)             |
|   - API routing & Input validation                               |
|   - Data persistence: data/books.json (Atomic File I/O)          |
|   - Child Process execution: Spawns C++ Engine                   |
|   - Stale proposal detection via dataset versioning              |
+---------------------------------+--------------------------------+
                                  | JSON via stdin / stdout
                                  v
+------------------------------------------------------------------+
|                      C++ DSA Engine (C++17)                      |
|  - Hash Table: O(1) Book ID lookup & indexing                    |
|  - BST: Alphabetical genre categorization                        |
|  - Quick Sort: Custom in-place borrow count sorting              |
|  - 2D Shelf Array: 4x5 physical matrix slot allocation           |
+------------------------------------------------------------------+
```

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, TypeScript, tsx
- **Shared Types:** TypeScript shared monorepo package (`@smart-library/shared`)
- **DSA Engine:** Modern C++ (C++17, compiled with Apple Clang / GCC)
- **Monorepo:** pnpm workspaces
- **Persistence:** Local JSON file (`data/books.json`) managed exclusively by Node.js

---

## 3. Monorepo Directory Structure

```text
smart-library/
├── apps/
│   ├── web/                     # React + Vite + Tailwind frontend
│   └── api/                     # Express + TypeScript backend API
│       ├── src/
│       │   ├── config.ts        # Central environment configuration
│       │   ├── app.ts           # Express application factory
│       │   ├── index.ts         # Server listen entry point
│       │   ├── services/
│       │   │   ├── storage.ts   # Atomic JSON persistence & locks
│       │   │   ├── cppEngine.ts # C++ child-process execution (stdin/stdout)
│       │   │   ├── auth.ts      # Scrypt hashing, HMAC Bearer tokens, rate limiting
│       │   │   └── shelf.ts     # Proposal generation, adjustment, approval
│       │   └── routes/
│       │       ├── student.ts   # Public student catalog, search, and active shelf
│       │       └── admin.ts     # Protected administrative & borrowing operations
│       └── tests/
│           └── api.test.ts      # 28 automated integration & unit tests
├── packages/
│   └── shared/                  # Common TypeScript interfaces & schemas
├── cpp-engine/
│   ├── src/                     # C++ source code (main.cpp)
│   ├── include/                 # C++ header files & nlohmann/json.hpp
│   │   ├── models/Book.hpp
│   │   ├── dsa/HashTable.hpp    # Custom Hash Table with separate chaining
│   │   ├── dsa/BST.hpp          # Custom Binary Search Tree for genres
│   │   ├── dsa/QuickSort.hpp    # Custom QuickSort with median-of-three
│   │   ├── dsa/Shelf2DArray.hpp # 4x5 2D Shelf Array
│   │   └── engine/ShelfOptimizer.hpp
│   ├── tests/
│   │   └── test_runner.cpp      # 12 automated C++ unit tests
│   └── build/                   # Compiled shelf_engine executable
├── data/
│   ├── books.json               # Seeded JSON persistence repository
│   └── seed.ts                  # Generates 60 realistic books across 5 genres
├── package.json                 # Monorepo root scripts & configuration
├── pnpm-workspace.yaml          # pnpm workspace definition
└── README.md
```

---

## 4. How to Run Locally (macOS)

### Prerequisites
- Node.js (v20+ recommended)
- pnpm (`npm install -g pnpm`)
- Apple Clang or GCC (`clang++ --version`)

### Commands

```bash
# 1. Install all dependencies across the monorepo
pnpm install

# 2. Compile the C++ DSA Engine
pnpm run build:cpp

# 3. Run all automated tests (12 C++ engine tests + 28 API tests)
pnpm run test

# 4. Seed the database with 60 realistic sample books across 5 genres
pnpm run seed

# 5. Start development servers concurrently (Frontend on :3000, Backend on :4000)
pnpm run dev
```

* **Web Application:** [http://localhost:3000](http://localhost:3000)
* **API Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
* **Student Catalog:** [http://localhost:4000/api/books](http://localhost:4000/api/books)
* **Active Shelf Grid:** [http://localhost:4000/api/shelves/active](http://localhost:4000/api/shelves/active)
* **Library Analytics:** [http://localhost:4000/api/analytics](http://localhost:4000/api/analytics)

---

## 5. REST API Documentation

### Public Student Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status. |
| `GET` | `/api/books` | Paginated books with filters (`genre`, `available`, `search`, `sortBy`, `order`, `page`, `limit`). |
| `GET` | `/api/books/:id` | Single book lookup by ID. |
| `GET` | `/api/search?q=...&type=title\|id\|genre` | Search powered by C++ Hash Table (`type=id`) or C++ BST (`type=genre`). |
| `GET` | `/api/genres` | List distinct genres and book counts. |
| `GET` | `/api/shelves/active` | Current approved $4 \times 5$ physical shelf layout. |
| `GET` | `/api/analytics` | Overview statistics (most borrowed, occupancy, borrow counts). |

### Protected Admin Endpoints (Require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/admin/login` | Authenticate admin (`admin` / `adminpassword123`) with rate limiting. Returns signed Bearer token. |
| `POST` | `/api/admin/logout` | Invalidate/end session. |
| `POST` | `/api/admin/books` | Add new book to catalog. |
| `PATCH` | `/api/admin/books/:id` | Update existing book metadata. |
| `DELETE`| `/api/admin/books/:id` | Remove book from catalog. |
| `POST` | `/api/admin/books/:id/borrow` | Simulate borrow. Auto-triggers C++ engine to compute new shelf proposal. |
| `POST` | `/api/admin/books/:id/return` | Simulate return. Auto-triggers C++ engine to compute new shelf proposal. |
| `POST` | `/api/admin/shelves/optimize` | Explicitly trigger C++ optimization to generate a fresh proposal. |
| `GET` | `/api/admin/shelves/proposal` | Retrieve currently pending shelf proposal. |
| `PATCH`| `/api/admin/shelves/proposal` | Manually fine-tune proposed shelf positions before approval. |
| `POST` | `/api/admin/shelves/proposal/approve` | Approve proposal. Commits new coordinates to active shelves. |
| `POST` | `/api/admin/shelves/proposal/reject` | Reject proposal. Discards proposal; active layout remains unchanged. |

---

## 6. Borrowing & Proposal Lifecycle

1. **Borrow Simulation:** When a book is borrowed, its `borrowCount` increments and `availability` becomes `false`. The backend automatically invokes the compiled C++ engine with the updated dataset.
2. **Proposal Isolation:** The proposed layout is stored in `state.pendingProposal` tagged with the dataset's `baseVersion`. The active shelf layout is **never** touched before approval.
3. **Stale Protection:** If book records are added, edited, or deleted while a proposal is pending, `state.version` increments. Any attempt to approve the older proposal is rejected with `STALE_PROPOSAL` (HTTP 409).
4. **Approval vs. Rejection:**
   * **Approve:** Overwrites active shelf coordinates, updates active shelf pages, clears pending proposal, and increments `state.version`.
   * **Reject:** Completely clears pending proposal; active layout remains untouched.
