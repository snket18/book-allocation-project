import React, { useState, useEffect } from 'react';
import type { Book, ShelfPage } from '@smart-library/shared';
import { ApiClient } from '../services/api';
import { ShelfGrid } from '../components/ShelfGrid';
import { BookDetailsModal } from '../components/BookDetailsModal';
import { Layers, Search, RefreshCw, AlertCircle, Info, Sparkles } from 'lucide-react';

export const ShelvesPage: React.FC = () => {
  const [shelfPages, setShelfPages] = useState<ShelfPage[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalPages: number;
    totalCapacity: number;
    occupiedSlots: number;
    occupancyRate: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Search/Highlight feature
  const [highlightInput, setHighlightInput] = useState('');
  const [highlightedBookId, setHighlightedBookId] = useState<string | undefined>(undefined);
  const [highlightMessage, setHighlightMessage] = useState<string | null>(null);

  const fetchShelves = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [shelvesData, analyticsData] = await Promise.all([
        ApiClient.getActiveShelves(),
        ApiClient.getAnalytics(),
      ]);
      setShelfPages(shelvesData.pages || []);
      setAnalytics(analyticsData.shelfCapacity || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve active shelf arrangement.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShelves();
  }, []);

  const handleHighlightSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = highlightInput.trim().toLowerCase();
    if (!query) {
      setHighlightedBookId(undefined);
      setHighlightMessage(null);
      return;
    }

    // Search through all pages and slots
    let foundSlot: { bookId: string; page: number; row: number; slot: number; title: string } | null = null;
    for (const page of shelfPages) {
      for (const slot of page.slots) {
        if (
          slot.isOccupied &&
          slot.bookId &&
          (slot.bookId.toLowerCase().includes(query) || (slot.title && slot.title.toLowerCase().includes(query)))
        ) {
          foundSlot = {
            bookId: slot.bookId,
            page: page.page,
            row: slot.row,
            slot: slot.slot,
            title: slot.title || '',
          };
          break;
        }
      }
      if (foundSlot) break;
    }

    if (foundSlot) {
      setHighlightedBookId(foundSlot.bookId);
      setHighlightMessage(
        `Located "${foundSlot.title}" (${foundSlot.bookId}) on Shelf Unit ${foundSlot.page}, Row ${foundSlot.row}, Slot ${foundSlot.slot}.`
      );
    } else {
      setHighlightedBookId(undefined);
      setHighlightMessage(`No book found matching "${highlightInput}" on the active shelves.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-8 h-8 text-cyan-400" />
              Physical Bookshelf Layout
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Live Arrangement
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Visual map of physical library shelving units organized in 4 rows × 5 slots (20 books per unit).
          </p>
        </div>

        <button
          onClick={fetchShelves}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Layout
        </button>
      </div>

      {/* Shelf Capacity Metrics Banner */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Shelf Units</span>
            <span className="text-2xl font-extrabold text-white font-mono mt-0.5 block">
              {analytics.totalPages} Pages
            </span>
            <span className="text-[11px] text-slate-500">20 physical slots per unit</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Slot Capacity</span>
            <span className="text-2xl font-extrabold text-indigo-400 font-mono mt-0.5 block">
              {analytics.totalCapacity} Slots
            </span>
            <span className="text-[11px] text-slate-500">Physical book capacity</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Occupied Positions</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5 block">
              {analytics.occupiedSlots} Books
            </span>
            <span className="text-[11px] text-slate-500">Currently shelved titles</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Occupancy Rate</span>
            <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5 block">
              {analytics.occupancyRate}%
            </span>
            <span className="text-[11px] text-slate-500">Physical shelf utilization</span>
          </div>
        </div>
      )}

      {/* Slot Highlighter / Quick Locate Tool */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <form onSubmit={handleHighlightSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
              placeholder="Locate a book on the shelf (enter Book ID e.g. CS-001 or title)..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shrink-0"
          >
            Locate Slot
          </button>
        </form>

        {highlightMessage && (
          <div className="mt-3 text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-3 py-2 rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{highlightMessage}</span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchShelves}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-white transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Physical Shelf Grid Component */}
      {isLoading ? (
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      ) : (
        <ShelfGrid
          pages={shelfPages}
          onSelectBook={setSelectedBook}
          title="Active Library Shelves"
          subtitle="Click on any occupied slot to view the book's details, circulation records, and wayfinding directions."
          badge="Live Physical Arrangement"
          highlightBookId={highlightedBookId}
        />
      )}

      {/* Ergonomic Notice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">How Shelf Optimization Works:</strong> Books with high borrow circulation counts are dynamically prioritized onto <strong className="text-amber-300">Row 1 (Eye-Level Tier)</strong> to minimize physical strain, reach-over, and crouching for visitors during peak hours.
        </div>
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </div>
  );
};
