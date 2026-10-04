import React, { useState, useEffect } from 'react';
import { Gift, CalendarCheck, Users, Copy, Check, Sparkles, ChevronRight, Award, RefreshCw, Clock, Share2, Link } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { getReferralUrl, getReferralShareMessage } from '../utils/referral';

interface RewardInitiativesProps {
  onOpenReferralModal: () => void;
}

export const RewardInitiatives: React.FC<RewardInitiativesProps> = ({ onOpenReferralModal }) => {
  const { user, claimDailyBonus, claimSignupBonus } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [copied, setCopied] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingSignup, setClaimingSignup] = useState(false);
  const [dailyClaimMsg, setDailyClaimMsg] = useState<string | null>(null);

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

  // Real-time 24-Hour Countdown Timer Engine
  useEffect(() => {
    const calculateTimeLeft = () => {
      const claimTimestamp = user?.dailyClaimTimestamp ? Number(user.dailyClaimTimestamp) : null;
      if (!claimTimestamp) {
        if (user?.dailyClaimDate === new Date().toISOString().split('T')[0]) {
          return 12 * 60 * 60 * 1000;
        }
        return 0;
      }

      const targetTime = claimTimestamp + (24 * 60 * 60 * 1000);
      const diff = targetTime - Date.now();
      return diff > 0 ? diff : 0;
    };

    setTimeLeftMs(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeftMs(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [user?.dailyClaimTimestamp, user?.dailyClaimDate]);

  // Format milliseconds into HH:MM:SS
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const isDailyClaimed = timeLeftMs > 0;
  const referralCode = user?.referralCode || 'PALM2026';
  const referralUrl = getReferralUrl(referralCode);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    triggerCelebration({
      title: 'VIP Invitation Link Copied! 🔗',
      subtitle: `Link "${referralUrl}" copied. Referees who open this link have your code prefilled automatically!`,
      type: 'copy',
      duration: 3000,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    triggerCelebration({
      title: 'Referral Code Copied! 📋',
      subtitle: `Code "${referralCode}" copied to clipboard. Share with friends to earn commission rewards!`,
      type: 'copy',
      duration: 2500,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimWelcome = async () => {
    setClaimingSignup(true);
    const success = await claimSignupBonus();
    setClaimingSignup(false);
    if (success) {
      triggerCelebration({
        title: 'Welcome Bonus Claimed! 🎁',
        subtitle: '₦150,000 instant welcome bonus has been deposited to your CashBack vault.',
        type: 'bonus',
        amount: '₦150,000',
        duration: 4000
      });
    }
  };

  const handleDailyClaim = async () => {
    setClaimingDaily(true);
    const amount = await claimDailyBonus();
    setClaimingDaily(false);
    if (amount) {
      triggerCelebration({
        title: 'Daily Bonus Claimed! 📅',
        subtitle: `₦${amount.toLocaleString()} daily streak reward added to your balance. Come back tomorrow for more!`,
        type: 'bonus',
        amount: `+₦${amount.toLocaleString()}`,
        duration: 3800
      });
      setDailyClaimMsg(`Claimed +₦${amount.toLocaleString()}!`);
      setTimeout(() => setDailyClaimMsg(null), 3500);
    } else {
      setDailyClaimMsg('Already claimed today! Check back tomorrow.');
      setTimeout(() => setDailyClaimMsg(null), 3500);
    }
  };

  const isSignupClaimed = user?.signupBonusClaimed ?? false;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Award className="w-5 h-5 text-[#A855F7]" />
          Reward Initiatives &amp; Perks
        </h3>
        <span className="text-xs text-purple-300 font-semibold bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
          3 Active Programs
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Initiative 1: Automated Sign-up Reward (N150K Sign-up Bonus) */}
        <div className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/20 hover:border-purple-400/40 transition-all flex flex-col justify-between group specular-shine">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#621494] to-[#7E1DC6] text-white shadow-md">
                <Gift className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                isSignupClaimed
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                  : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
              }`}>
                {isSignupClaimed ? (
                  <><Check className="w-3 h-3 text-[#FFC107]" /> CREDITED</>
                ) : (
                  <><Sparkles className="w-3 h-3 text-[#FFC107]" /> UNCLAIMED</>
                )}
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-semibold text-purple-200/80">Automated Sign-up Reward</h4>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5 font-['Poppins',sans-serif]">
                ₦150K Sign-up Bonus
              </div>
              <p className="text-xs text-purple-300/70 mt-1 leading-snug">
                Automated welcome grant credited immediately upon account verification.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20">
            {isSignupClaimed ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300/70">Status in Vault:</span>
                <span className="text-[#FFC107] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> ₦150,000 Active
                </span>
              </div>
            ) : (
              <button
                onClick={handleClaimWelcome}
                disabled={claimingSignup}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white text-xs font-bold shadow-[0_4px_16px_rgba(126,29,198,0.4)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-purple-300/30 disabled:opacity-50 cursor-pointer"
              >
                {claimingSignup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FFC107]" />
                    <span>Claiming Grant...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FFC107]" />
                    <span>Claim ₦150,000 Bonus</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Initiative 2: Daily Check-in Program (Daily Claim Bonus with 24h Countdown) */}
        <div className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between group specular-shine">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black shadow-md">
                <CalendarCheck className="w-5 h-5" />
              </div>
              {isDailyClaimed ? (
                <span className="text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/40 flex items-center gap-1 shadow-sm">
                  <Clock className="w-3 h-3 text-[#FFC107] animate-pulse" />
                  NEXT IN {formatCountdown(timeLeftMs)}
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#00B875] border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-[#00B875]" />
                  AVAILABLE NOW
                </span>
              )}
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-semibold text-purple-200/80">Daily Check-in Program</h4>
              <div className="text-xl sm:text-2xl font-black text-[#FFC107] mt-0.5 font-['Poppins',sans-serif]">
                Daily Claim Bonus
              </div>
              <p className="text-xs text-purple-300/70 mt-1 leading-snug">
                Check in every 24 hours to claim your ₦2,500 cash reward. Resets automatically after 24 hours.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20">
            {dailyClaimMsg && (
              <p className="text-[11px] text-amber-300 font-semibold mb-2 text-center animate-fade-in">
                {dailyClaimMsg}
              </p>
            )}

            {isDailyClaimed ? (
              <div className="p-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-center space-y-1">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>24-Hour Cooldown Active</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-[#FFC107] tracking-widest">
                  {formatCountdown(timeLeftMs)}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDailyClaim}
                disabled={claimingDaily}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-[#FFC107] to-amber-400 text-black hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {claimingDaily ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Claiming Bonus...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4 text-black" />
                    <span>Claim ₦2,500 Daily Bonus</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Initiative 3: Referral Growth Scheme (Refer & Earn - Earn N2,500) */}
        <div className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/20 hover:border-purple-400/40 transition-all flex flex-col justify-between group specular-shine">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#621494] via-[#7E1DC6] to-[#A855F7] text-white shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                UNLIMITED
              </span>
            </div>

            <div className="mt-3">
              <h4 className="text-sm font-semibold text-purple-200/80">Referral Growth Scheme</h4>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5 font-['Poppins',sans-serif]">
                Refer &amp; Earn
              </div>
              <p className="text-xs text-[#FFC107] font-bold mt-1">
                Earn ₦2,500 per friend invited
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-col gap-2">
            {/* Full Referral URL Box */}
            <div className="bg-black/60 rounded-xl p-2 border border-purple-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-purple-300">
                <span className="font-mono truncate">{referralUrl}</span>
                <span className="text-[#FFC107] font-bold shrink-0 ml-1">Auto-Prefill</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white text-[11px] font-bold flex items-center justify-center gap-1 hover:opacity-95 transition-all shadow-sm border border-purple-300/30 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-[#FFC107]" /> : <Link className="w-3 h-3" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-white/15 transition-all cursor-pointer"
                  title="Copy code only"
                >
                  {copied ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Code Copied' : 'Code'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={onOpenReferralModal}
              className="text-xs text-purple-200/80 hover:text-white flex items-center justify-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>View Invite Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
