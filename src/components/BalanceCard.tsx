import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ArrowUpRight, Clock, ShieldCheck, Plus, Sparkles, KeyRound, Wallet, Gamepad2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function useCountUp(targetValue: number, duration: number = 1200) {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = prevValueRef.current;
    const changeInValue = targetValue - startValue;

    if (changeInValue === 0) {
      setCurrentValue(targetValue);
      return;
    }

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const nextValue = Math.round(startValue + changeInValue * easeProgress);

      setCurrentValue(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  return currentValue;
}

interface BalanceCardProps {
  onWithdraw: () => void;
  onAddMoney: () => void;
  onBuyCode: () => void;
  onViewHistory: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  onWithdraw,
  onAddMoney,
  onBuyCode,
  onViewHistory
}) => {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState<boolean>(true);

  // Live countdown timer initialized around 23:37:14
  const [secondsLeft, setSecondsLeft] = useState<number>(23 * 3600 + 37 * 60 + 14);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 86400));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const rawCashbackBalance = user?.balance ?? 0;
  const rawDepositBalance = user?.depositBalance ?? 0;

  // Smooth count-up animated values
  const animatedCashbackBalance = useCountUp(rawCashbackBalance, 1200);
  const animatedDepositBalance = useCountUp(rawDepositBalance, 1200);

  return (
    <div className="relative w-full mirror-glass-card rounded-3xl p-5 sm:p-7 border border-purple-500/30 shadow-[0_16px_50px_rgba(10,4,20,0.85)] overflow-hidden specular-shine group">
      {/* Decorative PalmPay Purple & Golden Glow Orbs */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Card Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#FFC107] flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/25">
            <Sparkles className="w-3.5 h-3.5" />
            VAULT BALANCES
          </span>

          {/* Privacy Eye Toggle */}
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-purple-200/80 hover:text-white transition-all"
            title={showBalance ? 'Hide balance' : 'Show balance'}
            aria-label="Toggle balance visibility"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Countdown Timer badge */}
        <div className="flex items-center gap-2 bg-[#120822]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-500/30 text-xs text-purple-200">
          <Clock className="w-3.5 h-3.5 text-[#FFC107] animate-pulse" />
          <span className="text-purple-300/80 font-medium text-[11px] hidden sm:inline">Daily Cycle:</span>
          <span className="font-mono font-bold text-white tracking-wider">
            {formatCountdown(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Dual Balance Cards: Separated Cashback & Deposited Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4 sm:mt-5 relative z-10">
        
        {/* 1. Cashback Balance Card (Only Withdrawable) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-purple-900/20 to-black/50 border border-purple-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
              CashBack Balance
            </span>
            <span className="text-[10px] font-bold bg-amber-500/20 text-[#FFC107] px-2 py-0.5 rounded-full border border-amber-500/30">
              Withdrawable Only
            </span>
          </div>

          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FFC107] font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(255,193,7,0.3)]">
            {showBalance ? `₦${animatedCashbackBalance.toLocaleString()}` : '₦ ••••••'}
          </div>

          <p className="text-[11px] text-purple-200/80 mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Eligible for direct bank payout with CashBack code</span>
          </p>
        </div>

        {/* 2. Deposited Balance Card (For Games & Code Purchases) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-black/50 border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#00B875]" />
              Deposited Balance
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />
              For Games &amp; Codes
            </span>
          </div>

          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#00B875] font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(0,184,117,0.3)]">
            {showBalance ? `₦${animatedDepositBalance.toLocaleString()}` : '₦ ••••••'}
          </div>

          <p className="text-[11px] text-emerald-200/80 mt-1.5 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Funded via Paystack • Play Spin Bottle Game</span>
          </p>
        </div>

      </div>

      {/* Main Action Bar */}
      <div className="mt-5 sm:mt-6 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
        
        {/* Withdraw CTA Button */}
        <button
          onClick={onWithdraw}
          className="relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-base shadow-[0_6px_25px_rgba(126,29,198,0.5)] hover:shadow-[0_8px_32px_rgba(126,29,198,0.65)] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2 group border border-purple-300/40"
        >
          <span>Withdraw Funds</span>
          <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          <span className="absolute -top-2 -right-2 bg-[#FFC107] text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md animate-bounce">
            Instant
          </span>
        </button>

        {/* Secondary Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={onAddMoney}
            className="w-full px-3 sm:px-4 py-3 rounded-2xl mirror-glass hover:bg-emerald-950/40 text-emerald-200 hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-emerald-500/40 shadow-md"
          >
            <Plus className="w-4 h-4 text-[#00B875] shrink-0" />
            <span className="truncate">Deposit Funds</span>
          </button>

          <button
            onClick={onBuyCode}
            className="w-full px-3 sm:px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-[#FFC107] to-yellow-300 text-black hover:opacity-95 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/40 shadow-[0_8px_30px_rgba(255,193,7,0.6)]"
          >
            <KeyRound className="w-4 h-4 text-black shrink-0" />
            <span className="truncate">Buy CashBack Code</span>
          </button>

          <button
            onClick={onViewHistory}
            className="w-full px-3 sm:px-4 py-3 rounded-2xl mirror-glass hover:bg-purple-900/30 text-purple-100 hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-purple-400/30 shadow-md"
          >
            <span className="truncate">Transaction Ledger</span>
          </button>
        </div>

      </div>
    </div>
  );
};
