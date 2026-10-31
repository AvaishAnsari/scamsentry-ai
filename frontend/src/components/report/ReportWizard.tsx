import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Phone,
  CreditCard,
  Link as LinkIcon,
  AlertCircle,
  Lock,
  ArrowLeft,
  MapPin,
  FileCheck,
  ShieldAlert,
  Zap,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { IdentifierType, ScamCategory, ScamReportInput } from '../../types';
import { submitScamReport } from '../../services/api';

const SCAM_CATEGORIES: { id: ScamCategory; label: string; description: string }[] = [
  { id: 'digital_arrest', label: 'Digital Arrest', description: 'Fake police/CBI video call threats' },
  { id: 'fake_kyc', label: 'Fake KYC / Bank', description: 'Urgent SIM block or bank account update' },
  { id: 'upi_refund', label: 'UPI Fraud / Refund', description: 'Ask to approve PIN to receive money' },
  { id: 'loan_app', label: 'Loan App Threat', description: 'Blackmail, harassment, or instant loan debt' },
  { id: 'fake_job', label: 'Fake Job Offer', description: 'Paid Telegram tasks or YouTube rating scams' },
  { id: 'electricity_bill', label: 'Electricity Bill Urgency', description: 'Night disconnection threat SMS' },
  { id: 'other', label: 'Other Fraud', description: 'Lottery, parcel fee, crypto investment' },
];

const PINCODE_MAP: Record<string, { city: string; state: string; area: string }> = {
  '560102': { city: 'Bengaluru', state: 'Karnataka', area: 'HSR Layout' },
  '560034': { city: 'Bengaluru', state: 'Karnataka', area: 'Koramangala' },
  '560037': { city: 'Bengaluru', state: 'Karnataka', area: 'Marathahalli' },
  '560066': { city: 'Bengaluru', state: 'Karnataka', area: 'Whitefield' },
  '560038': { city: 'Bengaluru', state: 'Karnataka', area: 'Indiranagar' },
  '560076': { city: 'Bengaluru', state: 'Karnataka', area: 'BTM Layout' },
  '400069': { city: 'Mumbai', state: 'Maharashtra', area: 'Andheri East' },
  '400001': { city: 'Mumbai', state: 'Maharashtra', area: 'Fort / South Mumbai' },
  '110001': { city: 'New Delhi', state: 'Delhi', area: 'Connaught Place' },
  '201301': { city: 'Noida', state: 'Uttar Pradesh', area: 'Sector 62' },
  '500081': { city: 'Hyderabad', state: 'Telangana', area: 'HITEC City' },
  '600028': { city: 'Chennai', state: 'Tamil Nadu', area: 'R.A. Puram' },
  '700001': { city: 'Kolkata', state: 'West Bengal', area: 'BBD Bagh' },
  '411001': { city: 'Pune', state: 'Maharashtra', area: 'Camp' },
};

const DRAFT_STORAGE_KEY = 'scamsentry_report_draft';

export const ReportWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Query parameter pre-fills
  const initialType = (searchParams.get('type') as IdentifierType) || 'phone';
  const initialVal = searchParams.get('val') || '';
  const initialPin = searchParams.get('pincode') || '';

  // Level 1 = Quick Community Warning (Short & Fast)
  // Level 2 = Optional Evidence & Location Details
  const [reportingLevel, setReportingLevel] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<ScamReportInput>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (initialVal) parsed.target_value = initialVal;
        if (initialType) parsed.target_type = initialType;
        if (initialPin) parsed.pincode = initialPin;
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      target_type: initialType,
      target_value: initialVal,
      scam_category: 'digital_arrest',
      description: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: initialPin || '',
      channel: 'phone_call',
      occurred_on: 'today',
      lost_money: false,
      lost_amount: '',
      evidence_url: '',
      evidence_reference: '',
    };
  });

  const [areaHint, setAreaHint] = useState<string>('');
  const [confirmedTruth, setConfirmedTruth] = useState(true);

  // Auto-detect identifier type if user pastes input
  const detectType = (val: string): IdentifierType => {
    const clean = val.trim();
    if (clean.includes('@')) return 'upi';
    if (clean.includes('.') && (clean.startsWith('http') || clean.includes('/'))) return 'url';
    return 'phone';
  };

  const handleIdentifierChange = (val: string) => {
    const updated: Partial<ScamReportInput> = { target_value: val };
    if (!formData.target_value && val.length > 3) {
      updated.target_type = detectType(val);
    }
    setFormData((prev) => ({ ...prev, ...updated }));
    if (error) setError(null);
  };

  // Save draft
  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  // Update area hint when pincode changes
  useEffect(() => {
    if (formData.pincode && formData.pincode.length === 6) {
      const match = PINCODE_MAP[formData.pincode];
      if (match) {
        setAreaHint(`${match.area}, ${match.city}`);
        setFormData((prev) => ({
          ...prev,
          city: match.city,
          state: match.state,
        }));
      } else {
        setAreaHint('Area will be matched automatically');
      }
    } else {
      setAreaHint('');
    }
  }, [formData.pincode]);

  // Validate Level 1 (Short & Easy)
  const validateQuickWarning = (): boolean => {
    const cleanVal = formData.target_value.trim();
    if (!cleanVal) {
      setError('Please provide the phone number, UPI ID, or web link.');
      return false;
    }
    if (formData.target_type === 'phone') {
      const digits = cleanVal.replace(/\D/g, '');
      if (digits.length < 10) {
        setError('Please enter a valid 10-digit phone number.');
        return false;
      }
    } else if (formData.target_type === 'upi') {
      if (!cleanVal.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. name@bank).');
        return false;
      }
    }
    setError(null);
    return true;
  };

  // Submit report handler (works for either Level 1 or Level 2)
  const handleSubmit = async () => {
    if (!validateQuickWarning()) return;

    if (!confirmedTruth) {
      setError('Please check the confirmation box to submit.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitScamReport({
        ...formData,
        description: formData.description?.trim() || undefined,
        pincode: formData.pincode?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
      });

      if (res.status === 'success' || res.status === 'duplicate') {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        // Pass response guidance & details to done page via sessionStorage
        try {
          sessionStorage.setItem(
            'scamsentry_last_report_result',
            JSON.stringify({
              reportId: res.report_id,
              targetVal: formData.target_value,
              targetType: formData.target_type,
              status: res.status,
              verificationStatus: res.verification_status || 'UNDER_REVIEW',
              confidenceLevel: res.confidence_level || 'LOW',
              communityImpactMessage: res.community_impact_message,
              safetyGuidance: res.safety_guidance || [],
            })
          );
        } catch {
          // ignore
        }

        navigate(
          `/report/done?id=${encodeURIComponent(res.report_id || 'rep_success')}&type=${encodeURIComponent(
            formData.target_type || 'phone'
          )}&val=${encodeURIComponent(formData.target_value)}&status=${encodeURIComponent(res.status)}`
        );
      } else {
        setError(res.message || 'Failed to submit report. Please try again.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Submission encountered an unexpected network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4">
      {/* Privacy Promise Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-btn p-3.5 mb-6 flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-emerald-900">
            100% Anonymous Crowdsourced Intelligence
          </p>
          <p className="text-emerald-800 mt-0.5">
            We never collect your name, email, or device IP. Reports contribute strictly as community safety signals.
          </p>
        </div>
      </div>

      {/* Level Selection Tabs */}
      <div className="bg-white border border-line rounded-card p-4 sm:p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              Report a Scam Incident
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Help protect fellow citizens with early community warning signals.
            </p>
          </div>

          <div className="flex bg-surface p-1 rounded-btn border border-line text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setReportingLevel(1)}
              className={`px-3 py-1.5 rounded-btn flex items-center gap-1.5 transition-colors ${
                reportingLevel === 1 ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Level 1: Quick Warning</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (validateQuickWarning()) setReportingLevel(2);
              }}
              className={`px-3 py-1.5 rounded-btn flex items-center gap-1.5 transition-colors ${
                reportingLevel === 2 ? 'bg-white text-brand shadow-sm font-bold' : 'text-ink-muted'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-brand" />
              <span>Level 2: Add Evidence</span>
            </button>
          </div>
        </div>

        {/* Legal Safeguard / Mentor Feedback Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-btn p-3 flex items-start gap-2.5 text-xs text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Community Safeguard Notice: </span>
            <span>
              This creates a community warning. It does not automatically prove that the target is a confirmed scam.
              ScamSentry requires independent corroborating reports to escalate risk.
            </span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-btn bg-risk-red-tint border border-risk-red/30 text-risk-red text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* LEVEL 1: Quick Community Warning */}
      {reportingLevel === 1 && (
        <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-line pb-3">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Level 1 — Quick Community Warning (Short & Easy)
            </span>
            <p className="text-xs text-ink-muted mt-1">
              Provide just the suspicious contact and type of fraud to alert the community immediately.
            </p>
          </div>

          {/* Identifier Type Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Identifier Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, target_type: 'phone' })}
                className={`py-2.5 px-3 rounded-btn border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  formData.target_type === 'phone'
                    ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand'
                    : 'border-line hover:border-gray-400 text-ink-muted'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Phone</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, target_type: 'upi' })}
                className={`py-2.5 px-3 rounded-btn border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  formData.target_type === 'upi'
                    ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand'
                    : 'border-line hover:border-gray-400 text-ink-muted'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>UPI ID</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, target_type: 'url' })}
                className={`py-2.5 px-3 rounded-btn border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  formData.target_type === 'url'
                    ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand'
                    : 'border-line hover:border-gray-400 text-ink-muted'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Link / URL</span>
              </button>
            </div>
          </div>

          {/* Target Value Input */}
          <div>
            <label htmlFor="target-value-input" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1.5">
              {formData.target_type === 'phone'
                ? 'Suspicious Phone Number'
                : formData.target_type === 'upi'
                ? 'Fraudulent UPI ID'
                : 'Suspicious Website Link'}
            </label>
            <input
              id="target-value-input"
              type="text"
              value={formData.target_value}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              placeholder={
                formData.target_type === 'phone'
                  ? '+91 98765 43210'
                  : formData.target_type === 'upi'
                  ? 'fraudster@bank'
                  : 'https://fake-login-bank.in'
              }
              className="w-full h-12 px-4 rounded-btn border border-line text-sm font-mono font-medium focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Enter the phone number, UPI handle, or link sent to you.
            </p>
          </div>

          {/* Scam Category Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Scam Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SCAM_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, scam_category: cat.id })}
                  className={`text-left p-3.5 rounded-card border transition-all ${
                    formData.scam_category === cat.id
                      ? 'border-brand bg-brand-tint/40 shadow-sm ring-1 ring-brand'
                      : 'border-line hover:border-gray-400 bg-white'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm text-ink block">
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-ink-muted block mt-0.5">
                    {cat.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Short Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="quick-desc" className="text-xs font-bold uppercase tracking-wider text-ink">
                Short Description
              </label>
              <span className="text-[11px] text-brand font-semibold">Optional</span>
            </div>
            <textarea
              id="quick-desc"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Sent fake electricity bill SMS demanding immediate bill payment..."
              className="w-full p-3 rounded-btn border border-line text-xs sm:text-sm focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Truth Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-2">
            <input
              type="checkbox"
              checked={confirmedTruth}
              onChange={(e) => setConfirmedTruth(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-line text-brand focus:ring-brand"
            />
            <span className="text-xs text-ink leading-relaxed font-medium">
              I confirm this report describes a genuine suspected fraud attempt to the best of my knowledge.
            </span>
          </label>

          {/* Action Row: Quick Submit or Add Level 2 Details */}
          <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (validateQuickWarning()) setReportingLevel(2);
              }}
              className="w-full sm:w-auto h-11 px-5 border border-line text-ink hover:bg-surface font-semibold text-xs rounded-btn transition-colors flex items-center justify-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4 text-brand" />
              <span>Add Evidence / Location (Level 2) →</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !confirmedTruth}
              className="w-full sm:w-auto h-12 px-7 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging warning...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Submit Quick Community Warning</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 2: Optional Evidence & Location Details */}
      {reportingLevel === 2 && (
        <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-line pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Level 2 — Optional Evidence & Location Details
              </span>
              <p className="text-xs text-ink-muted mt-1">
                Adding area PIN codes and transaction references helps map localized threat clusters.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReportingLevel(1)}
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Quick Report</span>
            </button>
          </div>

          {/* Area PIN Code */}
          <div>
            <label htmlFor="pincode-input" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1.5">
              Regional PIN Code (Optional)
            </label>
            <div className="relative">
              <input
                id="pincode-input"
                type="text"
                maxLength={6}
                value={formData.pincode || ''}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                placeholder="560102"
                className="w-full h-12 px-4 rounded-btn border border-line text-sm font-mono font-medium focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <MapPin className="absolute right-4 top-3.5 w-5 h-5 text-ink-muted pointer-events-none" />
            </div>
            {areaHint && (
              <p className="mt-1.5 text-xs text-brand font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Detected Area: {areaHint}</span>
              </p>
            )}
          </div>

          {/* How did they reach you */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Communication Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'phone_call', label: 'Phone call' },
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'sms', label: 'SMS text' },
                { id: 'email', label: 'Email' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, channel: c.id as any })}
                  className={`py-2.5 px-2 rounded-btn border text-xs font-semibold text-center transition-all ${
                    formData.channel === c.id
                      ? 'border-brand bg-brand-tint text-brand'
                      : 'border-line hover:border-gray-400 text-ink-muted'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Loss */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Did you lose money? (Optional)
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, lost_money: false, lost_amount: '' })}
                className={`py-2.5 px-5 rounded-btn border text-xs sm:text-sm font-semibold transition-all ${
                  !formData.lost_money
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-line hover:border-gray-400 text-ink-muted'
                }`}
              >
                No money lost
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, lost_money: true })}
                className={`py-2.5 px-5 rounded-btn border text-xs sm:text-sm font-semibold transition-all ${
                  formData.lost_money
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-line hover:border-gray-400 text-ink-muted'
                }`}
              >
                Yes, lost money
              </button>
            </div>

            {formData.lost_money && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Estimated amount in ₹ (e.g. 5000)"
                  value={formData.lost_amount || ''}
                  onChange={(e) => setFormData({ ...formData, lost_amount: e.target.value })}
                  className="w-full h-11 px-4 rounded-btn border border-line text-sm"
                />
              </div>
            )}
          </div>

          {/* Evidence Reference / URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="evidence-url" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
                Evidence Screenshot Link
              </label>
              <input
                id="evidence-url"
                type="text"
                placeholder="https://imgur.com/... or cloud link"
                value={formData.evidence_url || ''}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                className="w-full h-11 px-3.5 rounded-btn border border-line text-xs font-mono"
              />
            </div>
            <div>
              <label htmlFor="evidence-ref" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
                Transaction / Reference ID
              </label>
              <input
                id="evidence-ref"
                type="text"
                placeholder="e.g. UPI Ref / SMS header"
                value={formData.evidence_reference || ''}
                onChange={(e) => setFormData({ ...formData, evidence_reference: e.target.value })}
                className="w-full h-11 px-3.5 rounded-btn border border-line text-xs font-mono"
              />
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-2">
            <input
              type="checkbox"
              checked={confirmedTruth}
              onChange={(e) => setConfirmedTruth(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-line text-brand focus:ring-brand"
            />
            <span className="text-xs text-ink leading-relaxed font-medium">
              I confirm this report describes a genuine suspected fraud attempt to the best of my knowledge.
            </span>
          </label>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={() => setReportingLevel(1)}
              className="h-12 px-5 text-ink font-semibold text-xs sm:text-sm rounded-btn border border-line hover:bg-surface transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !confirmedTruth}
              className="h-12 px-8 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting report...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Submit Complete Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
