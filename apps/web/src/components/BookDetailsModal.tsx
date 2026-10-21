import React from 'react';
import type { Book } from '@smart-library/shared';
import { X, BookOpen, MapPin, CheckCircle, Clock, Award, Compass } from 'lucide-react';

interface BookDetailsModalProps {
  book: Book | null;
  onClose: () => void;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({ book, onClose }) => {
  if (!book) return null;

  const isEyeLevel = book.shelfRow === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient banner */}
        <div className="relative h-28 bg-gradient-to-r from-indigo-700 via-violet-800 to-slate-900 p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-indigo-200 bg-black/40 px-2.5 py-0.5 rounded border border-white/10 inline-block">
                {book.bookId}
              </span>
              <span className="text-xs text-white/80 block mt-0.5 font-medium">
                {book.genre}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
              {book.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">by <span className="text-slate-200 font-medium">{book.author}</span></p>
          </div>

          {/* Status & Popularity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Status</span>
              <div className="mt-1 flex items-center gap-1.5 font-semibold text-xs">
                {book.availability ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Available</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-amber-300">Checked Out</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Circulation</span>
              <div className="mt-1 flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{book.borrowCount} total borrows</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Demand Score</span>
              <div className="mt-1 flex items-center gap-1.5 font-semibold text-xs text-indigo-300">
                <span className="font-mono text-sm">{book.popularityScore}</span> / 100
              </div>
            </div>
          </div>

          {/* Physical Shelf Location Card */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <Compass className="w-4 h-4" /> Physical Shelf Wayfinding
              </div>
              {isEyeLevel && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ★ Prime Eye-Level Slot
                </span>
              )}
            </div>

            {book.shelfPage > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Shelf Unit</span>
                    <span className="text-base font-bold text-white font-mono">Page {book.shelfPage}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Shelf Tier</span>
                    <span className="text-base font-bold text-indigo-300 font-mono">Row {book.shelfRow}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Slot Position</span>
                    <span className="text-base font-bold text-cyan-300 font-mono">Slot {book.shelfSlot}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Located in the <strong className="text-slate-200">{book.genre}</strong> section. Walk to Shelf Unit {book.shelfPage}, Tier {book.shelfRow}, count {book.shelfSlot} books from the left.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                This book has not yet been assigned a physical shelf location.
              </p>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
