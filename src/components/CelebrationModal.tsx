import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  Trophy, 
  ShieldCheck, 
  KeyRound, 
  Coins, 
  Gift, 
  X, 
  ArrowRight,
  PartyPopper,
  Zap,
  Check
} from 'lucide-react';
import { useCelebration, CelebrationType } from '../context/CelebrationContext';

export const CelebrationModal: React.FC = () => {
  const { celebration, isOpen, closeCelebration } = useCelebration();
  const [animStage, setAnimStage] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setAnimStage(0);
      const t1 = setTimeout(() => setAnimStage(1), 50);
      const t2 = setTimeout(() => setAnimStage(2), 250);
      const t3 = setTimeout(() => setAnimStage(3), 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setAnimStage(0);
    }
  }, [isOpen]);

  if (!isOpen || !celebration) return null;

  const { title, subtitle, type = 'success', amount } = celebration;

  const getCelebrationIcon = (ctype: CelebrationType) => {
    switch (ctype) {
      case 'bonus':
      case 'game':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping opacity-75 duration-1000" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-600 via-[#FFC107] to-yellow-200 p-0.5 shadow-[0_0_40px_rgba(255,193,7,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#1A1005] flex items-center justify-center">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-[#FFC107] animate-bounce" />
              </div>
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-7 h-7 text-yellow-300 animate-spin duration-3000" />
            <Coins className="absolute -bottom-1 -left-2 w-6 h-6 text-amber-400 animate-pulse" />
          </div>
        );

      case 'register':
      case 'login':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-75 duration-1000" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#621494] via-[#A855F7] to-purple-300 p-0.5 shadow-[0_0_40px_rgba(168,85,247,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#150A24] flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-[#A855F7] animate-pulse" />
              </div>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-purple-300 animate-spin duration-3000" />
            <Zap className="absolute -bottom-1 -left-1 w-6 h-6 text-amber-400 animate-bounce" />
          </div>
        );

      case 'code':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping opacity-75 duration-1000" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-400 p-0.5 shadow-[0_0_40px_rgba(147,51,234,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#0E0B1F] flex items-center justify-center">
                <KeyRound className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-pink-300 animate-spin" />
          </div>
        );

      case 'deposit':
      case 'withdrawal':
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-75 duration-1000" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-[#00B875] to-emerald-200 p-0.5 shadow-[0_0_40px_rgba(0,184,117,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#061811] flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#00B875] animate-bounce" />
              </div>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-emerald-300 animate-spin" />
          </div>
        );

      default:
        return (
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-75 duration-1000" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-purple-600 via-[#A855F7] to-emerald-400 p-0.5 shadow-[0_0_40px_rgba(168,85,247,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#120A20] flex items-center justify-center">
                <PartyPopper className="w-10 h-10 sm:w-12 sm:h-12 text-[#A855F7] animate-bounce" />
              </div>
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-300 animate-spin" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      {/* Dimmed backdrop with animated ambient glow */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={closeCelebration}
      />

      {/* Main Mirror Glass Celebration Modal */}
      <div 
        className={`relative z-10 w-full max-w-sm sm:max-w-md mirror-glass-card rounded-3xl p-6 sm:p-8 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-center overflow-hidden transition-all duration-500 transform ${
          animStage >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-6'
        }`}
      >
        {/* Specular animated reflection sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute top-0 -left-[100%] w-[60%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-25deg] animate-[shimmer_2.5s_infinite]" />
          {/* Ambient colored lighting in corners */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-purple-600/30 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl" />
        </div>

        {/* Close Icon */}
        <button
          type="button"
          onClick={closeCelebration}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          title="Close celebration"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Animated 3D Emblem */}
        <div className="flex justify-center mb-5 mt-2">
          {getCelebrationIcon(type)}
        </div>

        {/* 2. Amount / Badge Pill if present */}
        {amount && (
          <div 
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/40 text-[#FFC107] font-black font-mono text-sm sm:text-base mb-3 shadow-[0_0_15px_rgba(255,193,7,0.3)] transition-all duration-500 transform ${
              animStage >= 2 ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-2'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{typeof amount === 'number' ? `₦${amount.toLocaleString()}` : amount}</span>
          </div>
        )}

        {/* 3. Main Title with spring bounce and gradient text */}
        <div className="space-y-2">
          <h2 
            className={`text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-purple-100 to-amber-200 bg-clip-text text-transparent tracking-tight transition-all duration-500 transform ${
              animStage >= 2 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
            }`}
          >
            {title}
          </h2>

          {/* 4. Subtitle with glowing wave / slide animation */}
          <div 
            className={`p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs sm:text-sm text-purple-200/90 leading-relaxed shadow-inner transition-all duration-500 delay-150 transform ${
              animStage >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <p className="flex items-center justify-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 inline-block" />
              <span>{subtitle}</span>
            </p>
          </div>
        </div>

        {/* 5. Progress Dismiss Bar */}
        <div className="mt-6 pt-2">
          <button
            type="button"
            onClick={closeCelebration}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#00B875] text-white font-bold text-xs sm:text-sm shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
