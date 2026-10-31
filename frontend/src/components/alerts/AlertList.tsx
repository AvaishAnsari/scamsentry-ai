import React, { useState } from 'react';
import { Bell, Filter, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AlertItem, AlertType } from '../../types';
import { AlertCard } from './AlertCard';

interface AlertListProps {
  alerts: AlertItem[];
  isMock?: boolean;
}

export const AlertList: React.FC<AlertListProps> = ({ alerts, isMock = false }) => {
  const [filterType, setFilterType] = useState<'ALL' | AlertType>('ALL');
  const [subscribedArea, setSubscribedArea] = useState<string>('');
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<boolean>(false);

  const filtered = alerts.filter((a) => {
    if (filterType === 'ALL') return true;
    return a.alert_type === filterType;
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (subscribedArea.trim()) {
      setSubscriptionSuccess(true);
      setTimeout(() => setSubscriptionSuccess(false), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Main Alert Feed */}
      <div className="lg:col-span-2 space-y-4">
        {/* Filter bar */}
        <div className="bg-white border border-line rounded-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-muted" />
            <span className="text-xs font-bold uppercase tracking-wider text-ink">Filter:</span>
            <div className="flex bg-surface p-1 rounded-btn border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1 rounded-btn transition-colors ${
                  filterType === 'ALL' ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
                }`}
              >
                All Alerts ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SPIKE')}
                className={`px-3 py-1 rounded-btn transition-colors ${
                  filterType === 'SPIKE' ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
                }`}
              >
                Spikes Only
              </button>
              <button
                type="button"
                onClick={() => setFilterType('NEW_SCAM_TYPE')}
                className={`px-3 py-1 rounded-btn transition-colors ${
                  filterType === 'NEW_SCAM_TYPE' ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
                }`}
              >
                New Types Only
              </button>
            </div>
          </div>

          {isMock && (
            <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Demo Alert Simulator
            </span>
          )}
        </div>

        {/* List of Alerts */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-line rounded-card p-10 text-center space-y-3 shadow-sm">
            <Bell className="w-8 h-8 text-ink-muted mx-auto opacity-40" />
            <h3 className="font-bold text-ink text-sm">No Unusual Alerts Triggered</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              Scam activity in this filter is currently within normal historical thresholds. Ordinary reports remain visible on the community map.
            </p>
          </div>
        ) : (
          filtered.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>

      {/* Explanatory Sidebar: Rules & Local Subscription */}
      <div className="lg:col-span-1 space-y-4">
        {/* Why you see an alert */}
        <div className="bg-white border border-line rounded-card p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Why you see an alert
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            ScamSentry alerts are mathematically bounded to prevent alarm fatigue. We only alert when fraud escalates abnormally:
          </p>
          <ul className="text-xs text-ink-muted space-y-2 border-t border-line pt-3">
            <li>
              <strong className="text-ink block">1. Surge Spikes:</strong>
              When an area records at least 5 reports in 24 hours AND exceeds 2× its 7-day average.
            </li>
            <li>
              <strong className="text-ink block">2. New Scam Patterns:</strong>
              When a new attack vector appears in an area with 3+ reports that was unseen there in the previous 30 days.
            </li>
          </ul>
          <div className="bg-surface p-3 rounded-btn border border-line text-[11px] text-ink-muted">
            Ordinary or isolated reports never trigger alarms; they are aggregated calmly on the Scam Map.
          </div>
        </div>

        {/* Local Area Subscription (No login/IP required) */}
        <div className="bg-white border border-line rounded-card p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Get Localized Alerts
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Follow your residential PIN code to receive notifications when fraud surges occur nearby. No email or phone required.
          </p>

          <form onSubmit={handleSubscribe} className="space-y-2.5">
            <input
              type="text"
              maxLength={6}
              value={subscribedArea}
              onChange={(e) => setSubscribedArea(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter your 6-digit PIN code..."
              className="w-full h-10 px-3 rounded-btn border border-line text-xs font-mono"
            />
            <button
              type="submit"
              className="w-full h-10 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-btn transition-colors shadow-sm"
            >
              Set My Local Area
            </button>
          </form>

          {subscriptionSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-btn text-xs flex items-center gap-1.5 animate-fadeIn font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Subscribed to PIN {subscribedArea}! Alerts stored locally in browser.</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Zero personal identification collected.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

