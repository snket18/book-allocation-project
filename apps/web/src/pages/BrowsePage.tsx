import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Book } from '@smart-library/shared';
import { ApiClient } from '../services/api';
import { BookCard } from '../components/BookCard';
import { BookDetailsModal } from '../components/BookDetailsModal';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';

export const BrowsePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter parameters from URL
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as 'title' | 'id' | 'genre') || 'title';
  const initialGenre = searchParams.get('genre') || 'All';
  const initialSortBy = (searchParams.get('sortBy') as 'borrowCount' | 'title' | 'id') || 'borrowCount';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'title' | 'id' | 'genre'>(initialType);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'borrowCount' | 'title' | 'id'>(initialSortBy);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  // Data states
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<{ genre: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Load available genres
  useEffect(() => {
    ApiClient.getGenres()
      .then((data) => setGenres(data || []))
      .catch(() => {});
  }, []);

  // Fetch books based on current filters and search
  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (searchQuery.trim() && (searchType === 'id' || searchType === 'genre')) {
        // Use specialized C++ search endpoint
        const results = await ApiClient.searchBooks(searchQuery.trim(), searchType);
        let filtered = results;
        if (availableOnly) {
          filtered = filtered.filter((b) => b.availability);
        }
        setBooks(filtered);
        setTotalBooks(filtered.length);
        setTotalPages(1);
      } else {
        // Use standard filtered catalog endpoint
        const data = await ApiClient.getBooks({
          page,
          limit,
          genre: selectedGenre,
          available: availableOnly ? true : undefined,
          search: searchQuery.trim() || undefined,
          sortBy,
          order,
        });
        setBooks(data.books || []);
        setTotalBooks(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve books.');
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType, selectedGenre, availableOnly, sortBy, order, page, limit]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Sync state to URL search parameters
  const updateUrl = (newQuery: string, newGenre: string, newSort: string) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('q', newQuery);
    if (searchType !== 'title') params.set('type', searchType);
    if (newGenre !== 'All') params.set('genre', newGenre);
    if (newSort !== 'borrowCount') params.set('sortBy', newSort);
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateUrl(searchQuery, selectedGenre, sortBy);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setAvailableOnly(false);
    setSortBy('borrowCount');
    setOrder('desc');
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Browse Library Catalog</h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore books, filter by genre or availability, and locate physical shelf positions.
        </p>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 shadow-lg space-y-4">
        {/* Search input with type selector */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1 flex-1">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'title' | 'id' | 'genre')}
              className="bg-transparent text-xs font-semibold text-slate-300 px-3 border-r border-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="title" className="bg-slate-900 text-white">Title / Author</option>
              <option value="id" className="bg-slate-900 text-white">Book ID (Hash Table)</option>
              <option value="genre" className="bg-slate-900 text-white">Genre (BST Search)</option>
            </select>

            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchType === 'id'
                    ? 'Search Book ID (e.g. CS-001)...'
                    : searchType === 'genre'
                    ? 'Search Genre (e.g. Computer Science)...'
                    : 'Search titles or authors...'
                }
                className="w-full bg-transparent pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-white mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {/* Filters and sorting row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800 text-xs">
          {/* Genre & Availability options */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setPage(1);
                  updateUrl(searchQuery, e.target.value, sortBy);
                }}
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Categories ({genres.reduce((acc, g) => acc + g.count, 0)})</option>
                {genres.map((g) => (
                  <option key={g.genre} value={g.genre}>
                    {g.genre} ({g.count})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => {
                  setAvailableOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Available books only</span>
            </label>
          </div>

          {/* Sort & View mode */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as 'borrowCount' | 'title' | 'id';
                  setSortBy(val);
                  setOrder(val === 'title' || val === 'id' ? 'asc' : 'desc');
                  updateUrl(searchQuery, selectedGenre, val);
                }}
                className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="borrowCount">Popularity (Most Borrows)</option>
                <option value="title">Title (Alphabetical A-Z)</option>
                <option value="id">Book ID</option>
              </select>
            </div>

            {/* Grid vs Table view toggle */}
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table List View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active filter summary */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <strong className="text-white">{books.length}</strong> of{' '}
          <strong className="text-white">{totalBooks}</strong> books
          {selectedGenre !== 'All' && <span> in category "{selectedGenre}"</span>}
          {searchQuery && <span> matching "{searchQuery}"</span>}
          {availableOnly && <span> (Available only)</span>}
        </div>

        {(selectedGenre !== 'All' || searchQuery || availableOnly) && (
          <button
            onClick={handleClearFilters}
            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" /> Clear all filters
          </button>
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
            onClick={fetchBooks}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-white transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Books Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : books.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {books.map((book) => (
              <BookCard key={book.bookId} book={book} onSelect={setSelectedBook} />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Book ID</th>
                    <th className="py-3.5 px-4">Title &amp; Author</th>
                    <th className="py-3.5 px-4">Genre</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Circulation</th>
                    <th className="py-3.5 px-4">Shelf Position</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {books.map((book) => (
                    <tr
                      key={book.bookId}
                      onClick={() => setSelectedBook(book)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                        {book.bookId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{book.title}</div>
                        <div className="text-slate-400 text-[11px]">{book.author}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                          {book.genre}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            book.availability
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {book.availability ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> Available
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" /> Checked Out
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">
                        {book.borrowCount} borrows
                      </td>
                      <td className="py-3.5 px-4">
                        {book.shelfPage > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60">
                            <MapPin className="w-3 h-3 text-indigo-400" />
                            P{book.shelfPage} • R{book.shelfRow} • S{book.shelfSlot}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Unshelved</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBook(book);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No books match your criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing genre filters, or toggling off the "Available only" filter.
          </p>
          <div className="pt-2">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Book Details Modal */}
      <BookDetailsModal book={selectedBook} onClose={() => setSelectedBook(null)} />
    </div>
  );
};
