import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Check, 
  Copy, 
  AlertCircle, 
  ArrowRight, 
  ExternalLink, 
  CreditCard, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  Wallet,
  Coins
} from 'lucide-react';
import { useAuth, PAYSTACK_CASHBACK_CODE_URL, OFFICIAL_CASHBACK_CODE } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import confetti from 'canvas-confetti';

interface BuyCashbackCodeProps {
  isOpen: boolean;
  onClose: () => void;
  onCodePurchased?: (code: string) => void;
  onProceedToWithdraw?: () => void;
}

export const BuyCashbackCodeModal: React.FC<BuyCashbackCodeProps> = ({
  isOpen,
  onClose,
  onCodePurchased,
  onProceedToWithdraw
}) => {
  const { user, activateCashbackCode, buyCashbackCodeWithDepositBalance } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [depLoading, setDepLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCode = user?.activeCashbackCode || '';
  const depositBal = user?.depositBalance ?? 0;

  const handleCopyCode = () => {
    if (!activeCode) return;
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    triggerCelebration({
      title: 'Code Copied! 📋',
      subtitle: `CashBack Code "${activeCode}" copied to clipboard.`,
      type: 'copy',
      duration: 2500,
      confettiIntensity: 'low'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPaystack = () => {
    window.open(PAYSTACK_CASHBACK_CODE_URL, '_blank', 'noopener,noreferrer');
  };

  // Buy directly using Deposited Balance
  const handleBuyWithDepositBalance = async () => {
    if (depositBal < 8550) {
      setError(`Insufficient deposited balance (Available: ₦${depositBal.toLocaleString()}). You need ₦8,550 in your deposited balance, or pay directly via Paystack.`);
      return;
    }

    setError(null);
    setDepLoading(true);

    try {
      const code = await buyCashbackCodeWithDepositBalance();
      setSuccessMessage(`CashBack Code (${code}) purchased and activated successfully using your Deposited Balance!`);
      
      triggerCelebration({
        title: 'CashBack Code Activated! 🔑',
        subtitle: `Code "${code}" is now linked to your account. Your withdrawal access is cleared!`,
        type: 'code',
        duration: 4500
      });

      if (onCodePurchased) {
        onCodePurchased(code);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing purchase from deposited balance.');
    } finally {
      setDepLoading(false);
    }
  };

  // Manual activate code
  const handleActivateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean || clean.length < 5) {
      setError('Please enter a valid CashBack Code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await activateCashbackCode(clean);
      setSuccessMessage('CashBack Code successfully activated and linked to your account!');
      
      triggerCelebration({
        title: 'CashBack Code Linked! 🛡️',
        subtitle: `Code "${clean}" successfully verified and active on your account.`,
        type: 'code',
        duration: 4200
      });

      if (onCodePurchased) {
        onCodePurchased(clean);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-5 sm:p-7 border border-amber-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.9)] relative my-8">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#FFC107] text-black shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                  Buy CashBack Code
                </h3>
                <span className="text-[10px] font-black uppercase bg-[#00B875]/20 text-[#00B875] px-2 py-0.5 rounded-full border border-[#00B875]/30">
                  CBN VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">Official Withdrawal Clearance Protocol</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Pricing Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-black/40 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block">
              Clearance Fee
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#FFC107] font-mono">
              ₦8,550
            </span>
            <span className="text-[11px] text-slate-300 block mt-0.5">
              Code: <span className="text-[#FFC107] font-mono font-bold">{OFFICIAL_CASHBACK_CODE}</span>
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] bg-emerald-500/20 text-[#00B875] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">
              Mandatory for Payouts
            </span>
          </div>
        </div>

        {/* Existing Active Code Section */}
        {user?.hasActiveCode && activeCode && (
          <div className="mt-4 p-4 rounded-2xl mirror-glass border border-emerald-500/35 bg-emerald-950/15 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Your Active CashBack Code:
              </span>
              <span className="text-[10px] bg-emerald-500/25 text-emerald-300 font-mono px-2 py-0.5 rounded-full font-bold">
                READY FOR WITHDRAWAL
              </span>
            </div>

            <div className="flex items-center justify-between bg-black/60 rounded-xl px-3.5 py-2.5 border border-white/10">
              <span className="font-mono font-black text-sm sm:text-base text-white tracking-wider">
                {activeCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs bg-[#00B875] hover:bg-[#008f5a] text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-md active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-300">
                Code verified. You can now process withdrawals.
              </p>
              {onProceedToWithdraw && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onProceedToWithdraw();
                  }}
                  className="text-xs text-[#FFC107] font-bold hover:underline flex items-center gap-1"
                >
                  <span>Withdraw Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Option 1: Buy with Deposited Balance */}
        <div className="mt-4 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-extrabold text-[11px] flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Buy with Deposited Balance
              </span>
            </div>
            <span className="text-[11px] text-emerald-300 font-mono font-bold">
              Avail: ₦{depositBal.toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Instantly purchase and activate your official CashBack Code by deducting ₦8,550 directly from your deposited balance.
          </p>

          <button
            type="button"
            onClick={handleBuyWithDepositBalance}
            disabled={depLoading || depositBal < 8550}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(0,184,117,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Coins className="w-4 h-4" />
            <span>{depLoading ? 'Purchasing...' : 'Buy with Deposited Balance (₦8,550)'}</span>
          </button>
          
          {depositBal < 8550 && (
            <p className="text-[10px] text-slate-400 text-center">
              Need more funds? Deposit via Paystack below.
            </p>
          )}
        </div>

        {/* Option 2: Pay on Paystack Store */}
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-extrabold text-[11px] flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Pay on Official Paystack Store
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">paystack.shop</span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Click below to pay <strong>₦8,550</strong> directly on Paystack.
          </p>

          <a
            href={PAYSTACK_CASHBACK_CODE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenPaystack}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-[#FFC107] to-amber-400 text-black font-black text-xs sm:text-sm shadow-[0_6px_25px_rgba(255,193,7,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay ₦8,550 on Paystack</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Option 3: Input and Activate Purchased Code */}
        <form onSubmit={handleActivateCode} className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-500 text-white font-extrabold text-[11px] flex items-center justify-center">
              3
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Input &amp; Activate Purchased Code
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="e.g. palm_386_cash_737"
              className="flex-1 bg-[#121922] text-white text-xs sm:text-sm font-mono font-bold tracking-wider rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
              required
            />
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md border border-purple-300/30"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Activate</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer buttons */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl mirror-glass hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
