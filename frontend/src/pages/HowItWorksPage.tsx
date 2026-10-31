import React from 'react';
import { Shield, ShieldAlert, PhoneCall, ExternalLink } from 'lucide-react';
import { VerdictBadge } from '../components/lookup/VerdictBadge';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-10">
      {/* Title */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand">
          System Architecture & Standards
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          How ScamSentry Verdicts and Guardrails Work
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          ScamSentry AI is designed to protect citizens without creating an open platform for defamation or false reports. Learn how our risk engine evaluates signals.
        </p>
      </div>

      {/* 4 Verdicts Standard */}
      <section className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" />
          The Four Verdict Standards
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-card border border-line bg-surface space-y-2">
            <div className="flex items-center justify-between">
              <VerdictBadge verdict="KNOWN_SCAM" />
              <span className="text-xs font-bold text-risk-red">High Risk (60–100)</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              <strong>Criteria:</strong> 10+ independent trusted reports across 3+ distinct geographic areas within 90 days, or confirmed active match on verified cyber threat intelligence feeds.
            </p>
          </div>

          <div className="p-4 rounded-card border border-line bg-surface space-y-2">
            <div className="flex items-center justify-between">
              <VerdictBadge verdict="SUSPICIOUS" />
              <span className="text-xs font-bold text-risk-amber">Medium Risk (20–59)</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              <strong>Criteria:</strong> 2 to 9 independent reports, or high-heuristic anomalies such as a domain registered within the past 7 days, or suspicious URL redirect obfuscation.
            </p>
          </div>

          <div className="p-4 rounded-card border border-line bg-surface space-y-2">
            <div className="flex items-center justify-between">
              <VerdictBadge verdict="NO_REPORTS" />
              <span className="text-xs font-bold text-ink-muted">Neutral / Unverified (0)</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              <strong>Criteria:</strong> 0 reports or 1 unverified submission.
              <br />
              <span className="text-ink font-semibold">Important Rule:</span> Silence is never labeled "Safe". Fraud rings frequently dispose of phone numbers and UPI IDs within 48 hours of attack launch.
            </p>
          </div>

          <div className="p-4 rounded-card border border-line bg-surface space-y-2">
            <div className="flex items-center justify-between">
              <VerdictBadge verdict="VERIFIED_BUSINESS" />
              <span className="text-xs font-bold text-risk-green">Low Risk (0)</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              <strong>Criteria:</strong> Exact match to a verified, published directory of registered financial institutions, scheduled commercial banks, or government utilities. Note: Banks never ask for PINs or OTPs over phone calls.
            </p>
          </div>
        </div>
      </section>

      {/* Anti-Abuse and Report-Bombing Protection */}
      <section className="bg-white border border-line rounded-card p-6 sm:p-8 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-brand" />
          Anti-Abuse & Anti-Defamation Guardrails
        </h2>

        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
          Open reporting systems risk malicious "report bombing"—where bad actors attempt to harm a competitor or innocent individual by flooding fake reports. ScamSentry employs multi-tiered defensive barriers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="border border-line rounded-btn p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Reporter Deduplication
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Multiple reports against the same identifier from the same device context within a rolling 24-hour window count as a single weighted submission.
            </p>
          </div>

          <div className="border border-line rounded-btn p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Salted Rotating Hash Fingerprints
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Rate-limiting uses anonymous cryptographic hashes that expire daily. No personally identifying IP addresses or hardware identifiers are persistently retained.
            </p>
          </div>

          <div className="border border-line rounded-btn p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Geographic Dispersion Verification
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              An identifier cannot attain "KNOWN_SCAM" status solely from reports originating in a single narrow location, preventing local grudges from weaponizing the tool.
            </p>
          </div>

          <div className="border border-line rounded-btn p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Format Normalization & Junk Filtering
            </h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Input is automatically normalized into consistent E.164 phone formats and strict UPI VPA structures to block malformed or spam submissions.
            </p>
          </div>
        </div>
      </section>

      {/* Emergency Protocol */}
      <section className="bg-amber-50 border border-amber-200 rounded-card p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-amber-950 flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-amber-700" />
          Indian Cyber Crime Emergency Resources
        </h2>

        <p className="text-xs text-amber-900 leading-relaxed">
          ScamSentry is a community intelligence layer and not a replacement for official law enforcement. If you have lost funds or credentials:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="bg-white border border-amber-200 rounded-btn p-4 space-y-2">
            <h4 className="font-bold text-sm text-ink">National Helpline: 1930</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Operated under the Ministry of Home Affairs (MHA) through I4C (Indian Cyber Crime Coordination Centre). Dial 1930 immediately.
            </p>
            <a
              href="tel:1930"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:underline"
            >
              <span>Call 1930</span>
            </a>
          </div>

          <div className="bg-white border border-amber-200 rounded-btn p-4 space-y-2">
            <h4 className="font-bold text-sm text-ink">Official Portal</h4>
            <p className="text-xs text-ink-muted leading-relaxed">
              Register an official e-complaint and track FIR progress through the official government portal.
            </p>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
            >
              <span>cybercrime.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
