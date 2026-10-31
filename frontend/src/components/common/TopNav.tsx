import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Shield, MapPin, AlertTriangle, PlusCircle, Search, HelpCircle, Globe } from 'lucide-react';
import { checkBackendHealth } from '../../services/api';

export const TopNav: React.FC = () => {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    checkBackendHealth().then((res) => setIsLive(res.is_live));
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-semibold rounded-btn transition-colors ${
      isActive
        ? 'text-brand bg-brand-tint'
        : 'text-ink-muted hover:text-ink hover:bg-gray-100'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            aria-label="ScamSentry AI Home"
          >
            <div className="w-9 h-9 rounded-btn bg-brand text-white flex items-center justify-center shadow-sm group-hover:bg-brand-hover transition-colors">
              <Shield className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-ink">
                  ScamSentry
                </span>
                <span className="bg-brand-tint text-brand text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-ink-muted block -mt-1 leading-none">
                Community Fraud Defense
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/check" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <Search className="w-4 h-4" />
                Check
              </span>
            </NavLink>
            <NavLink to="/map" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Scam Map
              </span>
            </NavLink>
            <NavLink to="/report" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Report
              </span>
            </NavLink>
            <NavLink to="/alerts" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Alerts
              </span>
            </NavLink>
            <NavLink to="/how-it-works" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                How It Works
              </span>
            </NavLink>
          </nav>
        </div>

        {/* Right Action Area */}
        <div className="flex items-center gap-3">
          {/* Live vs Demo Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={
              isLive
                ? 'Connected to real FastAPI backend at localhost:8000'
                : 'Backend offline: Using built-in realistic mock intelligence engine'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px]">
              {isLive ? 'Live API' : 'Demo Mode'}
            </span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 text-ink-muted hover:text-ink hover:bg-gray-100 rounded-btn transition-colors border border-line"
            aria-label="Switch language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* Primary CTA */}
          <Link
            to="/report"
            className="hidden sm:inline-flex items-center justify-center bg-brand text-white font-semibold text-xs px-3.5 py-2 rounded-btn hover:bg-brand-hover shadow-sm transition-colors"
          >
            Report a Scam
          </Link>
        </div>
      </div>
    </header>
  );
};
