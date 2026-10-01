import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ShieldCheck, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface VerificationNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToWithdraw?: () => void;
  isStandalone?: boolean;
}

export const VerificationNotificationModal: React.FC<VerificationNotificationModalProps> = ({
  isOpen,
  onClose,
  onProceedToWithdraw,
  isStandalone = false
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [revealCode, setRevealCode] = useState(false);

  if (!isOpen && !isStandalone) return null;

  const hasApprovedCode = user?.hasActiveCode && user?.activeCashbackCode;
  const rawCode = hasApprovedCode ? user.activeCashbackCode! : '';
  const maskedCode = hasApprovedCode
    ? (revealCode ? rawCode : 'PALM-CB-••••-••••')
    : 'Hidden (Requires Purchase & Admin Approval)';

  const handleCopy = () => {
    if (!hasApprovedCode) return;
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contentMarkup = (
    <div className="mirror-glass-card max-w-xl w-full mx-auto rounded-3xl p-6 sm:p-7 border border-purple-500/35 shadow-[0_25px_70px_rgba(10,4,20,0.9)] relative my-2 sm:my-4">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />

      {/* Standalone Back Navigation Header */}
      {isStandalone && (
        <div className="flex items-center justify-between pb-3.5 border-b border-purple-500/20 mb-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 hover:text-white text-xs font-bold transition-all border border-purple-400/30"
          >
            ← Back to Dashboard
          </button>
          <span className="text-[10px] sm:text-xs font-black uppercase text-[#00B875] bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Clearance Verification
          </span>
        </div>
      )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Approved Checkmark Badge */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#621494] to-[#7E1DC6] p-3 shadow-[0_0_30px_rgba(126,29,198,0.5)] flex items-center justify-center border border-purple-300/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-purple-500/25 text-purple-200 border border-purple-400/30 px-3 py-0.5 rounded-full text-xs font-black tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFC107]" />
              Approved
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Poppins',sans-serif]">
              Verification Notification
            </h3>
            <p className="text-xs text-purple-200/80">
              Clearance protocol timestamp: <strong className="text-white">29 Sept 2026</strong>
            </p>
          </div>
        </div>

        {/* Step-by-step progress indicator */}
        <div className="my-5 p-3 rounded-2xl bg-black/50 border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-300/80 font-medium">Clearance Status:</span>
            <span className={hasApprovedCode ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-amber-400 font-bold flex items-center gap-1'}>
              {hasApprovedCode ? <><Check className="w-3.5 h-3.5 text-[#00B875]" /> Active &amp; Cleared</> : 'Pending Purchase Clearance'}
            </span>
          </div>

          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#621494] to-[#A855F7] h-full rounded-full transition-all duration-500"
              style={{ width: hasApprovedCode ? '100%' : '35%' }}
            />
          </div>

          <p className="text-[11px] text-purple-200/80 leading-snug">
            {hasApprovedCode 
              ? 'Your CBN automated cash disburser authorization code is active and ready for withdrawal clearance.' 
              : 'Purchase a CashBack Code (₦8,550) to unlock and reveal your clearance code for withdrawals.'}
          </p>
        </div>

        {/* Masked Withdrawal Code Input Field & Copy Button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FFC107]" />
              Withdrawal Authentication Code
            </label>
            {hasApprovedCode && (
              <button
                onClick={() => setRevealCode(!revealCode)}
                className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1"
              >
                {revealCode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{revealCode ? 'Hide' : 'Reveal'}</span>
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={hasApprovedCode ? (revealCode ? rawCode : '••••••••••••••••') : 'Locked (Purchase Required)'}
              className="w-full bg-[#150A24] text-white text-sm sm:text-base font-mono font-bold tracking-widest rounded-xl px-4 py-3.5 border border-purple-500/30 focus:outline-none text-center select-all shadow-inner"
            />
          </div>

          {/* Copy Code button in PalmPay Purple */}
          {hasApprovedCode ? (
            <button
              onClick={handleCopy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(126,29,198,0.4)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-300/30"
            >
              {copied ? <Check className="w-4 h-4 text-[#FFC107]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Code Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs sm:text-sm transition-all"
            >
              Close
            </button>
          )}
        </div>

        {/* Bottom CTA to proceed */}
        {onProceedToWithdraw && (
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <button
              onClick={() => {
                onClose();
                onProceedToWithdraw();
              }}
              className="text-xs text-[#FFC107] hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Proceed to Withdraw Funds</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
  );

  if (isStandalone) {
    return (
      <div className="animate-in fade-in duration-300 w-full py-2">
        {contentMarkup}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      {contentMarkup}
    </div>
  );
};
