import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Calendar, Sparkles } from 'lucide-react';

export const UserPersonalizationHeader: React.FC = () => {
  const { user } = useAuth();

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.displayName || 'Valued Member';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 pt-2">
      <div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-white font-['Poppins',sans-serif] flex flex-wrap items-center gap-1.5 sm:gap-2 break-words">
            <span>{getGreeting()},</span>
            <span className="inline-block animate-wiggle origin-[70%_70%] text-xl sm:text-3xl" role="img" aria-label="waving hand">
              👋
            </span>
            <span className="text-white bg-clip-text break-all sm:break-normal">
              {displayName}
            </span>
          </h1>
        </div>

        <p className="text-xs sm:text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[#00B875] font-medium bg-[#00B875]/10 px-2 py-0.5 rounded-full border border-[#00B875]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Member
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Member since: {user?.memberSince || '29 September 2026'}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <div className="mirror-glass px-3 py-1.5 rounded-xl border border-purple-500/25 flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse" />
          <span className="text-purple-200/80 font-medium">Vault Status:</span>
          <span className="text-[#FFC107] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Active Payouts
          </span>
        </div>
      </div>
    </div>
  );
};
