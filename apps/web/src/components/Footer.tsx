import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MapPin, Clock, Mail, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              Alexandria Library
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Empowering students and faculty with optimized physical access to academic and literary collections.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-indigo-400 transition">
                  Library Home
                </Link>
              </li>
              <li>
                <Link to="/browse" className="hover:text-indigo-400 transition">
                  Browse All Books
                </Link>
              </li>
              <li>
                <Link to="/shelves" className="hover:text-indigo-400 transition">
                  Physical Shelf Map
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-indigo-400 transition">
                  Librarian Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Library Hours */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Hours of Operation
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Monday – Thursday:</span>
                <span className="text-slate-300">8:00 AM – 10:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Friday:</span>
                <span className="text-slate-300">8:00 AM – 8:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday – Sunday:</span>
                <span className="text-slate-300">10:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              Location &amp; Help
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Central Campus Library Building, Level 2</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>(555) 234-5678</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>helpdesk@alexandrialibrary.edu</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Alexandria University Library. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Physical Shelf Optimization System</p>
        </div>
      </div>
    </footer>
  );
};
