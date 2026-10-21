import React from 'react';
import type { Book } from '@smart-library/shared';
import { BookOpen, MapPin, CheckCircle, Clock, Eye } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onSelect?: (book: Book) => void;
}

// Genre color themes for attractive visual covers
const getGenreTheme = (genre: string) => {
  const g = genre.toLowerCase();
  if (g.includes('computer') || g.includes('cs') || g.includes('tech')) {
    return {
      gradient: 'from-blue-600 via-indigo-700 to-slate-900',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      accent: 'text-blue-400',
    };
  }
  if (g.includes('math')) {
    return {
      gradient: 'from-emerald-600 via-teal-700 to-slate-900',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      accent: 'text-emerald-400',
    };
  }
  if (g.includes('phys')) {
    return {
      gradient: 'from-purple-600 via-violet-700 to-slate-900',
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      accent: 'text-purple-400',
    };
  }
  if (g.includes('fict') || g.includes('lit')) {
    return {
      gradient: 'from-amber-600 via-rose-700 to-slate-900',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      accent: 'text-amber-400',
    };
  }
  if (g.includes('hist')) {
    return {
      gradient: 'from-orange-600 via-amber-800 to-slate-900',
      badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      accent: 'text-orange-400',
    };
  }
  return {
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    accent: 'text-slate-400',
  };
};

export const BookCard: React.FC<BookCardProps> = ({ book, onSelect }) => {
  const theme = getGenreTheme(book.genre);

  return (
    <div
      onClick={() => onSelect && onSelect(book)}
      className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer"
    >
      {/* Decorative Book Cover Header */}
      <div className={`h-40 w-full bg-gradient-to-br ${theme.gradient} p-4 flex flex-col justify-between relative overflow-hidden`}>
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="flex items-center justify-between z-10">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-sm ${theme.badge}`}>
            {book.genre}
          </span>

          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-sm ${
              book.availability
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
            }`}
          >
            {book.availability ? (
              <>
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Available
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-amber-400" />
                Checked Out
              </>
            )}
          </span>
        </div>

        <div className="z-10 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded border border-white/10">
            {book.bookId}
          </span>
          <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/90 group-hover:scale-110 transition-transform">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Book Information */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-slate-100 text-sm leading-snug line-clamp-2 group-hover:text-indigo-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{book.author}</p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {/* Physical Shelf Coordinates */}
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {book.shelfPage > 0 ? (
              <span className="text-[11px] text-indigo-300 font-mono bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/60">
                P{book.shelfPage} • R{book.shelfRow} • S{book.shelfSlot}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 italic">Unshelved</span>
            )}
          </div>

          {/* Borrow count badge */}
          <div className="text-[11px] text-slate-400" title={`Circulation Count: ${book.borrowCount} borrows`}>
            <span className="text-slate-200 font-semibold">{book.borrowCount}</span> borrows
          </div>
        </div>
      </div>

      {/* Quick view hover pill */}
      <div className="absolute inset-x-0 bottom-0 py-1.5 bg-indigo-600/90 text-white text-xs font-medium text-center flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Eye className="w-3.5 h-3.5" /> View Details &amp; Shelf Location
      </div>
    </div>
  );
};
