import React, { useState } from 'react';
import {
  Network,
  Building,
  Phone,
  CreditCard,
  Globe,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { RelatedIndicator } from '../../types';

interface VisualConnectionGraphProps {
  targetValue: string;
  relatedIndicators?: RelatedIndicator[];
  isMock?: boolean;
}

export const VisualConnectionGraph: React.FC<VisualConnectionGraphProps> = ({
  targetValue,
  relatedIndicators = [],
  isMock = false,
}) => {
  const [selectedNode, setSelectedNode] = useState<RelatedIndicator | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Node type styles & icons
  const getNodeMeta = (type: RelatedIndicator['type']) => {
    switch (type) {
      case 'brand':
      case 'impersonated_brand':
        return {
          label: 'Impersonated Brand',
          color: '#7C3AED',
          bg: '#EDE9FE',
          border: '#C4B5FD',
          icon: Building,
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'phone':
        return {
          label: 'Linked Phone Number',
          color: '#2563EB',
          bg: '#DBEAFE',
          border: '#93C5FD',
          icon: Phone,
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'upi':
        return {
          label: 'Linked UPI ID / VPA',
          color: '#0D9488',
          bg: '#CCFBF1',
          border: '#5EEAD4',
          icon: CreditCard,
          badge: 'bg-teal-100 text-teal-800 border-teal-200',
        };
      case 'category':
        return {
          label: 'Scam Modus Operandi',
          color: '#D97706',
          bg: '#FEF3C7',
          border: '#FCD34D',
          icon: Tag,
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'domain':
      case 'url':
      default:
        return {
          label: 'Linked Infrastructure / URL',
          color: '#E11D48',
          bg: '#FFE4E6',
          border: '#FDA4AF',
          icon: Globe,
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
        };
    }
  };

  const hasConnections = relatedIndicators && relatedIndicators.length > 0;

  // Layout calculations for SVG
  const svgWidth = 600;
  const svgHeight = 360;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const radius = 135;

  const nodesWithPositions = relatedIndicators.map((item, index) => {
    const total = relatedIndicators.length;
    // Distribute angles evenly around the center
    const angle = (index * (2 * Math.PI)) / total - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return {
      ...item,
      x,
      y,
      meta: getNodeMeta(item.type),
    };
  });

  return (
    <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-brand" />
            <h3 className="text-base sm:text-lg font-bold text-ink">
              Visual Scam Connection Graph
            </h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Cross-indicator syndicate linkages, impersonated brands, and linked payment VPAs
          </p>
        </div>

        {isMock && (
          <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Demo Mock Graph
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 px-3 bg-surface border border-line rounded-btn text-[11px] font-medium text-ink-muted mb-5">
        <span className="font-bold text-ink">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand" />
          <span>Central Target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          <span>Brand</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span>Phone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          <span>UPI / VPA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Category</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <span>Domain</span>
        </div>
      </div>

      {/* Main Graph Content */}
      {!hasConnections ? (
        <div className="p-8 sm:p-12 text-center rounded-card bg-surface border border-dashed border-line my-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mx-auto mb-3">
            <Network className="w-6 h-6" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-ink">
            No known connection
          </h4>
          <p className="text-xs text-ink-muted max-w-md mx-auto mt-1 leading-relaxed">
            No cross-indicator links or syndicates have been mapped to this entity yet. As more reports arrive from citizens, ScamSentry connects phones, UPI IDs, and links automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SVG Canvas Container */}
          <div className="relative w-full bg-surface border border-line rounded-card overflow-hidden select-none flex items-center justify-center p-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[420px]"
              style={{ minHeight: '280px' }}
            >
              <defs>
                {/* Glow Filter for Active Nodes */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Central Radial Gradient */}
                <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Central Background Pulse */}
              <circle
                cx={centerX}
                cy={centerY}
                r="110"
                fill="url(#centerGradient)"
              />

              {/* Connection Lines & Relationship Labels */}
              {nodesWithPositions.map((node, i) => {
                const isSelected = selectedNode?.value === node.value;
                const midX = (centerX + node.x) / 2;
                const midY = (centerY + node.y) / 2;

                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={node.x}
                      y2={node.y}
                      stroke={isSelected ? node.meta.color : '#CBD5E1'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray={isSelected ? 'none' : '4 3'}
                      className="transition-all duration-300"
                    />
                    {/* Relationship Pill on Line */}
                    <rect
                      x={midX - 38}
                      y={midY - 9}
                      width="76"
                      height="18"
                      rx="9"
                      fill="#FFFFFF"
                      stroke={isSelected ? node.meta.color : '#E2E8F0'}
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isSelected ? node.meta.color : '#64748B'}
                      fontWeight="600"
                    >
                      {node.relationship.length > 13 ? `${node.relationship.slice(0, 11)}..` : node.relationship}
                    </text>
                  </g>
                );
              })}

              {/* Center Target Node */}
              <g
                transform={`translate(${centerX}, ${centerY})`}
                className="cursor-pointer"
              >
                <title>{`Inspected target: ${targetValue}`}</title>
                <circle
                  r="34"
                  fill="#1F4FC4"
                  stroke="#DBEAFE"
                  strokeWidth="4"
                  className="shadow-md"
                />
                <circle
                  r="40"
                  fill="none"
                  stroke="#1F4FC4"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  className="animate-spin"
                  style={{ animationDuration: '24s' }}
                />
                <text
                  y="-5"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="bold"
                >
                  TARGET
                </text>
                <text
                  y="9"
                  textAnchor="middle"
                  fill="#93C5FD"
                  fontSize="8"
                  fontWeight="600"
                >
                  Inspected URL
                </text>
              </g>

              {/* Satellite Connected Nodes */}
              {nodesWithPositions.map((node, i) => {
                const isSelected = selectedNode?.value === node.value;

                return (
                  <g
                    key={`node-${i}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    {/* Outer hover ring */}
                    <circle
                      r={isSelected ? 26 : 22}
                      fill={node.meta.bg}
                      stroke={node.meta.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={isSelected ? 'url(#glow)' : undefined}
                      className="transition-all duration-200"
                    />

                    {/* Node Label Text under the circle */}
                    <rect
                      x="-55"
                      y="26"
                      width="110"
                      height="18"
                      rx="4"
                      fill="#FFFFFF"
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      className="shadow-sm"
                    />
                    <text
                      x="0"
                      y="38"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill="#1E293B"
                    >
                      {node.value.length > 18 ? `${node.value.slice(0, 16)}..` : node.value}
                    </text>

                    {/* Icon or Type initial inside circle */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill={node.meta.color}
                    >
                      {node.type.toUpperCase().slice(0, 3)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tap instruction */}
            <div className="absolute bottom-2 right-3 text-[10px] text-ink-muted bg-white/90 backdrop-blur px-2 py-0.5 rounded border border-line shadow-xs pointer-events-none">
              Click any node to inspect details
            </div>
          </div>

          {/* Connected Indicators Cards / Selected Node Detail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {nodesWithPositions.map((node, i) => {
              const isSelected = selectedNode?.value === node.value;
              const Icon = node.meta.icon;

              return (
                <div
                  key={`card-${i}`}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-btn border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand bg-brand-tint/40 shadow-xs ring-1 ring-brand'
                      : 'border-line bg-surface hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${node.meta.badge} flex items-center gap-1`}>
                      <Icon className="w-3 h-3" />
                      {node.meta.label}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(node.value);
                      }}
                      className="text-ink-muted hover:text-ink p-1 rounded hover:bg-white transition-colors"
                      title="Copy indicator value"
                    >
                      {copiedText === node.value ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="font-mono font-bold text-ink truncate mb-1" title={node.value}>
                    {node.value}
                  </div>

                  <div className="text-[11px] text-ink-muted flex items-center gap-1">
                    <span className="font-semibold text-ink">Link:</span>
                    <span>{node.relationship}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
