import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book, OptimizationProposal, ShelfPage } from '@smart-library/shared';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ShelfGrid } from '../components/ShelfGrid';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  BarChart3,
  BookOpen,
  Layers,
  Check,
  X,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { success, error: toastError, info } = useToast();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'circulation' | 'proposals'>('overview');

  // Data states
  const [analytics, setAnalytics] = useState<{
    totalBooks: number;
    availableCount: number;
    borrowedCount: number;
    totalBorrows: number;
    avgBorrows: number;
    genreCounts: Record<string, number>;
    mostBorrowed: Book[];
    shelfCapacity: {
      totalPages: number;
      totalCapacity: number;
      occupiedSlots: number;
      occupancyRate: number;
    };
  } | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [activeShelfPages, setActiveShelfPages] = useState<ShelfPage[]>([]);
  const [pendingProposal, setPendingProposal] = useState<OptimizationProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search in catalog tab
  const [catalogSearch, setCatalogSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // Add/Edit Book Form state
  const [formBookId, setFormBookId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formGenre, setFormGenre] = useState('Computer Science');
  const [formBorrowCount, setFormBorrowCount] = useState(0);

  // Manual adjustment in proposal tab
  const [manualAdjustMode, setManualAdjustMode] = useState(false);
  const [adjustedBooks, setAdjustedBooks] = useState<Book[]>([]);
  const [comparisonView, setComparisonView] = useState<'proposed' | 'active' | 'side-by-side'>('side-by-side');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Load all admin data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [analyticsData, booksData, shelvesData, proposalData] = await Promise.all([
        ApiClient.getAnalytics(),
        ApiClient.getBooks({ limit: 100 }),
        ApiClient.getActiveShelves(),
        ApiClient.getProposal(),
      ]);

      setAnalytics(analyticsData);
      setBooks(booksData.books || []);
      setActiveShelfPages(shelvesData.pages || []);
      setPendingProposal(proposalData);
      if (proposalData && proposalData.books) {
        setAdjustedBooks(JSON.parse(JSON.stringify(proposalData.books)));
      }
    } catch (err: unknown) {
      toastError('Data Fetch Error', err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // --- Handlers: Book Management ---

  const handleOpenAdd = () => {
    setFormBookId('');
    setFormTitle('');
    setFormAuthor('');
    setFormGenre('Computer Science');
    setFormBorrowCount(0);
    setIsAddModalOpen(true);
  };

  const handleSaveAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.addBook({
        bookId: formBookId.trim(),
        title: formTitle.trim(),
        author: formAuthor.trim(),
        genre: formGenre.trim(),
        borrowCount: formBorrowCount,
      });
      success('Book Added', `Successfully added '${formTitle}' (${formBookId}).`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toastError('Failed to Add Book', err instanceof Error ? err.message : 'Error adding book.');
    }
  };

  const handleOpenEdit = (book: Book) => {
    setEditingBook(book);
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormGenre(book.genre);
    setFormBorrowCount(book.borrowCount);
  };

  const handleSaveEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      await ApiClient.updateBook(editingBook.bookId, {
        title: formTitle.trim(),
        author: formAuthor.trim(),
        genre: formGenre.trim(),
        borrowCount: formBorrowCount,
      });
      success('Book Updated', `Book '${editingBook.bookId}' was updated successfully.`);
      setEditingBook(null);
      loadData();
    } catch (err: unknown) {
      toastError('Update Error', err instanceof Error ? err.message : 'Failed to update book.');
    }
  };

  const handleDeleteBook = async () => {
    if (!deletingBookId) return;
    try {
      await ApiClient.deleteBook(deletingBookId);
      success('Book Removed', `Book '${deletingBookId}' was removed from the catalog.`);
      setDeletingBookId(null);
      loadData();
    } catch (err: unknown) {
      toastError('Delete Error', err instanceof Error ? err.message : 'Failed to delete book.');
    }
  };

  // --- Handlers: Circulation / Borrow Simulator ---

  const handleSimulateBorrow = async (bookId: string) => {
    try {
      const res = await ApiClient.simulateBorrow(bookId);
      success(
        'Checkout Simulated',
        `Book ${bookId} borrowed. Circulation count is now ${res.book.borrowCount}.`
      );
      if (res.proposalGenerated) {
        info('New Proposal Ready', 'C++ engine calculated a re-optimized shelf layout.');
      }
      loadData();
    } catch (err: unknown) {
      toastError('Borrow Simulation Error', err instanceof Error ? err.message : 'Failed to borrow book.');
    }
  };

  const handleSimulateReturn = async (bookId: string) => {
    try {
      await ApiClient.simulateReturn(bookId);
      success('Return Simulated', `Book ${bookId} returned and marked available on physical shelf.`);
      loadData();
    } catch (err: unknown) {
      toastError('Return Simulation Error', err instanceof Error ? err.message : 'Failed to return book.');
    }
  };

  // --- Handlers: Proposal Workflow ---

  const handleGenerateProposal = async () => {
    setIsLoading(true);
    try {
      const prop = await ApiClient.optimizeShelves();
      setPendingProposal(prop);
      setAdjustedBooks(JSON.parse(JSON.stringify(prop.books)));
      success('Optimization Complete', 'C++ Engine generated an optimal physical layout.');
      setActiveTab('proposals');
      loadData();
    } catch (err: unknown) {
      toastError('Optimization Failed', err instanceof Error ? err.message : 'C++ process failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveProposal = async () => {
    try {
      const res = await ApiClient.approveProposal();
      success('Proposal Approved!', res.message);
      setPendingProposal(null);
      setManualAdjustMode(false);
      loadData();
    } catch (err: unknown) {
      toastError('Approval Failed', err instanceof Error ? err.message : 'Unable to approve proposal.');
    }
  };

  const handleRejectProposal = async () => {
    try {
      const res = await ApiClient.rejectProposal();
      info('Proposal Rejected', res.message);
      setPendingProposal(null);
      setManualAdjustMode(false);
      loadData();
    } catch (err: unknown) {
      toastError('Rejection Failed', err instanceof Error ? err.message : 'Unable to reject proposal.');
    }
  };

  const handleSaveManualAdjustment = async () => {
    try {
      const updatedProp = await ApiClient.adjustProposal(adjustedBooks);
      setPendingProposal(updatedProp);
      setManualAdjustMode(false);
      success('Manual Adjustment Saved', 'Proposal coordinates updated without collisions.');
    } catch (err: unknown) {
      toastError('Adjustment Error', err instanceof Error ? err.message : 'Invalid slot positions.');
    }
  };

  // Filter catalog list
  const filteredCatalog = books.filter(
    (b) =>
      b.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.bookId.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.author.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.genre.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  if (authLoading || (!isAuthenticated && !user)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-violet-400" />
              Librarian Administration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
              Staff Portal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{user?.username}</strong>. Manage catalog, simulate loans, and review C++ shelf arrangements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleGenerateProposal}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Optimize Shelves</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics &amp; KPIs
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Catalog Management ({books.length})
        </button>

        <button
          onClick={() => setActiveTab('circulation')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'circulation'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Circulation Simulator
        </button>

        <button
          onClick={() => setActiveTab('proposals')}
          className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'proposals'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Shelf Proposals
          {pendingProposal && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Catalog</span>
              <span className="text-3xl font-extrabold text-white mt-1 block font-mono">{analytics.totalBooks}</span>
              <span className="text-xs text-slate-500 mt-1 block">Books in collection</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Available on Shelf</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1 block font-mono">{analytics.availableCount}</span>
              <span className="text-xs text-slate-500 mt-1 block">{analytics.borrowedCount} currently loaned</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Circulations</span>
              <span className="text-3xl font-extrabold text-indigo-400 mt-1 block font-mono">{analytics.totalBorrows}</span>
              <span className="text-xs text-slate-500 mt-1 block">Avg {analytics.avgBorrows} per title</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Shelf Occupancy</span>
              <span className="text-3xl font-extrabold text-cyan-400 mt-1 block font-mono">{analytics.shelfCapacity.occupancyRate}%</span>
              <span className="text-xs text-slate-500 mt-1 block">{analytics.shelfCapacity.totalPages} units (20 slots each)</span>
            </div>
          </div>

          {/* Genre Distribution & Top Borrows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Genre Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <h3 className="font-bold text-white text-base tracking-tight">Category Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analytics.genreCounts).map(([genre, count]) => {
                  const pct = Math.round((count / analytics.totalBooks) * 100);
                  return (
                    <div key={genre} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{genre}</span>
                        <span className="text-slate-400 font-mono">{count} books ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Borrowed Titles */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <h3 className="font-bold text-white text-base tracking-tight">Highest Circulation Titles</h3>
              <div className="divide-y divide-slate-800/80">
                {analytics.mostBorrowed.slice(0, 5).map((book, idx) => (
                  <div key={book.bookId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-100">{book.title}</div>
                        <div className="text-[11px] text-slate-400">{book.author} • {book.genre}</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60">
                      {book.borrowCount} borrows
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATALOG MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog by title, author, ID..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Book</span>
            </button>
          </div>

          {/* Book Catalog Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Title &amp; Author</th>
                    <th className="py-3 px-4">Genre</th>
                    <th className="py-3 px-4 text-center">Circulation</th>
                    <th className="py-3 px-4">Active Placement</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredCatalog.map((b) => (
                    <tr key={b.bookId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{b.bookId}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{b.title}</div>
                        <div className="text-slate-400 text-[11px]">{b.author}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                          {b.genre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        {b.borrowCount} borrows
                      </td>
                      <td className="py-3 px-4">
                        {b.shelfPage > 0 ? (
                          <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60 text-[11px]">
                            P{b.shelfPage} • R{b.shelfRow} • S{b.shelfSlot}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            b.availability
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {b.availability ? 'Available' : 'Loaned'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Edit Book Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingBookId(b.bookId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                            title="Delete Book"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CIRCULATION SIMULATOR */}
      {activeTab === 'circulation' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs text-slate-300 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Borrow &amp; Return Simulation:</strong> When a loan or return is simulated, the book's borrow count and availability update immediately. The backend automatically calls the C++ engine to compute an optimal new shelf proposal awaiting your approval.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Book ID</th>
                    <th className="py-3.5 px-4">Title &amp; Author</th>
                    <th className="py-3.5 px-4 text-center">Circulation Count</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Simulation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {books.map((b) => (
                    <tr key={b.bookId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{b.bookId}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{b.title}</div>
                        <div className="text-slate-400 text-[11px]">{b.author}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                        {b.borrowCount} borrows
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            b.availability
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {b.availability ? 'Available on Shelf' : 'Checked Out'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {b.availability ? (
                          <button
                            onClick={() => handleSimulateBorrow(b.bookId)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-sm"
                          >
                            Simulate Borrow
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSimulateReturn(b.bookId)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm"
                          >
                            Simulate Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHELF PROPOSALS & WORKFLOW */}
      {activeTab === 'proposals' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {pendingProposal ? (
            <div className="space-y-6">
              {/* Proposal Header Banner */}
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                      Pending Librarian Approval
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {pendingProposal.id.slice(0, 18)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">Proposed Physical Shelf Reorganization</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    The C++ algorithm has proposed new shelf coordinates based on updated borrow circulation. Active layout remains unchanged until you approve.
                  </p>
                </div>

                {/* Approve / Reject Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleRejectProposal}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Proposal</span>
                  </button>

                  <button
                    onClick={handleApproveProposal}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Apply Layout</span>
                  </button>
                </div>
              </div>

              {/* Proposed Movements List */}
              {pendingProposal.moves && pendingProposal.moves.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                    Proposed Physical Relocations ({pendingProposal.moves.length} titles to move)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pendingProposal.moves.map((move) => (
                      <div
                        key={move.bookId}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5"
                      >
                        <div className="font-semibold text-white truncate">{move.title}</div>
                        <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                          <span className="text-slate-400">
                            P{move.from.shelfPage}-R{move.from.shelfRow}-S{move.from.shelfSlot}
                          </span>
                          <span className="text-indigo-400 font-bold">➔</span>
                          <span className="text-emerald-300 font-bold">
                            P{move.to.shelfPage}-R{move.to.shelfRow}-S{move.to.shelfSlot}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Shelf Grid View */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-base">Shelf Arrangement Comparison</h4>
                    <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
                      <button
                        onClick={() => setComparisonView('side-by-side')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          comparisonView === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Side-by-Side
                      </button>
                      <button
                        onClick={() => setComparisonView('proposed')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          comparisonView === 'proposed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Proposed Only
                      </button>
                      <button
                        onClick={() => setComparisonView('active')}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          comparisonView === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Active Only
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setManualAdjustMode(!manualAdjustMode)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    {manualAdjustMode ? 'Close Manual Adjust' : 'Manual Slot Adjustments'}
                  </button>
                </div>

                {manualAdjustMode ? (
                  <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-300">
                        Edit coordinates for individual books below. System validates that no 2 books occupy the same (Page, Row, Slot).
                      </p>
                      <button
                        onClick={handleSaveManualAdjustment}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Save Adjustments
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                      {adjustedBooks.map((b, idx) => (
                        <div
                          key={b.bookId}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                        >
                          <span className="font-medium text-white truncate max-w-xs">{b.title}</span>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-slate-400">P:</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={b.shelfPage}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                const copy = [...adjustedBooks];
                                copy[idx].shelfPage = val;
                                setAdjustedBooks(copy);
                              }}
                              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                            />

                            <label className="text-[10px] text-slate-400">R:</label>
                            <input
                              type="number"
                              min={1}
                              max={4}
                              value={b.shelfRow}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                const copy = [...adjustedBooks];
                                copy[idx].shelfRow = val;
                                setAdjustedBooks(copy);
                              }}
                              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                            />

                            <label className="text-[10px] text-slate-400">S:</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={b.shelfSlot}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                const copy = [...adjustedBooks];
                                copy[idx].shelfSlot = val;
                                setAdjustedBooks(copy);
                              }}
                              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : comparisonView === 'side-by-side' ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ShelfGrid
                      pages={activeShelfPages}
                      title="Current Active Physical Layout"
                      subtitle="Physical layout currently on the library shelves."
                      badge="Active (Live)"
                    />
                    <ShelfGrid
                      pages={pendingProposal.shelfPages}
                      title="Proposed C++ Optimized Layout"
                      subtitle="Proposed reorganization based on latest borrow counts."
                      badge="Proposed"
                    />
                  </div>
                ) : comparisonView === 'active' ? (
                  <ShelfGrid
                    pages={activeShelfPages}
                    title="Current Active Physical Layout"
                    subtitle="Physical layout currently on the library shelves."
                    badge="Active (Live)"
                  />
                ) : (
                  <ShelfGrid
                    pages={pendingProposal.shelfPages}
                    title="Proposed Physical Shelf Grid"
                    subtitle="Generated by C++ algorithm based on borrow circulation rankings."
                    badge="Proposal Preview (Not Yet Active)"
                  />
                )}
              </div>
            </div>
          ) : (
            /* No pending proposal state */
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No Shelf Proposals Pending</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The physical shelves are currently synchronized with the latest approved layout. Click the button below to re-calculate positions using the C++ DSA engine.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleGenerateProposal}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-600/30"
                >
                  Generate Optimization Proposal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD NEW BOOK */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add New Book to Catalog</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddBook} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Book ID / Barcode *</label>
                <input
                  type="text"
                  required
                  value={formBookId}
                  onChange={(e) => setFormBookId(e.target.value)}
                  placeholder="e.g. CS-015"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  placeholder="e.g. Robert Sedgewick"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Genre / Category *</label>
                  <select
                    value={formGenre}
                    onChange={(e) => setFormGenre(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="History">History</option>
                    <option value="Philosophy">Philosophy</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Borrows</label>
                  <input
                    type="number"
                    min={0}
                    value={formBorrowCount}
                    onChange={(e) => setFormBorrowCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Save Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BOOK */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Edit Book Details ({editingBook.bookId})</h3>
              <button onClick={() => setEditingBook(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBook} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    value={formGenre}
                    onChange={(e) => setFormGenre(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Borrow Count</label>
                  <input
                    type="number"
                    min={0}
                    value={formBorrowCount}
                    onChange={(e) => setFormBorrowCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Update Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE BOOK */}
      {deletingBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete book <strong className="text-white font-mono">{deletingBookId}</strong> from the catalog? This action will remove its active shelf assignment.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setDeletingBookId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBook}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                Delete Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
