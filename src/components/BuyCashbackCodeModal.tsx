import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Check, 
  Copy, 
  AlertCircle, 
  ExternalLink, 
  CreditCard, 
  CheckCircle2, 
  Coins,
  Lock,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useAuth, PAYSTACK_CASHBACK_CODE_URL } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';

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
  const { user, buyCashbackCode, activateCashbackCode, buyCashbackCodeWithDepositBalance } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [depLoading, setDepLoading] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Receipt image upload states for Paystack store purchase
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  if (!isOpen) return null;

  const hasPurchasedCode = Boolean(user?.hasActiveCode && user?.activeCashbackCode);
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
    if (hasPurchasedCode) return;
    window.open(PAYSTACK_CASHBACK_CODE_URL, '_blank', 'noopener,noreferrer');
  };

  // Handle image upload from file select
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Buy Cashback Code with Paystack + MANDATORY Receipt
  const handleBuyCashbackCodeWithReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPurchasedCode) {
      setError('You already have an active CashBack Code linked to this account.');
      return;
    }

    if (!receiptImage) {
      setError('Please upload your Paystack payment receipt image to complete your order. Upload is mandatory.');
      return;
    }

    setError(null);
    setPaystackLoading(true);

    try {
      await buyCashbackCode(receiptImage);
      setSuccessMessage('Your Cashback Code order was submitted successfully with receipt proof! Once verified by admin, your code will be revealed here.');
      
      triggerCelebration({
        title: 'Order Submitted! 💳',
        subtitle: 'Your transaction receipt is submitted for admin review. Your code will be released shortly.',
        type: 'code',
        duration: 4500
      });

      setReceiptImage(null);
      setFileName('');
      if (onCodePurchased) {
        onCodePurchased('Pending Admin Approval');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing Cashback Code purchase request.');
    } finally {
      setPaystackLoading(false);
    }
  };

  // Buy directly using Deposited Balance
  const handleBuyWithDepositBalance = async () => {
    if (hasPurchasedCode) {
      setError('You have already purchased and activated a CashBack Code. No duplicate purchase is permitted.');
      return;
    }

    if (depositBal < 8550) {
      setError(`Insufficient deposited balance (Available: ₦${depositBal.toLocaleString()}). You need ₦8,550 in your deposited balance, or pay directly via Paystack.`);
      return;
    }

    setError(null);
    setDepLoading(true);

    try {
      await buyCashbackCodeWithDepositBalance();
      setSuccessMessage('CashBack Code purchase submitted (₦8,550). Pending Admin Approval on Control Panel. Once approved, your code will be revealed in your account.');
      
      triggerCelebration({
        title: 'Order Submitted for Approval! ⌛',
        subtitle: 'Your CashBack Code purchase was placed on pending. It will be revealed upon Admin approval.',
        type: 'code',
        duration: 4500
      });

      if (onCodePurchased) {
        onCodePurchased('Pending Admin Approval');
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
    if (hasPurchasedCode) {
      setError('You already have an active CashBack Code linked to this account.');
      return;
    }

    const clean = inputCode.trim();
    if (!clean || clean.length < 5) {
      setError('Please enter a valid CashBack Code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await activateCashbackCode(clean);
      setSuccessMessage('CashBack Code successfully submitted and linked to your account!');
      
      triggerCelebration({
        title: 'CashBack Code Linked! 🛡️',
        subtitle: `Code successfully submitted for approval on your account.`,
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
      <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-5 sm:p-7 border border-amber-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.9)] relative my-8 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
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
                  Purchase CashBack Code
                </h3>
                <span className="text-[10px] font-black uppercase bg-[#00B875]/20 text-[#00B875] px-2 py-0.5 rounded-full border border-[#00B875]/30">
                  OFFICIAL CLEARANCE
                </span>
              </div>
              <p className="text-xs text-slate-400">Solely for CashBack Code purchase & activation</p>
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

        {/* ALREADY PURCHASED BANNER */}
        {hasPurchasedCode && (
          <div className="mt-4 p-4 rounded-2xl mirror-glass border border-emerald-500/40 bg-emerald-950/20 space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00B875]" />
                CashBack Code Active
              </span>
              <span className="text-[10px] bg-emerald-500/25 text-[#00B875] font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                PURCHASE COMPLETED
              </span>
            </div>

            <p className="text-xs text-emerald-200/90 leading-relaxed">
              You have already purchased and activated your official CashBack Code. Purchases are disabled as you only need one active code per account.
            </p>

            <div className="flex items-center justify-between bg-black/60 rounded-xl px-3.5 py-2.5 border border-emerald-500/30">
              <span className="font-mono font-black text-sm sm:text-base text-white tracking-wider">
                {activeCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs bg-[#00B875] hover:bg-[#008f5a] text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-md active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Pricing Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-black/40 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block">
              Clearance Code Price
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#FFC107] font-mono">
              ₦8,550
            </span>
            <span className="text-[11px] text-slate-300 block mt-0.5">
              Code Status: <span className="text-[#FFC107] font-mono font-bold">{hasPurchasedCode ? activeCode : 'Revealed upon Admin Approval'}</span>
            </span>
          </div>

          <div className="text-right">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-block ${
              hasPurchasedCode
                ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {hasPurchasedCode ? 'Purchased' : 'One-Time Purchase'}
            </span>
          </div>
        </div>

        {/* Option 1: Buy with Deposited Balance */}
        <div className={`mt-4 p-4 rounded-2xl border space-y-2.5 transition-all ${
          hasPurchasedCode 
            ? 'bg-white/5 border-white/10 opacity-60' 
            : 'bg-emerald-950/20 border-emerald-500/30'
        }`}>
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
            Deduct ₦8,550 directly from your deposited balance to purchase and activate your official CashBack Code.
          </p>

          <button
            type="button"
            onClick={handleBuyWithDepositBalance}
            disabled={hasPurchasedCode || depLoading || depositBal < 8550}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(0,184,117,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasPurchasedCode ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Code Already Purchased &amp; Active</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>{depLoading ? 'Purchasing...' : 'Buy with Deposited Balance (₦8,550)'}</span>
              </>
            )}
          </button>
          
          {!hasPurchasedCode && depositBal < 8550 && (
            <p className="text-[10px] text-slate-400 text-center">
              Insufficient deposited balance (₦8,550 needed). Pay via Paystack below.
            </p>
          )}
        </div>

        {/* Option 2: Pay on Paystack Store + MANDATORY RECEIPT */}
        <div className={`mt-4 p-4 rounded-2xl border space-y-3 transition-all ${
          hasPurchasedCode 
            ? 'bg-white/5 border-white/10 opacity-60' 
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-extrabold text-[11px] flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Pay via Paystack &amp; Submit Receipt
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Mandatory Proof</span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            1. Open and pay <strong>₦8,550</strong> online through the verified Paystack portal.<br />
            2. Take a screenshot or download your receipt, then upload it below. Proof of payment is **mandatory** to release your CashBack Code.
          </p>

          {hasPurchasedCode ? (
            <button
              type="button"
              disabled={true}
              className="w-full py-3 rounded-xl bg-white/10 text-slate-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>Purchase Disabled (Already Active)</span>
            </button>
          ) : (
            <div className="space-y-4">
              <a
                href={PAYSTACK_CASHBACK_CODE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenPaystack}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-[#FFC107] to-amber-400 text-black font-black text-xs sm:text-sm shadow-[0_6px_25px_rgba(255,193,7,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Step 1: Pay ₦8,550 on Paystack</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Mandatory Receipt Upload Input */}
              <form onSubmit={handleBuyCashbackCodeWithReceipt} className="space-y-3.5 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Upload className="w-4 h-4 text-[#00B875]" />
                  <span>Step 2: Upload Payment Receipt (Mandatory)</span>
                </div>

                {receiptImage ? (
                  <div className="p-3 rounded-2xl bg-black/60 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5 truncate">
                        <ImageIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{fileName || 'Receipt Preview'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage(null);
                          setFileName('');
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-40 overflow-hidden rounded-xl border border-white/10 bg-black/80 flex items-center justify-center">
                      <img
                        src={receiptImage}
                        alt="Receipt Preview"
                        className="max-h-40 w-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/20 hover:border-[#00B875] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-black/30 hover:bg-black/50 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-200 text-center">
                      Click to upload Paystack transaction receipt image
                    </span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, JPEG, WEBP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={paystackLoading || !receiptImage}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs sm:text-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{paystackLoading ? 'Submitting Receipt...' : 'Step 3: Submit Receipt for Code Release'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Option 3: Input and Activate Purchased Code */}
        {!hasPurchasedCode && (
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
                placeholder="Enter purchased code"
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
        )}

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
