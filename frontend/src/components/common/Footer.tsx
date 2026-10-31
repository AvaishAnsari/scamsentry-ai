import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-line mt-auto pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-btn bg-brand text-white flex items-center justify-center">
                <Shield className="w-4 h-4 fill-white/20" />
              </div>
              <span className="font-bold text-base text-ink">ScamSentry AI</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed max-w-md">
              Community scam defense and real-time fraud intelligence network for India.
              Crowdsourcing indicators to protect citizens against digital arrest, fake job offers, and payment fraud.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Privacy First: We do not store reporter IP addresses, names, or contact numbers.
              </span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li>
                <Link to="/check" className="hover:text-brand transition-colors">
                  Check a Number or UPI
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-brand transition-colors">
                  Report a Scam
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-brand transition-colors">
                  7-Day Regional Map
                </Link>
              </li>
              <li>
                <Link to="/alerts" className="hover:text-brand transition-colors">
                  Surge & Anomaly Alerts
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Safety links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">Trust & Support</h4>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li>
                <Link to="/how-it-works" className="hover:text-brand transition-colors">
                  How Verdicts Work
                </Link>
              </li>
              <li>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-brand transition-colors"
                >
                  <span>National Cyber Crime Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="tel:1930" className="text-amber-800 font-semibold hover:underline">
                  Emergency: Call 1930
                </a>
              </li>
              <li>
                <span className="text-[11px] text-gray-400">
                  Built for CyberForge Hackathon
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-muted">
          <p>
            Reports come from the community and represent crowd indicators, not judicial or legal findings.
          </p>
          <p className="shrink-0">
            © 2026 ScamSentry AI Team. Open source MIT license.
          </p>
        </div>
      </div>
    </footer>
  );
};

