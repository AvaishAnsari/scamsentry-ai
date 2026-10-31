import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Shield } from 'lucide-react';
import { ScamMap } from '../components/map/ScamMap';
import { getMapHotspots } from '../services/api';
import { MapHotspot } from '../types';

export const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pinParam = searchParams.get('pin') || '';

  const [hotspots, setHotspots] = useState<MapHotspot[]>([]);
  const [timeframeDays, setTimeframeDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMock, setIsMock] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    getMapHotspots(timeframeDays)
      .then((res) => {
        setHotspots(res.hotspots);
        setIsMock(!!res.is_mock);
      })
      .finally(() => setLoading(false));
  }, [timeframeDays]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand" />
            Hyperlocal Scam Activity Map
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mt-1">
            Visualizing regional scam clusters and emerging hotspots aggregated across Indian cities.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Aggregated by 6-digit PIN code. No personal coordinates.</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-line rounded-card p-12 text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto" />
          <div className="h-4 w-48 bg-gray-200 rounded mx-auto" />
          <div className="h-64 bg-gray-100 rounded-card" />
        </div>
      ) : (
        <ScamMap
          hotspots={hotspots}
          timeframeDays={timeframeDays}
          onTimeframeChange={setTimeframeDays}
          selectedPincode={pinParam}
          isMock={isMock}
        />
      )}
    </div>
  );
};
