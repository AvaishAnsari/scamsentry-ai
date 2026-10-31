import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, AlertCircle } from 'lucide-react';
import { LookupForm } from '../components/lookup/LookupForm';
import { ResultCard } from '../components/lookup/ResultCard';
import { lookupIdentifier } from '../services/api';
import { LookupResult, IdentifierType } from '../types';

export const LookupPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as IdentifierType) || 'phone';

  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performLookup = async (q: string, t: IdentifierType) => {
    setLoading(true);
    setError(null);
    setSearchParams({ q, type: t });

    try {
      const res = await lookupIdentifier(q, t);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Lookup encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryParam) {
      performLookup(queryParam, typeParam);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Check a Number, UPI ID or Web Link
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
          Verify community risk reports, previous incident flags, and official enterprise registrations before you transfer money or reply.
        </p>
      </div>

      {/* Lookup Form */}
      <LookupForm
        onSearch={performLookup}
        isLoading={loading}
        initialQuery={queryParam}
        initialType={typeParam}
      />

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white border border-line rounded-card p-6 shadow-sm space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 rounded-full" />
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
          <div className="h-10 w-64 bg-gray-200 rounded-md" />
          <div className="h-4 w-full bg-gray-100 rounded-md" />
          <div className="grid grid-cols-4 gap-3 pt-3">
            <div className="h-16 bg-gray-100 rounded-btn" />
            <div className="h-16 bg-gray-100 rounded-btn" />
            <div className="h-16 bg-gray-100 rounded-btn" />
            <div className="h-16 bg-gray-100 rounded-btn" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-risk-red-tint/30 border border-risk-red/30 rounded-card p-4 text-xs text-risk-red flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Display */}
      {!loading && result && (
        <div className="animate-fadeIn">
          <ResultCard result={result} />
        </div>
      )}

      {/* Initial Empty State Helper */}
      {!loading && !result && !error && (
        <div className="bg-white border border-line rounded-card p-8 text-center space-y-3 shadow-sm">
          <Search className="w-10 h-10 text-brand/40 mx-auto" />
          <h3 className="text-base font-bold text-ink">
            Ready to Inspect Unknown Contacts
          </h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
            Enter a 10-digit Indian mobile number, a UPI ID, or any link you received via SMS, WhatsApp, or email to inspect community reports.
          </p>
        </div>
      )}
    </div>
  );
};
