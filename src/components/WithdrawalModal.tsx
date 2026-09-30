import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight, 
  Building, 
  KeyRound, 
  Check, 
  ChevronRight, 
  Loader2, 
  ExternalLink,
  Lock,
  CreditCard,
  RefreshCw,
  Wallet,
  Sparkles,
  Upload,
  X,
  ImageIcon
} from 'lucide-react';
import { useAuth, PAYSTACK_CASHBACK_CODE_URL, OFFICIAL_CASHBACK_CODE } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { fetchPaystackBanks, resolvePaystackAccount, BankOption, DEFAULT_NIGERIAN_BANKS } from '../services/paystackService';
import confetti from 'canvas-confetti';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBuyCode: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  onOpenBuyCode
}) => {
  const { user, requestWithdrawal } = useAuth();
  const { triggerCelebration } = useCelebration();

  const [step, setStep] = useState<'details' | 'verify_code' | 'success'>('details');
  const [balanceSource, setBalanceSource] = useState<'cashback' | 'deposit'>('cashback');
  const [banks, setBanks] = useState<BankOption[]>(DEFAULT_NIGERIAN_BANKS);
  const [banksLoading, setBanksLoading] = useState(false);
  
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [enteredCode, setEnteredCode] = useState(user?.activeCashbackCode || '');
  
  // Paystack verification state
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string>('');

  // Transaction Receipt Upload state
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync enteredCode whenever activeCashbackCode changes
  useEffect(() => {
    if (user?.activeCashbackCode) {
      setEnteredCode(user.activeCashbackCode);
    }
  }, [user?.activeCashbackCode]);

  // Initialize destination to Site B / PalmPay
  useEffect(() => {
    if (isOpen) {
      setBankName('Site B Wallet');
      setBankCode('SITE_B');
      if (user?.displayName && !accountName) {
        setAccountName(user.displayName);
      }
      setIsResolved(true);
    }
  }, [isOpen, user?.displayName]);

  // Handle dynamic Site B account number input (accepts any Site B account number)
  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAccountNumber(value);
    setError(null);
  };

  // Receipt image file handler
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReceiptError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    // Limit to 4MB
    if (file.size > 4 * 1024 * 1024) {
      setReceiptError('File size exceeds 4MB limit. Please upload a smaller image.');
      return;
    }

    setReceiptError(null);
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImage(result);
    };
    reader.onerror = () => {
      setReceiptError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const removeReceiptImage = () => {
    setReceiptImage('');
    setReceiptFileName('');
    setReceiptError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const cashbackBal = user?.balance ?? 0;
  const depositBal = user?.depositBalance ?? 0;
  const selectedAvailable = balanceSource === 'deposit' ? depositBal : cashbackBal;

  const handleProceedToVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAcc = (accountNumber || '').trim();
    if (!cleanAcc || cleanAcc.length < 2) {
      setError('Please enter a valid Site B account number.');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }
    if (numAmount < 1000) {
      setError('Minimum withdrawal amount is ₦1,000.');
      return;
    }
    if (numAmount > selectedAvailable) {
      setError(`Withdrawal amount exceeds your available ${balanceSource === 'deposit' ? 'Deposited' : 'CashBack'} balance of ₦${selectedAvailable.toLocaleString()}.`);
      return;
    }
    setError(null);
    setEnteredCode(user?.activeCashbackCode || '');
    setStep('verify_code');
  };

  const handleConfirmWithdrawal = async () => {
    const cleanCode = (enteredCode || '').trim().toLowerCase();
    if (!cleanCode || cleanCode.length < 5) {
      setError('CashBack Code required. You must purchase and input a valid CashBack Code (e.g. palm_386_cash_737) before you can withdraw funds.');
      return;
    }

    if (!receiptImage) {
      setError('Transaction receipt image required. Please upload your transaction receipt before submitting for admin approval.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const reference = await requestWithdrawal({
        bankName: bankName || 'Site B Wallet',
        accountNumber,
        userName: accountName.trim() || user?.displayName || 'Site B Beneficiary',
        amount: Number(amount),
        cashbackCode: cleanCode,
        balanceSource,
        receiptImage
      });
      setTxRef(reference);
      setLoading(false);
      setStep('success');

      triggerCelebration({
        title: 'Withdrawal Submitted! ⏳',
        subtitle: 'Your withdrawal request has been placed on pending status. It will be verified and approved by Admin.',
        type: 'withdrawal',
        amount: `₦${Number(amount).toLocaleString()}`,
        duration: 4500
      });
    } catch (err: any) {
      setError(err.message || 'Error executing withdrawal.');
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setStep('details');
    setBalanceSource('cashback');
    setBankName('Site B Wallet');
    setBankCode('SITE_B');
    setAccountNumber('');
    setAccountName('');
    setAmount('');
    setReceiptImage('');
    setReceiptFileName('');
    setReceiptError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsResolved(false);
    setResolutionMessage(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="mirror-glass-card max-w-md w-full rounded-3xl p-5 sm:p-7 border border-purple-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.85)] relative my-8">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* STEP 1: Withdrawal Account & Amount Details */}
        {step === 'details' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-['Poppins',sans-serif]">
                    Withdraw Funds
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Paystack Live
                  </span>
                </div>
                <p className="text-xs text-slate-400">Direct transfer to any Nigerian bank account</p>
              </div>
              <button
                onClick={handleResetAndClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleProceedToVerify} className="space-y-3.5">
              
              {/* Balance Source Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Select Balance to Withdraw From:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceSource('cashback')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      balanceSource === 'cashback'
                        ? 'bg-purple-600/30 border-[#A855F7] text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#FFC107]" /> CashBack
                      </span>
                      {balanceSource === 'cashback' && <Check className="w-3 h-3 text-[#FFC107]" />}
                    </div>
                    <div className="text-sm font-black font-mono text-[#FFC107] mt-0.5">
                      ₦{cashbackBal.toLocaleString()}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBalanceSource('deposit')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      balanceSource === 'deposit'
                        ? 'bg-emerald-600/30 border-[#00B875] text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-[#00B875]" /> Deposited
                      </span>
                      {balanceSource === 'deposit' && <Check className="w-3 h-3 text-[#00B875]" />}
                    </div>
                    <div className="text-sm font-black font-mono text-[#00B875] mt-0.5">
                      ₦{depositBal.toLocaleString()}
                    </div>
                  </button>
                </div>
              </div>

              {/* Destination Platform / Service */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Destination Platform (Site B Disbursal)
                </label>
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-950/60 to-black/60 border border-purple-500/40 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#621494] border border-purple-400/30 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Building className="w-5 h-5 text-[#FFC107]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white font-['Poppins',sans-serif]">Site B Wallet</span>
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-[#00B875]/20 text-[#00B875] border border-[#00B875]/30">
                          Direct Credit
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-200/80">PalmPay Cashback Server-to-Server Payout</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#FFC107] font-bold block">ROUTE: SITE_B</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Site B Account Number Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Site B Account Number
                  </label>
                  <span className="text-[10px] text-purple-300">
                    Input any Site B account number
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={handleAccountNumberChange}
                    placeholder="Enter any Site B generated account number"
                    className="w-full bg-[#121922] text-white text-xs sm:text-sm font-mono rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 You can enter your own Site B account number or any beneficiary account on Site B.
                </p>
              </div>

              {/* Account / Beneficiary Name (Optional customization) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Beneficiary Name (Optional Reference)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. My Site B Account or Beneficiary Name"
                  className="w-full bg-[#121922] text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                />
              </div>

              {/* Withdrawal Amount */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Withdrawal Amount (₦)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#FFC107] font-mono">
                      Avail: ₦{selectedAvailable.toLocaleString()}
                    </span>
                    {selectedAvailable > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(selectedAvailable)}
                        className="text-[10px] text-purple-300 hover:text-white bg-purple-600/30 px-2 py-0.5 rounded-full font-bold"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    min={2000}
                    max={selectedAvailable}
                    placeholder="Enter amount (min. ₦2,000)"
                    className="w-full bg-[#121922] text-white text-sm sm:text-base font-bold font-mono rounded-xl pl-8 pr-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isResolving}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-sm shadow-[0_6px_25px_rgba(126,29,198,0.45)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-300/30 disabled:opacity-50"
                >
                  <span>Continue to Code Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Code Verification (Mandatory Cashback Code: palm_386_cash_737) */}
        {step === 'verify_code' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#FFC107]" />
                <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                  CashBack Code Verification
                </h3>
              </div>
              <button
                onClick={() => setStep('details')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Mandatory Requirement Warning */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/35 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#FFC107] shrink-0" /> Mandatory CBN Clearance Notice
                </span>
                <span className="text-[10px] bg-amber-500/25 text-[#FFC107] font-mono px-2 py-0.5 rounded-full font-bold">
                  FEE: ₦8,550
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                ⚠️ You must purchase a valid CashBack Code and upload your transaction receipt proof, or else your withdrawal request will be declined by the admin clearing protocol.
              </p>
            </div>

            {/* Paystack Purchase Quick Action Link */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-black/50 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-left">
                <span className="text-xs font-bold text-white block">Don't have a code yet?</span>
                <span className="text-[11px] text-amber-300">Purchase securely on Paystack or via Deposit balance</span>
              </div>
              <a
                href={PAYSTACK_CASHBACK_CODE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#FFC107] hover:bg-amber-400 text-black text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Buy Code (₦8,550)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Code Input Field */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Enter or Paste CashBack Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                placeholder="Enter CashBack Code (e.g. palm_386_cash_737)"
                className="w-full bg-[#121922] text-white text-sm sm:text-base font-mono font-bold tracking-wider rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6] text-center"
                required
              />
            </div>

            {/* Transaction Receipt Image Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#00B875]" />
                  Upload Transaction Receipt Proof <span className="text-red-400">*</span>
                </span>
                <span className="text-[10px] text-purple-300">Required for Admin Review</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleReceiptUpload}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                id="withdrawal-receipt-upload"
              />

              {!receiptImage ? (
                <label
                  htmlFor="withdrawal-receipt-upload"
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-white/5 hover:bg-white/10 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 group-hover:bg-purple-600/30 flex items-center justify-center text-[#FFC107] transition-all">
                    <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Click to upload transaction receipt</span>
                    <span className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG, WEBP (Max 4MB)</span>
                  </div>
                </label>
              ) : (
                <div className="relative rounded-2xl border border-emerald-500/40 bg-black/50 p-2.5 flex items-center gap-3">
                  <img
                    src={receiptImage}
                    alt="Uploaded Receipt"
                    className="w-14 h-14 object-cover rounded-xl border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Receipt Attached</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {receiptFileName || 'transaction_receipt.png'}
                    </p>
                    <span className="text-[9px] text-purple-300 font-mono">Ready for admin verification</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeReceiptImage}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs transition-colors shrink-0"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {receiptError && (
                <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{receiptError}</span>
                </p>
              )}
            </div>

            {/* Payout Summary */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Withdrawal Source:</span>
                <strong className="text-purple-300">
                  {balanceSource === 'deposit' ? 'Deposited Balance' : 'CashBack Balance'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Beneficiary:</span>
                <strong className="text-white flex items-center gap-1">
                  {accountName}
                  {isResolved && <Check className="w-3 h-3 text-emerald-400" />}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Destination:</span>
                <strong className="text-white">{bankName} ({accountNumber})</strong>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-white/10">
                <span>Total Payout:</span>
                <strong className="text-[#00B875] font-mono text-sm font-black">
                  ₦{Number(amount).toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleConfirmWithdrawal}
                disabled={loading || !enteredCode.trim() || !receiptImage}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-sm shadow-[0_6px_25px_rgba(126,29,198,0.45)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-300/30 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Submitting Request...' : `Submit Withdrawal for Admin Approval (₦${Number(amount).toLocaleString()})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Withdrawal Submitted (Pending Admin Approval) Modal */}
        {step === 'success' && (
          <div className="space-y-4 text-center py-2 animate-in zoom-in-95">
            <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-[#7E1DC6] to-emerald-400 p-[2px] shadow-[0_0_35px_rgba(126,29,198,0.6)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#120822] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFC107] animate-bounce" />
              </div>
              <div className="absolute -top-1 -right-1 text-xl sm:text-2xl">
                ⏳
              </div>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-[#FFC107] px-3 py-1 rounded-full border border-amber-500/40 animate-pulse">
                STATUS: PENDING ADMIN APPROVAL
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-2 font-['Poppins',sans-serif]">
                Withdrawal Submitted!
              </h3>
              <p className="text-xs text-purple-200/80 mt-1 max-w-sm mx-auto">
                Your request has been queued in pending status. Balance will be deducted once verified by Admin and disbursed to Site B.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/20 text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Balance Source:</span>
                <span className="font-bold text-purple-300">
                  {balanceSource === 'deposit' ? 'Deposited Balance' : 'CashBack Balance'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Beneficiary:</span>
                <span className="font-bold text-white">{accountName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Destination:</span>
                <span className="font-bold text-white">{bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Site B Account:</span>
                <span className="font-mono text-[#FFC107] font-bold bg-black/50 px-2 py-0.5 rounded border border-amber-500/30">
                  {accountNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-slate-400 font-semibold">Requested Amount:</span>
                <span className="text-lg font-black text-[#FFC107] font-mono">
                  ₦{Number(amount).toLocaleString()}
                </span>
              </div>
              {receiptImage && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400">Proof Receipt:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Attached
                  </span>
                </div>
              )}
              {txRef && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                  <span>Reference ID:</span>
                  <span className="font-mono text-purple-300 font-semibold">{txRef}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={handleResetAndClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-sm shadow-[0_6px_25px_rgba(126,29,198,0.45)] hover:opacity-95 active:scale-95 transition-all border border-purple-300/30"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
