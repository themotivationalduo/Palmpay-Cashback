import React, { useState } from 'react';
import { User, Mail, Hash, Calendar, Moon, Sun, LogOut, Copy, Check, Shield, Sparkles, Users, Award, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';

interface SettingsProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
}

export const SettingsProfileModal: React.FC<SettingsProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAdminPanel
}) => {
  const { user, logout, isAdmin, referrals } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isUltraDarkMode, setIsUltraDarkMode] = useState(true);

  if (!isOpen) return null;

  const userEmail = user?.email || 'user@example.com';
  const referralCode = user?.referralCode || 'PALM2026';
  const memberDate = user?.memberSince || '29 September 2026';
  const totalReferralCount = Math.max(user?.referralCount || 0, referrals.length);
  const totalReferralEarnings = totalReferralCount * 2500;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    triggerCelebration({
      title: 'Referral Code Copied! 📋',
      subtitle: `Code "${referralCode}" copied to clipboard. Share with friends to earn ₦2,500 commission rewards!`,
      type: 'copy',
      duration: 2500,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const formatMaskedEmail = (emailStr: string) => {
    if (!emailStr.includes('@')) return emailStr;
    const [namePart, domainPart] = emailStr.split('@');
    const masked = namePart.slice(0, 2) + '***';
    return `${masked}@${domainPart}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-5 sm:p-7 border border-white/20 shadow-[0_25px_65px_rgba(0,0,0,0.85)] relative my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#00B875]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-500/20 sticky top-0 bg-[#120822]/90 backdrop-blur-md z-10 -mx-2 px-2 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#621494] via-[#7E1DC6] to-[#A855F7] p-[2px] shadow-md">
              <div className="w-full h-full rounded-2xl bg-[#120822] flex items-center justify-center text-white font-bold text-base uppercase">
                {user?.displayName ? user.displayName.slice(0, 2) : 'DM'}
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                Settings &amp; Profile
              </h3>
              <p className="text-xs text-[#A855F7] font-semibold flex items-center gap-1">
                <span>●</span> Active PalmPay Verified Member
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* User Profile Info Fields */}
        <div className="mt-4 space-y-3">
          
          {/* Account Email */}
          <div className="mirror-glass p-3.5 rounded-2xl border border-purple-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs text-purple-300/80">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#A855F7]" />
                Account Email
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-200 px-1.5 py-0.2 rounded font-semibold border border-purple-400/30">
                Verified
              </span>
            </div>
            <div className="font-mono text-sm font-semibold text-white break-all">
              {userEmail}
            </div>
          </div>

          {/* Unique Referral Code Card */}
          <div className="mirror-glass p-3.5 rounded-2xl border border-purple-500/30 space-y-2 bg-gradient-to-r from-purple-900/30 to-purple-800/10">
            <div className="flex items-center justify-between text-xs text-purple-300/90">
              <span className="flex items-center gap-1.5 font-bold text-purple-200">
                <Hash className="w-3.5 h-3.5 text-[#FFC107]" />
                Unique Referral Code
              </span>
              <span className="text-[11px] bg-amber-500/20 text-[#FFC107] font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                ₦2,500 / invite
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base sm:text-lg font-black text-[#FFC107] tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-[#621494] to-[#7E1DC6] hover:opacity-90 text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-md border border-purple-300/30"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Referral History & Earnings Section */}
          <div className="mirror-glass p-4 rounded-2xl border border-amber-500/30 space-y-3 bg-[#160B29]/90">
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-[#FFC107]">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Referral History &amp; Earnings
                </h4>
              </div>
              <span className="text-xs font-black text-[#FFC107] bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Total: ₦{totalReferralEarnings.toLocaleString()}
              </span>
            </div>

            {/* Total Summary Counters */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/20">
                <span className="text-[11px] text-purple-300 block font-medium">Invited Friends</span>
                <span className="text-lg font-black text-white font-mono">{totalReferralCount} Users</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/20">
                <span className="text-[11px] text-purple-300 block font-medium">Referral Commission</span>
                <span className="text-lg font-black text-[#FFC107] font-mono">₦{totalReferralEarnings.toLocaleString()}</span>
              </div>
            </div>

            {/* Referred List */}
            {referrals.length > 0 ? (
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                {referrals.map((ref) => (
                  <div key={ref.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-200 font-bold text-xs border border-purple-400/30">
                        {ref.referredName ? ref.referredName.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="font-semibold text-white block">
                          {ref.referredName || 'PalmPay Member'}
                        </span>
                        <span className="text-[10px] text-purple-300/70 font-mono">
                          {formatMaskedEmail(ref.referredEmail)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#FFC107] font-black block">
                        +₦{ref.rewardAmount?.toLocaleString() || '2,500'}
                      </span>
                      <span className="text-[9px] text-purple-300/60 uppercase tracking-wider font-semibold">
                        {ref.status === 'rewarded' ? 'Credited' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : totalReferralCount > 0 ? (
              <div className="space-y-2 mt-2">
                <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-semibold text-white block">{totalReferralCount} Active Referral Bonus(es)</span>
                      <span className="text-[10px] text-purple-300/80">Credited to CashBack Vault</span>
                    </div>
                  </div>
                  <span className="text-amber-400 font-black">+₦{totalReferralEarnings.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-white/5 border border-purple-500/20 text-center space-y-2">
                <p className="text-xs text-purple-200/90 leading-snug">
                  No referred friends yet. Share your code <span className="font-mono font-bold text-[#FFC107]">{referralCode}</span> with friends to earn <span className="font-bold text-[#FFC107]">₦2,500</span> for every new sign-up!
                </p>
                <button
                  onClick={handleCopyCode}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Copy Code &amp; Share (₦2,500/Ref)</span>
                </button>
              </div>
            )}
          </div>

          {/* Member Start Date */}
          <div className="mirror-glass p-3.5 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Member Start Date
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Tier-1 CBN
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {memberDate}
            </div>
          </div>

          {/* Dark Mode Toggle Switch */}
          <div className="mirror-glass p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-[#00B875]" />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-white block">
                  Dark Mode Theme
                </span>
                <span className="text-[11px] text-slate-400">
                  {isUltraDarkMode ? 'Obsidian Mirror Glass Enabled' : 'Standard Dark Active'}
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => setIsUltraDarkMode(!isUltraDarkMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                isUltraDarkMode ? 'bg-[#00B875]' : 'bg-slate-700'
              }`}
              aria-label="Toggle theme mode"
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  isUltraDarkMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* WhatsApp Support Channel */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => window.open('https://whatsapp.com/channel/0029Vb7iKzx9Gv7YcWX4Vv1C', '_blank', 'noopener,noreferrer')}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-[#02E680]/15 hover:bg-[#02E680]/25 text-[#02E680] font-bold text-xs flex items-center justify-between border border-[#02E680]/35 shadow-sm transition-all active:scale-95"
            >
              <span>Contact Us (Official WhatsApp Channel)</span>
              <span className="text-[10px] uppercase font-black bg-[#02E680] text-black px-2 py-0.5 rounded-md">
                24/7 Live
              </span>
            </button>
          </div>

          {/* Admin Indicator (Only shown if already logged in as Admin) */}
          {isAdmin && (
            <div className="pt-1">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Admin Mode Active</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Red Logout Button as requested */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold text-xs sm:text-sm shadow-[0_6px_20px_rgba(220,38,38,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-400/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

      </div>
    </div>
  );
};
