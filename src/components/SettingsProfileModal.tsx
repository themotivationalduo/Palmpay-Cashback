import React, { useState } from 'react';
import { User, Mail, Hash, Calendar, Moon, Sun, LogOut, Copy, Check, Shield, Sparkles, Users, Award, Gift, RefreshCw, Link, Share2, Smartphone, Download, Github, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { getReferralUrl, getReferralShareMessage } from '../utils/referral';

interface SettingsProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
  onOpenWelcome?: () => void;
  isStandalone?: boolean;
}

export const SettingsProfileModal: React.FC<SettingsProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAdminPanel,
  onOpenWelcome,
  isStandalone = false
}) => {
  const { user, logout, isAdmin, referrals } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isUltraDarkMode, setIsUltraDarkMode] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showApkGuide, setShowApkGuide] = useState(false);

  if (!isOpen && !isStandalone) return null;

  const userEmail = user?.email || 'user@example.com';
  const referralCode = user?.referralCode || 'PALM2026';
  const referralUrl = getReferralUrl(referralCode);
  const [copiedLink, setCopiedLink] = useState(false);
  const memberDate = user?.memberSince || '29 September 2026';
  const totalReferralCount = Math.max(user?.referralCount || 0, referrals.length);
  const totalReferralEarnings = totalReferralCount * 2500;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    triggerCelebration({
      title: 'VIP Invitation Link Copied! 🔗',
      subtitle: `Link "${referralUrl}" copied! When opened by a referee, your invitation code is prefilled automatically.`,
      type: 'copy',
      duration: 3000,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const msg = getReferralShareMessage(referralCode);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

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
    try {
      setLogoutLoading(true);
      await logout();
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const formatMaskedEmail = (emailStr: string) => {
    if (!emailStr.includes('@')) return emailStr;
    const [namePart, domainPart] = emailStr.split('@');
    const masked = namePart.slice(0, 2) + '***';
    return `${masked}@${domainPart}`;
  };

  const contentMarkup = (
    <div className="mirror-glass-card max-w-xl w-full mx-auto rounded-3xl p-5 sm:p-7 border border-purple-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.85)] relative my-2 sm:my-4">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[#00B875]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Standalone Back Header */}
      {isStandalone && (
        <div className="flex items-center justify-between pb-3.5 border-b border-purple-500/20 mb-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 hover:text-white text-xs font-bold transition-all border border-purple-400/30"
          >
            ← Back to Dashboard
          </button>
          <span className="text-[10px] sm:text-xs font-black uppercase text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
            Account Profile
          </span>
        </div>
      )}

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

          {/* Unique Referral Code & URL Link Card */}
          <div className="mirror-glass p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 space-y-3 bg-gradient-to-r from-purple-900/30 to-purple-800/10">
            <div className="flex items-center justify-between text-xs text-purple-300/90">
              <span className="flex items-center gap-1.5 font-bold text-purple-200">
                <Hash className="w-3.5 h-3.5 text-[#FFC107]" />
                VIP Invitation Code &amp; Link
              </span>
              <span className="text-[11px] bg-amber-500/20 text-[#FFC107] font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                ₦2,500 / invite
              </span>
            </div>

            <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-purple-500/25">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Your Referral Code</span>
                <span className="font-mono text-base font-black text-[#FFC107] tracking-wider">
                  {referralCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/15 text-slate-200 px-2.5 py-1.5 rounded-lg font-semibold transition-all border border-white/15 cursor-pointer"
                title="Copy code only"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Code'}</span>
              </button>
            </div>

            {/* URL Link Box */}
            <div className="space-y-1.5">
              <div className="bg-black/60 rounded-xl px-2.5 py-1.5 border border-purple-500/30 text-[11px] font-mono text-purple-200 truncate select-all">
                {referralUrl}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-[#621494] to-[#7E1DC6] hover:opacity-90 text-white py-2 rounded-xl font-bold transition-all shadow-md border border-purple-300/30 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#FFC107]" /> : <Link className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link (Auto-Prefills)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold transition-all shadow-md cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-tight">
              ⚡ Referees who click your link automatically have your invitation code prefilled upon sign-up and unlock ₦150,000 welcome cashback.
            </p>
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

          {/* WhatsApp Support Channel & APK Download */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={() => setShowApkGuide(true)}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-[#00B875]/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 font-bold text-xs flex items-center justify-between border border-[#00B875]/40 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#00B875]" />
                Download App as APK (GitHub)
              </span>
              <span className="text-[10px] uppercase font-black bg-[#00B875] text-black px-2 py-0.5 rounded-md flex items-center gap-1">
                <Download className="w-3 h-3" />
                APK Build
              </span>
            </button>

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

            {onOpenWelcome && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWelcome();
                }}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-[#1865D8]/15 hover:bg-[#1865D8]/25 text-blue-400 font-bold text-xs flex items-center justify-between border border-blue-500/35 shadow-sm transition-all active:scale-95"
              >
                <span>View Welcome &amp; Rewards Overview</span>
                <span className="text-[10px] uppercase font-black bg-[#1865D8] text-white px-2 py-0.5 rounded-md">
                  Welcome
                </span>
              </button>
            )}
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
            disabled={logoutLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold text-xs sm:text-sm shadow-[0_6px_20px_rgba(220,38,38,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-400/30 disabled:opacity-50 cursor-pointer"
          >
            {logoutLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>

      </div>
  );

  return (
    <>
      {isStandalone ? (
        <div className="animate-in fade-in duration-300 w-full py-2">
          {contentMarkup}
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          {contentMarkup}
        </div>
      )}

      {/* APK GitHub Guide Modal */}
      {showApkGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-5 sm:p-6 border border-[#00B875]/40 shadow-[0_25px_65px_rgba(0,0,0,0.95)] relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00B875]/20 border border-[#00B875]/40 flex items-center justify-center text-[#00B875]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white font-['Poppins',sans-serif]">
                    Download APK via GitHub
                  </h4>
                  <p className="text-[11px] text-slate-400">Automated Android CI/CD Build</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApkGuide(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#00B875]/10 border border-[#00B875]/30 space-y-1">
              <span className="text-xs font-bold text-[#00B875] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Ready for GitHub Actions Build
              </span>
              <p className="text-[11px] text-slate-300">
                A pre-configured GitHub Actions workflow (<code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">.github/workflows/build-apk.yml</code>) automatically builds your Android APK whenever you push to GitHub!
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-black">1</span>
                  Push Code to your GitHub Repo
                </span>
                <pre className="p-2.5 rounded-xl bg-black/60 border border-purple-500/30 text-[11px] font-mono text-purple-300 overflow-x-auto">
git add .
git commit -m "feat: setup APK build"
git push origin main</pre>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-black">2</span>
                  Open the "Actions" Tab on GitHub
                </span>
                <p className="text-slate-400 text-[11px]">
                  Go to your repository on github.com and click the <strong className="text-white">Actions</strong> tab. You will see the <strong className="text-[#00B875]">"Build Android APK"</strong> workflow running.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#00B875] text-black flex items-center justify-center text-[11px] font-black">3</span>
                  Download the .apk File (Artifacts)
                </span>
                <p className="text-slate-400 text-[11px]">
                  When the build finishes with a green checkmark, scroll down to <strong className="text-white">Artifacts</strong> and click <strong className="text-[#00B875]">PalmPay-CashBack-Android-APK</strong> to download and install!
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('git add . && git commit -m "feat: build apk" && git push');
                  triggerCelebration({
                    title: 'Git Commands Copied! 📋',
                    subtitle: 'Push your repository to GitHub to automatically generate your APK!',
                    type: 'copy',
                    duration: 2500,
                    confettiIntensity: 'low'
                  });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 font-bold text-xs border border-purple-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Push Command
              </button>

              <button
                type="button"
                onClick={() => setShowApkGuide(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
