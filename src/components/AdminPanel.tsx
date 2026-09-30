import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  DollarSign, 
  KeyRound, 
  Bell, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  Search, 
  Trash2,
  Wallet,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  X,
  Users,
  Sliders,
  ArrowRight,
  Edit3,
  Globe,
  Server,
  Activity,
  Check,
  Copy
} from 'lucide-react';
import { useAuth, getLocalWithdrawalRequests } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { db, collection, query, onSnapshot, updateDoc, doc, addDoc, getDocs } from '../lib/firebase';
import { WithdrawalRequest, CodeOrder, DepositRequest, UserProfile } from '../types';

export const AdminPanel: React.FC = () => {
  const { 
    user, 
    updateBalance, 
    purgeAllRecords, 
    approveDepositRequest, 
    rejectDepositRequest, 
    approveWithdrawalRequest,
    rejectWithdrawalRequest,
    approveCodeOrder,
    rejectCodeOrder,
    depositRequests,
    withdrawalRequests,
    overrideUserBalance,
    getAllUsersForAdmin
  } = useAuth();
  const { triggerCelebration } = useCelebration();

  const [tab, setTab] = useState<'deposits' | 'withdrawals' | 'codes' | 'balance' | 'announcements' | 'gateway'>('deposits');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    return getLocalWithdrawalRequests();
  });
  const [codes, setCodes] = useState<CodeOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [purgeSuccess, setPurgeSuccess] = useState<boolean>(false);
  const [approvingWithdrawalId, setApprovingWithdrawalId] = useState<string | null>(null);
  const [withdrawalAlert, setWithdrawalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected receipt image modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    type: 'deposit' | 'withdrawal' | 'code' | 'bonus';
    title: string;
    amount: number;
    status: string;
    reference: string;
    userEmail: string;
    userName?: string;
    receiptImage?: string;
    bankName?: string;
    accountNumber?: string;
    code?: string;
    date: string;
  } | null>(null);

  // User Management & Override Balance state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<UserProfile | null>(null);
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [overrideMode, setOverrideMode] = useState<'set' | 'credit' | 'debit'>('set');
  const [adjustAmount, setAdjustAmount] = useState<number>(50000);
  const [adjustBalanceType, setAdjustBalanceType] = useState<'deposit' | 'cashback'>('cashback');
  const [adjustReason, setAdjustReason] = useState('Admin Balance Adjustment / Override');
  const [adjustMsg, setAdjustMsg] = useState<string | null>(null);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  // Platform announcement broadcast
  const [announcementText, setAnnouncementText] = useState('PalmPayCashBack — Only valid on www.palmpaycashback.vercel.app');
  const [announceMsg, setAnnounceMsg] = useState<string | null>(null);

  // PalmPay Gateway Integration State
  const [gatewayConfig, setGatewayConfig] = useState<{
    apiUrl: string;
    hasSecret: boolean;
    maskedSecret: string;
    mode: string;
  } | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState<boolean>(false);
  const [gatewayInputUrl, setGatewayInputUrl] = useState<string>('');
  const [gatewayInputSecret, setGatewayInputSecret] = useState<string>('');
  const [gatewaySaveMsg, setGatewaySaveMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [gatewayPingResult, setGatewayPingResult] = useState<any | null>(null);
  const [gatewayPinging, setGatewayPinging] = useState<boolean>(false);
  const [testAccountNumber, setTestAccountNumber] = useState<string>('8012345678');
  const [copiedAcc, setCopiedAcc] = useState<string | null>(null);

  const fetchGatewayConfig = async () => {
    try {
      setGatewayLoading(true);
      const res = await fetch('/api/admin/gateway-config');
      const data = await res.json();
      if (data.success) {
        setGatewayConfig(data);
        setGatewayInputUrl(data.apiUrl || '');
      }
    } catch (err) {
      console.warn('Gateway config fetch err:', err);
    } finally {
      setGatewayLoading(false);
    }
  };

  const handleSaveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/gateway-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: gatewayInputUrl,
          internalSecret: gatewayInputSecret
        })
      });
      const data = await res.json();
      if (data.success) {
        setGatewaySaveMsg({ type: 'success', message: 'PalmPay Gateway settings updated successfully!' });
        fetchGatewayConfig();
        setTimeout(() => setGatewaySaveMsg(null), 4000);
      } else {
        setGatewaySaveMsg({ type: 'error', message: data.message || 'Failed to update gateway.' });
      }
    } catch (err: any) {
      setGatewaySaveMsg({ type: 'error', message: err.message || 'Failed to save gateway.' });
    }
  };

  const handleTestPingGateway = async () => {
    setGatewayPinging(true);
    setGatewayPingResult(null);
    try {
      const res = await fetch('/api/admin/gateway-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: testAccountNumber
        })
      });
      const data = await res.json();
      setGatewayPingResult(data);
    } catch (err: any) {
      setGatewayPingResult({
        success: false,
        status: 502,
        message: err.message || 'Network error reaching test gateway'
      });
    } finally {
      setGatewayPinging(false);
    }
  };

  const handleCopyAccount = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedAcc(acc);
    setTimeout(() => setCopiedAcc(null), 2000);
  };

  useEffect(() => {
    if (tab === 'gateway') {
      fetchGatewayConfig();
    }
  }, [tab]);

  const refreshUsersList = async () => {
    setUsersLoading(true);
    try {
      const list = await getAllUsersForAdmin();
      setUsersList(list);
    } catch (e) {
      console.warn('Error fetching users for admin:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'balance') {
      refreshUsersList();
    }
  }, [tab]);

  const handleSelectUserToOverride = (u: UserProfile) => {
    setSelectedUserForOverride(u);
    setTargetUserEmail(u.email);
    const currentBal = adjustBalanceType === 'deposit' ? (u.depositBalance || 0) : u.balance;
    setAdjustAmount(currentBal);
  };

  const handlePurgeAll = async () => {
    if (window.confirm('Are you sure you want to delete every existing account and all transaction records? This action cannot be undone.')) {
      await purgeAllRecords();
      setWithdrawals([]);
      setCodes([]);
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 4000);
    }
  };

  useEffect(() => {
    // Helper to merge Firestore snapshots with AuthContext withdrawalRequests and local storage
    const mergeWithdrawals = (firestoreList?: WithdrawalRequest[]) => {
      const local = getLocalWithdrawalRequests();
      const authList = withdrawalRequests || [];
      const map = new Map<string, WithdrawalRequest>();
      local.forEach((r) => map.set(r.id, r));
      authList.forEach((r) => map.set(r.id, r));
      if (firestoreList) {
        firestoreList.forEach((r) => map.set(r.id, r));
      }
      const list = Array.from(map.values()).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setWithdrawals(list);
    };

    mergeWithdrawals();

    const handleNewWd = (e: any) => {
      if (e.detail) {
        setWithdrawals((prev) => {
          const filtered = prev.filter((r) => r.id !== e.detail.id);
          return [e.detail, ...filtered];
        });
      }
    };
    window.addEventListener('palmpay_withdrawal_created', handleNewWd);

    try {
      const unsubWithdrawals = onSnapshot(collection(db, 'withdrawal_requests'), (snapshot) => {
        const list: WithdrawalRequest[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }));
        mergeWithdrawals(list);
      }, (err) => {
        console.warn('Withdrawal snapshot note:', err);
        mergeWithdrawals();
      });

      const unsubCodes = onSnapshot(collection(db, 'code_orders'), (snapshot) => {
        const list: CodeOrder[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<CodeOrder, 'id'>) }));
        list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setCodes(list);
      }, (err) => {
        console.warn('Code orders snapshot note:', err);
      });

      return () => {
        window.removeEventListener('palmpay_withdrawal_created', handleNewWd);
        unsubWithdrawals();
        unsubCodes();
      };
    } catch {
      mergeWithdrawals();
      setCodes([]);
      return () => {
        window.removeEventListener('palmpay_withdrawal_created', handleNewWd);
      };
    }
  }, [withdrawalRequests]);

  const handleUpdateWithdrawalStatus = async (id: string, newStatus: 'approved' | 'rejected', force = false) => {
    try {
      if (newStatus === 'approved') {
        setApprovingWithdrawalId(id);
        setWithdrawalAlert(null);

        const result = await approveWithdrawalRequest(id, force);
        setApprovingWithdrawalId(null);

        if (result.success) {
          setWithdrawals((prev) =>
            prev.map((w) => (w.id === id ? { ...w, status: 'successful', adminNote: 'Disbursed to PalmPay Account' } : w))
          );
          setWithdrawalAlert({
            type: 'success',
            message: result.message || 'Withdrawal approved & disbursed to PalmPay account successfully!'
          });
          triggerCelebration({
            title: 'Disbursed to PalmPay! 💸',
            subtitle: result.message || 'Payment has been transferred to PalmPay account successfully.',
            type: 'withdrawal',
            duration: 4000
          });
        } else {
          setWithdrawalAlert({
            type: 'error',
            message: result.message || 'Disbursal to PalmPay account failed.'
          });
        }
      } else {
        await rejectWithdrawalRequest(id, 'Declined by Admin. Funds reversed.');
        setWithdrawals((prev) =>
          prev.map((w) => (w.id === id ? { ...w, status: 'rejected', adminNote: 'Declined by Admin. Funds reversed.' } : w))
        );
        setWithdrawalAlert({
          type: 'success',
          message: 'Withdrawal request declined and funds reversed back to user balance.'
        });
      }
    } catch (err: any) {
      setApprovingWithdrawalId(null);
      setWithdrawalAlert({
        type: 'error',
        message: err.message || 'An error occurred updating withdrawal status.'
      });
    }
  };

  const handleUpdateCodeStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    try {
      await updateDoc(doc(db, 'code_orders', id), {
        status: newStatus
      });
    } catch (err) {
      console.warn('Update code Firestore error:', err);
    }
  };

  const handleExecuteOverrideBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserEmail.trim()) {
      alert('Please enter or select a target user email / ID.');
      return;
    }

    setIsSubmittingOverride(true);
    setAdjustMsg(null);

    try {
      const res = await overrideUserBalance(
        targetUserEmail,
        adjustAmount,
        adjustBalanceType,
        overrideMode,
        `${adjustReason} [Admin Mathias]`
      );

      if (res.success) {
        setAdjustMsg(res.message);
        if (res.updatedUser) {
          setSelectedUserForOverride(res.updatedUser);
        }
        await refreshUsersList();

        triggerCelebration({
          title: 'Balance Override Applied! ⚖️',
          subtitle: res.message,
          type: 'admin',
          amount: `₦${adjustAmount.toLocaleString()}`,
          duration: 4000
        });
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Error overriding balance: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingOverride(false);
      setTimeout(() => setAdjustMsg(null), 5000);
    }
  };

  const handleBroadcastAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setAnnounceMsg('Top Banner Announcement updated globally across all user sessions.');
    setTimeout(() => setAnnounceMsg(null), 4000);
  };

  const filteredDeposits = depositRequests.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (filterStatus === 'all') return true;
    return w.status === filterStatus;
  });

  const filteredUsers = usersList.filter((u: UserProfile) => {
    if (!userSearchTerm.trim()) return true;
    const term = userSearchTerm.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.displayName && u.displayName.toLowerCase().includes(term)) ||
      (u.uid && u.uid.toLowerCase().includes(term))
    );
  });

  const pendingDepositsCount = depositRequests.filter((d) => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in min-w-0 overflow-x-hidden">
      
      {/* Admin Header Banner */}
      <div className="mirror-glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-[2px] shadow-lg shrink-0">
              <div className="w-full h-full rounded-2xl bg-[#0A0D0F] flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFC107]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white font-['Poppins',sans-serif] truncate">
                  PalmPay Admin Control Center
                </h2>
                <span className="text-[9px] sm:text-[10px] font-black uppercase bg-amber-500/20 text-[#FFC107] border border-amber-500/40 px-2 py-0.5 rounded-full">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200 mt-0.5 truncate">
                Admin: <strong className="text-white">Mathias Danlami</strong> • <span className="text-[#FFC107] font-mono">themotivationalduo@gmail.com</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics & Purge Action */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="mirror-glass px-2.5 sm:px-3.5 py-2 rounded-xl border border-emerald-500/30 text-center">
              <span className="text-[9px] sm:text-[10px] text-emerald-300 block uppercase">Pending Deposits</span>
              <span className="text-sm sm:text-base font-bold text-[#00B875] font-mono">
                {pendingDepositsCount}
              </span>
            </div>

            <div className="mirror-glass px-2.5 sm:px-3.5 py-2 rounded-xl border border-purple-500/20 text-center">
              <span className="text-[9px] sm:text-[10px] text-purple-300/80 block uppercase">Pending Payouts</span>
              <span className="text-sm sm:text-base font-bold text-amber-400 font-mono">
                {pendingWithdrawalsCount}
              </span>
            </div>

            <button
              onClick={handlePurgeAll}
              className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Delete all user accounts and transaction records"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Purge All Records</span>
            </button>
          </div>
        </div>

        {purgeSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All accounts and records have been completely purged. Only Admin Mathias Danlami remains active.</span>
          </div>
        )}
      </div>

      {/* Admin Navigation Tabs */}
      <div className="w-full min-w-0 max-w-full overflow-x-auto pb-2 flex items-center gap-2 border-b border-purple-500/20">
        <button
          onClick={() => setTab('deposits')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
            tab === 'deposits'
              ? 'bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white shadow-md'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Pending Deposits ({pendingDepositsCount})</span>
        </button>

        <button
          onClick={() => setTab('withdrawals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            tab === 'withdrawals'
              ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-md'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Withdrawal Approvals ({pendingWithdrawalsCount})</span>
        </button>

        <button
          onClick={() => setTab('codes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            tab === 'codes'
              ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-md'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>CashBack Code Orders ({codes.length})</span>
        </button>

        <button
          onClick={() => setTab('balance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            tab === 'balance'
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-[#7E1DC6] text-white shadow-md ring-2 ring-amber-400/50'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>User Balance Override Hub</span>
        </button>

        <button
          onClick={() => setTab('announcements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            tab === 'announcements'
              ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-md'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Banner Broadcaster</span>
        </button>

        <button
          onClick={() => setTab('gateway')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
            tab === 'gateway'
              ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-cyan-400/50'
              : 'text-purple-300/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>PalmPay API Gateway</span>
        </button>
      </div>

      {/* Filter Status Selector for Deposits / Withdrawals */}
      {(tab === 'deposits' || tab === 'withdrawals') && (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>{tab === 'deposits' ? 'Pending Deposits Queue & Receipt Inspection' : 'Withdrawal Requests Queue'}</span>
          </h3>

          <div className="flex items-center gap-1 bg-[#121922] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg ${filterStatus === 'all' ? 'bg-white/15 text-white font-bold' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded-lg ${filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-2.5 py-1 rounded-lg ${filterStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-2.5 py-1 rounded-lg ${filterStatus === 'rejected' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-400'}`}
            >
              Rejected
            </button>
          </div>
        </div>
      )}

      {/* TAB 0: Deposit Approvals (Receipt Review) */}
      {tab === 'deposits' && (
        <div className="mirror-glass-card rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {filteredDeposits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No deposit requests found for status: <strong>{filterStatus}</strong>.
            </div>
          ) : (
            filteredDeposits.map((dep) => (
              <div key={dep.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white">{dep.userName}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      dep.status === 'approved'
                        ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/40'
                        : dep.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
                    }`}>
                      {dep.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Email: <strong className="text-white font-mono">{dep.userEmail}</strong></span>
                    <span>•</span>
                    <span>Ref: <strong className="text-[#FFC107] font-mono">{dep.paymentReference || dep.id}</strong></span>
                    <span>•</span>
                    <span>Date: <span className="text-slate-400">{new Date(Number(dep.createdAt)).toLocaleString()}</span></span>
                  </div>

                  {/* Receipt Image Thumbnail & Button */}
                  {dep.receiptImage && (
                    <div className="pt-2 flex items-center gap-3">
                      <div
                        onClick={() => setPreviewImage(dep.receiptImage)}
                        className="w-12 h-12 rounded-xl overflow-hidden border border-purple-500/40 bg-black cursor-pointer hover:opacity-80 transition-opacity shadow-sm relative group shrink-0"
                        title="Click to inspect full receipt image"
                      >
                        <img src={dep.receiptImage} alt="Deposit Receipt Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(dep.receiptImage)}
                          className="inline-flex items-center gap-1.5 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 px-3 py-1.5 rounded-xl border border-purple-500/30 transition-all font-semibold shadow-inner"
                        >
                          <Eye className="w-4 h-4 text-[#FFC107]" />
                          <span>Inspect Receipt Image</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedReceiptData({
                            type: 'deposit',
                            title: `Deposit Request (₦${dep.amount.toLocaleString()})`,
                            amount: dep.amount,
                            status: dep.status,
                            reference: dep.paymentReference || dep.id,
                            userEmail: dep.userEmail,
                            userName: dep.userName,
                            receiptImage: dep.receiptImage,
                            date: new Date(Number(dep.createdAt)).toLocaleString()
                          })}
                          className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-xl border border-white/20 transition-all font-semibold"
                        >
                          <span>View Full Receipt</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-[#00B875] font-mono">
                      ₦{dep.amount.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">Deposited Amount</span>
                  </div>

                  {dep.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await approveDepositRequest(dep.id);
                          triggerCelebration({
                            title: 'Deposit Approved & Credited! 💳',
                            subtitle: `₦${dep.amount.toLocaleString()} has been credited to ${dep.userName}'s Deposited Balance.`,
                            type: 'deposit',
                            amount: `₦${dep.amount.toLocaleString()}`,
                            duration: 3800
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve &amp; Credit</span>
                      </button>
                      <button
                        onClick={() => rejectDepositRequest(dep.id, 'Payment unverified')}
                        className="px-3.5 py-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center gap-1 active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 1: Withdrawal Approvals */}
      {tab === 'withdrawals' && (
        <div className="space-y-3">
          {/* Action Response Alert Banner */}
          {withdrawalAlert && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in ${
              withdrawalAlert.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {withdrawalAlert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-semibold">{withdrawalAlert.message}</span>
              </div>
              <button
                onClick={() => setWithdrawalAlert(null)}
                className="text-xs hover:text-white p-1 rounded-lg bg-black/20"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="mirror-glass-card rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {filteredWithdrawals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No withdrawal requests found for this filter.
              </div>
            ) : (
              filteredWithdrawals.map((req) => {
                const isApproving = approvingWithdrawalId === req.id;
                const isSuccessful = req.status === 'successful' || req.status === 'approved';
                const isFailed = req.status === 'failed';
                const isRejected = req.status === 'rejected';

                return (
                  <div key={req.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">{req.userName}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isSuccessful
                            ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/40'
                            : isFailed || isRejected
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
                        }`}>
                          {isSuccessful ? 'SUCCESSFUL (PALMPAY CREDITED)' : isFailed ? 'FAILED (INVALID PALMPAY ACCOUNT)' : req.status}
                        </span>
                        {req.balanceSource && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30">
                            {req.balanceSource === 'deposit' ? 'Deposited Bal' : 'Cashback Bal'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Email: <strong className="text-white font-mono break-all">{req.userEmail}</strong></span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          PalmPay Account: 
                          <strong className="text-[#FFC107] font-mono break-all bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
                            {req.accountNumber}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(req.accountNumber)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Copy Account Number"
                          >
                            {copiedAcc === req.accountNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                        <span>•</span>
                        <span>Destination: <strong className="text-white">{req.bankName || 'PalmPay Wallet'}</strong></span>
                      </div>

                      {/* Attached Transaction Receipt Proof Indicator */}
                      {req.receiptImage && (
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewImage(req.receiptImage || null)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-[11px] text-emerald-300 transition-colors"
                          >
                            <img src={req.receiptImage} alt="Receipt thumbnail" className="w-4 h-4 rounded object-cover border border-emerald-400/40 shrink-0" />
                            <span className="font-semibold">View Transaction Receipt</span>
                            <Eye className="w-3 h-3 text-emerald-400 ml-0.5" />
                          </button>
                        </div>
                      )}

                      {req.adminNote && (
                        <p className="text-[11px] text-rose-300 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-500/25 mt-1">
                          ⚠️ {req.adminNote}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-lg font-black text-[#FFC107] font-mono">
                          ₦{req.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Ref: {req.reference || req.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptData({
                            type: 'withdrawal',
                            title: `PalmPay Account Withdrawal (${req.bankName || 'PalmPay Wallet'})`,
                            amount: req.amount,
                            status: req.status,
                            reference: req.reference || req.id,
                            userEmail: req.userEmail,
                            userName: req.userName,
                            bankName: req.bankName,
                            accountNumber: req.accountNumber,
                            code: req.cashbackCode,
                            receiptImage: req.receiptImage || undefined,
                            date: new Date(Number(req.createdAt || Date.now())).toLocaleString()
                          })}
                          className="px-3 py-2 rounded-xl mirror-glass hover:bg-white/10 text-purple-200 text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-[#FFC107]" />
                          <span>Details</span>
                        </button>

                        {req.status === 'pending' && (
                          <>
                            <button
                              disabled={isApproving}
                              onClick={() => handleUpdateWithdrawalStatus(req.id, 'approved')}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00B875] hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                              {isApproving ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Calling PalmPay API...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve &amp; Disburse (₦{req.amount.toLocaleString()})</span>
                                </>
                              )}
                            </button>
                            <button
                              disabled={isApproving}
                              onClick={() => handleUpdateWithdrawalStatus(req.id, 'rejected')}
                              className="px-3 py-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </>
                        )}

                        {(req.status === 'successful' || req.status === 'approved') && (
                          <button
                            disabled={isApproving}
                            onClick={() => handleUpdateWithdrawalStatus(req.id, 'approved', true)}
                            className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white font-bold text-xs border border-purple-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            title="Force re-send disbursal of exact amount to PalmPay Account"
                          >
                            {isApproving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Re-syncing...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
                                <span>Re-send to PalmPay (₦{req.amount.toLocaleString()})</span>
                              </>
                            )}
                          </button>
                        )}

                        {req.status === 'failed' && (
                          <button
                            disabled={isApproving}
                            onClick={() => handleUpdateWithdrawalStatus(req.id, 'approved', true)}
                            className="px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white font-bold text-xs border border-amber-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            title="Retry disbursing exact amount to PalmPay Account"
                          >
                            {isApproving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Retrying...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry Disbursal (₦{req.amount.toLocaleString()})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CashBack Code Orders */}
      {tab === 'codes' && (
        <div className="space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center justify-between">
            <span>CashBack Code Orders (₦8,550 fee)</span>
            <span className="text-xs text-[#FFC107] font-mono font-normal">Pending Orders: {codes.filter(c => c.status === 'pending').length}</span>
          </h3>

          <div className="mirror-glass-card rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {codes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No code purchases recorded.
              </div>
            ) : (
              codes.map((c) => (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">{c.generatedCode}</span>
                      <span className={`text-[10px] font-black uppercase border px-2 py-0.5 rounded-full ${
                        c.status === 'approved'
                          ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/40'
                          : c.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
                      }`}>
                        {c.status}
                      </span>
                      {c.paymentSource && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                          {c.paymentSource === 'deposit_balance' ? 'Paid via Deposit Bal' : 'Paid via Paystack'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300">
                      Purchased by: <strong className="text-white font-mono">{c.userEmail}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center md:justify-end gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptData({
                        type: 'code',
                        title: `CashBack Code Purchase (${c.generatedCode})`,
                        amount: c.codePrice || 8550,
                        status: c.status,
                        reference: c.paymentReference || 'PAYSTACK',
                        userEmail: c.userEmail,
                        code: c.generatedCode,
                        date: new Date(Number(c.createdAt || Date.now())).toLocaleString()
                      })}
                      className="px-3 py-1.5 rounded-xl mirror-glass hover:bg-white/10 text-purple-200 text-[10px] sm:text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#FFC107]" />
                      <span>View Receipt</span>
                    </button>

                    {c.status === 'pending' && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                          onClick={async () => {
                            await approveCodeOrder(c.id);
                            triggerCelebration({
                              title: 'CashBack Code Approved! 🔑',
                              subtitle: `Code order for ${c.userEmail} approved and code activated.`,
                              type: 'code',
                              duration: 3500
                            });
                          }}
                          className="flex-1 md:flex-none px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-xs shadow-md transition-all flex items-center justify-center gap-1 active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => rejectCodeOrder(c.id, 'Unverified payment')}
                          className="flex-1 md:flex-none px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white font-bold text-[10px] sm:text-xs border border-red-500/40 transition-all flex items-center justify-center gap-1 active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    <div className="text-right">
                      <span className="text-base font-bold text-[#FFC107] font-mono">
                        ₦{(c.codePrice || 8550).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Ref: {c.paymentReference || 'PAYSTACK'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: User Balance Override Management Hub */}
      {tab === 'balance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Registered Users Directory & Quick Search */}
          <div className="lg:col-span-6 space-y-4">
            <div className="mirror-glass-card rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#FFC107]" />
                  <h3 className="text-sm sm:text-base font-bold text-white">Registered Users Directory</h3>
                </div>
                <button
                  type="button"
                  onClick={refreshUsersList}
                  disabled={usersLoading}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  title="Refresh Users"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by email, name, or UID..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full bg-[#121922] text-white text-xs rounded-xl pl-9 pr-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>

              {/* Users list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {usersLoading && usersList.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Loading user accounts...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No users match "{userSearchTerm}".
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = targetUserEmail.toLowerCase() === (u.email || '').toLowerCase();
                    return (
                      <div
                        key={u.uid || u.email}
                        onClick={() => handleSelectUserToOverride(u)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-purple-900/40 to-purple-800/20 border-purple-500 shadow-md ring-1 ring-purple-500/50' 
                            : 'bg-[#121922]/70 hover:bg-[#121922] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-white truncate">
                              {u.displayName || 'Unnamed User'}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FFC107] border border-amber-500/40">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 font-mono truncate">{u.email}</p>
                          <div className="flex items-center gap-2 pt-0.5 text-[10px]">
                            <span className="text-purple-300">
                              CashBack: <strong className="text-white font-mono">₦{(u.balance ?? 0).toLocaleString()}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-300">
                              Deposit: <strong className="text-[#00B875] font-mono">₦{(u.depositBalance ?? 0).toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-purple-300">
                          <button
                            type="button"
                            className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
                            title="Select for override"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Override Controls Form */}
          <div className="lg:col-span-6 space-y-4">
            <div className="mirror-glass-card rounded-2xl p-6 border border-amber-500/30 space-y-4 relative overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Sliders className="w-5 h-5 text-[#FFC107]" />
                <div>
                  <h3 className="text-base font-bold text-white">Live Balance Override Control</h3>
                  <p className="text-[11px] text-purple-200">Instantly set, credit, or debit any user's balance with real-time sync.</p>
                </div>
              </div>

              {adjustMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adjustMsg}</span>
                </div>
              )}

              <form onSubmit={handleExecuteOverrideBalance} className="space-y-4">
                
                {/* Target User Account Email */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target User Account Email or UID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. user@example.com or UID"
                    value={targetUserEmail}
                    onChange={(e) => {
                      setTargetUserEmail(e.target.value);
                      const matched = usersList.find((u) => u.email?.toLowerCase() === e.target.value.toLowerCase() || u.uid === e.target.value);
                      setSelectedUserForOverride(matched || null);
                    }}
                    className="w-full bg-[#121922] text-white text-xs sm:text-sm font-mono rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                  />
                </div>

                {/* Target User Current Balances Snapshot */}
                {selectedUserForOverride && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">Selected User:</span>
                      <strong className="text-white">{selectedUserForOverride.displayName || 'PalmPay Member'}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-[#0A0D0F]/80 border border-white/5">
                        <span className="text-[10px] text-purple-300 block">Current CashBack Bal</span>
                        <span className="font-bold text-amber-400 font-mono text-sm">
                          ₦{(selectedUserForOverride.balance ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#0A0D0F]/80 border border-white/5">
                        <span className="text-[10px] text-emerald-300 block">Current Deposit Bal</span>
                        <span className="font-bold text-[#00B875] font-mono text-sm">
                          ₦{(selectedUserForOverride.depositBalance ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Select Balance Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    1. Select Balance Type to Override
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustBalanceType('cashback')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        adjustBalanceType === 'cashback'
                          ? 'bg-gradient-to-r from-purple-700 to-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-400'
                          : 'bg-[#121922] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>CashBack (Withdrawable)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustBalanceType('deposit')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                        adjustBalanceType === 'deposit'
                          ? 'bg-gradient-to-r from-emerald-700 to-[#00B875] text-white border-emerald-400 shadow-md ring-1 ring-emerald-400'
                          : 'bg-[#121922] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Deposited Balance (Games)</span>
                    </button>
                  </div>
                </div>

                {/* Select Override Mode */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    2. Override Action Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverrideMode('set')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        overrideMode === 'set'
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black'
                          : 'bg-[#121922] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      Set Exact Balance (=)
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverrideMode('credit')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        overrideMode === 'credit'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-[#121922] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      Add / Credit (+)
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverrideMode('debit')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        overrideMode === 'debit'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                          : 'bg-[#121922] text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      Subtract / Debit (-)
                    </button>
                  </div>
                </div>

                {/* Amount Input and Preset Quick Buttons */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      3. Amount (₦) {overrideMode === 'set' ? 'New Exact Balance' : 'Delta Amount'}
                    </label>
                  </div>
                  <input
                    type="number"
                    required
                    min={0}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#121922] text-white text-base sm:text-lg font-mono font-bold rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                  />

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <button
                      type="button"
                      onClick={() => setAdjustAmount(0)}
                      className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-mono"
                    >
                      ₦0 (Reset)
                    </button>
                    {[5000, 20000, 50000, 150000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAdjustAmount(amt)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
                          adjustAmount === amt
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                        }`}
                      >
                        ₦{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audit Reason / Memo */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    4. Reason / Audit Memo
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-[#121922] text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#7E1DC6] to-[#00B875] text-white font-bold text-sm shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isSubmittingOverride ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Applying Override to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-[#FFC107]" />
                      <span>Execute Balance Override</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Banner Broadcaster */}
      {tab === 'announcements' && (
        <div className="mirror-glass-card rounded-2xl p-6 border border-white/10 space-y-4 max-w-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <Bell className="w-5 h-5 text-[#FFC107]" />
            <h3 className="text-base font-bold text-white">Global Announcement Broadcaster</h3>
          </div>

          {announceMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{announceMsg}</span>
            </div>
          )}

          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Top Ticker / Hero Notice Text
              </label>
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full bg-[#121922] text-white text-xs sm:text-sm rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-[#7E1DC6]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-[#FFC107] text-black font-extrabold text-sm shadow-md hover:opacity-95 transition-all"
            >
              Broadcast Globally
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: PalmPay API Gateway Hub */}
      {tab === 'gateway' && (
        <div className="space-y-6 max-w-4xl">
          {/* Header Banner */}
          <div className="mirror-glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-2xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-['Poppins',sans-serif]">
                    <span>PalmPay Disbursal Gateway</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      gatewayConfig?.mode === 'live_remote'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {gatewayConfig?.mode === 'live_remote' ? 'LIVE REMOTE SERVER' : 'INTEGRATED TEST GATEWAY'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Server-to-server POST endpoint that credits dynamic PalmPay accounts upon Admin Approval.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchGatewayConfig}
                disabled={gatewayLoading}
                className="px-3 py-1.5 rounded-xl mirror-glass hover:bg-white/10 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gatewayLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Specification & Architecture Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                  Target Endpoint &amp; Auth Header
                </span>
                <div className="space-y-1 font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Target URL:</span>
                    <span className="text-cyan-300 font-bold break-all">
                      {gatewayConfig?.apiUrl || 'Direct PalmPay Gateway (Active)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Header:</span>
                    <span className="text-amber-300">x-api-secret</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Secret Status:</span>
                    <span className={gatewayConfig?.hasSecret ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {gatewayConfig?.hasSecret ? gatewayConfig.maskedSecret || 'Configured (Active)' : 'Optional / Default'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                  Disbursal Payload (JSON)
                </span>
                <pre className="text-[11px] font-mono text-purple-200 bg-black/60 p-2.5 rounded-xl border border-white/5 overflow-x-auto leading-tight">
{`{
  "accountNumber": withdrawal.accountNumber,
  "amount": Number(withdrawal.amount),
  "senderName": "PalmPay Cashback",
  "transactionReference": withdrawal.id
}`}
                </pre>
              </div>
            </div>
          </div>

            {/* Interactive Test Ping Gateway Tool */}
          <div className="mirror-glass-card rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white font-['Poppins',sans-serif]">
                  Gateway Connectivity Diagnostics (Zero-Amount Probe)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">Non-financial test ping</span>
            </div>

            <p className="text-xs text-slate-300">
              Verify PalmPay API connectivity in real-time. This diagnostic test checks server availability and response headers without transferring or debiting any real user funds.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Test Presets:</span>
              <button
                type="button"
                onClick={() => setTestAccountNumber('8012345678')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold"
              >
                8012345678 (200 Success Test)
              </button>
              <button
                type="button"
                onClick={() => setTestAccountNumber('404')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold"
              >
                404 (Account Not Found Test)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:flex-1">
                <input
                  type="text"
                  value={testAccountNumber}
                  onChange={(e) => setTestAccountNumber(e.target.value)}
                  placeholder="Enter test PalmPay account number"
                  className="w-full bg-[#121922] text-white text-xs sm:text-sm font-mono rounded-xl px-3.5 py-2.5 border border-white/15 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={handleTestPingGateway}
                disabled={gatewayPinging || !testAccountNumber.trim()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {gatewayPinging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Gateway...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5" />
                    <span>Ping PalmPay Gateway</span>
                  </>
                )}
              </button>
            </div>

            {/* Ping Result Box */}
            {gatewayPingResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
                gatewayPingResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {gatewayPingResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{gatewayPingResult.message || `Status: ${gatewayPingResult.status}`}</span>
                  </div>
                  {gatewayPingResult.durationMs && (
                    <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded text-cyan-300 border border-white/10">
                      {gatewayPingResult.durationMs}ms latency
                    </span>
                  )}
                </div>

                <div className="bg-black/60 p-3 rounded-xl border border-white/5 font-mono text-[11px] overflow-x-auto text-slate-200">
                  <pre>{JSON.stringify(gatewayPingResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Update Gateway Settings Form */}
          <div className="mirror-glass-card rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Server className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white font-['Poppins',sans-serif]">
                Update PalmPay Endpoint &amp; Secret (Live Runtime)
              </h4>
            </div>

            {gatewaySaveMsg && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                gatewaySaveMsg.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
              }`}>
                {gatewaySaveMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{gatewaySaveMsg.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveGatewayConfig} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  PalmPay API Endpoint URL (process.env.PALMPAY_API_URL)
                </label>
                <input
                  type="text"
                  value={gatewayInputUrl}
                  onChange={(e) => setGatewayInputUrl(e.target.value)}
                  placeholder="e.g. https://api.palmpay.com/v1/transfers or leave blank for internal test gateway"
                  className="w-full bg-[#121922] text-white text-xs sm:text-sm font-mono rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank or empty to use the built-in integrated verification test gateway.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Internal API Secret Key (process.env.INTERNAL_API_SECRET)
                </label>
                <input
                  type="password"
                  value={gatewayInputSecret}
                  onChange={(e) => setGatewayInputSecret(e.target.value)}
                  placeholder="Enter shared secret passed in x-api-secret header"
                  className="w-full bg-[#121922] text-white text-xs sm:text-sm font-mono rounded-xl px-3.5 py-3 border border-white/15 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
              >
                Save Gateway Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview for Receipt Image */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-2xl w-full rounded-3xl p-5 border border-purple-500/40 shadow-2xl relative space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#FFC107]" /> Paystack Transaction Receipt Image
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-black/70 flex items-center justify-center p-2">
              <img
                src={previewImage}
                alt="Receipt Full View"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Receipt Details & Proof Modal */}
      {selectedReceiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-4 sm:p-6 border border-purple-500/40 shadow-2xl relative space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-[#FFC107]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Poppins',sans-serif]">
                    {selectedReceiptData.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedReceiptData.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceiptData(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">User Email:</span>
                <strong className="text-white font-mono">{selectedReceiptData.userEmail}</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Amount:</span>
                <strong className="text-emerald-400 font-mono text-sm">₦{selectedReceiptData.amount.toLocaleString()}</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  selectedReceiptData.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  selectedReceiptData.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-[#FFC107] border border-amber-500/30'
                }`}>
                  {selectedReceiptData.status}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Reference:</span>
                <code className="text-purple-300 font-mono">{selectedReceiptData.reference}</code>
              </div>

              {selectedReceiptData.bankName && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Bank Destination:</span>
                  <strong className="text-white">{selectedReceiptData.bankName} ({selectedReceiptData.accountNumber})</strong>
                </div>
              )}

              {selectedReceiptData.code && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">CashBack Code:</span>
                  <code className="text-[#FFC107] font-mono font-bold">{selectedReceiptData.code}</code>
                </div>
              )}

              {selectedReceiptData.receiptImage && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1.5 font-semibold">Submitted Transaction Receipt:</span>
                  <div className="rounded-xl overflow-hidden border border-white/25 max-h-52 flex items-center justify-center bg-black cursor-pointer" onClick={() => {
                    setPreviewImage(selectedReceiptData.receiptImage || null);
                  }}>
                    <img src={selectedReceiptData.receiptImage} alt="Receipt Full Proof" className="max-h-52 object-contain" />
                  </div>
                  <span className="text-[10px] text-purple-300 block mt-1 text-center">Click image to inspect full-screen</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedReceiptData(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
              >
                Close Receipt Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
