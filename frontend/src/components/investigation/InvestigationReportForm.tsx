import React, { useState } from 'react';
import {
  FileCheck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ScamCategory, ScamReportInput } from '../../types';
import { submitScamReport } from '../../services/api';

interface InvestigationReportFormProps {
  initialTargetValue: string;
}

const CATEGORIES: { id: ScamCategory; label: string }[] = [
  { id: 'fake_kyc', label: 'Fake KYC / Bank Phishing' },
  { id: 'digital_arrest', label: 'Digital Arrest / Impersonation' },
  { id: 'upi_refund', label: 'UPI Refund Fraud' },
  { id: 'electricity_bill', label: 'Electricity Bill Urgency' },
  { id: 'fake_job', label: 'Fake Job / Task Scam' },
  { id: 'loan_app', label: 'Illegal Loan App' },
  { id: 'other', label: 'Other Fraudulent Modus' },
];

export const InvestigationReportForm: React.FC<InvestigationReportFormProps> = ({
  initialTargetValue,
}) => {
  const [targetValue, setTargetValue] = useState(initialTargetValue);
  const [category, setCategory] = useState<ScamCategory>('fake_kyc');
  const [channel, setChannel] = useState<'phone_call' | 'whatsapp' | 'sms' | 'email'>('sms');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560102');
  const [lostMoney, setLostMoney] = useState(false);
  const [lostAmount, setLostAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);

  // Sync if prop changes
  React.useEffect(() => {
    setTargetValue(initialTargetValue);
  }, [initialTargetValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim()) {
      setError('Please provide the target URL to report.');
      return;
    }
    if (!confirmed) {
      setError('Please check the confirmation box verifying your report.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessReportId(null);

    const reportData: ScamReportInput = {
      target_type: 'url',
      target_value: targetValue.trim(),
      scam_category: category,
      description: description.trim() || `Reported during investigation of suspicious URL: ${targetValue}`,
      city,
      state,
      pincode: pincode.trim() || '560102',
      channel,
      occurred_on: 'today',
      lost_money: lostMoney,
      lost_amount: lostMoney ? lostAmount : '',
    };

    try {
      const res = await submitScamReport(reportData);

      if (res.status === 'success') {
        setSuccessReportId(res.report_id || `rep_${Date.now().toString().slice(-6)}`);
        setDescription('');
      } else {
        setError(res.message || 'Unable to submit report. Backend server may be offline.');
      }
    } catch {
      setError('Unable to reach ScamSentry backend. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="investigation-report-section" className="bg-white border border-line rounded-card p-5 sm:p-7 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <FileCheck className="w-5 h-5 text-brand" />
        <h3 className="text-base sm:text-lg font-bold text-ink">
          Help Protect Others
        </h3>
      </div>
      <p className="text-xs text-ink-muted mb-5 leading-relaxed">
        Did you receive a suspicious link via SMS, WhatsApp, or email? Submit an anonymous report to alert citizens across India.
      </p>

      {/* Privacy Promise Callout */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-btn p-3 mb-5 flex items-start gap-2.5 text-xs">
        <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-emerald-900 block">
            100% Anonymous Citizen Submission
          </span>
          <span className="text-emerald-800 leading-relaxed">
            We never record your IP address, name, phone number, or personal details. Reports are verified using privacy-preserving cryptographic hashes.
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successReportId && (
        <div className="p-4 rounded-btn bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs mb-5 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              Thank you! Your anonymous report was submitted successfully.
            </p>
            <p className="mt-1 text-emerald-800">
              Reference ID:{' '}
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                {successReportId}
              </span>
            </p>
            <p className="mt-1 text-emerald-700 text-[11px]">
              Our automated threat feed has indexed this URL to protect other users of the ScamSentry extension and platform.
            </p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-btn bg-risk-red-tint border border-risk-red/40 text-risk-red text-xs mb-5 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-risk-red shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Report Submission Failed</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Report Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Target URL */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
            Target URL to Report
          </label>
          <input
            type="text"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            required
            placeholder="e.g. sbi-kyc-update.in/login"
            className="w-full h-11 px-3.5 rounded-btn border border-line text-sm font-mono focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          />
        </div>

        {/* Category & Channel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
              Scam Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ScamCategory)}
              className="w-full h-11 px-3 rounded-btn border border-line text-sm bg-white focus:border-brand outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
              Contact Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as any)}
              className="w-full h-11 px-3 rounded-btn border border-line text-sm bg-white focus:border-brand outline-none"
            >
              <option value="sms">SMS Text Message</option>
              <option value="whatsapp">WhatsApp Message</option>
              <option value="phone_call">Phone Call</option>
              <option value="email">Phishing Email</option>
            </select>
          </div>
        </div>

        {/* Location & Pincode Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
              Area PIN Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 560102"
              className="w-full h-11 px-3 rounded-btn border border-line text-sm focus:border-brand outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full h-11 px-3 rounded-btn border border-line text-sm focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              className="w-full h-11 px-3 rounded-btn border border-line text-sm focus:border-brand outline-none"
            />
          </div>
        </div>

        {/* Narrative / Context */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1">
            Incident Description (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Received SMS stating SBI account will be suspended tonight unless PAN is linked via this link."
            className="w-full p-3 rounded-btn border border-line text-xs sm:text-sm focus:border-brand outline-none resize-none"
          />
        </div>

        {/* Financial Loss Check */}
        <div className="p-3 bg-surface border border-line rounded-btn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink">
              Did you incur financial loss?
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLostMoney(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-btn border transition-all ${
                  !lostMoney
                    ? 'border-brand bg-brand text-white'
                    : 'border-line text-ink-muted bg-white'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setLostMoney(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-btn border transition-all ${
                  lostMoney
                    ? 'border-risk-red bg-risk-red text-white'
                    : 'border-line text-ink-muted bg-white'
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {lostMoney && (
            <div className="mt-3 pt-3 border-t border-line">
              <input
                type="text"
                value={lostAmount}
                onChange={(e) => setLostAmount(e.target.value)}
                placeholder="Lost amount in ₹ (e.g. 5000)"
                className="w-full h-10 px-3 rounded-btn border border-line text-xs bg-white focus:border-brand outline-none"
              />
            </div>
          )}
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-line text-brand focus:ring-brand"
          />
          <span className="text-xs text-ink-muted leading-relaxed font-medium">
            I confirm that this report describes a genuine suspected scam or phishing attempt to protect other citizens.
          </span>
        </label>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !confirmed}
            className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-btn transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting to ScamSentry...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Anonymous Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

