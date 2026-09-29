import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Hash, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { PalmPayLogo } from './PalmPayLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const { registerUser, loginUser, loginWithGoogle } = useAuth();
  const { triggerCelebration } = useCelebration();
  
  const [mode, setMode] = useState<'register' | 'login'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full legal name.');
        }
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        await registerUser({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          referralCode: referralCode.trim()
        });

        triggerCelebration({
          title: 'Account Created Successfully! 🎉',
          subtitle: `Welcome, ${fullName.trim()}! Your PalmPay CashBack vault is now active with ₦2,000 bonus waiting.`,
          type: 'register',
          amount: '₦2,000 Welcome Reward Ready',
          duration: 4200
        });
      } else {
        if (!email.trim()) {
          throw new Error('Please enter your account email.');
        }
        await loginUser(email.trim(), password);

        triggerCelebration({
          title: 'Login Successful! ✨',
          subtitle: 'Welcome back! You are securely connected to your PalmPay CashBack dashboard.',
          type: 'login',
          duration: 3600
        });
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      triggerCelebration({
        title: 'Google Sign-In Successful! 🚀',
        subtitle: 'You are securely logged into PalmPay CashBack with Google.',
        type: 'login',
        duration: 3600
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        
        {/* Top PalmPay Brand Emblem */}
        <div className="text-center space-y-2">
          <div className="inline-block transition-transform hover:scale-105">
            <PalmPayLogo size="lg" showWordmark={true} />
          </div>
          <p className="text-xs text-purple-200/80 max-w-xs mx-auto">
            Official CBN-Licensed Rewards Portal. Enter your credentials to access your cashback vault.
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="mirror-glass-card rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-[0_20px_60px_rgba(10,4,20,0.9)] relative overflow-hidden">
          
          {/* Subtle purple aura glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-2xl bg-[#140924] p-1 border border-purple-500/25 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white shadow-md'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white shadow-md'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* New User Welcome Bonus Teaser */}
          {mode === 'register' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black/40 border border-purple-500/30 mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/30 text-[#FFC107]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#FFC107] tracking-wider block">
                    WELCOME INITIATIVE
                  </span>
                  <span className="text-xs font-bold text-white">
                    Claim ₦150,000 Sign-up Bonus
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Automated
              </span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 mb-4 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-purple-200 block mb-1">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#150A24] text-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-3 border border-purple-500/25 focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-purple-200 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#150A24] text-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-3 border border-purple-500/25 focus:outline-none focus:border-[#A855F7]"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-purple-200 block mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    placeholder="0801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#150A24] text-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-3 border border-purple-500/25 focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-purple-200 block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#150A24] text-white text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-3 border border-purple-500/25 focus:outline-none focus:border-[#A855F7]"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-purple-200 block mb-1">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-purple-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. PALM2026"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#150A24] text-white text-xs sm:text-sm font-mono rounded-xl pl-10 pr-3.5 py-3 border border-purple-500/25 focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-extrabold text-sm shadow-[0_6px_25px_rgba(126,29,198,0.5)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-300/30 mt-4"
            >
              <span>{loading ? 'Processing...' : mode === 'register' ? 'Register & Unlock Vault' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Social Sign In & Contact Us & PWA Install */}
          <div className="mt-5 pt-4 border-t border-purple-500/20 space-y-2.5">
            <PWAInstallButton variant="banner" />

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 rounded-xl mirror-glass hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-purple-500/30 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => window.open('https://whatsapp.com/channel/0029Vb7iKzx9Gv7YcWX4Vv1C', '_blank', 'noopener,noreferrer')}
              className="w-full py-2.5 rounded-xl bg-[#02E680]/15 hover:bg-[#02E680]/25 text-[#02E680] hover:text-white text-xs font-bold flex items-center justify-center gap-2 border border-[#02E680]/35 transition-all shadow-sm active:scale-95"
            >
              <Phone className="w-4 h-4 text-[#02E680]" />
              <span>Contact Us (WhatsApp Channel)</span>
            </button>
          </div>

        </div>

        {/* Security & Regulatory footer pill */}
        <div className="text-center text-xs text-purple-300/70 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#A855F7]" />
          <span>CBN Licensed • Automated 256-bit Interbank Settlement</span>
        </div>

      </div>
    </div>
  );
};
