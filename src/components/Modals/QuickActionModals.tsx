import React, { useState } from 'react';
import { 
  MessageSquareText, 
  Wallet, 
  Headphones, 
  ExternalLink, 
  Send, 
  Sparkles, 
  AlertCircle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  Building,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { useAuth, PAYSTACK_DEPOSIT_URL } from '../../context/AuthContext';
import { useCelebration } from '../../context/CelebrationContext';
import confetti from 'canvas-confetti';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 1. Community Modal
export const CommunityModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="mirror-glass-card max-w-md w-full rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Poppins',sans-serif]">Official Community</h3>
            <span className="text-xs text-blue-400 font-semibold">48,290+ Active PalmPay Members</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Connect with daily cashback recipients, share invite links, participate in weekly ₦500,000 cash drops, and get rapid peer support.
        </p>

        <div className="space-y-2.5 pt-2">
          <a
            href="https://t.me/palmpaycashback"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-white transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✈️</span>
              <div>
                <span className="text-xs sm:text-sm font-bold block">Telegram Official Channel</span>
                <span className="text-[11px] text-slate-400">32,500 Subscribers • Live Alerts</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="https://chat.whatsapp.com/palmpaycashback"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-white transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <div>
                <span className="text-xs sm:text-sm font-bold block">WhatsApp VIP Community</span>
                <span className="text-[11px] text-slate-400">Instant payout screenshots & proof</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl mirror-glass hover:bg-white/10 text-slate-300 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Add Money Modal (Paystack Deposit + Receipt Upload & Admin Approval)
export const AddMoneyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { user, submitDepositRequest, depositRequests } = useAuth();
  const { triggerCelebration } = useCelebration();
  
  const [amount, setAmount] = useState<number | ''>(5000);
  const [reference, setReference] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');

  if (!isOpen) return null;

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

  const handleOpenPaystack = () => {
    window.open(PAYSTACK_DEPOSIT_URL, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 500) {
      setError('Minimum deposit amount is ₦500.');
      return;
    }
    if (!receiptImage) {
      setError('Please upload your Paystack transaction receipt image before submitting.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await submitDepositRequest({
        amount: Number(amount),
        receiptImage,
        paymentReference: reference.trim() || undefined
      });

      setSuccess('Deposit proof submitted successfully! Funds will reflect in your Deposited Balance once approved by admin.');
      
      triggerCelebration({
        title: 'Deposit Submitted! 💳',
        subtitle: `₦${Number(amount).toLocaleString()} deposit proof was uploaded and sent to admin for immediate verification.`,
        type: 'deposit',
        amount: `₦${Number(amount).toLocaleString()}`,
        duration: 4500
      });

      setReceiptImage(null);
      setFileName('');
      setReference('');
      setAmount(5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit deposit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const userDeposits = depositRequests.filter((d) => d.uid === user?.uid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-5 sm:p-7 border border-emerald-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative my-8">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#008f5a] to-[#00B875] text-white shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                  Deposit Funds
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-[#00B875] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Paystack Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">For Games &amp; CashBack Code Purchases</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 my-3.5 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'deposit'
                ? 'bg-[#00B875] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            New Deposit
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#00B875] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>My Deposit Requests</span>
            {userDeposits.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                {userDeposits.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {activeTab === 'deposit' ? (
          <div className="space-y-4">
            
            {/* Step 1: Paystack Deposit Action Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black/40 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> 1. Complete Payment via Paystack
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-[#00B875] font-mono px-2 py-0.5 rounded-full">
                  Instant Link
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Click below to make your deposit on the official Paystack gateway, then save or screenshot your receipt.
              </p>
              <a
                href={PAYSTACK_DEPOSIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenPaystack}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(0,184,117,0.35)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Pay on Paystack Deposit Portal</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Step 2: Upload Receipt Form */}
            <form onSubmit={handleSubmitDeposit} className="space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Upload className="w-4 h-4 text-[#FFC107]" />
                <span>2. Upload Payment Receipt &amp; Submit</span>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Deposited Amount (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    min={500}
                    placeholder="Enter amount deposited"
                    className="w-full bg-[#121922] text-white text-sm font-mono font-bold rounded-xl pl-8 pr-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#00B875]"
                    required
                  />
                </div>
                {/* Preset Amount buttons */}
                <div className="flex gap-2 mt-1.5">
                  {[2000, 5000, 8550, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold border transition-all ${
                        amount === amt
                          ? 'bg-[#00B875]/25 border-[#00B875] text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Reference or Sender */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Payment Reference or Sender Name (Optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. PAY-982183 or Sender Name"
                  className="w-full bg-[#121922] text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#00B875]"
                />
              </div>

              {/* Receipt File Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Transaction Receipt Image (Required)
                </label>
                
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
                    <span className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required
                    />
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !receiptImage}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white font-bold text-sm shadow-[0_6px_25px_rgba(0,184,117,0.4)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? 'Submitting Receipt...' : 'Submit Deposit for Admin Approval'}</span>
                </button>
              </div>
            </form>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-[#FFC107] shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Deposited balance is strictly dedicated for game spins and purchasing CashBack codes. Funds reflect automatically upon admin verification.
              </span>
            </div>
          </div>
        ) : (
          /* Deposit History Tab */
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {userDeposits.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No deposit requests submitted yet.
              </div>
            ) : (
              userDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-3.5 rounded-2xl mirror-glass border border-white/10 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-sm">
                      ₦{dep.amount.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        dep.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : dep.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {dep.status === 'approved'
                        ? '✓ Approved & Credited'
                        : dep.status === 'rejected'
                        ? '✕ Rejected'
                        : '⏳ Pending Admin Approval'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Ref: {dep.paymentReference || dep.id}</span>
                    <span>{new Date(Number(dep.createdAt)).toLocaleDateString()}</span>
                  </div>

                  {dep.receiptImage && (
                    <div className="pt-1">
                      <a
                        href={dep.receiptImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#00B875] hover:underline flex items-center gap-1 font-bold"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View Attached Receipt</span>
                      </a>
                    </div>
                  )}

                  {dep.adminNote && (
                    <div className="pt-1.5 border-t border-white/5">
                      <p className={`text-[11px] p-2 rounded-lg leading-relaxed ${
                        dep.adminNote.includes('WARNING') || dep.adminNote.includes('⚠️')
                          ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20 font-medium'
                          : 'bg-white/5 text-purple-200 border border-white/10'
                      }`}>
                        {dep.adminNote}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// 3. Support Live Chat Modal
export const SupportModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<{ sender: 'agent' | 'user'; text: string; time: string }[]>([
    {
      sender: 'agent',
      text: 'Hello! Welcome to PalmPay Cashback 24/7 Verified Support. How can we assist you with your payout, deposit or Cashback Code today?',
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg, time }]);
    setInput('');

    // Automated smart agent response
    setTimeout(() => {
      let reply = 'Thank you for reaching out. Your inquiry has been routed to our CBN disbursement desk. All pending withdrawals with an approved CashBack Code are cleared rapidly.';
      if (userMsg.toLowerCase().includes('code')) {
        reply = 'A CashBack Code (₦8,550) is required for withdrawal clearance. You can purchase your unique code via Paystack or directly from your deposited balance. Once approved, your code is revealed securely in your account.';
      } else if (userMsg.toLowerCase().includes('deposit')) {
        reply = 'Deposits can be completed via Paystack (https://paystack.shop/pay/palmpay_cashback_deposit). Once paid, upload your receipt in the Add Money modal for admin approval.';
      } else if (userMsg.toLowerCase().includes('withdraw')) {
        reply = 'Withdrawals are processed directly to all major Nigerian banks (PalmPay, OPay, Kuda, GTBank, Zenith, etc.) from your selected Cashback or Deposited balance.';
      }
      setMessages((prev) => [...prev, { sender: 'agent', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="mirror-glass-card max-w-md w-full rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl relative flex flex-col h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00B875] rounded-full border-2 border-[#0A0D0F]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-['Poppins',sans-serif]">PalmPay Care</h3>
              <span className="text-[11px] text-[#00B875] font-semibold">24/7 Priority Desk • Online</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Chat message history */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#00B875] text-white rounded-br-none shadow-md'
                    : 'mirror-glass text-slate-200 border border-white/10 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="shrink-0 pt-2 border-t border-white/10 flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[#121922] text-white text-xs px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-[#00B875] focus:outline-none"
          />
          <button
            type="submit"
            className="px-3.5 py-2.5 bg-[#00B875] hover:bg-[#008f5a] text-white rounded-xl transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
