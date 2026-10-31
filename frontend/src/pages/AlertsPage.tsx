import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { AlertList } from '../components/alerts/AlertList';
import { getAlerts } from '../services/api';
import { AlertItem } from '../types';

export const AlertsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get('city') || undefined;

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMock, setIsMock] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getAlerts(cityParam)
      .then((res) => {
        setAlerts(res.alerts);
        setIsMock(!!res.is_mock);
      })
      .finally(() => setLoading(false));
  }, [cityParam]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Unusual Scam Surge & Anomaly Alerts
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mt-1">
            Real-time notifications triggered exclusively when regional fraud spikes or novel attack patterns exceed strict statistical thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>No alarm fatigue: quiet means normal activity.</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-line rounded-card p-12 text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto" />
          <div className="h-4 w-48 bg-gray-200 rounded mx-auto" />
          <div className="h-48 bg-gray-100 rounded-card" />
        </div>
      ) : (
        <AlertList alerts={alerts} isMock={isMock} />
      )}
    </div>
  );
};

