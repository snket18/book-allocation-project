/**
 * Shared Domain Models and Types for Smart Library Shelf Optimization System
 */

export interface ShelfPosition {
  shelfPage: number; // 1-indexed (Page 1, 2, 3...)
  shelfRow: number;  // 1-indexed (Row 1 to 4: Row 1 = Eye-level prime tier)
  shelfSlot: number; // 1-indexed (Slot 1 to 5 per row)
}

export interface Book extends ShelfPosition {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  borrowCount: number;
  popularityScore: number;
  availability: boolean;
}

export interface ShelfSlot {
  row: number;
  slot: number;
  isOccupied: boolean;
  bookId?: string | null;
  title?: string;
  author?: string;
  genre?: string;
  borrowCount?: number;
  popularityScore?: number;
}

export interface ShelfPage {
  page: number;
  rows: number;
  slotsPerRow: number;
  slots: ShelfSlot[];
}

export interface ProposedMove {
  bookId: string;
  title: string;
  genre: string;
  borrowCount: number;
  from: ShelfPosition;
  to: ShelfPosition;
}

export interface OptimizationProposal {
  id: string;
  createdAt: string;
  baseVersion: number; // Tracks dataset version when generated (stale detection)
  books: Book[];
  shelfPages: ShelfPage[];
  moves: ProposedMove[];
  metadata: {
    totalBooks: number;
    totalPages: number;
    totalOccupied: number;
    totalCapacity: number;
    emptySlots: number;
    genresCount: number;
    eyeLevelBooksCount: number;
    rowsPerPage: number;
    slotsPerRow: number;
    slotsPerPage: number;
  };
}

export interface LibraryState {
  version: number;
  lastUpdated: string;
  books: Book[];
  activeShelfPages: ShelfPage[];
  pendingProposal: OptimizationProposal | null;
}

export interface BorrowSimulationRequest {
  action: 'borrow' | 'return';
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export type UserRole = 'admin' | 'student';

export interface AuthUser {
  username: string;
  role: UserRole;
  token: string;
  expiresAt: string;
  studentId?: string;
  department?: string;
  name?: string;
}

