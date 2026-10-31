import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Phone,
  CreditCard,
  Link as LinkIcon,
  AlertCircle,
  Lock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { IdentifierType, ScamCategory, ScamReportInput } from '../../types';
import { submitScamReport } from '../../services/api';

const SCAM_CATEGORIES: { id: ScamCategory; label: string; description: string }[] = [
  { id: 'digital_arrest', label: 'Digital Arrest', description: 'Fake police/CBI video call threats' },
  { id: 'fake_kyc', label: 'Fake KYC / Bank', description: 'Urgent SIM block or bank account update' },
  { id: 'upi_refund', label: 'UPI Refund Fraud', description: 'Ask to approve PIN to receive money' },
  { id: 'loan_app', label: 'Loan App Threat', description: 'Blackmail, harassment, or instant loan debt' },
  { id: 'fake_job', label: 'Fake Job Offer', description: 'Paid Telegram tasks or YouTube rating scams' },
  { id: 'electricity_bill', label: 'Electricity Bill Urgency', description: 'Night disconnection threat SMS' },
  { id: 'other', label: 'Something Else', description: 'Lottery, parcel fee, crypto investment' },
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
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
      pincode: '560102',
      channel: 'phone_call',
      occurred_on: 'today',
      lost_money: false,
      lost_amount: '',
    };
  });

  const [areaHint, setAreaHint] = useState<string>('HSR Layout, Bengaluru');
  const [confirmedTruth, setConfirmedTruth] = useState(false);

  // Save draft whenever formData changes
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

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!formData.target_value.trim()) {
      setError('Please provide the phone number, UPI ID, or link.');
      return false;
    }
    if (formData.target_type === 'phone') {
      const digits = formData.target_value.replace(/\D/g, '');
      if (digits.length < 10) {
        setError('Please enter a valid 10-digit phone number.');
        return false;
      }
    } else if (formData.target_type === 'upi') {
      if (!formData.target_value.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. name@bank).');
        return false;
      }
    }
    setError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!formData.pincode || formData.pincode.trim().length !== 6) {
      setError('Please provide a valid 6-digit Indian PIN code for regional mapping.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!confirmedTruth) {
      setError('Please check the confirmation box to proceed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitScamReport({
        ...formData,
        description: formData.description.trim() || `Suspicious ${formData.scam_category.replace('_', ' ')} incident reported.`,
      });

      if (res.status === 'success') {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        navigate(`/report/done?id=${encodeURIComponent(res.report_id || 'rep_success')}&type=${formData.target_type}&val=${encodeURIComponent(formData.target_value)}`);
      } else {
        setError(res.message || 'Failed to submit report. Please try again.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Submission encountered an unexpected error. Please try again.');
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
            We never ask for your name, phone number, email address, or IP. Your incident is grouped by region to warn other citizens.
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="bg-white border border-line rounded-card p-5 sm:p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Report a Scam Incident
          </h1>
          <span className="text-xs font-bold text-brand bg-brand-tint px-2.5 py-1 rounded-full">
            Step {step} of 3
          </span>
        </div>

        {/* Visual Stepper */}
        <div className="flex items-center gap-2 mt-4">
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step >= 1 ? 'bg-brand' : 'bg-line'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step >= 2 ? 'bg-brand' : 'bg-line'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step === 3 ? 'bg-brand' : 'bg-line'
            }`}
          />
        </div>

        <div className="flex justify-between text-[11px] font-semibold text-ink-muted mt-2">
          <span className={step >= 1 ? 'text-brand' : ''}>1. What happened</span>
          <span className={step >= 2 ? 'text-brand' : ''}>2. Where & when</span>
          <span className={step === 3 ? 'text-brand' : ''}>3. Review & submit</span>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="mb-6 p-4 rounded-btn bg-risk-red-tint border border-risk-red/30 text-risk-red text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: What happened */}
      {step === 1 && (
        <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              What identifier are you reporting?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, target_type: 'phone' })}
                className={`py-2.5 px-3 rounded-btn border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  formData.target_type === 'phone'
                    ? 'border-brand bg-brand-tint text-brand'
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
                    ? 'border-brand bg-brand-tint text-brand'
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
                    ? 'border-brand bg-brand-tint text-brand'
                    : 'border-line hover:border-gray-400 text-ink-muted'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Link / URL</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="target-value-input" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1.5">
              {formData.target_type === 'phone'
                ? 'Suspicious Phone Number'
                : formData.target_type === 'upi'
                ? 'Fraudulent UPI ID / VPA'
                : 'Suspicious Website Link'}
            </label>
            <input
              id="target-value-input"
              type="text"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
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
              Enter the exact phone number, UPI handle, or link sent to you.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              What kind of scam was it?
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

          <div className="pt-4 border-t border-line flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="h-12 px-7 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Next: Where and When</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Where and When */}
      {step === 2 && (
        <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <label htmlFor="pincode-input" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1.5">
              Where were you located? (6-digit PIN code)
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
            <p className="mt-1 text-[11px] text-ink-muted">
              Used strictly to plot regional cluster heatmaps. Exact streets or premises are never captured.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              When did this fraud attempt occur?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['today', 'yesterday', 'earlier'] as const).map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setFormData({ ...formData, occurred_on: time })}
                  className={`py-2.5 px-3 rounded-btn border text-xs sm:text-sm font-semibold capitalize transition-all ${
                    formData.occurred_on === time
                      ? 'border-brand bg-brand-tint text-brand'
                      : 'border-line hover:border-gray-400 text-ink-muted'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              How did they reach you?
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

          <div>
            <label htmlFor="description-input" className="text-xs font-bold uppercase tracking-wider text-ink block mb-1.5">
              Incident Details / Narrative (Optional)
            </label>
            <textarea
              id="description-input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Claimed to be Mumbai police inspector, threatened arrest if I didn't verify bank balance on Skype video call..."
              className="w-full p-3 rounded-btn border border-line text-xs sm:text-sm focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div className="pt-4 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-12 px-5 text-ink font-semibold text-xs sm:text-sm rounded-btn border border-line hover:bg-surface transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="h-12 px-7 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Next: Review & Submit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div className="border border-line rounded-card divide-y divide-line text-xs">
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-ink-muted block text-[11px]">Reported Identifier</span>
                <span className="font-mono font-bold text-sm text-ink">{formData.target_value}</span>
                <span className="text-ink-muted text-[11px] block capitalize">Type: {formData.target_type}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-brand font-semibold hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-ink-muted block text-[11px]">Scam Category</span>
                <span className="font-bold text-ink">
                  {SCAM_CATEGORIES.find((c) => c.id === formData.scam_category)?.label || formData.scam_category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-brand font-semibold hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-ink-muted block text-[11px]">Area / PIN Code</span>
                <span className="font-bold text-ink">{formData.pincode} ({areaHint || `${formData.city}, ${formData.state}`})</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-brand font-semibold hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-ink-muted block text-[11px]">Timeline & Channel</span>
                <span className="font-bold text-ink capitalize">
                  {formData.occurred_on} via {formData.channel?.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-brand font-semibold hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-ink-muted block text-[11px]">Financial Loss</span>
                <span className="font-bold text-ink">
                  {formData.lost_money ? `Yes (₹${formData.lost_amount || 'unspecified'})` : 'No money lost'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-brand font-semibold hover:underline"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Privacy Transparency Box */}
          <div className="bg-surface border border-line rounded-card p-4 space-y-2 text-xs">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Privacy Guarantee</span>
            </div>
            <p className="text-ink-muted">
              <strong>What we store:</strong> Identifier ({formData.target_value}), scam classification, 6-digit area PIN code, and timestamp.
            </p>
            <p className="text-ink-muted">
              <strong>What we never store:</strong> Your name, phone number, email address, or device IP. Reports are processed with salted anti-abuse hashes.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedTruth}
              onChange={(e) => setConfirmedTruth(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-line text-brand focus:ring-brand"
            />
            <span className="text-xs text-ink leading-relaxed font-medium">
              I confirm that this report describes a genuine suspected fraud attempt to the best of my knowledge, and is not submitted to harass or defame any legitimate person or business.
            </span>
          </label>

          <div className="pt-4 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
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
                  <span>Submit Anonymous Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
