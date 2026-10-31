import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  MapPin,
  PlusCircle,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';
import { LookupForm } from '../components/lookup/LookupForm';
import { ResultCard } from '../components/lookup/ResultCard';
import { getPlatformStats, lookupIdentifier } from '../services/api';
import { PlatformStats, LookupResult, IdentifierType } from '../types';

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [searchResult, setSearchResult] = useState<LookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    getPlatformStats().then(setStats);
  }, []);

  const handleSearch = async (query: string, type: IdentifierType) => {
    setIsSearching(true);
    try {
      const res = await lookupIdentifier(query, type);
      setSearchResult(res);
      // Smooth scroll to result
      window.scrollTo({ top: 380, behavior: 'smooth' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-surface border-b border-line pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Hero Left: Tagline & Mission */}
          <div className="lg:col-span-6 space-y-5 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-tint text-brand uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Community Fraud Defense Network for India
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-tight">
              Check before you trust.
              <span className="block text-brand">Report before others fall victim.</span>
            </h1>

            <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-xl">
              Instantly check unknown callers, UPI addresses, and links against crowdsourced fraud indicators. Add your own report in under two minutes. We never collect your name, email, or device IP.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/report"
                className="h-12 px-6 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors flex items-center gap-2 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report a Scam</span>
              </Link>
              <Link
                to="/map"
                className="h-12 px-6 bg-white hover:bg-surface text-ink font-semibold text-sm rounded-btn border border-line transition-colors flex items-center gap-2 shadow-sm"
              >
                <MapPin className="w-4 h-4 text-brand" />
                <span>See Scam Map</span>
              </Link>
            </div>
          </div>

          {/* Hero Right: Direct Working Lookup Form */}
          <div className="lg:col-span-6 w-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-brand" />
                  Instant Risk Verification
                </span>
                <span className="text-[11px] text-ink-muted">Free public safety service</span>
              </div>
              <LookupForm onSearch={handleSearch} isLoading={isSearching} />
            </div>
          </div>
        </div>

        {/* Inline Search Result (if user searched on homepage) */}
        {searchResult && (
          <div className="max-w-4xl mx-auto mt-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
                Verification Result
              </h3>
              <button
                onClick={() => setSearchResult(null)}
                className="text-xs text-ink-muted hover:text-ink underline"
              >
                Clear result
              </button>
            </div>
            <ResultCard result={searchResult} />
          </div>
        )}
      </section>

      {/* Live Platform Statistics Strip (Matches UI/UX Design Page 6) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-line rounded-card p-5 sm:p-6 shadow-sm">
          <div>
            <span className="block text-2xl sm:text-3xl font-bold font-mono text-ink">
              {stats?.reports_last_7_days.toLocaleString() || '1,284'}
            </span>
            <span className="text-xs text-ink-muted">Reports in the last 7 days</span>
          </div>

          <div>
            <span className="block text-2xl sm:text-3xl font-bold font-mono text-brand">
              {stats?.newly_flagged_identifiers || '312'}
            </span>
            <span className="text-xs text-ink-muted">Numbers and VPAs newly flagged</span>
          </div>

          <div>
            <span className="block text-xl sm:text-2xl font-bold text-risk-red truncate">
              {stats?.top_reported_scam || 'Digital arrest'}
            </span>
            <span className="text-xs text-ink-muted">Most reported scam vector this week</span>
          </div>

          <div>
            <span className="block text-xl sm:text-2xl font-bold text-ink truncate">
              {stats?.most_active_area || 'HSR Layout'}
            </span>
            <span className="text-xs text-ink-muted">Active surge hotspot, Bengaluru</span>
          </div>
        </div>
      </section>

      {/* 2-Column Section: How It Works & If You Already Lost Money */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How It Works */}
          <div className="bg-white border border-line rounded-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-tint text-brand text-xs flex items-center justify-center font-bold">
                i
              </span>
              How ScamSentry Works
            </h3>

            <ol className="space-y-4 text-xs text-ink">
              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-surface border border-line text-ink font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="block text-sm text-ink mb-0.5">Look it up</strong>
                  <span className="text-ink-muted leading-relaxed">
                    Paste the unknown caller's number, UPI handle, or link you were sent.
                  </span>
                </div>
              </li>

              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-surface border border-line text-ink font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="block text-sm text-ink mb-0.5">Read the verdict</strong>
                  <span className="text-ink-muted leading-relaxed">
                    See community report tallies, regional distributions, and clear safety guidance.
                  </span>
                </div>
              </li>

              <li className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-surface border border-line text-ink font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="block text-sm text-ink mb-0.5">Add what you know</strong>
                  <span className="text-ink-muted leading-relaxed">
                    If it's new, submit an anonymous 60-second report so the next person is safeguarded.
                  </span>
                </div>
              </li>
            </ol>
          </div>

          {/* If You Have Already Sent Money */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              If you have already sent money
            </h3>

            <div className="space-y-3 text-xs text-amber-900 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <span className="font-bold text-sm text-amber-800">1.</span>
                <div>
                  <p className="font-bold text-amber-950">Call 1930 immediately</p>
                  <p className="text-amber-800 text-[11px]">
                    The Indian National Cyber Crime Helpline can trigger an inter-bank freeze within the "golden hour".
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="font-bold text-sm text-amber-800">2.</span>
                <div>
                  <p className="font-bold text-amber-950">Inform your bank or payment app</p>
                  <p className="text-amber-800 text-[11px]">
                    Ask them to dispute and block the beneficiary account or VPA transaction.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="font-bold text-sm text-amber-800">3.</span>
                <div>
                  <p className="font-bold text-amber-950">File official complaint at cybercrime.gov.in</p>
                  <p className="text-amber-800 text-[11px]">
                    Keep your transaction UTR numbers, SMS receipts, and screenshots handy.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="tel:1930"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-btn shadow-sm transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call 1930 Cyber Crime Helpline</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
