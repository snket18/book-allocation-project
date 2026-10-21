import React, { useState } from 'react';
import type { Book, ShelfPage, ShelfSlot } from '@smart-library/shared';
import { ChevronLeft, ChevronRight, BookOpen, Sparkles, MapPin } from 'lucide-react';

interface ShelfGridProps {
  pages: ShelfPage[];
  onSelectBook?: (book: Book) => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  highlightBookId?: string;
}

export const ShelfGrid: React.FC<ShelfGridProps> = ({
  pages,
  onSelectBook,
  title = 'Physical Shelf Layout',
  subtitle = 'Real-time 4×5 slot visualization across physical library shelving units',
  badge = 'Active Shelf',
  highlightBookId,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  if (!pages || pages.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400 text-sm">No physical shelf pages available.</p>
      </div>
    );
  }

  const totalPages = pages.length;
  const currentPage = pages[Math.min(currentPageIndex, totalPages - 1)];

  // Group 20 slots by row (1..4)
  const slotsByRow: Record<number, ShelfSlot[]> = { 1: [], 2: [], 3: [], 4: [] };
  if (currentPage && currentPage.slots) {
    for (const slot of currentPage.slots) {
      if (slotsByRow[slot.row]) {
        slotsByRow[slot.row].push(slot);
      }
    }
  }

  // Ensure each row has 5 slots sorted by slot number (1..5)
  for (let r = 1; r <= 4; r++) {
    slotsByRow[r].sort((a, b) => a.slot - b.slot);
  }

  const handleSlotClick = (slot: ShelfSlot) => {
    if (slot.isOccupied && slot.bookId && onSelectBook) {
      const bookObj: Book = {
        bookId: slot.bookId,
        title: slot.title || 'Unknown Title',
        author: slot.author || 'Unknown Author',
        genre: slot.genre || 'General',
        borrowCount: slot.borrowCount || 0,
        popularityScore: slot.popularityScore || 0,
        availability: true,
        shelfPage: currentPage.page,
        shelfRow: slot.row,
        shelfSlot: slot.slot,
      };
      onSelectBook(bookObj);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header & Page Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {badge}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentPageIndex === 0}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Previous Shelf Unit"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium text-slate-200 px-2">
            Unit <strong className="text-indigo-400">{currentPage.page}</strong> of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPageIndex >= totalPages - 1}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Next Shelf Unit"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Physical Shelf Frame (4 Rows) */}
      <div className="mt-5 space-y-4">
        {[1, 2, 3, 4].map((rowNum) => {
          const isEyeLevel = rowNum === 1;
          const rowSlots = slotsByRow[rowNum] || [];

          return (
            <div
              key={rowNum}
              className={`rounded-xl p-3 border transition-colors ${
                isEyeLevel
                  ? 'bg-gradient-to-r from-amber-500/5 via-indigo-500/5 to-slate-900/60 border-amber-500/30'
                  : 'bg-slate-950/40 border-slate-800/80'
              }`}
            >
              {/* Row Label Header */}
              <div className="flex items-center justify-between text-xs mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-300">
                    Row {rowNum}
                  </span>
                  {isEyeLevel ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Eye-Level Tier (Priority Circulation)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                      {rowNum === 4 ? 'Bottom Tier' : 'Standard Tier'}
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-500">
                  {rowSlots.filter((s) => s.isOccupied).length} / 5 slots occupied
                </span>
              </div>

              {/* 5 Slots along the shelf */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {rowSlots.map((slot) => {
                  const isHighlighted = highlightBookId && slot.bookId === highlightBookId;

                  if (slot.isOccupied) {
                    return (
                      <div
                        key={slot.slot}
                        onClick={() => handleSlotClick(slot)}
                        className={`group relative rounded-lg border p-2.5 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between min-h-[92px] ${
                          isHighlighted
                            ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'bg-slate-900 border-slate-700/80 hover:border-indigo-500 hover:bg-slate-850 hover:shadow-md'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-mono text-indigo-300 font-bold bg-indigo-950/80 px-1 rounded border border-indigo-900/60">
                              S{slot.slot} • {slot.bookId}
                            </span>
                            <span className="text-slate-400 text-[10px]">{slot.borrowCount}b</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-100 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
                            {slot.title}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[85px]">{slot.genre}</span>
                          <span className="font-mono text-emerald-400">{slot.popularityScore}★</span>
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot Marker
                  return (
                    <div
                      key={slot.slot}
                      className="rounded-lg border border-dashed border-slate-800/80 bg-slate-950/20 p-2.5 flex flex-col items-center justify-center text-center min-h-[92px] text-slate-600"
                    >
                      <span className="text-[10px] font-mono mb-1">Slot {slot.slot}</span>
                      <BookOpen className="w-4 h-4 opacity-30 mb-0.5" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Empty Slot</span>
                    </div>
                  );
                })}
              </div>

              {/* Physical shelf plank wooden accent line */}
              <div className="mt-2.5 h-1 w-full bg-slate-800/60 rounded-full" />
            </div>
          );
        })}
      </div>

      {/* Shelf Wayfinding Legend */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-700" />
            <span>Occupied Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-dashed border-slate-700 bg-slate-950/40" />
            <span>Empty Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
            <span>Eye-Level Prime Tier (Row 1)</span>
          </div>
        </div>

        <span className="text-slate-500 text-[11px] flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> 20 physical positions per shelf unit
        </span>
      </div>
    </div>
  );
};
