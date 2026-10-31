import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, MapPin, PlusCircle, AlertTriangle, Menu, X, Shield, HelpCircle } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
      isActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
    }`;

  return (
    <>
      {/* Mobile Drawer Menu Modal */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-4/5 max-w-sm bg-white h-full p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-btn bg-brand text-white flex items-center justify-center">
                    <Shield className="w-4 h-4 fill-white/20" />
                  </div>
                  <span className="font-bold text-ink">ScamSentry AI</span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 text-ink-muted hover:text-ink rounded-btn hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-ink hover:bg-surface rounded-btn"
                >
                  <Home className="w-4 h-4 text-brand" />
                  Home
                </Link>
                <Link
                  to="/check"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-ink hover:bg-surface rounded-btn"
                >
                  <Shield className="w-4 h-4 text-brand" />
                  Check a Number / UPI / Link
                </Link>
                <Link
                  to="/report"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-ink hover:bg-surface rounded-btn"
                >
                  <PlusCircle className="w-4 h-4 text-brand" />
                  Report a Scam Incident
                </Link>
                <Link
                  to="/map"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-ink hover:bg-surface rounded-btn"
                >
                  <MapPin className="w-4 h-4 text-brand" />
                  Community Scam Map
                </Link>
                <Link
                  to="/alerts"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-ink hover:bg-surface rounded-btn"
                >
                  <AlertTriangle className="w-4 h-4 text-brand" />
                  Recent Spike Alerts
                </Link>
                <Link
                  to="/how-it-works"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-ink hover:bg-surface rounded-btn"
                >
                  <HelpCircle className="w-4 h-4 text-brand" />
                  How Verdicts Work & Privacy
                </Link>
              </nav>
            </div>

            {/* Helpline quick-card inside menu */}
            <div className="bg-amber-50 border border-amber-200 rounded-card p-3.5 space-y-2">
              <span className="text-xs font-bold text-amber-900 block">
                Already lost money to a scam?
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Call the National Cyber Crime Helpline immediately.
              </p>
              <a
                href="tel:1930"
                className="inline-flex items-center justify-center w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-btn shadow-sm transition-colors"
              >
                Call 1930 Helpline
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line md:hidden h-14 flex items-center px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      >
        <NavLink to="/" className={navLinkClass}>
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/map" className={navLinkClass}>
          <MapPin className="w-5 h-5 mb-0.5" />
          <span>Map</span>
        </NavLink>
        <NavLink to="/report" className={navLinkClass}>
          <div className="relative -top-3 w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center shadow-md">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="relative -top-2">Report</span>
        </NavLink>
        <NavLink to="/alerts" className={navLinkClass}>
          <AlertTriangle className="w-5 h-5 mb-0.5" />
          <span>Alerts</span>
        </NavLink>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-ink-muted hover:text-ink transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
};
