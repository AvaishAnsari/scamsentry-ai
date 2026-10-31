import React, { useState } from 'react';
import { Phone, CreditCard, Link as LinkIcon, Search, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { IdentifierType } from '../../types';

interface LookupFormProps {
  onSearch: (query: string, type: IdentifierType) => void;
  isLoading?: boolean;
  initialQuery?: string;
  initialType?: IdentifierType;
}

export const LookupForm: React.FC<LookupFormProps> = ({
  onSearch,
  isLoading = false,
  initialQuery = '',
  initialType = 'phone',
}) => {
  const [type, setType] = useState<IdentifierType>(initialType);
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);

  const validateInput = (val: string, t: IdentifierType): string | null => {
    const clean = val.trim();
    if (!clean) return 'Please enter an identifier to check.';

    if (t === 'phone') {
      const digitsOnly = clean.replace(/\D/g, '');
      const localTen = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      if (localTen.length !== 10) {
        return 'Enter a 10-digit Indian mobile number (e.g. 98765 43210).';
      }
      if (!/^[6-9]/.test(localTen)) {
        return 'Indian mobile numbers start with 6, 7, 8 or 9.';
      }
    } else if (t === 'upi') {
      if (!clean.includes('@') || clean.startsWith('@') || clean.endsWith('@')) {
        return 'Enter a valid UPI ID (e.g. name@okaxis or 9876543210@paytm).';
      }
    } else if (t === 'url') {
      if (!clean.includes('.') || clean.length < 4) {
        return 'Enter a valid web link or domain (e.g. sbi-kyc-update.in).';
      }
    }
    return null;
  };

  const handleBlur = () => {
    if (query.trim()) {
      setError(validateInput(query, type));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateInput(query, type);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSearch(query.trim(), type);
  };

  const setPreset = (presetQuery: string, presetType: IdentifierType) => {
    setType(presetType);
    setQuery(presetQuery);
    setError(null);
    onSearch(presetQuery, presetType);
  };

  return (
    <div className="bg-white rounded-card border border-line p-5 sm:p-7 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector Tabs */}
        <div className="flex bg-surface p-1 rounded-btn border border-line" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={type === 'phone'}
            onClick={() => {
              setType('phone');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-semibold rounded-btn transition-all ${
              type === 'phone'
                ? 'bg-white text-brand shadow-sm border border-line/60'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Phone</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={type === 'upi'}
            onClick={() => {
              setType('upi');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-semibold rounded-btn transition-all ${
              type === 'upi'
                ? 'bg-white text-brand shadow-sm border border-line/60'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>UPI ID</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={type === 'url'}
            onClick={() => {
              setType('url');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-semibold rounded-btn transition-all ${
              type === 'url'
                ? 'bg-white text-brand shadow-sm border border-line/60'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Link / URL</span>
          </button>
        </div>

        {/* Search Input & Action Button */}
        <div>
          <label htmlFor="identifier-input" className="sr-only">
            Enter {type === 'phone' ? 'Phone Number' : type === 'upi' ? 'UPI ID' : 'Website Link'}
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="identifier-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (error) setError(null);
                }}
                onBlur={handleBlur}
                placeholder={
                  type === 'phone'
                    ? '+91 98765 43210'
                    : type === 'upi'
                    ? 'merchant@upi or name@okaxis'
                    : 'https://example-bank-verify.in'
                }
                className={`w-full h-12 px-4 rounded-btn border text-base font-medium text-ink placeholder:text-gray-400 bg-white transition-colors focus:bg-white ${
                  error ? 'border-risk-red bg-risk-red-tint/20' : 'border-line hover:border-gray-400'
                }`}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 px-7 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check</span>
                </>
              )}
            </button>
          </div>

          {/* Validation Error Message */}
          {error && (
            <p className="mt-2 text-xs text-risk-red flex items-center gap-1.5 font-medium animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {/* Helper notes */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-ink-muted gap-2">
            <span>
              {type === 'phone' && 'Example: +91 98765 43210'}
              {type === 'upi' && 'Example: name@okaxis or 9876543210@paytm'}
              {type === 'url' && 'Example: sbi-kyc-update.in/login'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Searches are not linked to your identity.
            </span>
          </div>
        </div>

        {/* Demo Quick Presets */}
        <div className="pt-2 border-t border-line/60 flex items-center gap-2 flex-wrap text-xs text-ink-muted">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Try Demo Presets:
          </span>
          <button
            type="button"
            onClick={() => setPreset('+91 98765 43210', 'phone')}
            className="px-2 py-0.5 rounded-full bg-risk-red-tint text-risk-red font-medium text-[11px] hover:bg-red-100 transition-colors"
          >
            Known Scam (+91 98765...)
          </button>
          <button
            type="button"
            onClick={() => setPreset('+91 91234 56789', 'phone')}
            className="px-2 py-0.5 rounded-full bg-risk-amber-tint text-risk-amber font-medium text-[11px] hover:bg-amber-100 transition-colors"
          >
            Suspicious (+91 91234...)
          </button>
          <button
            type="button"
            onClick={() => setPreset('1800 123 4567', 'phone')}
            className="px-2 py-0.5 rounded-full bg-risk-green-tint text-risk-green font-medium text-[11px] hover:bg-green-100 transition-colors"
          >
            Verified (1800 123...)
          </button>
          <button
            type="button"
            onClick={() => setPreset('kyc.update92@okaxis', 'upi')}
            className="px-2 py-0.5 rounded-full bg-gray-100 text-ink-muted font-medium text-[11px] hover:bg-gray-200 transition-colors"
          >
            No Reports Yet (UPI)
          </button>
        </div>
      </form>
    </div>
  );
};

