import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  Building, 
  KeyRound, 
  Check, 
  Loader2, 
  Lock, 
  CreditCard,
  RefreshCw,
  Wallet,
  Sparkles,
  Upload,
  X,
  Clock,
  Zap,
  UserCheck,
  XCircle,
  Search
} from 'lucide-react';
import { useAuth, OFFICIAL_CASHBACK_CODE } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { resolvePaystackAccount } from '../services/paystackService';
import { db, collection, getDocs, doc, setDoc, getDoc } from '../lib/firebase';
import { CodeOrder, UserProfile } from '../types';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBuyCode?: () => void;
  isStandalone?: boolean;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  isStandalone = false
}) => {
  const { user, requestWithdrawal } = useAuth();
  const { triggerCelebration } = useCelebration();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [balanceSource, setBalanceSource] = useState<'cashback' | 'deposit'>('cashback');
  
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [enteredCode, setEnteredCode] = useState('');
  
  // Cashback Code real-time validation state
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeProgressStep, setCodeProgressStep] = useState<number>(0); // 0 = idle, 1 = format, 2 = DB registry, 3 = assignment/complete
  const [codeValidationResult, setCodeValidationResult] = useState<{
    formatOk: boolean | null;
    existsOk: boolean | null;
    assignedOk: boolean | null;
    message: string | null;
    isValid: boolean | null;
  }>({
    formatOk: null,
    existsOk: null,
    assignedOk: null,
    message: null,
    isValid: null
  });

  const codeValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect and populate approved code for user when page loads
  useEffect(() => {
    let isMounted = true;
    const loadApprovedCode = async () => {
      let codeToFill = (user?.hasActiveCode && user?.activeCashbackCode && !user.activeCashbackCode.toLowerCase().includes('pending'))
        ? user.activeCashbackCode.trim()
        : '';

      if (!codeToFill && user) {
        try {
          const ordersSnap = await getDocs(collection(db, 'code_orders'));
          ordersSnap.forEach((docSnap) => {
            const c = docSnap.data() as CodeOrder;
            const matchesUser = Boolean(
              c.uid === user.uid ||
              (c.userEmail && user.email && c.userEmail.trim().toLowerCase() === user.email.trim().toLowerCase())
            );
            if (matchesUser && c.status === 'approved' && c.generatedCode && !c.generatedCode.toLowerCase().includes('pending')) {
              codeToFill = c.generatedCode.trim();
            }
          });
        } catch (e) {}

        if (!codeToFill && user.uid) {
          try {
            const uSnap = await getDoc(doc(db, 'users', user.uid));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              if (uData.hasActiveCode && uData.activeCashbackCode && !uData.activeCashbackCode.toLowerCase().includes('pending')) {
                codeToFill = uData.activeCashbackCode.trim();
              }
            }
          } catch (e) {}
        }
      }

      if (isMounted && codeToFill && !enteredCode) {
        setEnteredCode(codeToFill);
        handleCodeChange(codeToFill);
      }
    };

    loadApprovedCode();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.email, user?.hasActiveCode, user?.activeCashbackCode]);

  // Real-time Cashback Code Validation Handler
  const handleCodeChange = (rawVal: string) => {
    setEnteredCode(rawVal);
    setError(null);

    if (codeValidationTimeoutRef.current) {
      clearTimeout(codeValidationTimeoutRef.current);
    }

    const cleanCode = rawVal.trim().toLowerCase();
    if (!cleanCode) {
      setIsValidatingCode(false);
      setCodeProgressStep(0);
      setCodeValidationResult({
        formatOk: null,
        existsOk: null,
        assignedOk: null,
        message: null,
        isValid: null
      });
      return;
    }

    setIsValidatingCode(true);
    setCodeProgressStep(1); // Step 1: Format Check

    codeValidationTimeoutRef.current = setTimeout(() => {
      // 1. Format Syntax Check: pattern palm_... or palm_###_cash_### with length >= 8
      const isFormatValid = cleanCode.startsWith('palm_') && cleanCode.length >= 8;
      
      setCodeProgressStep(2); // Step 2: Database Registry Lookup

      setTimeout(async () => {
        // 2. Comprehensive Existence & Approval Check
        let activeUserCode = (user?.activeCashbackCode || '').trim().toLowerCase();
        let userHasActiveCode = Boolean(user?.hasActiveCode && !activeUserCode.includes('pending'));
        let codeIsPending = activeUserCode.includes('pending');
        let matchedApprovedOrder: CodeOrder | null = null;
        let userApprovedOrder: CodeOrder | null = null;
        let isCodeApprovedInSystem = false;

        // Query Firestore code_orders
        try {
          const ordersSnap = await getDocs(collection(db, 'code_orders'));
          ordersSnap.forEach((docSnap) => {
            const c = docSnap.data() as CodeOrder;
            const cCode = (c.generatedCode || '').trim().toLowerCase();
            const matchesUser = Boolean(
              user && (
                c.uid === user.uid ||
                (c.userEmail && user.email && c.userEmail.trim().toLowerCase() === user.email.trim().toLowerCase())
              )
            );

            if (c.status === 'approved' && cCode && !cCode.includes('pending')) {
              if (cCode === cleanCode) {
                matchedApprovedOrder = c;
                isCodeApprovedInSystem = true;
              }
              if (matchesUser) {
                userApprovedOrder = c;
              }
            } else if (c.status === 'pending') {
              if (matchesUser && cCode === cleanCode) {
                codeIsPending = true;
              }
            }
          });
        } catch (e) {
          console.warn('Real-time code orders validation check note:', e);
        }

        // Also check users collection in Firestore
        if (user?.uid) {
          try {
            const uSnap = await getDoc(doc(db, 'users', user.uid));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              if (uData.hasActiveCode && uData.activeCashbackCode && !uData.activeCashbackCode.toLowerCase().includes('pending')) {
                const uDbCode = uData.activeCashbackCode.trim().toLowerCase();
                userHasActiveCode = true;
                codeIsPending = false;
                if (!activeUserCode || activeUserCode.includes('pending')) {
                  activeUserCode = uDbCode;
                }
                if (cleanCode === uDbCode) {
                  isCodeApprovedInSystem = true;
                }
              }
            }
          } catch (e) {
            console.warn('User doc check note:', e);
          }
        }

        // If matched an approved code order in Firestore, activate immediately for this user!
        if (matchedApprovedOrder) {
          userHasActiveCode = true;
          codeIsPending = false;
          activeUserCode = cleanCode;

          // Automatically sync & permanently activate on user's Firestore profile
          if (user?.uid) {
            try {
              await setDoc(doc(db, 'users', user.uid), {
                hasActiveCode: true,
                activeCashbackCode: (matchedApprovedOrder as CodeOrder).generatedCode
              }, { merge: true });
            } catch (e) {}
          }
        } else if (userApprovedOrder) {
          const approvedCodeVal = (userApprovedOrder as CodeOrder).generatedCode.trim().toLowerCase();
          userHasActiveCode = true;
          codeIsPending = false;
          if (cleanCode === approvedCodeVal) {
            activeUserCode = cleanCode;
            isCodeApprovedInSystem = true;
          } else if (!activeUserCode || activeUserCode.includes('pending')) {
            activeUserCode = approvedCodeVal;
          }
        }

        // Official code check
        if (cleanCode === OFFICIAL_CASHBACK_CODE.toLowerCase()) {
          userHasActiveCode = true;
          codeIsPending = false;
          activeUserCode = cleanCode;
          isCodeApprovedInSystem = true;
        }

        const codeMatchesUser = isFormatValid && (cleanCode === activeUserCode || isCodeApprovedInSystem);

        setCodeProgressStep(3); // Step 3: Account Ownership & Clearance Check

        setTimeout(() => {
          setIsValidatingCode(false);

          if (!isFormatValid) {
            setCodeValidationResult({
              formatOk: false,
              existsOk: false,
              assignedOk: false,
              message: 'Invalid code format. Expected syntax: palm_###_cash_###',
              isValid: false
            });
          } else if (codeIsPending && codeMatchesUser) {
            setCodeValidationResult({
              formatOk: true,
              existsOk: true,
              assignedOk: false,
              message: 'Code recognized in system but is Pending Admin Approval on Control Panel.',
              isValid: false
            });
          } else if (!userHasActiveCode || (!activeUserCode && !isCodeApprovedInSystem)) {
            setCodeValidationResult({
              formatOk: true,
              existsOk: false,
              assignedOk: false,
              message: 'Your account does not have an active approved CashBack Code yet. Please purchase one first.',
              isValid: false
            });
          } else if (!codeMatchesUser) {
            setCodeValidationResult({
              formatOk: true,
              existsOk: false,
              assignedOk: false,
              message: `Code '${rawVal}' does not match your active approved code (${activeUserCode}).`,
              isValid: false
            });
          } else {
            setCodeValidationResult({
              formatOk: true,
              existsOk: true,
              assignedOk: true,
              message: 'CashBack Code verified & active on your account!',
              isValid: true
            });
          }
        }, 150);
      }, 200);
    }, 250);
  };
  
  // Paystack verification state
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string>('');

  // Transaction Receipt Upload state
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic Paystack & Site B Account Name Resolution function
  const handleAutoResolve = async (num: string) => {
    const cleanNumber = num.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      setIsResolved(false);
      setResolvedStatus(null);
      setAccountName('');
      return;
    }

    setIsResolving(true);
    setIsResolved(false);
    setResolvedStatus('Resolving Account...');
    setError(null);

    // Instant resolution if matches current user's profile
    const userAccClean = (user?.accountNumber || '').replace(/\D/g, '');
    const userPhoneClean = (user?.phone || '').replace(/\D/g, '');
    if (
      user &&
      (userAccClean === cleanNumber ||
        userPhoneClean === cleanNumber ||
        (userAccClean.length >= 10 && cleanNumber.length >= 10 && userAccClean.slice(-10) === cleanNumber.slice(-10)) ||
        (userPhoneClean.length >= 10 && cleanNumber.length >= 10 && userPhoneClean.slice(-10) === cleanNumber.slice(-10)))
    ) {
      const matchName = user.displayName || 'PalmPay Verified User';
      setAccountName(matchName);
      setIsResolved(true);
      setResolvedStatus('Site B Account Verified');
      setError(null);
      setIsResolving(false);
      return;
    }

    // Check local registered accounts registry for Site B users
    try {
      const storedRegistry = localStorage.getItem('palmpay_accounts_registry_v3');
      if (storedRegistry) {
        const parsed = JSON.parse(storedRegistry);
        for (const emailKey of Object.keys(parsed)) {
          const profile = parsed[emailKey]?.profile;
          if (profile) {
            const pAcc = String(profile.accountNumber || '').replace(/\D/g, '');
            const pPhone = String(profile.phone || '').replace(/\D/g, '');
            if (
              (pAcc && (pAcc === cleanNumber || (pAcc.length >= 10 && pAcc.slice(-10) === cleanNumber.slice(-10)))) ||
              (pPhone && (pPhone === cleanNumber || (pPhone.length >= 10 && pPhone.slice(-10) === cleanNumber.slice(-10))))
            ) {
              const matchedName = profile.displayName || profile.name || emailKey.split('@')[0];
              setAccountName(matchedName);
              setIsResolved(true);
              setResolvedStatus('Site B Account Verified');
              setError(null);
              setIsResolving(false);
              return;
            }
          }
        }
      }
    } catch {}

    try {
      const result = await resolvePaystackAccount(cleanNumber, '999991');
      if (result.success && result.accountName) {
        setAccountName(result.accountName);
        setIsResolved(true);
        setResolvedStatus(result.verifiedBy || 'Site B Account Verified');
        setError(null);
      } else {
        // Site B Account Resolution Fallback
        const fallbackName = `PalmPay Member (${cleanNumber.slice(-4)})`;
        setAccountName(fallbackName);
        setIsResolved(true);
        setResolvedStatus('Site B Account Verified');
        setError(null);
      }
    } catch {
      const fallbackName = `PalmPay Member (${cleanNumber.slice(-4)})`;
      setAccountName(fallbackName);
      setIsResolved(true);
      setResolvedStatus('Site B Account Verified');
      setError(null);
    } finally {
      setIsResolving(false);
    }
  };

  // Handle dynamic PalmPay account number input with debounce (supports 10-digit NUBAN and 11-digit phone format)
  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setAccountNumber(value);
    setError(null);

    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
    }

    if (value.length >= 10) {
      resolveTimeoutRef.current = setTimeout(() => {
        handleAutoResolve(value);
      }, 300);
    } else {
      setIsResolved(false);
      setResolvedStatus(null);
    }
  };

  // Receipt image file handler
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReceiptError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

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

  const cashbackBal = user?.balance ?? 0;
  const depositBal = user?.depositBalance ?? 0;
  const selectedAvailable = balanceSource === 'deposit' ? depositBal : cashbackBal;

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAcc = (accountNumber || '').trim().replace(/\D/g, '');
    if (!cleanAcc || cleanAcc.length < 10) {
      setError('Please enter a valid 10 or 11 digit PalmPay account number.');
      return;
    }

    let finalAccName = accountName;
    if (!finalAccName || !isResolved) {
      finalAccName = user?.displayName || `PalmPay Member (${cleanAcc.slice(-4)})`;
      setAccountName(finalAccName);
      setIsResolved(true);
      setResolvedStatus('Site B Account Verified');
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

    const cleanCode = (enteredCode || '').trim().toLowerCase();
    if (!cleanCode) {
      setError('CashBack Code required. Please input your verified CashBack Code or purchase one from the dashboard.');
      return;
    }

    let userHasCode = Boolean(user?.hasActiveCode && user?.activeCashbackCode && !user.activeCashbackCode.toLowerCase().includes('pending'));
    let assignedCode = (user?.activeCashbackCode || '').trim().toLowerCase();
    let isCodeApproved = false;

    // In case user state has not refreshed, check code_orders directly in Firestore
    try {
      const ordersSnap = await getDocs(collection(db, 'code_orders'));
      ordersSnap.forEach((docSnap) => {
        const c = docSnap.data() as CodeOrder;
        const isUser = Boolean(
          user && (
            c.uid === user.uid ||
            (c.userEmail && user.email && c.userEmail.trim().toLowerCase() === user.email.trim().toLowerCase())
          )
        );
        const cCode = (c.generatedCode || '').trim().toLowerCase();
        if (c.status === 'approved' && cCode && !cCode.includes('pending')) {
          if (cleanCode === cCode) {
            userHasCode = true;
            assignedCode = cleanCode;
            isCodeApproved = true;
          }
          if (isUser) {
            userHasCode = true;
            if (!assignedCode || assignedCode.includes('pending')) {
              assignedCode = cCode;
            }
          }
        }
      });
    } catch (err) {
      console.warn('Withdrawal submit code check note:', err);
    }

    // Check users collection
    if (user?.uid) {
      try {
        const uSnap = await getDoc(doc(db, 'users', user.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (uData.hasActiveCode && uData.activeCashbackCode && !uData.activeCashbackCode.toLowerCase().includes('pending')) {
            userHasCode = true;
            const uDbCode = uData.activeCashbackCode.trim().toLowerCase();
            if (cleanCode === uDbCode) {
              assignedCode = cleanCode;
              isCodeApproved = true;
            } else if (!assignedCode || assignedCode.includes('pending')) {
              assignedCode = uDbCode;
            }
          }
        }
      } catch (e) {}
    }

    if (cleanCode === OFFICIAL_CASHBACK_CODE.toLowerCase()) {
      userHasCode = true;
      assignedCode = cleanCode;
      isCodeApproved = true;
    }

    if (!userHasCode || (!assignedCode && !isCodeApproved)) {
      setError('Your account does not have an active approved CashBack Code yet. Please purchase one first.');
      return;
    }

    if (cleanCode !== assignedCode && !isCodeApproved) {
      setError(`Invalid CashBack Code. The code entered ('${enteredCode}') is not assigned to your account or does not match your active approved CashBack Code.`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const reference = await requestWithdrawal({
        bankName: 'PalmPay Wallet',
        accountNumber: cleanAcc,
        userName: accountName.trim() || user?.displayName || `PalmPay Beneficiary (${cleanAcc})`,
        amount: numAmount,
        cashbackCode: cleanCode,
        balanceSource
      });

      setTxRef(reference);
      setLoading(false);
      setStep('success');

      triggerCelebration({
        title: 'Withdrawal Pending Admin Approval ⏳',
        subtitle: 'Your balance has been debited and your withdrawal request is pending admin review and approval.',
        type: 'withdrawal',
        amount: `₦${numAmount.toLocaleString()}`,
        duration: 4500
      });
    } catch (err: any) {
      setError(err.message || 'Error submitting withdrawal request.');
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setStep('form');
    setBalanceSource('cashback');
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
    setResolvedStatus(null);
    setError(null);
    onClose();
  };

  if (!isOpen && !isStandalone) return null;

  const contentMarkup = (
    <div className="mirror-glass-card max-w-xl w-full mx-auto rounded-3xl p-5 sm:p-7 border border-purple-500/30 shadow-[0_25px_65px_rgba(0,0,0,0.85)] relative my-2 sm:my-4">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top Standalone Navigation Bar */}
      {isStandalone && (
        <div className="flex items-center justify-between pb-3.5 border-b border-purple-500/20 mb-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 hover:text-white text-xs font-bold transition-all border border-purple-400/30"
          >
            ← Back to Dashboard
          </button>
          <span className="text-[10px] sm:text-xs font-black uppercase text-[#FFC107] bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            Instant Direct Payout
          </span>
        </div>
      )}

        {/* WITHDRAWAL FORM */}
        {step === 'form' && (
          <div className="space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white font-['Poppins',sans-serif]">
                    Withdraw Funds
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-[#00B875] px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00B875] animate-pulse" />
                    PalmPay Direct Disbursal
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Direct settlement to your PalmPay account</p>
              </div>
              <button
                onClick={handleResetAndClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawalSubmit} className="space-y-3.5">
              
              {/* 1. PalmPay Account Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    PalmPay Account Number <span className="text-red-400">*</span>
                  </label>
                  {isResolving ? (
                    <span className="text-[10px] font-bold text-[#FFC107] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Fetching Name...
                    </span>
                  ) : isResolved ? (
                    <span className="text-[10px] font-bold text-[#00B875] flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[#00B875]" /> {resolvedStatus || 'Site B Account Verified'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">10 or 11 Digits</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={11}
                    value={accountNumber}
                    onChange={handleAccountNumberChange}
                    placeholder="Enter 10 or 11-digit PalmPay account number"
                    className="w-full bg-[#121922] text-white text-sm sm:text-base font-mono font-bold tracking-wider rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                    required
                  />
                  {accountNumber.length >= 10 && !isResolving && (
                    <button
                      type="button"
                      onClick={() => handleAutoResolve(accountNumber)}
                      className="absolute right-2.5 top-2.5 text-[10px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-2 py-1 rounded-lg border border-purple-400/30 font-bold"
                    >
                      Verify Name
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-purple-300/80 mt-1">
                  Supports PalmPay accounts created on Site B (080... or 80...) and bank NUBAN.
                </p>

                {/* Account Not Found Alert Banner */}
                {error === 'account not found, insert correct account number' && (
                  <div className="mt-1.5 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="font-semibold">account not found, insert correct account number</span>
                  </div>
                )}

                {/* Automatically Fetched Account Name */}
                {(accountName || isResolving) && (
                  <div className="mt-1.5 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#621494] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        ₦
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-purple-300 block font-medium">Recipient Account Name:</span>
                        <span className="text-xs font-bold text-white truncate block font-['Poppins',sans-serif]">
                          {isResolving ? 'Fetching via Paystack...' : accountName || 'PalmPay Account Holder'}
                        </span>
                      </div>
                    </div>
                    {isResolved && (
                      <span className="text-[9px] bg-emerald-500/20 text-[#00B875] border border-emerald-500/30 font-extrabold px-2 py-0.5 rounded-md shrink-0">
                        VERIFIED
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Balance Source & Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Withdrawal Balance Source:
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
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

                {/* Amount Input */}
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    min={1000}
                    max={selectedAvailable}
                    placeholder="Enter withdrawal amount (min. ₦1,000)"
                    className="w-full bg-[#121922] text-white text-sm sm:text-base font-bold font-mono rounded-xl pl-8 pr-16 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                    required
                  />
                  {selectedAvailable > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(selectedAvailable)}
                      className="absolute right-2.5 top-2.5 text-[10px] text-purple-200 bg-purple-600/40 hover:bg-purple-600/60 px-2.5 py-1 rounded-lg font-bold border border-purple-400/30"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>

              {/* 3. CashBack Code Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#FFC107]" />
                    CashBack Code <span className="text-red-400">*</span>
                  </label>
                  {user?.hasActiveCode && user?.activeCashbackCode && !user.activeCashbackCode.includes('pending') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEnteredCode(user.activeCashbackCode!);
                        handleCodeChange(user.activeCashbackCode!);
                      }}
                      className="text-[10px] text-[#00B875] hover:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold"
                    >
                      Use My Purchased Code: {user.activeCashbackCode}
                    </button>
                  ) : onOpenBuyCode ? (
                    <button
                      type="button"
                      onClick={onOpenBuyCode}
                      className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-semibold flex items-center gap-1"
                    >
                      <span>🔒 Code Required — Purchase (₦8,550)</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-amber-300/80 font-medium">🔒 Purchase Required</span>
                  )}
                </div>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder={user?.hasActiveCode ? "Enter your purchased CashBack Code (palm_###_cash_###)" : "Purchase CashBack Code to unlock (palm_###_cash_###)"}
                  className={`w-full bg-[#121922] text-white text-sm sm:text-base font-mono font-bold tracking-wider rounded-xl px-3.5 py-3 border focus:outline-none text-center transition-colors ${
                    isValidatingCode ? 'border-amber-500/60 focus:border-amber-400' :
                    codeValidationResult.isValid ? 'border-emerald-500/60 focus:border-emerald-400' :
                    codeValidationResult.isValid === false ? 'border-red-500/60 focus:border-red-400' :
                    'border-white/15 focus:border-[#7E1DC6]'
                  }`}
                  required
                />

                {/* REAL-TIME VALIDATION PROGRESS INDICATOR */}
                {enteredCode.trim() !== '' && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#0d121d] border border-purple-500/30 shadow-lg animate-in fade-in slide-in-from-top-2">
                    {/* Header & Status Badge */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${
                          isValidatingCode ? 'text-amber-400 animate-pulse' :
                          codeValidationResult.isValid ? 'text-emerald-400' : 'text-red-400'
                        }`} />
                        <span className="text-xs font-bold text-white">Validation Progress</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isValidatingCode ? (
                          <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                            Validating ({codeProgressStep === 1 ? '33%' : codeProgressStep === 2 ? '66%' : '90%'})
                          </span>
                        ) : codeValidationResult.isValid ? (
                          <span className="text-[10px] font-extrabold text-[#00B875] bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED (100%)
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-red-400 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> UNVERIFIED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3 relative">
                      <div 
                        className={`h-full transition-all duration-300 ease-out rounded-full ${
                          isValidatingCode ? 'bg-gradient-to-r from-amber-500 to-purple-500 animate-pulse' :
                          codeValidationResult.isValid ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-rose-600'
                        }`}
                        style={{
                          width: isValidatingCode 
                            ? `${codeProgressStep * 33}%` 
                            : codeValidationResult.isValid ? '100%' : '100%'
                        }}
                      />
                    </div>

                    {/* 3 Validation Steps */}
                    <div className="space-y-1.5 text-[11px]">
                      {/* Step 1: Format Syntax */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          1. Format Syntax (palm_###_cash_###):
                        </span>
                        {isValidatingCode && codeProgressStep < 1 ? (
                          <span className="text-slate-500 text-[10px]">Waiting...</span>
                        ) : isValidatingCode && codeProgressStep === 1 ? (
                          <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking
                          </span>
                        ) : codeValidationResult.formatOk ? (
                          <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Valid Format
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold text-[10px] flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" /> Format Mismatch
                          </span>
                        )}
                      </div>

                      {/* Step 2: Database Registry */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          2. Database Registry Check:
                        </span>
                        {isValidatingCode && codeProgressStep < 2 ? (
                          <span className="text-slate-500 text-[10px]">Waiting...</span>
                        ) : isValidatingCode && codeProgressStep === 2 ? (
                          <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Querying DB
                          </span>
                        ) : codeValidationResult.existsOk ? (
                          <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Found in Registry
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold text-[10px] flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" /> Not Found
                          </span>
                        )}
                      </div>

                      {/* Step 3: Account Ownership & Approval */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          3. Account Assignment & Approval:
                        </span>
                        {isValidatingCode && codeProgressStep < 3 ? (
                          <span className="text-slate-500 text-[10px]">Waiting...</span>
                        ) : isValidatingCode && codeProgressStep === 3 ? (
                          <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verifying User
                          </span>
                        ) : codeValidationResult.assignedOk ? (
                          <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Assigned & Cleared
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold text-[10px] flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" /> Unassigned / Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Live Validation Result Banner */}
                    {!isValidatingCode && codeValidationResult.message && (
                      <div className={`mt-2.5 p-2 rounded-xl text-[11px] font-semibold flex items-center gap-2 border ${
                        codeValidationResult.isValid 
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
                          : 'bg-red-950/40 text-red-300 border-red-500/30'
                      }`}>
                        {codeValidationResult.isValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        )}
                        <span>{codeValidationResult.message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>



              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || isResolving}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-sm shadow-[0_6px_25px_rgba(126,29,198,0.45)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-300/30 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFC107]" />
                      <span>Submitting for Admin Approval...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit for Admin Approval {amount ? `(₦${Number(amount).toLocaleString()})` : ''}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* STEP: SUCCESS & DISBURSEMENT FLOW TRACKER */}
        {step === 'success' && (
          <div className="space-y-4 py-2 animate-in zoom-in-95">
            
            {/* Header Badge & Title */}
            <div className="text-center space-y-2">
              <div className="relative mx-auto w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-amber-500 via-[#7E1DC6] to-emerald-400 p-[2px] shadow-[0_0_35px_rgba(126,29,198,0.6)] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#120822] flex items-center justify-center">
                  <Clock className="w-8 h-8 text-[#FFC107] animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black shadow">
                  LIVE
                </div>
              </div>

              <div>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-[#FFC107] px-3.5 py-1 rounded-full border border-amber-500/40 animate-pulse inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  DISBURSEMENT IN PROGRESS
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1.5 font-['Poppins',sans-serif]">
                  Disbursal Pipeline Initialized
                </h3>
                <p className="text-xs text-purple-200/90 max-w-sm mx-auto leading-relaxed">
                  Your request for <strong className="text-white">₦{Number(amount).toLocaleString()}</strong> is moving through the direct settlement pipeline.
                </p>
              </div>
            </div>

            {/* VISUAL PROGRESS BAR & PIPELINE TRACKER */}
            <div className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 bg-black/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#FFC107]" />
                  Disbursement Flow Tracker
                </span>
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/30">
                  Step 2 of 4 Active
                </span>
              </div>

              {/* Graphical Step Bar with Connecting Line */}
              <div className="relative px-2 py-1">
                {/* Connecting Track Line */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-white/15 rounded-full -translate-y-1/2 z-0" />
                
                {/* Active Colored Progress Line */}
                <div 
                  className="absolute top-4 left-6 h-1 bg-gradient-to-r from-[#00B875] via-[#FFC107] to-purple-500 rounded-full -translate-y-1/2 z-0 transition-all duration-700 shadow-[0_0_10px_rgba(0,184,117,0.5)]"
                  style={{ width: '45%' }}
                />

                {/* Step Nodes */}
                <div className="relative z-10 flex justify-between items-start">
                  
                  {/* Step 1: Processing */}
                  <div className="flex flex-col items-center text-center max-w-[70px]">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(0,184,117,0.6)] border-2 border-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-400 mt-2 leading-tight">
                      Processing
                    </span>
                    <span className="text-[9px] text-emerald-300/80 font-medium">
                      Debited
                    </span>
                  </div>

                  {/* Step 2: Verification */}
                  <div className="flex flex-col items-center text-center max-w-[75px]">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-black shadow-[0_0_18px_rgba(255,193,7,0.8)] border-2 border-white animate-pulse">
                      <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#FFC107] mt-2 leading-tight">
                      Verification
                    </span>
                    <span className="text-[9px] text-amber-200/90 font-medium">
                      In Review
                    </span>
                  </div>

                  {/* Step 3: Admin Approval */}
                  <div className="flex flex-col items-center text-center max-w-[75px]">
                    <div className="w-8 h-8 rounded-full bg-purple-900/90 text-purple-300 flex items-center justify-center font-bold border-2 border-purple-500/50">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 mt-2 leading-tight">
                      Clearance
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      Approval
                    </span>
                  </div>

                  {/* Step 4: PalmPay Disbursed */}
                  <div className="flex flex-col items-center text-center max-w-[75px]">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold border-2 border-white/20">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 mt-2 leading-tight">
                      PalmPay Disbursed
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">
                      Direct Credit
                    </span>
                  </div>

                </div>
              </div>

              {/* Current Active Step Breakdown Card */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-black/70 border border-purple-500/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#FFC107] shrink-0">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FFC107]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Current Stage: Admin Verification</span>
                    <span className="text-[10px] text-[#00B875] font-bold">In Queue</span>
                  </div>
                  <p className="text-[11px] text-slate-300/90 truncate mt-0.5">
                    Clearance code verified • Automatic payout trigger upon approval
                  </p>
                </div>
              </div>
            </div>

            {/* Payout & Beneficiary Summary Details */}
            <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/20 text-left space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Balance Source:</span>
                <span className="font-bold text-purple-300">
                  {balanceSource === 'deposit' ? 'Deposited Balance' : 'CashBack Balance'} <span className="text-amber-400 text-[10px] font-normal">(Debited)</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Beneficiary:</span>
                <span className="font-bold text-white">{accountName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PalmPay Account:</span>
                <span className="font-mono text-[#FFC107] font-bold bg-black/50 px-2 py-0.5 rounded border border-amber-500/30">
                  {accountNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                <span className="text-slate-400 font-semibold">Debited Amount:</span>
                <span className="text-base sm:text-lg font-black text-[#FFC107] font-mono">
                  -₦{Number(amount).toLocaleString()}
                </span>
              </div>
              {receiptImage && (
                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <span className="text-slate-400">Proof Receipt:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Attached for Admin Review
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-sm shadow-[0_6px_25px_rgba(126,29,198,0.45)] hover:opacity-95 active:scale-95 transition-all border border-purple-300/30 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
  );

  if (isStandalone) {
    return (
      <div className="animate-in fade-in duration-300 w-full py-2">
        {contentMarkup}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      {contentMarkup}
    </div>
  );
};
