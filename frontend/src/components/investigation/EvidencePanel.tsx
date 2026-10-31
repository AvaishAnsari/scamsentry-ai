import React from 'react';
import {
  HelpCircle,
  AlertCircle,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileSearch,
} from 'lucide-react';
import { EvidenceItem } from '../../types';

interface EvidencePanelProps {
  evidenceItems?: EvidenceItem[];
  confidence?: number;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidenceItems = [],
  confidence,
}) => {
  const getSeverityBadge = (severity: EvidenceItem['severity']) => {
    switch (severity) {
      case 'high':
        return {
          label: 'High Severity',
          pill: 'bg-risk-red text-white',
          border: 'border-l-4 border-l-risk-red',
          icon: ShieldAlert,
        };
      case 'medium':
        return {
          label: 'Medium Severity',
          pill: 'bg-amber-600 text-white',
          border: 'border-l-4 border-l-amber-500',
          icon: AlertCircle,
        };
      case 'low':
        return {
          label: 'Low Severity',
          pill: 'bg-blue-600 text-white',
          border: 'border-l-4 border-l-blue-500',
          icon: Info,
        };
      case 'info':
      default:
        return {
          label: 'Informational',
          pill: 'bg-gray-600 text-white',
          border: 'border-l-4 border-l-gray-400',
          icon: HelpCircle,
        };
    }
  };

  const hasItems = evidenceItems && evidenceItems.length > 0;

  return (
    <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-brand" />
            <h3 className="text-base sm:text-lg font-bold text-ink">
              Why is this suspicious?
            </h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Transparent signal breakdown from heuristic crawlers, community reports, and threat feeds
          </p>
        </div>

        <div className="text-xs font-medium text-ink-muted bg-surface px-3 py-1 rounded-full border border-line">
          Overall Model Confidence:{' '}
          <strong className="text-ink">
            {typeof confidence === 'number'
              ? `${Math.round(confidence * 100)}%`
              : 'Confidence information unavailable'}
          </strong>
        </div>
      </div>

      {!hasItems ? (
        <div className="p-8 sm:p-12 text-center rounded-card bg-surface border border-dashed border-line my-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-ink">
            No detailed evidence is available for this indicator yet.
          </h4>
          <p className="text-xs text-ink-muted max-w-md mx-auto mt-1 leading-relaxed">
            ScamSentry has not detected automated behavioral anomalies or historical incident patterns for this specific URL yet. Continue to verify domain spelling and SSL certificates manually.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {evidenceItems.map((item, index) => {
            const badge = getSeverityBadge(item.severity);
            const Icon = badge.icon;

            return (
              <div
                key={item.id || `evidence-${index}`}
                className={`p-4 rounded-card bg-surface border border-line ${badge.border} hover:bg-white hover:shadow-xs transition-all`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${badge.pill}`}>
                      <Icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="text-xs font-semibold text-ink-muted">
                      Source: {item.source}
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-ink-muted">
                    Confidence:{' '}
                    <strong className="text-ink">
                      {typeof item.confidence === 'number'
                        ? `${Math.round(item.confidence * 100)}%`
                        : 'Unavailable'}
                    </strong>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                  {item.description}
                </p>

                {item.source?.toLowerCase().includes('heuristic') && (
                  <div className="mt-2 text-[11px] text-brand bg-brand-tint/60 px-2.5 py-1 rounded-btn flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-brand" />
                    <span>Cross-referenced against registered trademark patterns</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

