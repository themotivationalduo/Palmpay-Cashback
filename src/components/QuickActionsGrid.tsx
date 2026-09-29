import React from 'react';
import { KeyRound, Users, MessageSquareText, Wallet, Headphones, Sparkles, ArrowRight, MessageSquare } from 'lucide-react';
import { NavigationPage } from '../types';

export const WA_CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7iKzx9Gv7YcWX4Vv1C';

interface QuickActionsGridProps {
  onSelectAction: (action: string) => void;
  setCurrentPage: (page: NavigationPage) => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onSelectAction,
  setCurrentPage
}) => {
  const actions = [
    {
      id: 'buy_code',
      title: 'Buy CashBack Code',
      badge: '₦8,550 (Mandatory)',
      badgeColor: 'bg-amber-500/30 text-[#FFC107] border-amber-400/60 font-black animate-pulse',
      description: 'Mandatory CBN clearing code for instant automated withdrawals.',
      icon: KeyRound,
      iconBg: 'from-amber-500 via-[#FFC107] to-yellow-200 text-black shadow-lg',
      onClick: () => setCurrentPage('code')
    },
    {
      id: 'wa_channel',
      title: 'WhatsApp Channel',
      badge: '52k+ Members',
      badgeColor: 'bg-[#02E680]/20 text-[#02E680] border-[#02E680]/40 font-bold animate-pulse',
      description: 'Official PalmPay channel for live coupon drops & daily giveaways.',
      icon: MessageSquare,
      iconBg: 'from-[#02E680] via-[#00B875] to-[#128C7E] text-black shadow-lg shadow-emerald-500/20',
      onClick: () => window.open(WA_CHANNEL_LINK, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'refer_earn',
      title: 'Refer & Earn',
      badge: '₦2,500',
      badgeColor: 'bg-purple-500/25 text-purple-300 border-purple-400/40',
      description: 'Get ₦2,500 instant cash directly when an invited friend signs up.',
      icon: Users,
      iconBg: 'from-[#621494] via-[#7E1DC6] to-[#A855F7] text-white',
      onClick: () => onSelectAction('refer_earn')
    },
    {
      id: 'community',
      title: 'Community',
      badge: '48k+ Online',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description: 'Join verified PalmPay Cashback members on Telegram & WhatsApp.',
      icon: MessageSquareText,
      iconBg: 'from-purple-800 to-indigo-600 text-white',
      onClick: () => onSelectAction('community')
    },
    {
      id: 'add_money',
      title: 'Add Money',
      badge: '0% Fee',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      description: 'Deposit funds instantly via PalmPay virtual account & bank transfer.',
      icon: Wallet,
      iconBg: 'from-[#008f5a] to-[#00D2B4] text-white',
      onClick: () => onSelectAction('add_money')
    },
    {
      id: 'support',
      title: 'Support',
      badge: '24/7 Live',
      badgeColor: 'bg-purple-500/25 text-purple-200 border-purple-500/40',
      description: 'Connect with a certified customer care representative in real-time.',
      icon: Headphones,
      iconBg: 'from-[#4A0C72] to-[#7E1DC6] text-white',
      onClick: () => onSelectAction('support')
    },
    {
      id: 'game_spin',
      title: 'Game',
      badge: 'Spin & Win',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: 'Spin da\' Bottle for real multipliers up to ₦50,000 jackpot!',
      icon: Sparkles,
      iconBg: 'from-rose-600 via-purple-700 to-amber-500 text-white',
      onClick: () => setCurrentPage('game')
    }
  ];

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          Quick Actions &amp; Hub
        </h3>
        <span className="text-xs text-slate-400">Tap to access</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={act.onClick}
              className={`${act.id === 'buy_code' ? 'mirror-glass-gold border-amber-500/50 shadow-[0_10px_35px_rgba(255,193,7,0.25)]' : 'mirror-glass-card'} hover:bg-white/10 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-200 flex flex-col items-start justify-between text-left group active:scale-95 shadow-md relative overflow-hidden h-full`}
            >
              {/* Subtle top shine */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

              <div className="w-full flex items-center justify-between gap-1 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${act.iconBg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${act.badgeColor} whitespace-nowrap`}>
                  {act.badge}
                </span>
              </div>

              <div className="w-full">
                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00B875] transition-colors leading-tight">
                  {act.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {act.description}
                </p>
              </div>

              <div className="mt-3 flex items-center text-[10px] text-[#00B875] font-semibold opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <span>Open</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
