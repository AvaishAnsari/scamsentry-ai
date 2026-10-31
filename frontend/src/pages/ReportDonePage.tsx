import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, MapPin, Search, PhoneCall } from 'lucide-react';

export const ReportDonePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('id') || 'rep_success';
  const targetVal = searchParams.get('val') || '';

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-ink-muted bg-surface px-3 py-1 rounded-full border border-line inline-block">
            Report Reference: {reportId}
          </span>
          <h1 className="text-2xl font-bold text-ink">
            Thank You for Reporting
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Your report for <span className="font-mono font-bold text-ink">{targetVal || 'the suspected identifier'}</span> has been successfully logged into the community risk engine.
          </p>
        </div>

        {/* Privacy Note */}
        <div className="bg-surface border border-line rounded-btn p-3.5 text-xs text-ink-muted flex items-start gap-2.5 text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Your privacy was strictly preserved. No names, personal phone numbers, or IP addresses were recorded with this report.
          </span>
        </div>

        {/* Emergency Reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-btn p-4 text-left space-y-2">
          <span className="text-xs font-bold text-amber-900 block">
            Did you lose money during this incident?
          </span>
          <p className="text-xs text-amber-800 leading-relaxed">
            Every minute counts for fund recovery. Dial <strong>1930</strong> (National Cyber Crime Helpline) or lodge a report at <strong>cybercrime.gov.in</strong> immediately.
          </p>
          <a
            href="tel:1930"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline pt-1"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 1930 Helpline Now</span>
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/map"
            className="flex-1 h-11 px-4 bg-white border border-line hover:bg-surface text-ink font-semibold text-xs rounded-btn transition-colors flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-brand" />
            <span>View Regional Map</span>
          </Link>
          <Link
            to="/check"
            className="flex-1 h-11 px-4 bg-brand hover:bg-brand-hover text-white font-semibold text-xs rounded-btn transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Check Another Identifier</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
