import React, { useState, useEffect } from 'react';
import { Search, MapPin, List, Map as MapIcon } from 'lucide-react';
import { MapHotspot } from '../../types';
import { AreaPanel } from './AreaPanel';
import { AreaListView } from './AreaListView';

interface ScamMapProps {
  hotspots: MapHotspot[];
  timeframeDays: number;
  onTimeframeChange: (days: number) => void;
  selectedPincode?: string;
  isMock?: boolean;
}

export const ScamMap: React.FC<ScamMapProps> = ({
  hotspots,
  timeframeDays,
  onTimeframeChange,
  selectedPincode,
  isMock = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHotspot, setSelectedHotspot] = useState<MapHotspot | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [activeCityTab, setActiveCityTab] = useState<'Bengaluru' | 'Mumbai' | 'Delhi-NCR'>('Bengaluru');

  // Pre-select hotspot if provided
  useEffect(() => {
    if (selectedPincode) {
      const match = hotspots.find((h) => h.pincode === selectedPincode);
      if (match) setSelectedHotspot(match);
    } else if (hotspots.length > 0 && !selectedHotspot) {
      setSelectedHotspot(hotspots[0]);
    }
  }, [selectedPincode, hotspots]);

  // Filter hotspots based on search
  const filteredHotspots = hotspots.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      h.area.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.pincode.includes(q) ||
      h.dominant_category.toLowerCase().includes(q)
    );
  });

  const cityFilteredHotspots = filteredHotspots.filter((h) => {
    if (activeCityTab === 'Bengaluru') return h.city === 'Bengaluru';
    if (activeCityTab === 'Mumbai') return h.city === 'Mumbai';
    if (activeCityTab === 'Delhi-NCR') return h.city === 'Noida' || h.city === 'New Delhi';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Control Bar */}
      <div className="bg-white border border-line rounded-card p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PIN or area (e.g. 560102)..."
            className="w-full h-10 pl-9 pr-4 rounded-btn border border-line text-xs font-medium focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" />
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['Bengaluru', 'Mumbai', 'Delhi-NCR'] as const).map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setActiveCityTab(city)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCityTab === city
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-surface text-ink-muted hover:text-ink border border-line'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Timeframe & View Toggles */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Timeframe selector */}
          <div className="flex bg-surface p-1 rounded-btn border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => onTimeframeChange(1)}
              className={`px-2.5 py-1 rounded-btn transition-colors ${
                timeframeDays === 1 ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
              }`}
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange(7)}
              className={`px-2.5 py-1 rounded-btn transition-colors ${
                timeframeDays === 7 ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange(30)}
              className={`px-2.5 py-1 rounded-btn transition-colors ${
                timeframeDays === 30 ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Map vs List Mode Toggle */}
          <div className="flex bg-surface p-1 rounded-btn border border-line">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-btn transition-colors ${
                viewMode === 'map' ? 'bg-white text-brand shadow-sm' : 'text-ink-muted'
              }`}
              title="Interactive Area Map"
              aria-label="Map View"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-btn transition-colors ${
                viewMode === 'list' ? 'bg-white text-brand shadow-sm' : 'text-ink-muted'
              }`}
              title="Accessible Table View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Privacy Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-ink-muted">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-ink text-[11px] uppercase tracking-wider">Severity:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-risk-red inline-block" />
            <span>High (20+ reports)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Medium (5–19 reports)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
            <span>Low (1–4 reports)</span>
          </span>
        </div>

        {isMock && (
          <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            Demo Cluster Simulation
          </span>
        )}
      </div>

      {/* Main Content Layout: Map/List + Side Details Panel */}
      {viewMode === 'list' ? (
        <AreaListView
          hotspots={filteredHotspots}
          selectedHotspot={selectedHotspot}
          onSelect={setSelectedHotspot}
          timeframeDays={timeframeDays}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Schematic & Interactive Area Zone Canvas */}
          <div className="lg:col-span-2 bg-white border border-line rounded-card overflow-hidden shadow-sm flex flex-col">
            <div className="bg-surface px-4 py-2.5 border-b border-line flex items-center justify-between text-xs">
              <span className="font-bold text-ink flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand" />
                Regional Area Clusters — {activeCityTab}
              </span>
              <span className="text-[11px] text-ink-muted">
                Click any zone card to inspect details
              </span>
            </div>

            {/* Interactive Schematic Cluster Grid */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-[380px] flex flex-col justify-between">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cityFilteredHotspots.map((h) => {
                  const isSelected = selectedHotspot?.pincode === h.pincode;
                  const isHigh = h.severity === 'high';
                  const isMedium = h.severity === 'medium';

                  return (
                    <button
                      key={h.pincode}
                      type="button"
                      onClick={() => setSelectedHotspot(h)}
                      className={`text-left p-3.5 rounded-card border transition-all transform hover:-translate-y-0.5 ${
                        isSelected
                          ? 'border-brand ring-2 ring-brand bg-white shadow-md'
                          : 'border-line/80 hover:border-brand/50 bg-white/90 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-ink-muted">
                          {h.pincode}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isHigh
                              ? 'bg-risk-red ring-2 ring-red-200'
                              : isMedium
                              ? 'bg-amber-500 ring-2 ring-amber-200'
                              : 'bg-yellow-400'
                          }`}
                        />
                      </div>

                      <h4 className="font-bold text-sm text-ink truncate">{h.area}</h4>
                      <p className="text-[11px] text-ink-muted truncate mb-2">
                        {h.dominant_category}
                      </p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-line/60">
                        <span className="text-xs font-bold text-ink">
                          {h.report_count}{' '}
                          <span className="text-[10px] font-normal text-ink-muted">reports</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-risk-red">
                          +{h.last_24h_count} 24h
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Informational Footer Strip inside map */}
              <div className="mt-6 pt-3 border-t border-line/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
                <span>
                  Schematic pincode zones · counts reflect reported incidents in the last {timeframeDays} days
                </span>
                <span className="font-medium text-ink">
                  Total Active Reports: {hotspots.reduce((acc, h) => acc + h.report_count, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Area Details Side Panel */}
          <div className="lg:col-span-1">
            <AreaPanel hotspot={selectedHotspot} timeframeDays={timeframeDays} />
          </div>
        </div>
      )}
    </div>
  );
};
