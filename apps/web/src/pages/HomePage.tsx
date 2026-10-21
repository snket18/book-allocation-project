import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book, ShelfPage } from '@smart-library/shared';
import { ApiClient } from '../services/api';
import { BookCard } from '../components/BookCard';
import { ShelfGrid } from '../components/ShelfGrid';
import { BookDetailsModal } from '../components/BookDetailsModal';
import { Search, Layers, ArrowRight, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'id' | 'genre'>('title');

  // Data states
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [shelfPages, setShelfPages] = useState<ShelfPage[]>([]);
  const [genres, setGenres] = useState<{ genre: string; count: number }[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalBooks: number;
    availableCount: number;
    totalBorrows: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsData, shelvesData, genresData] = await Promise.all([
        ApiClient.getAnalytics(),
        ApiClient.getActiveShelves(),
        ApiClient.getGenres(),
      ]);

      setAnalytics(analyticsData);
      setPopularBooks(analyticsData.mostBorrowed || []);
      setShelfPages(shelvesData.pages || []);
      setGenres(genresData || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect to library service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}&type=${searchType}`);
  };

  const handleGenreClick = (genre: string) => {
    navigate(`/browse?genre=${encodeURIComponent(genre)}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Welcome Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Automated Physical Shelf Wayfinding
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Find Your Next Book on the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-cyan-300">
                Right Shelf
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Welcome to the Alexandria University Library catalog. Search titles, authors, or barcodes, and view exact physical shelf tiers instantly.
            </p>

            {/* Main Functional Search Bar */}
            <form onSubmit={handleSearchSubmit} className="pt-4 max-w-2xl mx-auto">
              <div className="relative flex flex-col sm:flex-row items-stretch rounded-2xl bg-slate-900 border border-slate-700/80 p-1.5 shadow-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                {/* Search Type Selector */}
                <div className="flex items-center pl-3 pr-2 py-1.5 sm:py-0 border-b sm:border-b-0 sm:border-r border-slate-800">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as 'title' | 'id' | 'genre')}
                    className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="title" className="bg-slate-900 text-white">Title / Author</option>
                    <option value="id" className="bg-slate-900 text-white">Book ID / Barcode</option>
                    <option value="genre" className="bg-slate-900 text-white">Genre</option>
                  </select>
                </div>

                {/* Text input */}
                <div className="relative flex-1 flex items-center">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchType === 'id'
                        ? 'e.g. CS-001, FIC-002...'
                        : searchType === 'genre'
                        ? 'e.g. Computer Science, Fiction...'
                        : 'Search by book title or author name...'
                    }
                    className="w-full bg-transparent pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 shrink-0 mt-2 sm:mt-0"
                >
                  <span>Search Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Genre Chips */}
            {genres.length > 0 && (
              <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-400 mr-1">Popular categories:</span>
                {genres.slice(0, 5).map((g) => (
                  <button
                    key={g.genre}
                    onClick={() => handleGenreClick(g.genre)}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
                  >
                    {g.genre} ({g.count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Metrics Banner */}
          {analytics && (
            <div className="mt-12 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Catalog</span>
                <span className="text-2xl font-extrabold text-white mt-1 block font-mono">
                  {analytics.totalBooks}
                </span>
                <span className="text-[11px] text-slate-500">Academic &amp; Literary Titles</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Available Now</span>
                <span className="text-2xl font-extrabold text-emerald-400 mt-1 block font-mono">
                  {analytics.availableCount}
                </span>
                <span className="text-[11px] text-slate-500">Ready for Checkout</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Circulations</span>
                <span className="text-2xl font-extrabold text-indigo-400 mt-1 block font-mono">
                  {analytics.totalBorrows}
                </span>
                <span className="text-[11px] text-slate-500">Student &amp; Faculty Loans</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Physical Shelves</span>
                <span className="text-2xl font-extrabold text-cyan-400 mt-1 block font-mono">
                  {shelfPages.length} Units
                </span>
                <span className="text-[11px] text-slate-500">4×5 Optimized Grid</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Error state alert if API fails */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-white transition"
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Popular & Trending Books Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              Most Circulated Books
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Popular titles placed in priority eye-level shelf slots for rapid retrieval
            </p>
          </div>

          <button
            onClick={() => navigate('/browse?sortBy=borrowCount')}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            <span>View All Books</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : popularBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {popularBooks.slice(0, 5).map((book) => (
              <BookCard key={book.bookId} book={book} onSelect={setSelectedBook} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400 text-sm">
            No popular books found in catalog.
          </div>
        )}
      </section>

      {/* Interactive Active Shelf Visualization Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              Live Physical Bookshelf Arrangement
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Explore the exact physical placement of books across shelf tiers. Click any book to view wayfinding coordinates.
            </p>
          </div>

          <button
            onClick={() => navigate('/shelves')}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>Full Screen Shelf Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        ) : (
          <ShelfGrid
            pages={shelfPages}
            onSelectBook={setSelectedBook}
            title="Active Shelf Arrangement"
            subtitle="Current approved layout. High-circulation titles automatically occupy Row 1 (Eye-Level Prime Tier)."
            badge="Live Physical Layout"
          />
        )}
      </section>

      {/* Book Details Modal */}
      <BookDetailsModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </div>
  );
};
