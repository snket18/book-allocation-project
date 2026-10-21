import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '@smart-library/shared';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ScanBarcode,
  BookOpen,
  MapPin,
  CheckCircle,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  Edit2,
  AlertCircle,
  Loader2,
  Info,
  ShieldCheck,
  Zap,
  X,
} from 'lucide-react';

// ─── Genre colour helpers (same logic as BookCard) ─────────────────────────────
const getGenreTheme = (genre: string) => {
  const g = genre.toLowerCase();
  if (g.includes('computer') || g.includes('cs') || g.includes('tech'))
    return { gradient: 'from-blue-600 via-indigo-700 to-slate-900', accent: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
  if (g.includes('math'))
    return { gradient: 'from-emerald-600 via-teal-700 to-slate-900', accent: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
  if (g.includes('phys'))
    return { gradient: 'from-purple-600 via-violet-700 to-slate-900', accent: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
  if (g.includes('fict') || g.includes('lit'))
    return { gradient: 'from-amber-600 via-rose-700 to-slate-900', accent: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
  if (g.includes('hist'))
    return { gradient: 'from-orange-600 via-amber-800 to-slate-900', accent: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30' };
  return { gradient: 'from-slate-700 via-slate-800 to-slate-900', accent: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30' };
};

// ─── State machine ─────────────────────────────────────────────────────────────
type ScanState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'found'; book: Book }
  | { type: 'not_found'; scannedId: string }
  | { type: 'error'; message: string };

// ─── Edit modal ────────────────────────────────────────────────────────────────
interface EditModalProps {
  book: Book;
  onClose: () => void;
  onSaved: (updated: Book) => void;
}

const EditModal: React.FC<EditModalProps> = ({ book, onClose, onSaved }) => {
  const { success: toastOk, error: toastErr } = useToast();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [genre, setGenre] = useState(book.genre);
  const [borrowCount, setBorrowCount] = useState(book.borrowCount);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await ApiClient.updateBook(book.bookId, {
        title: title.trim(),
        author: author.trim(),
        genre: genre.trim(),
        borrowCount,
      });
      toastOk('Book Updated', `'${updated.title}' saved successfully.`);
      onSaved(updated);
    } catch (err: unknown) {
      toastErr('Update Failed', err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-indigo-400" />
            Edit Book — <span className="font-mono text-indigo-300">{book.bookId}</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {[
            { label: 'Title', value: title, setter: setTitle, id: 'edit-title' },
            { label: 'Author', value: author, setter: setAuthor, id: 'edit-author' },
            { label: 'Genre', value: genre, setter: setGenre, id: 'edit-genre' },
          ].map(({ label, value, setter, id }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>
          ))}

          <div>
            <label htmlFor="edit-borrow-count" className="block text-xs font-semibold text-slate-400 mb-1">Borrow Count</label>
            <input
              id="edit-borrow-count"
              type="number"
              min={0}
              value={borrowCount}
              onChange={(e) => setBorrowCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export const BarcodeScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { success: toastOk, error: toastErr, info: toastInfo } = useToast();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login');
  }, [authLoading, isAuthenticated, navigate]);

  const [inputValue, setInputValue] = useState('');
  const [scanState, setScanState] = useState<ScanState>({ type: 'idle' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the barcode input whenever the edit modal is not open
  useEffect(() => {
    if (!isEditModalOpen && isAuthenticated) {
      const tid = setTimeout(() => scanInputRef.current?.focus(), 80);
      return () => clearTimeout(tid);
    }
  }, [isEditModalOpen, isAuthenticated]);

  // Core scan handler — called on Enter or button click
  const handleScan = useCallback(async (rawId: string) => {
    const bookId = rawId.trim().toUpperCase();
    if (!bookId) {
      scanInputRef.current?.focus();
      return;
    }
    // Duplicate scan guard
    if (scanState.type === 'found' && scanState.book.bookId.toUpperCase() === bookId) {
      toastInfo('Already Loaded', `Book ${bookId} is already displayed below.`);
      setInputValue('');
      return;
    }
    setScanState({ type: 'loading' });
    setInputValue('');
    try {
      const book = await ApiClient.getBookById(bookId);
      setScanState({ type: 'found', book });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lookup failed';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('404')) {
        setScanState({ type: 'not_found', scannedId: bookId });
      } else {
        setScanState({ type: 'error', message: msg });
      }
    }
  }, [scanState, toastInfo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleScan(inputValue); }
  };

  const handleReset = () => {
    setScanState({ type: 'idle' });
    setInputValue('');
    setTimeout(() => scanInputRef.current?.focus(), 60);
  };

  const handleBorrow = async () => {
    if (scanState.type !== 'found') return;
    const { book } = scanState;
    setIsActionLoading(true);
    try {
      const res = await ApiClient.simulateBorrow(book.bookId);
      setScanState({ type: 'found', book: res.book });
      toastOk('Checked Out', `'${res.book.title}' borrowed. Circulation: ${res.book.borrowCount}.`);
      if (res.proposalGenerated) toastInfo('Proposal Ready', 'C++ engine computed a new shelf layout.');
    } catch (err: unknown) {
      toastErr('Borrow Failed', err instanceof Error ? err.message : 'Could not borrow book.');
    } finally { setIsActionLoading(false); }
  };

  const handleReturn = async () => {
    if (scanState.type !== 'found') return;
    const { book } = scanState;
    setIsActionLoading(true);
    try {
      const res = await ApiClient.simulateReturn(book.bookId);
      setScanState({ type: 'found', book: res.book });
      toastOk('Returned', `'${res.book.title}' is back on the shelf.`);
    } catch (err: unknown) {
      toastErr('Return Failed', err instanceof Error ? err.message : 'Could not return book.');
    } finally { setIsActionLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const foundBook = scanState.type === 'found' ? scanState.book : null;
  const theme = foundBook ? getGenreTheme(foundBook.genre) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ScanBarcode className="w-7 h-7 text-indigo-400" />
            Barcode Scanner
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 uppercase tracking-wider">
            Staff Only
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
          Scan or type a Book ID and press Enter. USB barcode scanners are supported natively.
        </p>
      </div>

      {/* Usage tip */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p>
            <strong className="text-white">USB HID Scanner:</strong> Point the scanner at the book barcode — it will type the ID and send Enter automatically. No driver or plugin required.
          </p>
          <p>
            <strong className="text-white">Manual entry:</strong> Type the Book ID (e.g.{' '}
            <code className="bg-slate-800 px-1 rounded font-mono">CS-001</code>) and press{' '}
            <kbd className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>.
          </p>
        </div>
      </div>

      {/* Scanner input */}
      <div className="space-y-2">
        <label htmlFor="barcode-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Book ID / Barcode
        </label>
        <div
          className={`relative flex items-center rounded-2xl border bg-slate-900 transition-all ${
            scanState.type === 'loading'
              ? 'border-indigo-500/60 ring-2 ring-indigo-500/20'
              : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20'
          }`}
        >
          <div className="pl-5 pr-3 flex items-center">
            {scanState.type === 'loading'
              ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              : <ScanBarcode className="w-5 h-5 text-slate-500" />
            }
          </div>
          <input
            id="barcode-input"
            ref={scanInputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={inputValue}
            disabled={scanState.type === 'loading'}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g. CS-001, FIC-002, PHYS-003…"
            aria-label="Barcode or Book ID input"
            aria-describedby="barcode-hint"
            className="flex-1 bg-transparent py-4 pr-4 text-lg font-mono font-semibold text-white placeholder-slate-600 focus:outline-none disabled:cursor-wait"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleReset}
              tabIndex={-1}
              aria-label="Clear input"
              className="mr-3 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            id="barcode-submit-btn"
            type="button"
            onClick={() => handleScan(inputValue)}
            disabled={scanState.type === 'loading' || !inputValue.trim()}
            className="mr-2 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            Look Up
          </button>
        </div>
        <p id="barcode-hint" className="text-[11px] text-slate-500 pl-1">
          The input auto-focuses when no modal is open, so the USB scanner output is captured immediately.
        </p>
      </div>

      {/* Not-found state */}
      {scanState.type === 'not_found' && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">Book Not Found</p>
            <p className="text-xs text-slate-300">
              No book with ID{' '}
              <code className="bg-slate-800 text-rose-300 font-mono px-1.5 py-0.5 rounded">{scanState.scannedId}</code>{' '}
              exists in the catalog.
            </p>
            <p className="text-[11px] text-slate-400">
              Check that the barcode was scanned correctly, or add the book via Admin → Catalog.
            </p>
          </div>
          <button onClick={handleReset} className="ml-auto text-rose-300 hover:text-white transition shrink-0">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API / network error */}
      {scanState.type === 'error' && (
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Lookup Error</p>
            <p className="text-xs text-slate-300 mt-0.5">{scanState.message}</p>
          </div>
          <button onClick={handleReset} className="ml-auto text-amber-300 hover:text-white transition shrink-0">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Book found card */}
      {foundBook && theme && (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Genre-coloured header */}
          <div className={`h-36 bg-gradient-to-br ${theme.gradient} relative overflow-hidden flex flex-col justify-between p-5`}>
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="flex items-start justify-between z-10">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-sm ${theme.badge}`}>
                {foundBook.genre}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-sm ${
                foundBook.availability
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
              }`}>
                {foundBook.availability
                  ? <><CheckCircle className="w-3 h-3 text-emerald-400" /> Available on Shelf</>
                  : <><Clock className="w-3 h-3 text-amber-400" /> Currently Checked Out</>
                }
              </span>
            </div>
            <div className="z-10 flex items-end justify-between">
              <span className="font-mono text-xs font-bold text-white/80 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                {foundBook.bookId}
              </span>
              <BookOpen className="w-8 h-8 text-white/20" />
            </div>
          </div>

          {/* Detail body */}
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">{foundBook.title}</h2>
              <p className="text-sm text-slate-400 mt-1">{foundBook.author}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Circulation</p>
                <p className="text-xl font-extrabold font-mono text-indigo-400">{foundBook.borrowCount}</p>
                <p className="text-[10px] text-slate-500">borrows</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Popularity</p>
                <p className="text-xl font-extrabold font-mono text-violet-400">{foundBook.popularityScore}</p>
                <p className="text-[10px] text-slate-500">score / 100</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 col-span-2 sm:col-span-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-400" />
                  Shelf Location
                </p>
                {foundBook.shelfPage > 0
                  ? <p className="text-base font-extrabold font-mono text-indigo-300">Page {foundBook.shelfPage} · Row {foundBook.shelfRow} · Slot {foundBook.shelfSlot}</p>
                  : <p className="text-sm text-slate-500 italic">Not yet assigned</p>
                }
              </div>
            </div>

            {/* Actions */}
            <div className="pt-1 flex flex-wrap gap-2.5">
              {foundBook.availability && (
                <button
                  id="barcode-borrow-btn"
                  onClick={handleBorrow}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                  Borrow Book
                </button>
              )}
              {!foundBook.availability && (
                <button
                  id="barcode-return-btn"
                  onClick={handleReturn}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Return Book
                </button>
              )}
              <button
                id="barcode-edit-btn"
                onClick={() => setIsEditModalOpen(true)}
                disabled={isActionLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition disabled:opacity-50"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Details
              </button>
              <button
                id="barcode-clear-btn"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Scan Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {isEditModalOpen && foundBook && (
        <EditModal
          book={foundBook}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(updated) => {
            setScanState({ type: 'found', book: updated });
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
