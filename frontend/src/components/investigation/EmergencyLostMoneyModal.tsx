import React from 'react';
import {
  X,
  PhoneCall,
  Lock,
  ExternalLink,
  AlertOctagon,
  CreditCard,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface EmergencyLostMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetValue?: string;
}

export const EmergencyLostMoneyModal: React.FC<EmergencyLostMoneyModalProps> = ({
  isOpen,
  onClose,
  targetValue,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-card max-w-xl w-full border border-line shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-risk-red text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-btn">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Emergency Scam Response Protocol
              </h2>
              <p className="text-xs text-red-100">
                Immediate actions if you transferred money or shared bank OTPs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-btn hover:bg-white/20 text-white transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-ink text-xs sm:text-sm">
          {/* Crucial Disclaimer */}
          <div className="p-3.5 rounded-btn bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Crucial Safety Warning:</strong>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                ScamSentry AI is a public threat intelligence and warning platform. ScamSentry <strong>cannot reverse transactions</strong> or access banking networks. Beware of fraudulent &quot;recovery agents&quot; on Telegram or Instagram demanding fees to recover lost funds.
              </p>
            </div>
          </div>

          {/* Action Step 1 */}
          <div className="border border-line rounded-card p-4 bg-surface">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="space-y-1">
                <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-brand" />
                  <span>Freeze Cards & Net Banking Immediately</span>
                </h3>
                <p className="text-ink-muted text-xs leading-relaxed">
                  Open your official mobile banking app (SBI YONO, HDFC, ICICI, etc.) and freeze all debit/credit cards. Turn off international and online transactions to prevent subsequent unauthorized debits.
                </p>
              </div>
            </div>
          </div>

          {/* Action Step 2 */}
          <div className="border border-line rounded-card p-4 bg-surface">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="space-y-1">
                <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-risk-red" />
                  <span>Call National Cyber Helpline: 1930 (Golden Hour)</span>
                </h3>
                <p className="text-ink-muted text-xs leading-relaxed">
                  The Ministry of Home Affairs operates the Citizen Financial Cyber Fraud Reporting System. If reported within 2 to 4 hours of transfer, authorities can freeze beneficiary accounts before scammers withdraw cash.
                </p>
                <div className="pt-2">
                  <a
                    href="tel:1930"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-risk-red text-white text-xs font-bold rounded-btn hover:bg-red-800 transition-colors shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Dial 1930 Helpline Now</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action Step 3 */}
          <div className="border border-line rounded-card p-4 bg-surface">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="space-y-1">
                <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Raise Dispute in UPI App with UTR Number</span>
                </h3>
                <p className="text-ink-muted text-xs leading-relaxed">
                  Locate the 12-digit UTR (Unique Transaction Reference) number in your Google Pay, PhonePe, Paytm, or BHIM transaction history. Go to &quot;Have an issue with this transaction?&quot; and flag it as fraud.
                </p>
              </div>
            </div>
          </div>

          {/* Action Step 4 */}
          <div className="border border-line rounded-card p-4 bg-surface">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div className="space-y-1">
                <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand" />
                  <span>Lodge Official Police Complaint on Cybercrime Portal</span>
                </h3>
                <p className="text-ink-muted text-xs leading-relaxed">
                  File an official FIR acknowledgment online at the Government of India portal. Keep transaction screenshots, SMS messages, and the suspect URL handy.
                </p>
                <div className="pt-2">
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-line rounded-btn bg-white hover:bg-gray-100 text-ink text-xs font-semibold transition-colors"
                  >
                    <span>Visit cybercrime.gov.in</span>
                    <ExternalLink className="w-3.5 h-3.5 text-brand" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {targetValue && (
            <div className="text-[11px] text-ink-muted font-mono bg-gray-100 p-2.5 rounded-btn break-all">
              Suspect URL reported: <strong>{targetValue}</strong>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface border-t border-line flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-ink text-white text-xs font-semibold rounded-btn hover:bg-black transition-colors"
          >
            I Understand — Close Emergency Guide
          </button>
        </div>
      </div>
    </div>
  );
};
