import React from 'react';
import { MapPin, ArrowRight, ShieldAlert } from 'lucide-react';
import { MapHotspot } from '../../types';

interface AreaListViewProps {
  hotspots: MapHotspot[];
  selectedHotspot: MapHotspot | null;
  onSelect: (hotspot: MapHotspot) => void;
  timeframeDays: number;
}

export const AreaListView: React.FC<AreaListViewProps> = ({
  hotspots,
  selectedHotspot,
  onSelect,
  timeframeDays,
}) => {
  return (
    <div className="bg-white border border-line rounded-card overflow-hidden shadow-sm">
      <div className="p-4 border-b border-line bg-surface flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">Regional Incident Intelligence Table</h3>
          <p className="text-xs text-ink-muted">
            Aggregated scam reports across tracked Indian districts (Last {timeframeDays} days).
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-line rounded-full text-ink">
          {hotspots.length} Zones Tracked
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-line text-ink-muted uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Area & PIN</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Activity Level</th>
              <th className="py-3 px-4">Dominant Vector</th>
              <th className="py-3 px-4 text-right">Reports ({timeframeDays}d)</th>
              <th className="py-3 px-4 text-right">Last 24h</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {hotspots.map((h) => {
              const isSelected = selectedHotspot?.pincode === h.pincode;
              return (
                <tr
                  key={h.pincode}
                  onClick={() => onSelect(h)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-tint/50 font-medium'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-ink">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                      <span>{h.area}</span>
                      <span className="font-mono text-ink-muted text-[11px]">({h.pincode})</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-ink-muted">
                    {h.city}, {h.state}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        h.severity === 'high' || h.severity === 'critical'
                          ? 'bg-risk-red-tint text-risk-red'
                          : h.severity === 'medium'
                          ? 'bg-risk-amber-tint text-risk-amber'
                          : 'bg-risk-green-tint text-risk-green'
                      }`}
                    >
                      {h.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-ink">
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-600" />
                      {h.dominant_category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-ink">
                    {h.report_count}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-risk-red">
                    +{h.last_24h_count ?? 0}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(h);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-tint rounded-btn transition-colors inline-flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

