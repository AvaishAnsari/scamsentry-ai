import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-ink-muted">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-ink">404 — Page Not Found</h1>
        <p className="text-xs text-ink-muted leading-relaxed">
          The requested page or resource could not be found. Return to the home page or verify a suspected phone number, UPI ID, or web link.
        </p>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Link
          to="/"
          className="h-10 px-5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-btn transition-colors flex items-center gap-2 shadow-sm"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          to="/check"
          className="h-10 px-5 bg-white border border-line hover:bg-surface text-ink text-xs font-semibold rounded-btn transition-colors flex items-center gap-2 shadow-sm"
        >
          <Search className="w-4 h-4" />
          <span>Check an Identifier</span>
        </Link>
      </div>
    </div>
  );
};

