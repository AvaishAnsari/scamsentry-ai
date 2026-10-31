import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, MapPin, Search, PhoneCall, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';

interface StoredReportResult {
  reportId?: string;
  targetVal?: string;
  targetType?: string;
  status?: string;
  verificationStatus?: string;
  confidenceLevel?: string;
  communityImpactMessage?: string;
  safetyGuidance?: string[];
}

export const ReportDonePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reportIdParam = searchParams.get('id') || 'rep_success';
  const targetValParam = searchParams.get('val') || '';
  const statusParam = searchParams.get('status') || 'success';

  const [details, setDetails] = useState<StoredReportResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('scamsentry_last_report_result');
      if (raw) {
        setDetails(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const reportId = details?.reportId || reportIdParam;
  const targetVal = details?.targetVal || targetValParam;
  const isDuplicate = statusParam === 'duplicate' || details?.status === 'duplicate';
  const guidance = details?.safetyGuidance || [
    'Do not transfer money or share OTPs with unverified contacts.',
    'Contact your bank or UPI app support immediately if you suspect unauthorized activity.',
    'Dial 1930 to report cyber financial crime to the national helpline.',
  ];

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-sm text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-ink-muted bg-surface px-3 py-1 rounded-full border border-line inline-block">
            Report Reference: {reportId}
          </span>
          <h1 className="text-2xl font-bold text-ink">
            {isDuplicate ? 'Report Updated' : 'Thank You for Warning the Community'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Your report for <span className="font-mono font-bold text-ink">{targetVal || 'the suspected identifier'}</span> has been registered as an anonymous community safety signal.
          </p>
        </div>

        {/* Mentor Feedback / Legal Safeguard Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-btn p-4 text-left space-y-1.5 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Community Verification Status: Under Review</span>
          </div>
          <p className="leading-relaxed">
            This creates a community warning. It does <strong>not</strong> automatically prove that the target is a confirmed scam.
            To protect against false accusations, ScamSentry requires corroboration from multiple independent reporters across distinct areas before escalating risk.
          </p>
        </div>

        {/* Tailored Safety Guidance from backend */}
        {guidance.length > 0 && (
          <div className="bg-surface border border-line rounded-card p-4 text-left space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <ShieldAlert className="w-4 h-4 text-brand" />
              <span>Recommended Next Steps to Protect Yourself</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-ink-muted">
              {guidance.map((step, idx) => (
                <li key={idx} className="leading-relaxed text-ink">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Community Impact Message */}
        {details?.communityImpactMessage && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-btn p-3 text-xs text-emerald-900 text-left flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>{details.communityImpactMessage}</span>
          </div>
        )}

        {/* Emergency Reminder */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-btn p-4 text-left space-y-2">
          <span className="text-xs font-bold text-amber-900 block flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            Did you lose money during this incident?
          </span>
          <p className="text-xs text-amber-800 leading-relaxed">
            Every minute counts for fund recovery and banking cyber freezes. Dial <strong>1930</strong> (National Cyber Crime Helpline) or lodge a report at <strong>cybercrime.gov.in</strong> immediately.
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
            <span>View Scam Map</span>
          </Link>
          <Link
            to="/check"
            className="flex-1 h-11 px-4 bg-brand hover:bg-brand-hover text-white font-semibold text-xs rounded-btn transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Check Another Contact</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
