import React from 'react';
import { MessageSquare, ExternalLink, CheckCircle2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useCelebration } from '../../context/CelebrationContext';

interface WhatsAppChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTimeAuth: boolean;
}

export const WA_CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7iKzx9Gv7YcWX4Vv1C';

export const WhatsAppChannelModal: React.FC<WhatsAppChannelModalProps> = ({
  isOpen,
  onClose,
  isFirstTimeAuth
}) => {
  const { triggerCelebration } = useCelebration();

  if (!isOpen) return null;

  const handleJoinChannel = () => {
    // Open official WhatsApp channel in new tab
    window.open(WA_CHANNEL_LINK, '_blank', 'noopener,noreferrer');

    triggerCelebration({
      title: 'Welcome to PalmPay Community! 🚀',
      subtitle: 'Opening official WhatsApp channel. Stay tuned for instant cash giveaways!',
      type: 'success',
      duration: 3000,
      confettiIntensity: 'high'
    });

    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      // Skippable ONLY if not for the first time
      if (!isFirstTimeAuth) {
        onClose();
      }
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in transition-all"
    >
      <div className="mirror-glass-card max-w-md w-full rounded-3xl p-6 sm:p-7 border border-emerald-500/40 shadow-[0_25px_70px_rgba(2,230,128,0.25)] relative overflow-hidden space-y-5">
        
        {/* Glowing Ambient Background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#02E680]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-[#621494]/30 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#02E680] animate-ping shrink-0" />
            <span className="text-[11px] font-black tracking-wider uppercase bg-[#02E680]/20 text-[#02E680] px-2.5 py-0.5 rounded-full border border-[#02E680]/40 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Official Channel Prompt
            </span>
          </div>

          {/* Close button: Only available if NOT first-time auth */}
          {!isFirstTimeAuth ? (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              aria-label="Skip for now"
            >
              ✕
            </button>
          ) : (
            <span className="text-[10px] text-amber-400 font-extrabold uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
              Required Step
            </span>
          )}
        </div>

        {/* Hero Visual Card */}
        <div className="text-center space-y-3 pt-1">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#02E680] via-[#00B875] to-[#128C7E] p-[2px] shadow-lg shadow-emerald-500/30 flex items-center justify-center relative">
            <div className="w-full h-full rounded-2xl bg-[#0B1A12] flex items-center justify-center text-[#02E680]">
              <MessageSquare className="w-8 h-8 text-[#02E680]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full bg-[#FFC107] items-center justify-center text-[10px] text-black font-extrabold shadow">
              ✓
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white font-['Poppins',sans-serif] tracking-tight">
              Join PalmPay WhatsApp Channel
            </h3>
            <p className="text-xs text-emerald-300/90 font-semibold mt-1 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
              <span>52,800+ Active Members &amp; Live Giveaways</span>
            </p>
          </div>
        </div>

        {/* Channel Value Bullet Points */}
        <div className="space-y-2 bg-[#0E1B15]/80 p-3.5 rounded-2xl border border-emerald-500/25 text-xs text-slate-200">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#02E680] shrink-0 mt-0.5" />
            <span>Instant CashBack verification codes &amp; coupon drops</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#02E680] shrink-0 mt-0.5" />
            <span>Daily <strong>Spin da' Bottle</strong> bonus codes &amp; double multipliers</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#02E680] shrink-0 mt-0.5" />
            <span>24/7 Priority support &amp; payment withdrawal proofs</span>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleJoinChannel}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#02E680] via-[#00B875] to-[#128C7E] text-black font-extrabold text-xs sm:text-sm shadow-[0_10px_30px_rgba(2,230,128,0.4)] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Follow WhatsApp Channel</span>
            <ExternalLink className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Additional Skip Notice or Button if returning user */}
          {!isFirstTimeAuth ? (
            <button
              onClick={onClose}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors"
            >
              Skip to Dashboard (Tap outside to close)
            </button>
          ) : (
            <p className="text-[11px] text-center text-amber-300/80 font-medium pt-1">
              * Tap the green button above to unlock your PalmPay account dashboard.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
