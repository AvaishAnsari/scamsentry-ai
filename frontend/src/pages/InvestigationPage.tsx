import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Shield,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { LookupResult } from '../types';
import { investigateIdentifier } from '../services/api';
import { InvestigationSummary } from '../components/investigation/InvestigationSummary';
import { VisualConnectionGraph } from '../components/investigation/VisualConnectionGraph';
import { EvidencePanel } from '../components/investigation/EvidencePanel';
import { EvidenceSourcesCard } from '../components/investigation/EvidenceSourcesCard';
import { InvestigationReportForm } from '../components/investigation/InvestigationReportForm';
import { EmergencyLostMoneyModal } from '../components/investigation/EmergencyLostMoneyModal';

const DEMO_PRESETS = [
  {
    label: 'Fake SBI KYC (Phishing)',
    url: 'sbi-kyc-update.in/login',
    badge: 'Phishing Demo',
  },
  {
    label: 'Bescom Electricity Urgency',
    url: 'urgent-bescom-bill.xyz',
    badge: 'Urgency Scam',
  },
  {
    label: 'Official SBI Portal (Safe)',
    url: 'sbi.co.in',
    badge: 'Official Bank',
  },
  {
    label: 'Unreported Link (Zero Reports)',
    url: 'fresh-lottery-gift2026.top',
    badge: 'No Reports',
  },
];

export const InvestigationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlParam = searchParams.get('url') || searchParams.get('q') || searchParams.get('query') || '';

  const [inputUrl, setInputUrl] = useState(urlParam);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investigationData, setInvestigationData] = useState<LookupResult | null>(null);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  // Perform investigation
  const runInvestigation = async (target: string) => {
    const clean = target.trim();
    if (!clean) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await investigateIdentifier(clean, 'url');
      setInvestigationData(result);
    } catch {
      setError('Failed to complete investigation. Please check backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync with searchParams on mount or param change
  useEffect(() => {
    if (urlParam) {
      setInputUrl(urlParam);
      runInvestigation(urlParam);
    }
  }, [urlParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setSearchParams({ url: inputUrl.trim() });
  };

  const handleSelectPreset = (presetUrl: string) => {
    setInputUrl(presetUrl);
    setSearchParams({ url: presetUrl });
  };

  const handleScrollToReport = () => {
    const el = document.getElementById('investigation-report-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-surface min-h-[calc(100vh-64px)] pb-16">
      {/* Investigation Hero Header */}
      <div className="bg-ink text-white pt-8 pb-10 px-4 sm:px-6 border-b border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-btn bg-brand text-white">
                <Shield className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                  Deep Intelligence Mode
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  ScamSentry Investigation Mode
                </h1>
              </div>
            </div>

            <button
              onClick={() => setIsEmergencyOpen(true)}
              className="text-xs font-bold bg-risk-red hover:bg-red-800 text-white px-3.5 py-2 rounded-btn transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>I Already Lost Money</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed mb-6">
            Explain the scam. Connect the clues. Protect the user. Inspect suspect domains, discover impersonated brands, and trace connected phone and UPI syndicates.
          </p>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter suspect URL or domain (e.g. sbi-kyc-update.in/login)..."
                className="w-full h-13 pl-11 pr-28 rounded-card bg-white/10 backdrop-blur border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white/15 font-mono transition-all"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={isLoading || !inputUrl.trim()}
                className="absolute right-2 h-9 px-4 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-btn transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Investigate</span>
                )}
              </button>
            </div>
          </form>

          {/* Preset Buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-400 text-[11px] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Quick demo scenarios:
            </span>
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.url}
                type="button"
                onClick={() => handleSelectPreset(preset.url)}
                className="px-2.5 py-1 rounded-btn bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 text-[11px] font-medium transition-colors flex items-center gap-1.5"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {isLoading && (
          <div className="p-12 text-center rounded-card bg-white border border-line shadow-sm my-6">
            <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-3" />
            <h3 className="text-sm sm:text-base font-bold text-ink">
              Analyzing Intelligence Telemetry...
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              Querying ScamSentry Threat Engine, heuristic crawlers, and community syndicates
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-6 rounded-card bg-risk-red-tint border border-risk-red/40 text-risk-red my-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Investigation Error</h4>
              <p className="text-xs mt-1 leading-relaxed">{error}</p>
              <button
                onClick={() => runInvestigation(inputUrl)}
                className="mt-3 px-3 py-1.5 rounded-btn bg-risk-red text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-red-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Investigation</span>
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && investigationData && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Summary Dossier */}
            <InvestigationSummary
              data={investigationData}
              onOpenEmergency={() => setIsEmergencyOpen(true)}
              onScrollToReport={handleScrollToReport}
            />

            {/* 2. Visual Scam Connection Graph */}
            <VisualConnectionGraph
              targetValue={investigationData.target_value || investigationData.query}
              relatedIndicators={investigationData.related_indicators}
              isMock={investigationData.is_mock}
            />

            {/* 3. Explainable Evidence Panel */}
            <EvidencePanel
              evidenceItems={investigationData.evidence_items}
              confidence={investigationData.confidence}
            />

            {/* 4. Evidence Sources & Confidence Methodology */}
            <EvidenceSourcesCard
              confidence={investigationData.confidence}
              evidenceSource={investigationData.evidence_source}
            />

            {/* 5. Help Protect Others - Anonymous Report Submission */}
            <InvestigationReportForm
              initialTargetValue={investigationData.target_value || investigationData.query}
            />
          </div>
        )}

        {/* Empty state when no URL has been investigated yet */}
        {!isLoading && !error && !investigationData && (
          <div className="p-8 sm:p-14 text-center rounded-card bg-white border border-line shadow-sm my-6">
            <div className="w-16 h-16 rounded-full bg-brand-tint text-brand flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              Ready to Inspect Any Suspect Link
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto mt-1 leading-relaxed">
              Enter any URL or domain above to uncover syndicate connections, explain why it was flagged, and review crowdsourced evidence.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {DEMO_PRESETS.slice(0, 3).map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => handleSelectPreset(preset.url)}
                  className="px-3 py-2 bg-surface hover:bg-gray-100 border border-line rounded-btn text-xs font-semibold text-ink transition-colors"
                >
                  Inspect {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Lost Money Modal */}
      <EmergencyLostMoneyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        targetValue={investigationData?.target_value || inputUrl}
      />
    </div>
  );
};
