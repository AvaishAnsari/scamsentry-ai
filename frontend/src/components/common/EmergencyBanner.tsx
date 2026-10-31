import React from 'react';
import { PhoneCall, ExternalLink, ShieldAlert } from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  return (
    <aside
      aria-label="National Cyber Crime Emergency Helpline"
      className="bg-ink text-white text-xs sm:text-sm py-2 px-4 border-b border-gray-800"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-medium text-gray-200">
            Already lost money?
          </span>
          <span className="text-gray-300 hidden sm:inline">
            Act fast to stop the money transfer before it leaves the banking network.
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
          <a
            href="tel:1930"
            className="inline-flex items-center gap-1.5 text-amber-300 hover:text-white underline underline-offset-2 transition-colors py-1"
            title="Call Indian National Cyber Crime Helpline 1930"
          >
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            <span>Call 1930 Helpline</span>
          </a>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-300 hover:text-white transition-colors py-1"
            title="Open official Indian cybercrime reporting portal"
          >
            <span>cybercrime.gov.in</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
          </a>
        </div>
      </div>
    </aside>
  );
};

