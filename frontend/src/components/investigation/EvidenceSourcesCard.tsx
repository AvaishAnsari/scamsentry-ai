import React from 'react';
import {
  Shield,
  Users,
  Building2,
  Cpu,
  Info,
} from 'lucide-react';

interface EvidenceSourcesCardProps {
  confidence?: number;
  evidenceSource?: string;
}

export const EvidenceSourcesCard: React.FC<EvidenceSourcesCardProps> = ({
  confidence,
  evidenceSource,
}) => {
  return (
    <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-brand" />
        <h3 className="text-base sm:text-lg font-bold text-ink">
          Evidence Sources & Methodology
        </h3>
      </div>
      <p className="text-xs text-ink-muted mb-5 leading-relaxed">
        ScamSentry synthesizes multiple threat telemetry layers to provide transparent, explainable fraud verdicts.
      </p>

      {/* Intelligence Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        <div className="p-4 rounded-card bg-surface border border-line">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-brand flex items-center justify-center mb-2.5">
            <Users className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
            1. Citizen Crowdsource
          </h4>
          <p className="text-xs text-ink-muted leading-relaxed">
            Anonymous community incident reports aggregated across 28 states, verified through geographic clustering and salted anti-abuse hashing.
          </p>
        </div>

        <div className="p-4 rounded-card bg-surface border border-line">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
            2. Heuristic Analysis
          </h4>
          <p className="text-xs text-ink-muted leading-relaxed">
            Real-time domain age calculation, Levenshtein brand distance scoring, unverified SSL certificates, and obfuscated redirect chain analysis.
          </p>
        </div>

        <div className="p-4 rounded-card bg-surface border border-line">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-safe-green flex items-center justify-center mb-2.5">
            <Building2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
            3. Verified Registries
          </h4>
          <p className="text-xs text-ink-muted leading-relaxed">
            Cross-referenced against verified national bank portals (RBI, NPCI, SBI, HDFC), telecom headers (TRAI DLT), and official government domains (.gov.in).
          </p>
        </div>
      </div>

      {/* Confidence & Source Summary Box */}
      <div className="p-4 rounded-card bg-brand-tint/40 border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-brand block mb-0.5">
            Active Intelligence Source:
          </span>
          <span className="text-ink font-medium">
            {evidenceSource || 'ScamSentry Threat Intelligence Engine & Distributed Network'}
          </span>
        </div>

        <div className="text-right sm:border-l sm:border-brand/20 sm:pl-4 shrink-0">
          <span className="text-ink-muted block text-[11px]">
            Engine Confidence:
          </span>
          <span className="font-bold text-ink">
            {typeof confidence === 'number'
              ? `${Math.round(confidence * 100)}% Match Certainty`
              : 'Confidence information unavailable'}
          </span>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-ink-muted flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
        <span>
          Confidence scores are calibrated dynamically: higher for multi-source confirmations and lower for newly flagged, single-source indicators.
        </span>
      </div>
    </div>
  );
};
