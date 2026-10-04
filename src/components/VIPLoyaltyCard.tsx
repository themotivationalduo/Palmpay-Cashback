import React, { useState } from 'react';
import { 
  Crown, 
  Sparkles, 
  Trophy, 
  Award, 
  ShieldCheck, 
  ChevronRight, 
  Copy, 
  Check, 
  Share2, 
  TrendingUp, 
  Zap, 
  Flame, 
  ExternalLink,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { getReferralUrl, getReferralShareMessage } from '../utils/referral';

export interface VIPTier {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  badge: string;
  minCashback: number;
  maxCashback: number;
  tagline: string;
  multiplier: string;
  gradient: string;
  borderGlow: string;
  badgeBg: string;
  badgeText: string;
  textColor: string;
  progressColor: string;
  perks: string[];
}

export const VIP_TIERS: VIPTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    badge: '🥉 Bronze Tier',
    minCashback: 0,
    maxCashback: 49999,
    tagline: 'Standard Member',
    multiplier: '1.0x',
    gradient: 'from-[#2A170A] via-[#1E1107] to-[#120703]',
    borderGlow: 'border-amber-700/40 shadow-[0_0_25px_rgba(180,83,9,0.15)]',
    badgeBg: 'bg-amber-600/20 border-amber-600/40',
    badgeText: 'text-amber-300',
    textColor: 'text-amber-300',
    progressColor: 'from-amber-600 to-amber-400',
    perks: [
      'Access to daily cash claim bonus',
      'Standard 24h bank disbursal processing',
      '1.0x Spin da\' Bottle multipliers',
      'Standard community membership'
    ]
  },
  {
    id: 'silver',
    name: 'Silver',
    badge: '🥈 Silver VIP',
    minCashback: 50000,
    maxCashback: 149999,
    tagline: 'Elite Member',
    multiplier: '1.25x',
    gradient: 'from-[#1E293B] via-[#0F172A] to-[#0A0E17]',
    borderGlow: 'border-slate-400/40 shadow-[0_0_25px_rgba(203,213,225,0.2)]',
    badgeBg: 'bg-slate-400/20 border-slate-300/40',
    badgeText: 'text-slate-200',
    textColor: 'text-slate-200',
    progressColor: 'from-slate-400 to-slate-200',
    perks: [
      '+10% bonus boost on daily cash claims',
      'Expedited 2-hour withdrawal queue',
      '1.25x Spin da\' Bottle multipliers',
      'Silver VIP profile badge distinction'
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    badge: '🥇 Gold VIP',
    minCashback: 150000,
    maxCashback: 299999,
    tagline: 'Premier VIP',
    multiplier: '1.5x',
    gradient: 'from-[#3A2303] via-[#2A1802] to-[#150D02]',
    borderGlow: 'border-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    badgeBg: 'bg-amber-400/20 border-amber-400/60',
    badgeText: 'text-[#FFC107]',
    textColor: 'text-[#FFC107]',
    progressColor: 'from-amber-500 via-amber-400 to-yellow-300',
    perks: [
      'Instant priority admin disbursement',
      '₦2,500 referral commission bounty per friend',
      '1.5x multiplier on gamified cash rewards',
      'Gold VIP badge on public leaderboards',
      'Direct priority WhatsApp VIP concierge support'
    ]
  },
  {
    id: 'platinum',
    name: 'Platinum',
    badge: '💎 Platinum Executive',
    minCashback: 300000,
    maxCashback: 499999,
    tagline: 'Executive VIP',
    multiplier: '2.0x',
    gradient: 'from-[#082F49] via-[#0C1E33] to-[#05111E]',
    borderGlow: 'border-cyan-400/50 shadow-[0_0_35px_rgba(56,189,248,0.25)]',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/60',
    badgeText: 'text-cyan-300',
    textColor: 'text-cyan-300',
    progressColor: 'from-cyan-500 via-sky-400 to-teal-300',
    perks: [
      'Zero-fee direct bank settlements',
      '2.0x referral commission boosts',
      'Dedicated 24/7 personal VIP manager',
      'High-Roller Jackpots in Spin Bottle',
      'Instant VIP cashback clearance'
    ]
  },
  {
    id: 'diamond',
    name: 'Diamond',
    badge: '👑 Diamond Legend',
    minCashback: 500000,
    maxCashback: Infinity,
    tagline: 'Ambassador Class',
    multiplier: '3.0x',
    gradient: 'from-[#3B0764] via-[#24033E] to-[#120120]',
    borderGlow: 'border-fuchsia-400/50 shadow-[0_0_40px_rgba(217,70,239,0.3)]',
    badgeBg: 'bg-fuchsia-500/20 border-fuchsia-400/70',
    badgeText: 'text-fuchsia-300',
    textColor: 'text-fuchsia-300',
    progressColor: 'from-purple-500 via-fuchsia-500 to-pink-400',
    perks: [
      'Instant automated bank settlement (No queue)',
      'Unlimited daily spin plays with 3.0x multiplier',
      'Black VIP Diamond card distinction',
      'Lifetime PalmPay Ambassador privileges',
      'Exclusive private VIP executive channel'
    ]
  }
];

export const getUserVIPTier = (totalCashback: number): VIPTier => {
  const earned = Math.max(0, totalCashback);
  for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
    if (earned >= VIP_TIERS[i].minCashback) {
      return VIP_TIERS[i];
    }
  }
  return VIP_TIERS[0];
};

interface VIPLoyaltyCardProps {
  onOpenSettings?: () => void;
}

export const VIPLoyaltyCard: React.FC<VIPLoyaltyCardProps> = ({ onOpenSettings }) => {
  const { user } = useAuth();
  const { triggerCelebration } = useCelebration();

  // Total cashback earned based on current cashback balance
  const totalCashback = Math.max(0, user?.balance ?? 150000);
  const currentTier = getUserVIPTier(totalCashback);

  const [selectedTierId, setSelectedTierId] = useState<string>(currentTier.id);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedTier = VIP_TIERS.find((t) => t.id === selectedTierId) || currentTier;

  // Determine next tier and progress
  const currentTierIndex = VIP_TIERS.findIndex((t) => t.id === currentTier.id);
  const nextTier = currentTierIndex < VIP_TIERS.length - 1 ? VIP_TIERS[currentTierIndex + 1] : null;

  let progressPercent = 100;
  let remainingToNext = 0;

  if (nextTier) {
    const range = nextTier.minCashback - currentTier.minCashback;
    const progressIntoTier = totalCashback - currentTier.minCashback;
    progressPercent = Math.min(100, Math.max(0, (progressIntoTier / range) * 100));
    remainingToNext = Math.max(0, nextTier.minCashback - totalCashback);
  }

  const referralCode = user?.referralCode || 'PALM2026';
  const fullReferralUrl = getReferralUrl(referralCode);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullReferralUrl);
    setCopiedLink(true);
    triggerCelebration({
      title: 'VIP Invitation Link Copied! 🔗',
      subtitle: `Link with code "${referralCode}" copied. Friends who click will automatically have your code prefilled!`,
      type: 'copy',
      duration: 3000,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    triggerCelebration({
      title: 'Referral Code Copied! 📋',
      subtitle: `Code "${referralCode}" copied to clipboard.`,
      type: 'copy',
      duration: 2500,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = getReferralShareMessage(referralCode);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="relative overflow-hidden rounded-3xl mirror-glass-card border border-purple-500/25 p-4 sm:p-6 lg:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] space-y-6">
      
      {/* Ambient Radial Tier Glow */}
      <div 
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 -mr-20 -mt-20 transition-all duration-500"
        style={{
          background: currentTier.id === 'gold' 
            ? 'radial-gradient(circle, #FFC107 0%, transparent 70%)'
            : currentTier.id === 'diamond'
            ? 'radial-gradient(circle, #D946EF 0%, transparent 70%)'
            : currentTier.id === 'platinum'
            ? 'radial-gradient(circle, #38BDF8 0%, transparent 70%)'
            : currentTier.id === 'silver'
            ? 'radial-gradient(circle, #E2E8F0 0%, transparent 70%)'
            : 'radial-gradient(circle, #B45309 0%, transparent 70%)'
        }}
      />

      {/* 1. Header: VIP Loyalty Program & Active Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-[#FFC107] border border-amber-500/30">
              <Crown className="w-3.5 h-3.5" />
              VIP LOYALTY PRIVILEGES
            </span>
            <span className="text-[10px] text-purple-300/80 font-mono bg-purple-900/40 px-2 py-0.5 rounded-md border border-purple-500/20">
              Multi-Tier Rewards
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-['Poppins',sans-serif] tracking-tight flex items-center gap-2">
            <span>PalmPay Status Tiers</span>
            <Sparkles className="w-5 h-5 text-[#FFC107] animate-pulse" />
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Higher tiers unlock accelerated cashback multipliers, priority queue bypass, zero-fee withdrawals, and exclusive referral bonuses.
          </p>
        </div>

        {/* Current User Tier Badge Capsule */}
        <div className="flex items-center gap-3 bg-black/40 border border-white/15 px-4 py-2.5 rounded-2xl backdrop-blur-md self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-purple-600/30 border border-white/20 flex items-center justify-center text-xl shadow-inner">
            {currentTier.id === 'diamond' ? '👑' : currentTier.id === 'platinum' ? '💎' : currentTier.id === 'gold' ? '🥇' : currentTier.id === 'silver' ? '🥈' : '🥉'}
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
              Current Tier
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm sm:text-base font-black ${currentTier.textColor}`}>
                {currentTier.name} VIP
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-200 font-bold px-1.5 py-0.2 rounded border border-purple-400/30">
                {currentTier.multiplier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Total Earned & Next Tier Progress Meter */}
      <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-3 relative z-10 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-400">Total CashBack Earned: </span>
            <strong className="text-white font-mono text-sm sm:text-base font-black">
              ₦{totalCashback.toLocaleString()}
            </strong>
          </div>
          <div className="text-slate-300">
            {nextTier ? (
              <span>
                Earn <strong className="text-[#FFC107] font-mono">₦{remainingToNext.toLocaleString()}</strong> more to reach{' '}
                <strong className={nextTier.textColor}>{nextTier.name} VIP</strong>
              </span>
            ) : (
              <span className="text-fuchsia-300 font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                Maximum Diamond Legend Tier Reached!
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${currentTier.progressColor} transition-all duration-700 shadow-md relative`}
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/70 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>{currentTier.name} (₦{currentTier.minCashback.toLocaleString()})</span>
            <span className="text-purple-300 font-bold">{Math.round(progressPercent)}% Completed</span>
            <span>{nextTier ? `${nextTier.name} (₦${nextTier.minCashback.toLocaleString()})` : 'Max Tier'}</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Tier Switcher Tabs */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Explore Tier Benefits &amp; Perks
          </span>
          <span className="text-[11px] text-slate-400">
            Tap any tier to inspect
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {VIP_TIERS.map((tier) => {
            const isUserActive = tier.id === currentTier.id;
            const isTabSelected = tier.id === selectedTierId;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTierId(tier.id)}
                className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                  isTabSelected
                    ? `${tier.borderGlow} bg-white/10 ring-1 ring-white/30 scale-[1.02]`
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                {isUserActive && (
                  <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-[#00B875] text-white px-2 py-0.2 rounded-full shadow-sm border border-emerald-300/40">
                    YOUR TIER
                  </span>
                )}
                <div>
                  <div className="text-lg">
                    {tier.id === 'diamond' ? '👑' : tier.id === 'platinum' ? '💎' : tier.id === 'gold' ? '🥇' : tier.id === 'silver' ? '🥈' : '🥉'}
                  </div>
                  <div className={`text-xs sm:text-sm font-bold mt-1 ${tier.textColor}`}>
                    {tier.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {tier.minCashback === 0 ? '₦0+' : `₦${tier.minCashback.toLocaleString()}+`}
                  </div>
                </div>

                <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                  <span className="text-purple-300 font-bold">{tier.multiplier} Rate</span>
                  <ChevronRight className={`w-3 h-3 ${isTabSelected ? 'text-white' : 'text-slate-500'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Selected Tier Benefits Inspector Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${selectedTier.borderGlow} bg-gradient-to-br ${selectedTier.gradient} relative z-10 transition-all duration-300`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shadow-md">
              {selectedTier.id === 'diamond' ? '👑' : selectedTier.id === 'platinum' ? '💎' : selectedTier.id === 'gold' ? '🥇' : selectedTier.id === 'silver' ? '🥈' : '🥉'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-black text-white font-['Poppins',sans-serif]">
                  {selectedTier.name} VIP Perks
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedTier.badgeBg} ${selectedTier.badgeText}`}>
                  {selectedTier.multiplier} Multiplier
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {selectedTier.tagline} • Unlocked with ₦{selectedTier.minCashback.toLocaleString()} total cashback
              </p>
            </div>
          </div>

          {selectedTier.id === currentTier.id ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full self-start sm:self-auto">
              <Check className="w-3.5 h-3.5" />
              Active on Your Account
            </span>
          ) : (
            <span className="text-xs text-slate-300 self-start sm:self-auto bg-black/40 px-3 py-1 rounded-full border border-white/10 font-mono">
              {totalCashback >= selectedTier.minCashback ? 'Tier Achieved' : `Needs ₦${(selectedTier.minCashback - totalCashback).toLocaleString()} More`}
            </span>
          )}
        </div>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3.5">
          {selectedTier.perks.map((perk, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-slate-200">
              <div className="p-1 rounded-md bg-white/10 text-[#FFC107] shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <span className="leading-snug">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. VIP Invitation Link Sharing Banner (Prefills code for referee) */}
      <div className="p-4 sm:p-5 rounded-2xl mirror-glass border border-purple-500/35 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black/40 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#621494] to-[#A855F7] text-white shadow-md">
              <Gift className="w-4 h-4 text-[#FFC107]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">
                  Your VIP Invitation Link
                </span>
                <span className="text-[10px] font-black uppercase bg-amber-500/20 text-[#FFC107] px-2 py-0.5 rounded-full border border-amber-500/30">
                  Earn ₦2,500 / Friend
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80">
                Share this link with friends. When opened by a referee, your invitation code is <strong>automatically prefilled</strong>!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs text-slate-400 font-mono">Code:</span>
            <span className="font-mono font-black text-[#FFC107] bg-black/60 px-2 py-0.5 rounded-md border border-amber-500/30 text-xs">
              {referralCode}
            </span>
          </div>
        </div>

        {/* Link Input & Direct Share Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-black/60 rounded-xl px-3 py-2 border border-purple-500/30 text-xs font-mono text-purple-200 truncate select-all">
            {fullReferralUrl}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] hover:opacity-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md border border-purple-300/30 active:scale-95 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#FFC107]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className="hidden md:flex items-center justify-center gap-1 mirror-glass hover:bg-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-white/10 cursor-pointer"
              title="Copy code only"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Referee Benefit Reminder */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
          <Zap className="w-3.5 h-3.5 text-[#FFC107] shrink-0" />
          <span>
            Referees receive instant <strong>₦150,000 Welcome CashBack</strong> upon registration with your link.
          </span>
        </div>
      </div>

    </section>
  );
};
