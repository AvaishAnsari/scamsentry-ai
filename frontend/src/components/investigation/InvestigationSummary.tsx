import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Clock,
  Database,
  ExternalLink,
  Share2,
  LifeBuoy,
} from 'lucide-react';
import { LookupResult } from '../../types';

interface InvestigationSummaryProps {
  data: LookupResult;
  onOpenEmergency: () => void;
  onScrollToReport: () => void;
}

export const InvestigationSummary: React.FC<InvestigationSummaryProps> = ({
  data,
  onOpenEmergency,
  onScrollToReport,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verdict config
  const getVerdictConfig = () => {
    switch (data.verdict) {
      case 'KNOWN_SCAM':
        return {
          label: 'Known Scam Detected',
          sublabel: 'Confirmed malicious indicator in community and intelligence feeds',
          icon: ShieldAlert,
          bg: 'bg-risk-red-tint',
          border: 'border-risk-red',
          text: 'text-risk-red',
          pillBg: 'bg-risk-red text-white',
        };
      case 'SUSPICIOUS':
        return {
          label: 'Suspicious Activity Flagged',
          sublabel: 'Multiple behavioral anomalies or unconfirmed user reports',
          icon: AlertTriangle,
          bg: 'bg-risk-amber-tint',
          border: 'border-risk-amber',
          text: 'text-risk-amber',
          pillBg: 'bg-amber-600 text-white',
        };
      case 'VERIFIED_BUSINESS':
        return {
          label: 'Verified Official Domain',
          sublabel: 'Authenticated business registry identity',
          icon: ShieldCheck,
          bg: 'bg-safe-green-tint',
          border: 'border-safe-green',
          text: 'text-safe-green',
          pillBg: 'bg-safe-green text-white',
        };
      case 'NO_REPORTS':
      default:
        return {
          label: 'No Prior Reports Found',
          sublabel: 'Zero incident records in database. Not guaranteed safe.',
          icon: HelpCircle,
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-700',
          pillBg: 'bg-gray-600 text-white',
        };
    }
  };

  const vConfig = getVerdictConfig();
  const IconComponent = vConfig.icon;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-risk-red';
    if (score >= 35) return 'text-risk-amber';
    return 'text-safe-green';
  };

  const getScoreBarBg = (score: number) => {
    if (score >= 70) return 'bg-risk-red';
    if (score >= 35) return 'bg-amber-500';
    return 'bg-safe-green';
  };

  const formatCategory = (cat?: string) => {
    if (!cat) return 'Unclassified';
    return cat
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const targetStr = data.target_value || data.query;

  return (
    <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Investigation Dossier
          </span>
          <span className="text-gray-300">•</span>
          {data.is_mock ? (
            <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Database className="w-3 h-3" />
              Dev Mock Data
            </span>
          ) : (
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Backend API
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="text-xs font-medium text-ink-muted hover:text-ink border border-line rounded-btn px-2.5 py-1.5 flex items-center gap-1.5 bg-surface hover:bg-gray-100 transition-colors"
            title="Copy Dossier Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={onOpenEmergency}
            className="text-xs font-bold text-white bg-risk-red hover:bg-red-800 rounded-btn px-3 py-1.5 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>I Already Lost Money</span>
          </button>
        </div>
      </div>

      {/* Target URL Banner */}
      <div className="mt-5 p-4 rounded-card bg-surface border border-line">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
          Inspected Target
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="font-mono text-sm sm:text-base font-bold text-ink break-all">
            {targetStr}
          </span>
          <a
            href={targetStr.startsWith('http') ? targetStr : `https://${targetStr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 shrink-0"
            title="Open in new window (Use caution with untrusted sites)"
          >
            <span>External link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Verdict Card */}
      <div className={`mt-5 p-5 rounded-card border ${vConfig.border} ${vConfig.bg} transition-all`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-btn ${vConfig.pillBg} shrink-0 mt-0.5`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-lg sm:text-xl font-bold ${vConfig.text}`}>
                  {vConfig.label}
                </h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${vConfig.pillBg}`}>
                  {data.risk_level || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-xs text-ink/80 mt-1 leading-relaxed">
                {vConfig.sublabel}
              </p>
            </div>
          </div>

          {/* Risk Score Gauge */}
          <div className="bg-white/80 backdrop-blur border border-line/60 rounded-card p-3 sm:w-44 text-center shrink-0">
            <div className="text-[11px] font-semibold text-ink-muted uppercase">
              Threat Score
            </div>
            <div className={`text-2xl font-black ${getScoreColor(data.risk_score)}`}>
              {data.risk_score}<span className="text-xs font-medium text-ink-muted">/100</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full ${getScoreBarBg(data.risk_score)} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, data.risk_score))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Crucial Caution Notice for NO_REPORTS */}
      {data.verdict === 'NO_REPORTS' && (
        <div className="mt-4 p-4 rounded-btn bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Important: Zero reports does not guarantee safety.
            </p>
            <p className="text-amber-800 leading-relaxed">
              Newly created phishing links and targeted scam campaigns often show zero historical reports. Never enter banking credentials, OTPs, or approve UPI payment requests on unfamiliar links.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <div className="p-3.5 bg-surface border border-line rounded-btn">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Reports
          </div>
          <div className="text-lg font-black text-ink mt-0.5">
            {data.report_count}
          </div>
          <div className="text-[10px] text-ink-muted">Community submissions</div>
        </div>

        <div className="p-3.5 bg-surface border border-line rounded-btn">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Primary Category
          </div>
          <div className="text-sm font-bold text-ink mt-1 truncate" title={formatCategory(data.top_category)}>
            {formatCategory(data.top_category)}
          </div>
          <div className="text-[10px] text-ink-muted">Pattern classification</div>
        </div>

        <div className="p-3.5 bg-surface border border-line rounded-btn">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Analysis Confidence
          </div>
          <div className="text-sm font-bold text-ink mt-1">
            {typeof data.confidence === 'number' ? `${Math.round(data.confidence * 100)}%` : 'Unavailable'}
          </div>
          <div className="text-[10px] text-ink-muted">Model certainty</div>
        </div>

        <div className="p-3.5 bg-surface border border-line rounded-btn">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last Checked</span>
          </div>
          <div className="text-sm font-bold text-ink mt-1">
            {data.last_checked || 'Just now'}
          </div>
          <div className="text-[10px] text-ink-muted">Real-time cache</div>
        </div>
      </div>

      {/* Help Protect CTA */}
      <div className="mt-5 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-ink-muted">
          Encountered this URL in an SMS, email, or WhatsApp message?
        </span>
        <button
          onClick={onScrollToReport}
          className="text-brand font-bold hover:underline flex items-center gap-1"
        >
          <span>Submit your report to help protect others</span>
          <span>&darr;</span>
        </button>
      </div>
    </div>
  );
};
