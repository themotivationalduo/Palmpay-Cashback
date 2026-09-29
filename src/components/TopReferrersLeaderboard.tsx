import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Flame, Users, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  email: string;
  referralCount: number;
  totalEarned: number;
  isCurrentUser?: boolean;
}

const DEFAULT_TOP_REFERRERS: LeaderboardEntry[] = [
  { uid: 'ref-1', displayName: 'Chidi Okonkwo', email: 'chidi.ok***@gmail.com', referralCount: 84, totalEarned: 210000 },
  { uid: 'ref-2', displayName: 'Fatima Bello', email: 'fatima.b***@yahoo.com', referralCount: 67, totalEarned: 167500 },
  { uid: 'ref-3', displayName: 'Adebayo Kalu', email: 'adebayo.k***@gmail.com', referralCount: 52, totalEarned: 130000 },
  { uid: 'ref-4', displayName: 'Blessing Nwachukwu', email: 'blessing.n***@gmail.com', referralCount: 41, totalEarned: 102500 },
  { uid: 'ref-5', displayName: 'Emmanuel Danjuma', email: 'emmanuel.d***@gmail.com', referralCount: 35, totalEarned: 87500 },
  { uid: 'ref-6', displayName: 'Zainab Ibrahim', email: 'zainab.i***@outlook.com', referralCount: 29, totalEarned: 72500 },
  { uid: 'ref-7', displayName: 'Olumide Fashola', email: 'olumide.f***@gmail.com', referralCount: 24, totalEarned: 60000 },
  { uid: 'ref-8', displayName: 'Grace Chukwuma', email: 'grace.c***@gmail.com', referralCount: 19, totalEarned: 47500 },
  { uid: 'ref-9', displayName: 'Tunde Bakare', email: 'tunde.b***@yahoo.com', referralCount: 16, totalEarned: 40000 },
  { uid: 'ref-10', displayName: 'Aisha Suleiman', email: 'aisha.s***@gmail.com', referralCount: 12, totalEarned: 30000 },
];

interface TopReferrersLeaderboardProps {
  onOpenProfile: () => void;
}

export const TopReferrersLeaderboard: React.FC<TopReferrersLeaderboardProps> = ({ onOpenProfile }) => {
  const { user, referrals } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [copiedCode, setCopiedCode] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(DEFAULT_TOP_REFERRERS);

  const referralCode = user?.referralCode || 'PALM2026';
  const currentUserInvites = Math.max(user?.referralCount || 0, referrals.length);
  const currentUserEarned = currentUserInvites * 2500;

  useEffect(() => {
    // Construct dynamic leaderboard merging current user and top referrers
    const currentEntry: LeaderboardEntry = {
      uid: user?.uid || 'current-user',
      displayName: user?.displayName || 'You (Active Member)',
      email: user?.email ? maskEmail(user.email) : 'your.email@palmpay.app',
      referralCount: currentUserInvites,
      totalEarned: currentUserEarned,
      isCurrentUser: true,
    };

    const combined = [...DEFAULT_TOP_REFERRERS];
    
    // Replace or insert current user
    const existingIndex = combined.findIndex(e => e.uid === user?.uid || e.email === currentEntry.email);
    if (existingIndex !== -1) {
      combined[existingIndex] = { ...currentEntry, isCurrentUser: true };
    } else {
      combined.push(currentEntry);
    }

    // Sort descending by referral count
    combined.sort((a, b) => b.referralCount - a.referralCount);

    setLeaderboard(combined.slice(0, 10));
  }, [user?.uid, user?.displayName, user?.email, currentUserInvites, currentUserEarned]);

  function maskEmail(emailStr: string) {
    if (!emailStr || !emailStr.includes('@')) return emailStr;
    const [namePart, domainPart] = emailStr.split('@');
    const masked = namePart.slice(0, 2) + '***';
    return `${masked}@${domainPart}`;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    triggerCelebration({
      title: 'Referral Code Copied! 📋',
      subtitle: `Code "${referralCode}" copied. Share with friends to climb the Leaderboard & earn ₦2,500 per invite!`,
      type: 'copy',
      duration: 2500,
      confettiIntensity: 'medium',
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 text-black font-black flex items-center justify-center text-xs shadow-lg shadow-amber-500/30 border border-amber-200">
          🥇 1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 text-black font-black flex items-center justify-center text-xs shadow-md border border-white">
          🥈 2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-800 text-amber-100 font-black flex items-center justify-center text-xs shadow-md border border-amber-500/50">
          🥉 3
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-white/10 text-slate-300 font-bold flex items-center justify-center text-xs font-mono border border-white/10">
        #{rank}
      </div>
    );
  };

  return (
    <div className="mirror-glass-card rounded-3xl p-5 sm:p-7 border border-purple-500/30 shadow-[0_20px_50px_rgba(98,20,148,0.25)] relative overflow-hidden space-y-4">
      
      {/* Background Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-['Poppins',sans-serif]">
                Top Referrers Leaderboard
              </h3>
              <span className="text-[10px] font-black uppercase bg-amber-500/20 text-[#FFC107] px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Live
              </span>
            </div>
            <p className="text-xs text-purple-200/80">
              Top 10 PalmPay champions earning ₦2,500 per friend invited
            </p>
          </div>
        </div>

        {/* User Quick Rank Bar */}
        <div className="flex items-center gap-2 bg-purple-950/60 p-2 px-3 rounded-2xl border border-purple-500/30 shrink-0">
          <Users className="w-4 h-4 text-[#FFC107]" />
          <div className="text-xs">
            <span className="text-purple-300 block text-[10px]">Your Invites</span>
            <span className="font-extrabold text-white font-mono">{currentUserInvites} Friends (₦{currentUserEarned.toLocaleString()})</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table List */}
      <div className="space-y-2">
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1;
          const isUser = entry.isCurrentUser;

          return (
            <div
              key={entry.uid + '-' + idx}
              className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                isUser
                  ? 'bg-gradient-to-r from-purple-900/60 via-purple-800/40 to-amber-900/30 border-amber-400/60 shadow-[0_5px_20px_rgba(255,193,7,0.2)]'
                  : rank <= 3
                  ? 'bg-white/10 hover:bg-white/15 border-white/20'
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
            >
              {/* Rank & User Info */}
              <div className="flex items-center gap-3 overflow-hidden">
                {getRankBadge(rank)}

                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs sm:text-sm font-bold truncate ${isUser ? 'text-[#FFC107]' : 'text-white'}`}>
                      {entry.displayName}
                    </span>
                    {isUser && (
                      <span className="text-[9px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2 rounded uppercase">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-purple-200/70 font-mono block truncate">
                    {entry.email}
                  </span>
                </div>
              </div>

              {/* Stats & Earnings */}
              <div className="text-right shrink-0">
                <span className="text-xs sm:text-sm font-black text-[#FFC107] font-mono block">
                  ₦{entry.totalEarned.toLocaleString()}
                </span>
                <span className="text-[10px] text-purple-200/80 font-medium">
                  {entry.referralCount} Invites
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Invite Action */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-purple-950/40 p-3.5 rounded-2xl border border-purple-500/20">
        <div className="text-xs text-purple-200">
          <span className="font-bold text-white block">Climb to #1 Rank &amp; Claim ₦2,500/Friend!</span>
          <span>Your Code: <strong className="font-mono text-[#FFC107]">{referralCode}</strong></span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyCode}
            className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-white text-xs font-bold transition-all border border-purple-400/30 flex items-center justify-center gap-1"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            onClick={onOpenProfile}
            className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:opacity-95 text-black font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1"
          >
            <span>Referral History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
