import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { MapHotspot } from '../../types';

interface AreaPanelProps {
  hotspot: MapHotspot | null;
  timeframeDays: number;
}

export const AreaPanel: React.FC<AreaPanelProps> = ({ hotspot, timeframeDays }) => {
  if (!hotspot) {
    return (
      <div className="bg-white border border-line rounded-card p-6 text-center space-y-3">
        <MapPin className="w-8 h-8 text-ink-muted mx-auto opacity-50" />
        <h3 className="font-bold text-sm text-ink">No Area Selected</h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          Select any zone on the regional map or search by 6-digit PIN code to inspect localized scam report counts and daily attack trends.
        </p>
      </div>
    );
  }

  const maxDailyCount = hotspot.daily_counts
    ? Math.max(...hotspot.daily_counts.map((d) => d.count), 1)
    : 1;

  return (
    <div className="bg-white border border-line rounded-card p-5 sm:p-6 shadow-sm space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            <span>
              {hotspot.pincode} · {hotspot.city}, {hotspot.state}
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink mt-0.5">{hotspot.area}</h2>
        </div>

        <span
          className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider shrink-0 ${
            hotspot.severity === 'high'
              ? 'bg-risk-red-tint text-risk-red border border-risk-red/20'
              : hotspot.severity === 'medium'
              ? 'bg-risk-amber-tint text-risk-amber border border-risk-amber/20'
              : 'bg-risk-green-tint text-risk-green border border-risk-green/20'
          }`}
        >
          {hotspot.severity === 'high' ? 'High activity' : `${hotspot.severity} activity`}
        </span>
      </div>

      {/* Aggregate Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-btn p-3 border border-line">
          <span className="block text-3xl font-bold text-ink">{hotspot.report_count}</span>
          <span className="text-xs text-ink-muted">Reports (last {timeframeDays} days)</span>
        </div>
        <div className="bg-surface rounded-btn p-3 border border-line">
          <span className="block text-3xl font-bold text-risk-red">
            {hotspot.last_24h_count}
          </span>
          <span className="text-xs text-ink-muted">In the last 24 hours</span>
        </div>
      </div>

      {/* Dominant Pattern Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-btn p-3 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Dominant Reported Vector: </span>
          <span>{hotspot.dominant_category}</span>
        </div>
      </div>

      {/* Top Scam Types Breakdown */}
      {hotspot.categories_breakdown && hotspot.categories_breakdown.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Top Reported Scam Types
          </h4>
          <div className="space-y-1.5">
            {hotspot.categories_breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-ink font-medium">{item.category}</span>
                <span className="font-mono font-bold text-ink bg-surface px-2 py-0.5 rounded-full border border-line">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Reports Trend (Bars) */}
      {hotspot.daily_counts && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">
            <span>Daily Activity History</span>
            <span className="text-[10px] text-brand lowercase">tallest bar = today</span>
          </h4>
          <div className="flex items-end gap-1.5 h-20 pt-2 border-b border-line pb-1">
            {hotspot.daily_counts.map((d, idx) => {
              const heightPercent = Math.max(15, Math.round((d.count / maxDailyCount) * 100));
              const isToday = idx === hotspot.daily_counts!.length - 1;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-sm transition-all ${
                      isToday
                        ? 'bg-risk-red'
                        : 'bg-brand/60 group-hover:bg-brand'
                    }`}
                    title={`${d.day}: ${d.count} reports`}
                  />
                  <span className="text-[9px] text-ink-muted truncate w-full text-center">
                    {d.day.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <Link
          to={`/alerts?city=${encodeURIComponent(hotspot.city)}`}
          className="w-full h-10 px-4 bg-white border border-line hover:bg-surface text-ink font-semibold text-xs rounded-btn transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>View Alerts for this City</span>
        </Link>

        <Link
          to={`/report?pincode=${hotspot.pincode}`}
          className="w-full h-10 px-4 bg-brand hover:bg-brand-hover text-white font-semibold text-xs rounded-btn transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Report a Fraud in {hotspot.area}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Zero exact coordinates or personal identifiers are stored or shown.
      </p>
    </div>
  );
};
