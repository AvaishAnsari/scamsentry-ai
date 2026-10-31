import React from 'react';
import { XCircle, AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Verdict } from '../../types';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  switch (verdict) {
    case 'KNOWN_SCAM':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full ${
            size === 'sm'
              ? 'px-2 py-0.5 text-xs'
              : size === 'lg'
              ? 'px-4 py-1.5 text-sm'
              : 'px-3 py-1 text-xs'
          } bg-risk-red-tint text-risk-red border border-risk-red/20`}
        >
          <XCircle className="w-4 h-4 shrink-0" />
          <span>KNOWN SCAM</span>
        </span>
      );

    case 'SUSPICIOUS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full ${
            size === 'sm'
              ? 'px-2 py-0.5 text-xs'
              : size === 'lg'
              ? 'px-4 py-1.5 text-sm'
              : 'px-3 py-1 text-xs'
          } bg-risk-amber-tint text-risk-amber border border-risk-amber/20`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>SUSPICIOUS</span>
        </span>
      );

    case 'VERIFIED_BUSINESS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full ${
            size === 'sm'
              ? 'px-2 py-0.5 text-xs'
              : size === 'lg'
              ? 'px-4 py-1.5 text-sm'
              : 'px-3 py-1 text-xs'
          } bg-risk-green-tint text-risk-green border border-risk-green/20`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>VERIFIED BUSINESS</span>
        </span>
      );

    case 'NO_REPORTS':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full ${
            size === 'sm'
              ? 'px-2 py-0.5 text-xs'
              : size === 'lg'
              ? 'px-4 py-1.5 text-sm'
              : 'px-3 py-1 text-xs'
          } bg-gray-100 text-ink-muted border border-gray-300`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>NO REPORTS YET</span>
        </span>
      );
  }
};

