import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '@smart-library/shared';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  MapPin,
  CheckCircle,
  Clock,
  Search,
  Shield,
  Sparkles,
  QrCode,
  Library,
} from 'lucide-react';

interface StudentProfileData {
  profile: {
    studentId: string;
    name: string;
    department: string;
    memberSince: string;
    cardStatus: string;
    maxAllowed: number;
  };
  borrowedBooks: (Book & { borrowDate: string; dueDate: string; status: string })[];
  recommendedBooks: Book[];
  stats: {
    borrowedCount: number;
    availableQuota: number;
    fineAmount: string;
  };
}

export const StudentProfilePage: React.FC = () => {
  const { user, isAuthenticated, studentLogin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // If not authenticated as student, auto-authenticate or fetch demo student profile
        if (!isAuthenticated) {
          await studentLogin({ studentId: 'STU-2026-042', name: 'Alex Rivera' });
        }
        const profileData = await ApiClient.getStudentProfile();
        setData(profileData);
      } catch (err) {
        console.error('Failed to load student profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, studentLogin]);

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await ApiClient.searchBooks(searchQuery.trim(), 'title');
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading Student Profile...</p>
        </div>
      </div>
    );
  }

  const profile = data?.profile || {
    studentId: user?.studentId || 'STU-2026-042',
    name: user?.name || user?.username || 'Alex Rivera',
    department: user?.department || 'Computer Science & Engineering',
    memberSince: 'Fall 2024',
    cardStatus: 'Active',
    maxAllowed: 4,
  };

  const borrowed = data?.borrowedBooks || [];
  const recommended = data?.recommendedBooks || [];
  const stats = data?.stats || {
    borrowedCount: borrowed.length,
    availableQuota: 4 - borrowed.length,
    fineAmount: '$0.00',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Profile Mode Info */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Student Profile Portal
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Member
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Welcome back, {profile.name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {profile.department} • Student ID: <span className="font-mono text-indigo-300">{profile.studentId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Link
            to="/shelves"
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 text-center flex items-center justify-center gap-1.5"
          >
            <Library className="w-4 h-4 text-indigo-400" />
            Shelf Map
          </Link>
          <Link
            to="/login"
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 text-center flex items-center justify-center gap-1.5"
          >
            <Shield className="w-4 h-4" />
            Switch to Staff
          </Link>
        </div>
      </div>

      {/* Main Grid: Left Column (Student Card & Borrowed) + Right Column (Recommendations & Locator) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] font-medium text-slate-400 block">Books Checked Out</span>
              <span className="text-2xl font-black text-white mt-1 block">{stats.borrowedCount}</span>
              <span className="text-[10px] text-slate-500">Max limit: {profile.maxAllowed} books</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] font-medium text-slate-400 block">Available Quota</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">{stats.availableQuota}</span>
              <span className="text-[10px] text-emerald-400">Eligible to borrow</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <span className="text-[11px] font-medium text-slate-400 block">Overdue Fines</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.fineAmount}</span>
              <span className="text-[10px] text-slate-500">No overdue charges</span>
            </div>
          </div>

          {/* Currently Borrowed Books Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  My Borrowed Books
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Check due dates and see the physical shelf coordinates for easy return
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {borrowed.length} Active
              </span>
            </div>

            {borrowed.length === 0 ? (
              <div className="py-10 text-center text-slate-500 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm">You have no books currently checked out.</p>
                <Link to="/" className="text-xs text-indigo-400 hover:underline">
                  Browse library catalog to borrow books &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {borrowed.map((b) => (
                  <div
                    key={b.bookId}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-slate-700"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-400 font-semibold">{b.bookId}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400">{b.genre}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{b.title}</h3>
                      <p className="text-xs text-slate-400">{b.author}</p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                      {/* Physical Shelf Position */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Return Shelf</span>
                        <div className="flex items-center gap-1 text-xs font-mono text-indigo-300 font-bold mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          P{b.shelfPage} • R{b.shelfRow} : S{b.shelfSlot}
                        </div>
                        {b.shelfRow === 1 && (
                          <span className="text-[9px] text-emerald-400 font-semibold">Eye-Level</span>
                        )}
                      </div>

                      {/* Due Date Badge */}
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-right">
                        <span className="text-[10px] flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          Due: {b.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shelf Locator / Search Tool */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Physical Shelf Locator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant book lookup powered by C++ Hash Table & BST — find where any book is placed
              </p>
            </div>

            <form onSubmit={handleQuickSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter book title or ID (e.g. Algorithms, CS-001)..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
              >
                {searching ? 'Locating...' : 'Find Shelf'}
              </button>
            </form>

            {searchResults !== null && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-xs text-slate-400 block font-medium">
                  {searchResults.length} books found:
                </span>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500">No matching books found in library catalog.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {searchResults.slice(0, 4).map((book) => (
                      <div
                        key={book.bookId}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <p className="text-xs font-medium text-white truncate">{book.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{book.bookId} • {book.genre}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-indigo-400">
                            P{book.shelfPage}-R{book.shelfRow}-S{book.shelfSlot}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Digital Student ID Card & Recommended */}
        <div className="space-y-6">
          {/* Digital Student Library Card */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/60 via-slate-900 to-violet-950/60 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
                  College Library ID
                </span>
                <span className="text-sm font-bold text-white">Smart Library Card</span>
              </div>
              <QrCode className="w-8 h-8 text-indigo-400" />
            </div>

            <div className="py-4 space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Cardholder Name</span>
                <span className="text-sm font-semibold text-white">{profile.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Department / Branch</span>
                <span className="text-xs text-slate-300">{profile.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Student Barcode ID</span>
                <span className="font-mono text-sm font-black text-indigo-300 tracking-wider">
                  {profile.studentId}
                </span>
              </div>
            </div>

            {/* Barcode visual preview */}
            <div className="pt-3 border-t border-indigo-500/20 flex flex-col items-center gap-1.5">
              <div className="h-8 w-full bg-slate-950/80 rounded px-3 py-1 flex items-center justify-between overflow-hidden">
                {[...Array(28)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-indigo-400/80 ${i % 3 === 0 ? 'w-1.5' : i % 2 === 0 ? 'w-0.5' : 'w-1'}`}
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono text-slate-400">{profile.studentId}</span>
            </div>
          </div>

          {/* Recommended Popular Books */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Popular Picks for You
              </h2>
              <Link to="/" className="text-[11px] text-indigo-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {recommended.map((b) => (
                <div
                  key={b.bookId}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                      {b.title}
                    </span>
                    <span className="font-mono text-[10px] text-indigo-400">
                      P{b.shelfPage}-R{b.shelfRow}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{b.author}</span>
                    <span className="text-emerald-400 text-[10px] font-medium">Available</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
