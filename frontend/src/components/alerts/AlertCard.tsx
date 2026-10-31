import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Sparkles, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { AlertItem } from '../../types';

interface AlertCardProps {
  alert: AlertItem;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const isSpike = alert.alert_type === 'SPIKE';
  const isHigh = alert.severity === 'high' || alert.severity === 'critical';

  return (
    <div className="bg-white border border-line rounded-card p-5 sm:p-6 shadow-sm hover:border-gray-300 transition-all space-y-4">
      {/* Header: Alert Type + Time + Severity Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isSpike
                ? 'bg-risk-red-tint text-risk-red border border-risk-red/20'
                : 'bg-risk-amber-tint text-risk-amber border border-risk-amber/20'
            }`}
          >
            {isSpike ? <TrendingUp className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isSpike ? 'SURGE SPIKE' : 'NEW SCAM PATTERN'}</span>
          </span>

          <span className="text-xs text-ink-muted">
            {new Date(alert.detected_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <span
          className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
            isHigh
              ? 'bg-risk-red text-white'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}
        >
          {alert.severity} priority
        </span>
      </div>

      {/* Title & Region */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-ink leading-snug">
          {alert.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand mt-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{alert.region}</span>
        </div>
      </div>

      {/* Quantitative Narrative Breakdown */}
      <div className="bg-surface rounded-btn p-3 border border-line space-y-1.5 text-xs">
        <p className="text-ink font-medium leading-relaxed">
          {alert.description}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-muted pt-1">
          <span>
            <strong>Last 24h count:</strong> {alert.incident_count_last_24h} incidents
          </span>
          {alert.surge_percentage && (
            <span>
              <strong>Surge:</strong>{' '}
              <span className="text-risk-red font-mono font-bold">
                {alert.surge_percentage}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Plain Language Safety Advice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-btn p-3 flex items-start gap-2.5 text-xs text-emerald-950">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Protective Advice: </span>
          <span>{alert.advice}</span>
        </div>
      </div>

      {/* Action: View on Map */}
      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {alert.sample_indicators && alert.sample_indicators.length > 0 && (
            <span className="text-[11px] text-ink-muted">
              Sample flags: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-ink">{alert.sample_indicators[0]}</code>
            </span>
          )}
        </div>

        <Link
          to={`/map?pin=${alert.pincode || '560102'}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          <span>View Area on Scam Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
