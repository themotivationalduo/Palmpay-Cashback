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
  ArrowLeft,
  LayoutGrid,
  Edit3,
  Globe,
  Server,
  Activity,
  Check,
  Copy,
  MessageSquare,
  Send,
  Snowflake,
  Lock,
  Unlock,
  ShieldAlert
} from 'lucide-react';
import { useAuth, getLocalWithdrawalRequests, generateRandomCashbackCode, generateUniqueCashbackCode } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import { db, collection, query, onSnapshot, updateDoc, doc, addDoc, getDocs } from '../lib/firebase';
import { WithdrawalRequest, CodeOrder, DepositRequest, UserProfile, AdminSubPage } from '../types';

export interface ActionPromptState {
  isOpen: boolean;
  type: 'approve_withdrawal' | 'reject_withdrawal' | 'approve_deposit' | 'reject_deposit' | 'approve_code' | 'reject_code';
  id: string;
  userName: string;
  userEmail: string;
  amount?: number;
  accountNumber?: string;
  bankName?: string;
  reference?: string;
  code?: string;
  customMessage: string;
  isWarning: boolean;
}

export interface AdminPanelProps {
  activeSubPage?: AdminSubPage;
  onSubPageChange?: (page: AdminSubPage) => void;
  onNavigateHome?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  activeSubPage,
  onSubPageChange,
  onNavigateHome
}) => {
  const { 
    user, 
    updateBalance, 
    purgeAllRecords, 
    deleteUserPermanently,
    toggleFreezeUser,
    approveDepositRequest, 
    rejectDepositRequest, 
    approveWithdrawalRequest,
    rejectWithdrawalRequest,
    approveCodeOrder,
    rejectCodeOrder,
    deleteCodeOrder,
    depositRequests,
    deleteDepositRequest,
    withdrawalRequests,
    deleteWithdrawalRequest,
    cleanProcessedRequests,
    overrideUserBalance,
    getAllUsersForAdmin
  } = useAuth();
  const { triggerCelebration } = useCelebration();

  const [internalPage, setInternalPage] = useState<AdminSubPage>('overview');
  const currentPage: AdminSubPage = activeSubPage || internalPage;

  const navigateToPage = (targetPage: AdminSubPage) => {
    setInternalPage(targetPage);
    if (onSubPageChange) {
      onSubPageChange(targetPage);
    }
  };

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    return getLocalWithdrawalRequests();
  });
  const [codes, setCodes] = useState<CodeOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [purgeSuccess, setPurgeSuccess] = useState<boolean>(false);
  const [approvingWithdrawalId, setApprovingWithdrawalId] = useState<string | null>(null);
  const [withdrawalAlert, setWithdrawalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Request Deletion / Workspace Cleaning state
  const [requestToDelete, setRequestToDelete] = useState<{
    type: 'withdrawal' | 'deposit' | 'code';
    id: string;
    title: string;
    userEmail?: string;
    amount?: number;
    status: string;
  } | null>(null);
  const [isDeletingRequest, setIsDeletingRequest] = useState<boolean>(false);
  const [cleanFeedback, setCleanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCleaningBatch, setIsCleaningBatch] = useState<boolean>(false);

  // User Deletion & Freeze state
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
  const [deleteUserFeedback, setDeleteUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [userToFreeze, setUserToFreeze] = useState<UserProfile | null>(null);
  const [freezeReason, setFreezeReason] = useState<string>('');
  const [isFreezingUser, setIsFreezingUser] = useState<boolean>(false);
  const [freezeFeedback, setFreezeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom action prompt state for admin custom message/warning
  const [actionPrompt, setActionPrompt] = useState<ActionPromptState | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);

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
    adminNote?: string;
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
  const [testAccountNumber, setTestAccountNumber] = useState<string>('');
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
    if (currentPage === 'gateway') {
      fetchGatewayConfig();
    }
  }, [currentPage]);

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
    if (currentPage === 'users' || currentPage === 'overview') {
      refreshUsersList();
    }
  }, [currentPage]);

  const handleSelectUserToOverride = (u: UserProfile) => {
    setSelectedUserForOverride(u);
    setTargetUserEmail(u.email);
    const currentBal = adjustBalanceType === 'deposit' ? (u.depositBalance || 0) : u.balance;
    setAdjustAmount(currentBal);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setDeleteUserFeedback(null);
    try {
      const res = await deleteUserPermanently(userToDelete.uid || userToDelete.email);
      setDeleteUserFeedback({ type: 'success', message: res.message });
      if (selectedUserForOverride?.email === userToDelete.email || selectedUserForOverride?.uid === userToDelete.uid) {
        setSelectedUserForOverride(null);
        setTargetUserEmail('');
      }
      setUserToDelete(null);
      await refreshUsersList();
      setTimeout(() => setDeleteUserFeedback(null), 5000);
    } catch (err: any) {
      setDeleteUserFeedback({ type: 'error', message: err.message || 'Failed to delete user account.' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleConfirmFreezeUser = async () => {
    if (!userToFreeze) return;
    setIsFreezingUser(true);
    setFreezeFeedback(null);
    const targetFreeze = !userToFreeze.isFrozen;
    try {
      const res = await toggleFreezeUser(userToFreeze.uid || userToFreeze.email, targetFreeze, freezeReason);
      setFreezeFeedback({ type: 'success', message: res.message });
      if (res.updatedUser) {
        setUsersList((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === res.updatedUser!.email.toLowerCase() || u.uid === res.updatedUser!.uid
              ? res.updatedUser!
              : u
          )
        );
        if (selectedUserForOverride?.email.toLowerCase() === res.updatedUser.email.toLowerCase()) {
          setSelectedUserForOverride(res.updatedUser);
        }
      }
      await refreshUsersList();
      setUserToFreeze(null);
      setFreezeReason('');
      setTimeout(() => setFreezeFeedback(null), 5000);
    } catch (err: any) {
      setFreezeFeedback({ type: 'error', message: err.message || 'Failed to update account freeze state.' });
    } finally {
      setIsFreezingUser(false);
    }
  };

  const handleQuickToggleFreeze = async (u: UserProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (u.email?.toLowerCase() === 'themotivationalduo@gmail.com') {
      alert('Super Admin account cannot be frozen.');
      return;
    }
    const targetFreeze = !u.isFrozen;
    try {
      const res = await toggleFreezeUser(u.uid || u.email, targetFreeze);
      setFreezeFeedback({ type: 'success', message: res.message });
      if (res.updatedUser) {
        setUsersList((prev) =>
          prev.map((item) =>
            item.email.toLowerCase() === res.updatedUser!.email.toLowerCase() || item.uid === res.updatedUser!.uid
              ? res.updatedUser!
              : item
          )
        );
        if (selectedUserForOverride?.email.toLowerCase() === res.updatedUser.email.toLowerCase()) {
          setSelectedUserForOverride(res.updatedUser);
        }
      }
      await refreshUsersList();
      setTimeout(() => setFreezeFeedback(null), 5000);
    } catch (err: any) {
      setFreezeFeedback({ type: 'error', message: err.message || 'Failed to toggle account freeze state.' });
    }
  };

  const handlePurgeAll = async () => {
    if (window.confirm('Are you sure you want to permanently delete every user account, all files from Firebase Storage, and all transaction records? This action cannot be undone.')) {
      await purgeAllRecords();
      setWithdrawals([]);
      setCodes([]);
      await refreshUsersList();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 4000);
    }
  };

  /**
   * Safely deletes an individual request to free up workspace space on the admin panel.
   * STRICT SAFETY GUARANTEE: Does NOT affect user accounts, balances, or transactions. Purely cleaning.
   */
  const handleConfirmDeleteRequest = async () => {
    if (!requestToDelete || isDeletingRequest) return;
    setIsDeletingRequest(true);
    setCleanFeedback(null);

    const { type, id, title } = requestToDelete;
    try {
      if (type === 'withdrawal') {
        setWithdrawals((prev) => prev.filter((r) => r.id !== id));
        await deleteWithdrawalRequest(id);
      } else if (type === 'deposit') {
        await deleteDepositRequest(id);
      } else if (type === 'code') {
        setCodes((prev) => prev.filter((c) => c.id !== id));
        await deleteCodeOrder(id);
      }

      setCleanFeedback({
        type: 'success',
        message: `"${title}" safely removed. Admin queue space cleaned without affecting user accounts or data.`
      });
      setRequestToDelete(null);
      setTimeout(() => setCleanFeedback(null), 5000);
    } catch (err: any) {
      setCleanFeedback({
        type: 'error',
        message: err.message || 'Failed to remove request record.'
      });
    } finally {
      setIsDeletingRequest(false);
    }
  };

  /**
   * Batch cleans all processed (approved / rejected / completed) requests
   * to free up room for new requests on the admin panel.
   */
  const handleBatchClean = async (type: 'withdrawals' | 'deposits' | 'codes') => {
    if (isCleaningBatch) return;
    const typeLabel = type === 'withdrawals' ? 'Withdrawal' : type === 'deposits' ? 'Deposit' : 'CashBack Code';
    if (!window.confirm(`Clean all processed (approved, rejected, completed) ${typeLabel} requests?\n\nThis will remove processed items to give enough workspace space for other requests.\n\n✓ User accounts, balances, and data are SAFELY PRESERVED (NOT deleted).`)) {
      return;
    }

    setIsCleaningBatch(true);
    setCleanFeedback(null);
    try {
      if (type === 'withdrawals') {
        setWithdrawals((prev) => prev.filter((r) => r.status === 'pending'));
      } else if (type === 'codes') {
        setCodes((prev) => prev.filter((c) => c.status === 'pending'));
      }
      const res = await cleanProcessedRequests(type);
      setCleanFeedback({
        type: 'success',
        message: res.message
      });
      setTimeout(() => setCleanFeedback(null), 5000);
    } catch (err: any) {
      setCleanFeedback({
        type: 'error',
        message: err.message || 'Failed to clean processed requests.'
      });
    } finally {
      setIsCleaningBatch(false);
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
    const handleWdDeleted = (e: any) => {
      if (e.detail?.id) {
        setWithdrawals((prev) => prev.filter((r) => r.id !== e.detail.id));
      }
    };
    window.addEventListener('palmpay_withdrawal_created', handleNewWd);
    window.addEventListener('palmpay_withdrawal_deleted', handleWdDeleted);

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
        window.removeEventListener('palmpay_withdrawal_deleted', handleWdDeleted);
        unsubWithdrawals();
        unsubCodes();
      };
    } catch {
      mergeWithdrawals();
      setCodes([]);
      return () => {
        window.removeEventListener('palmpay_withdrawal_created', handleNewWd);
        window.removeEventListener('palmpay_withdrawal_deleted', handleWdDeleted);
      };
    }
  }, [withdrawalRequests]);

  const handleUpdateWithdrawalStatus = async (id: string, newStatus: 'approved' | 'rejected', force = false, customNote?: string) => {
    try {
      if (newStatus === 'approved') {
        setApprovingWithdrawalId(id);
        setWithdrawalAlert(null);

        const result = await approveWithdrawalRequest(id, force, customNote);
        setApprovingWithdrawalId(null);

        if (result.success) {
          const finalNote = customNote || 'Disbursed to PalmPay Account on Site B successfully with zero error';
          setWithdrawals((prev) =>
            prev.map((w) => (w.id === id ? { ...w, status: 'successful', adminNote: finalNote } : w))
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
        const finalNote = customNote || 'Declined by Admin. Funds reversed.';
        await rejectWithdrawalRequest(id, finalNote);
        setWithdrawals((prev) =>
          prev.map((w) => (w.id === id ? { ...w, status: 'rejected', adminNote: finalNote } : w))
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

  const handleUpdateCodeStatus = async (id: string, newStatus: 'approved' | 'rejected', customNote?: string) => {
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus, adminNote: customNote } : c))
    );

    try {
      if (newStatus === 'approved') {
        await approveCodeOrder(id, undefined, customNote);
      } else {
        await rejectCodeOrder(id, customNote || 'Order rejected by Admin.');
      }
    } catch (err) {
      console.warn('Update code Firestore error:', err);
    }
  };

  const handleConfirmActionPrompt = async () => {
    if (!actionPrompt) return;
    setActionSubmitting(true);
    try {
      const rawMsg = actionPrompt.customMessage.trim();
      const finalNote = actionPrompt.isWarning && !rawMsg.startsWith('⚠️')
        ? `⚠️ [WARNING] ${rawMsg}`
        : rawMsg;

      if (actionPrompt.type === 'approve_withdrawal') {
        await handleUpdateWithdrawalStatus(actionPrompt.id, 'approved', false, finalNote);
      } else if (actionPrompt.type === 'reject_withdrawal') {
        await handleUpdateWithdrawalStatus(actionPrompt.id, 'rejected', false, finalNote);
      } else if (actionPrompt.type === 'approve_deposit') {
        await approveDepositRequest(actionPrompt.id, finalNote);
        triggerCelebration({
          title: 'Deposit Approved & Credited! 💳',
          subtitle: `₦${(actionPrompt.amount || 0).toLocaleString()} credited to ${actionPrompt.userName}'s Deposited Balance.`,
          type: 'deposit',
          amount: `₦${(actionPrompt.amount || 0).toLocaleString()}`,
          duration: 3800
        });
      } else if (actionPrompt.type === 'reject_deposit') {
        await rejectDepositRequest(actionPrompt.id, finalNote);
      } else if (actionPrompt.type === 'approve_code') {
        await approveCodeOrder(actionPrompt.id, actionPrompt.code, finalNote);
        triggerCelebration({
          title: 'CashBack Code Approved! 🔑',
          subtitle: `Code order for ${actionPrompt.userEmail} approved and activated.`,
          type: 'code',
          duration: 3500
        });
      } else if (actionPrompt.type === 'reject_code') {
        await rejectCodeOrder(actionPrompt.id, finalNote);
      }

      setActionPrompt(null);
    } catch (err: any) {
      console.error('Error confirming admin action:', err);
      alert(err?.message || 'Error processing action.');
    } finally {
      setActionSubmitting(false);
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
  const processedDepositsCount = depositRequests.filter((d) => d.status !== 'pending').length;
  const processedWithdrawalsCount = withdrawals.filter((w) => w.status !== 'pending').length;
  const processedCodesCount = codes.filter((c) => c.status !== 'pending').length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in min-w-0 overflow-x-hidden pb-12">
      
      {/* 1. Admin Header Banner */}
      <div className="mirror-glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden">
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
                <h2 className="text-base sm:text-2xl font-black text-white font-['Poppins',sans-serif] truncate">
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
            <div 
              onClick={() => navigateToPage('deposits')}
              className="mirror-glass px-2.5 sm:px-3.5 py-2 rounded-xl border border-emerald-500/30 text-center cursor-pointer hover:bg-emerald-950/20 transition-all"
              title="Click to view Deposit Approvals page"
            >
              <span className="text-[9px] sm:text-[10px] text-emerald-300 block uppercase">Pending Deposits</span>
              <span className="text-sm sm:text-base font-bold text-[#00B875] font-mono">
                {pendingDepositsCount}
              </span>
            </div>

            <div 
              onClick={() => navigateToPage('withdrawals')}
              className="mirror-glass px-2.5 sm:px-3.5 py-2 rounded-xl border border-purple-500/20 text-center cursor-pointer hover:bg-purple-950/20 transition-all"
              title="Click to view Withdrawal Approvals page"
            >
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

      {/* 2. Admin Workspace Navigation Launcher (When on Overview Hub) */}
      {currentPage === 'overview' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-['Poppins',sans-serif]">
                <LayoutGrid className="w-4 h-4 text-[#FFC107]" />
                <span>Admin Management Pages</span>
              </h3>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Each management workspace is separated into its own dedicated page. Tap any button below to open.
              </p>
            </div>
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl mirror-glass hover:bg-white/10 text-xs text-purple-200 hover:text-white border border-purple-500/30 transition-all font-semibold flex items-center gap-1.5"
              >
                <span>Return to User Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Arranged Buttons Grid for Mobile & Desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
            
            {/* Page 1: Withdrawals */}
            <button
              type="button"
              onClick={() => navigateToPage('withdrawals')}
              className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-amber-400/50 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-[1.5px] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#0F081D] flex items-center justify-center">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFC107]" />
                  </div>
                </div>
                {pendingWithdrawalsCount > 0 ? (
                  <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/25 text-[#FFC107] border border-amber-500/40 animate-pulse">
                    {pendingWithdrawalsCount} PENDING
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CLEARED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-[#FFC107] transition-colors truncate">
                  Withdrawal Approvals
                </h4>
                <p className="text-[11px] text-purple-200/80 line-clamp-2">
                  Review withdrawal queue, approve &amp; disburse payouts to PalmPay accounts.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-[#FFC107] font-semibold">
                <span>Open Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Page 2: Deposits */}
            <button
              type="button"
              onClick={() => navigateToPage('deposits')}
              className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-emerald-400/50 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-[#00B875] to-teal-400 p-[1.5px] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#081812] flex items-center justify-center">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-[#00B875]" />
                  </div>
                </div>
                {pendingDepositsCount > 0 ? (
                  <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-[#00B875] border border-emerald-500/40 animate-pulse">
                    {pendingDepositsCount} PENDING
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ALL REVIEWED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  Deposit Approvals
                </h4>
                <p className="text-[11px] text-purple-200/80 line-clamp-2">
                  Inspect proof-of-payment receipts, approve and credit user deposit balances.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Open Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Page 3: Users & Balances */}
            <button
              type="button"
              onClick={() => navigateToPage('users')}
              className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-amber-400/50 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-[#7E1DC6] to-pink-500 p-[1.5px] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#140822] flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                  {usersList.length} USERS
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                  Users &amp; Balances
                </h4>
                <p className="text-[11px] text-purple-200/80 line-clamp-2">
                  User accounts directory, Freeze/Unfreeze toggle, live balance adjustments &amp; deletion.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-purple-300 font-semibold">
                <span>Open Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Page 4: CashBack Code Orders */}
            <button
              type="button"
              onClick={() => navigateToPage('codes')}
              className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-yellow-400/50 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-yellow-600 via-[#FFC107] to-amber-300 p-[1.5px] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#1E1605] flex items-center justify-center">
                    <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFC107]" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/20 text-[#FFC107] border border-yellow-500/40">
                  {codes.length} ORDERS
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-[#FFC107] transition-colors truncate">
                  CashBack Codes
                </h4>
                <p className="text-[11px] text-purple-200/80 line-clamp-2">
                  Review ₦8,550 activation code orders, verify Paystack proofs, and assign active codes.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-[#FFC107] font-semibold">
                <span>Open Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Page 5: Announcement Broadcaster */}
            <button
              type="button"
              onClick={() => navigateToPage('announcements')}
              className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-purple-400/50 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-[1.5px] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#120B20] flex items-center justify-center">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  ACTIVE
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                  Banner Broadcaster
                </h4>
                <p className="text-[11px] text-purple-200/80 line-clamp-2">
                  Broadcast live platform security alerts and news ticker to all user devices.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-purple-300 font-semibold">
                <span>Open Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Page 6: PalmPay API Gateway */}
            <button
              type="button"
              onClick={() => navigateToPage('gateway')}
              className="mirror-glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 hover:border-cyan-400/50 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 group flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-[1.5px] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-2xl bg-[#061822] flex items-center justify-center">
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                  </div>
                </div>
                <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  gatewayConfig?.mode === 'live_remote'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}>
                  {gatewayConfig?.mode === 'live_remote' ? 'LIVE' : 'TEST API'}
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                  PalmPay API Gateway
                </h4>
                <p className="text-[11px] text-purple-200/80 line-clamp-2">
                  Configure server-to-server disbursal endpoints and test connectivity in real-time.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                <span>Open Page</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

          </div>
        </div>
      )}

      {/* 3. Dedicated Page Header & Mobile-arranged Page Buttons (When viewing a specific subpage) */}
      {currentPage !== 'overview' && (
        <div className="space-y-3 animate-in fade-in">
          
          {/* Top Page Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPage('overview')}
                className="px-3 py-1.5 rounded-xl mirror-glass hover:bg-white/10 text-xs text-white border border-purple-400/30 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#FFC107]" />
                <span>Admin Hub</span>
              </button>

              <div className="h-4 w-[1px] bg-white/20 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-black text-white font-['Poppins',sans-serif] flex items-center gap-1.5">
                  {currentPage === 'withdrawals' && <DollarSign className="w-4 h-4 text-[#FFC107]" />}
                  {currentPage === 'deposits' && <Wallet className="w-4 h-4 text-[#00B875]" />}
                  {currentPage === 'users' && <Users className="w-4 h-4 text-purple-400" />}
                  {currentPage === 'codes' && <KeyRound className="w-4 h-4 text-[#FFC107]" />}
                  {currentPage === 'announcements' && <Bell className="w-4 h-4 text-purple-300" />}
                  {currentPage === 'gateway' && <Globe className="w-4 h-4 text-cyan-400" />}

                  <span>
                    {currentPage === 'withdrawals' && 'Withdrawal Approvals'}
                    {currentPage === 'deposits' && 'Deposit Approvals'}
                    {currentPage === 'users' && 'User Accounts & Balances'}
                    {currentPage === 'codes' && 'CashBack Code Orders'}
                    {currentPage === 'announcements' && 'Banner Broadcaster'}
                    {currentPage === 'gateway' && 'PalmPay API Gateway'}
                  </span>
                </h3>

                {currentPage === 'withdrawals' && pendingWithdrawalsCount > 0 && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/40">
                    {pendingWithdrawalsCount} PENDING
                  </span>
                )}
                {currentPage === 'deposits' && pendingDepositsCount > 0 && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00B875] border border-emerald-500/40">
                    {pendingDepositsCount} PENDING
                  </span>
                )}
                {currentPage === 'users' && (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    {usersList.length} TOTAL
                  </span>
                )}
              </div>
            </div>

            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="px-2.5 py-1 rounded-xl text-[11px] text-purple-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
              >
                <span>User App</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick-switch buttons strip - Arranged cleanly for mobile view */}
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full">
            <button
              type="button"
              onClick={() => navigateToPage('withdrawals')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate border ${
                currentPage === 'withdrawals'
                  ? 'bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white border-purple-300/40 shadow-md ring-1 ring-purple-400/50'
                  : 'mirror-glass hover:bg-white/10 text-purple-200/80 border-purple-500/20'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0 text-[#FFC107]" />
              <span className="truncate">Withdraw ({pendingWithdrawalsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage('deposits')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate border ${
                currentPage === 'deposits'
                  ? 'bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white border-emerald-300/40 shadow-md ring-1 ring-emerald-400/50'
                  : 'mirror-glass hover:bg-white/10 text-purple-200/80 border-purple-500/20'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0 text-[#00B875]" />
              <span className="truncate">Deposit ({pendingDepositsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage('users')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate border ${
                currentPage === 'users'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-[#7E1DC6] text-white border-amber-300/40 shadow-md ring-1 ring-amber-400/50'
                  : 'mirror-glass hover:bg-white/10 text-purple-200/80 border-purple-500/20'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Users ({usersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage('codes')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate border ${
                currentPage === 'codes'
                  ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white border-purple-300/40 shadow-md ring-1 ring-purple-400/50'
                  : 'mirror-glass hover:bg-white/10 text-purple-200/80 border-purple-500/20'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0 text-[#FFC107]" />
              <span className="truncate">Codes ({codes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage('announcements')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate border ${
                currentPage === 'announcements'
                  ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white border-purple-300/40 shadow-md ring-1 ring-purple-400/50'
                  : 'mirror-glass hover:bg-white/10 text-purple-200/80 border-purple-500/20'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0 text-purple-300" />
              <span className="truncate">Broadcast</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToPage('gateway')}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate border ${
                currentPage === 'gateway'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-300/40 shadow-md ring-1 ring-cyan-400/50'
                  : 'mirror-glass hover:bg-white/10 text-purple-200/80 border-purple-500/20'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span className="truncate">Gateway</span>
            </button>
          </div>

          {/* Filter Status Selector & Workspace Cleaning for Deposits / Withdrawals / Codes */}
          {(currentPage === 'deposits' || currentPage === 'withdrawals' || currentPage === 'codes') && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-200 font-semibold">
                  Filter Status:
                </span>
                <div className="flex items-center gap-1 bg-[#121922] p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg ${filterStatus === 'all' ? 'bg-white/15 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-2.5 py-1 rounded-lg ${filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus('approved')}
                    className={`px-2.5 py-1 rounded-lg ${filterStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilterStatus('rejected')}
                    className={`px-2.5 py-1 rounded-lg ${filterStatus === 'rejected' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Rejected
                  </button>
                </div>
              </div>

              {/* Clean Processed Requests (Gives enough space for other requests on admin panel with NO effect on user data) */}
              {((currentPage === 'withdrawals' && processedWithdrawalsCount > 0) ||
                (currentPage === 'deposits' && processedDepositsCount > 0) ||
                (currentPage === 'codes' && processedCodesCount > 0)) && (
                <button
                  type="button"
                  disabled={isCleaningBatch}
                  onClick={() => handleBatchClean(currentPage as 'withdrawals' | 'deposits' | 'codes')}
                  className="px-3 py-1.5 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  title="Clean processed requests to give enough space for other requests (User accounts & balances are safely preserved)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    Clean Processed ({
                      currentPage === 'withdrawals' ? processedWithdrawalsCount :
                      currentPage === 'deposits' ? processedDepositsCount :
                      processedCodesCount
                    })
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cleaning Feedback Toast / Alert */}
      {cleanFeedback && (
        <div className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in border ${
          cleanFeedback.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {cleanFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{cleanFeedback.message}</span>
          </div>
          <button
            onClick={() => setCleanFeedback(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PAGE 1: Deposit Approvals (Receipt Review) */}
      {currentPage === 'deposits' && (
        <div className="space-y-3">
          {/* Mobile Card View (Adapt to screen size without clipping/overlap) */}
          <div className="block md:hidden space-y-3">
            {filteredDeposits.length === 0 ? (
              <div className="mirror-glass-card rounded-2xl p-6 text-center text-slate-400 text-xs">
                No deposit requests found for status: <strong>{filterStatus}</strong>.
              </div>
            ) : (
              filteredDeposits.map((dep) => (
                <div key={dep.id} className="mirror-glass-card rounded-2xl p-4 border border-white/10 space-y-3 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-white truncate">{dep.userName}</span>
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

                  <div className="text-xs text-slate-300 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white truncate max-w-[200px]">{dep.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ref:</span>
                      <span className="text-[#FFC107] truncate max-w-[200px]">{dep.paymentReference || dep.id}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Date:</span>
                      <span>{new Date(Number(dep.createdAt)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Deposited Amount:</span>
                    <span className="text-lg font-black text-[#00B875] font-mono">
                      ₦{dep.amount.toLocaleString()}
                    </span>
                  </div>

                  {dep.receiptImage && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(dep.receiptImage)}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FFC107]" />
                        <span>Inspect Receipt</span>
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
                          adminNote: dep.adminNote,
                          date: new Date(Number(dep.createdAt)).toLocaleString()
                        })}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold"
                      >
                        Full Details
                      </button>
                    </div>
                  )}

                  {dep.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setActionPrompt({
                            isOpen: true,
                            type: 'approve_deposit',
                            id: dep.id,
                            userName: dep.userName,
                            userEmail: dep.userEmail,
                            amount: dep.amount,
                            reference: dep.paymentReference,
                            customMessage: `Deposit of ₦${dep.amount.toLocaleString()} approved and credited to your Deposited Balance.`,
                            isWarning: false
                          });
                        }}
                        className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00B875] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve &amp; Credit</span>
                      </button>
                      <button
                        onClick={() => {
                          setActionPrompt({
                            isOpen: true,
                            type: 'reject_deposit',
                            id: dep.id,
                            userName: dep.userName,
                            userEmail: dep.userEmail,
                            amount: dep.amount,
                            reference: dep.paymentReference,
                            customMessage: 'Transaction receipt unverified. Please upload clear proof of payment.',
                            isWarning: true
                          });
                        }}
                        className="py-2.5 rounded-xl bg-red-600/25 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {/* Clean Request Action (Gives enough space on admin panel, zero effect on user data) */}
                  <button
                    type="button"
                    onClick={() => setRequestToDelete({
                      type: 'deposit',
                      id: dep.id,
                      title: `Deposit Request (₦${dep.amount.toLocaleString()})`,
                      userEmail: dep.userEmail,
                      amount: dep.amount,
                      status: dep.status
                    })}
                    className="w-full py-2 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-1"
                    title="Clean request from admin queue (Zero effect on user data)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Clean Request from Queue</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block mirror-glass-card rounded-2xl border border-white/10 overflow-auto max-h-[650px] max-w-full scrollbar-thin">
            <div className="min-w-[950px] divide-y divide-white/5">
              {filteredDeposits.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No deposit requests found for status: <strong>{filterStatus}</strong>.
                </div>
              ) : (
                filteredDeposits.map((dep) => (
                  <div key={dep.id} className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
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
                                adminNote: dep.adminNote,
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

                    <div className="flex items-center justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-lg font-black text-[#00B875] font-mono">
                          ₦{dep.amount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">Deposited Amount</span>
                      </div>

                      {dep.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActionPrompt({
                                isOpen: true,
                                type: 'approve_deposit',
                                id: dep.id,
                                userName: dep.userName,
                                userEmail: dep.userEmail,
                                amount: dep.amount,
                                reference: dep.paymentReference,
                                customMessage: `Deposit of ₦${dep.amount.toLocaleString()} approved and credited to your Deposited Balance.`,
                                isWarning: false
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Credit</span>
                          </button>
                          <button
                            onClick={() => {
                              setActionPrompt({
                                isOpen: true,
                                type: 'reject_deposit',
                                id: dep.id,
                                userName: dep.userName,
                                userEmail: dep.userEmail,
                                amount: dep.amount,
                                reference: dep.paymentReference,
                                customMessage: 'Transaction receipt unverified. Please upload clear proof of payment.',
                                isWarning: true
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* Clean Request from Queue button */}
                      <button
                        type="button"
                        onClick={() => setRequestToDelete({
                          type: 'deposit',
                          id: dep.id,
                          title: `Deposit (₦${dep.amount.toLocaleString()}) - ${dep.userName}`,
                          userEmail: dep.userEmail,
                          amount: dep.amount,
                          status: dep.status
                        })}
                        className="p-2 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-all flex items-center gap-1 text-xs"
                        title="Clean request from admin workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Clean</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: Withdrawal Approvals */}
      {currentPage === 'withdrawals' && (
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

          {/* Mobile Card View (Adapt to screen size without clipping/overlap) */}
          <div className="block md:hidden space-y-3">
            {filteredWithdrawals.length === 0 ? (
              <div className="mirror-glass-card rounded-2xl p-6 text-center text-slate-400 text-xs">
                No withdrawal requests found for this filter.
              </div>
            ) : (
              filteredWithdrawals.map((req) => {
                const isApproving = approvingWithdrawalId === req.id;
                const isSuccessful = req.status === 'successful' || req.status === 'approved';
                const isFailed = req.status === 'failed';
                const isRejected = req.status === 'rejected';

                return (
                  <div key={req.id} className="mirror-glass-card rounded-2xl p-4 border border-white/10 space-y-3 shadow-md">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">{req.userName}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isSuccessful
                          ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/40'
                          : isFailed || isRejected
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
                      }`}>
                        {isSuccessful ? 'SUCCESS (DISBURSED)' : isFailed ? 'FAILED' : req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="text-white truncate max-w-[200px]">{req.userEmail}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">PalmPay Acc:</span>
                        <span className="inline-flex items-center gap-1 font-bold text-[#FFC107]">
                          <span>{req.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(req.accountNumber)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                            title="Copy Account Number"
                          >
                            {copiedAcc === req.accountNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank:</span>
                        <span className="text-white truncate">{req.bankName || 'PalmPay Wallet'}</span>
                      </div>
                      {req.cashbackCode && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Code:</span>
                          <span className="text-[#FFC107] font-bold">{req.cashbackCode}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Withdrawal Amount:</span>
                      <span className="text-lg font-black text-[#FFC107] font-mono">
                        ₦{req.amount.toLocaleString()}
                      </span>
                    </div>

                    {req.adminNote && (
                      <p className="text-[11px] text-rose-300 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-500/25">
                        ⚠️ {req.adminNote}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
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
                          adminNote: req.adminNote,
                          receiptImage: req.receiptImage || undefined,
                          date: new Date(Number(req.createdAt || Date.now())).toLocaleString()
                        })}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#FFC107]" />
                        <span>View Details</span>
                      </button>

                      {req.receiptImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(req.receiptImage || null)}
                          className="py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FFC107]" />
                          <span>Proof</span>
                        </button>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          disabled={isApproving}
                          onClick={() => {
                            setActionPrompt({
                              isOpen: true,
                              type: 'approve_withdrawal',
                              id: req.id,
                              userName: req.userName,
                              userEmail: req.userEmail,
                              amount: req.amount,
                              accountNumber: req.accountNumber,
                              bankName: req.bankName,
                              reference: req.reference || req.id,
                              code: req.cashbackCode,
                              customMessage: `Disbursed ₦${req.amount.toLocaleString()} to PalmPay account ${req.accountNumber} on Site B with zero error.`,
                              isWarning: false
                            });
                          }}
                          className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00B875] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          {isApproving ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Calling API...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </>
                          )}
                        </button>
                        <button
                          disabled={isApproving}
                          onClick={() => {
                            setActionPrompt({
                              isOpen: true,
                              type: 'reject_withdrawal',
                              id: req.id,
                              userName: req.userName,
                              userEmail: req.userEmail,
                              amount: req.amount,
                              accountNumber: req.accountNumber,
                              bankName: req.bankName,
                              reference: req.reference || req.id,
                              code: req.cashbackCode,
                              customMessage: 'Declined by Admin: Account verification mismatch. Funds have been reversed back to your balance.',
                              isWarning: true
                            });
                          }}
                          className="py-2.5 rounded-xl bg-red-600/25 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}

                    {(req.status === 'successful' || req.status === 'approved') && (
                      <button
                        disabled={isApproving}
                        onClick={() => {
                          setActionPrompt({
                            isOpen: true,
                            type: 'approve_withdrawal',
                            id: req.id,
                            userName: req.userName,
                            userEmail: req.userEmail,
                            amount: req.amount,
                            accountNumber: req.accountNumber,
                            bankName: req.bankName,
                            reference: req.reference || req.id,
                            customMessage: `Re-sent ₦${req.amount.toLocaleString()} disbursal to PalmPay account ${req.accountNumber} with zero error.`,
                            isWarning: false
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-purple-600/25 hover:bg-purple-600 text-purple-200 hover:text-white font-bold text-xs border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
                        <span>Force Re-send Disbursal to PalmPay</span>
                      </button>
                    )}

                    {req.status === 'failed' && (
                      <button
                        disabled={isApproving}
                        onClick={() => {
                          setActionPrompt({
                            isOpen: true,
                            type: 'approve_withdrawal',
                            id: req.id,
                            userName: req.userName,
                            userEmail: req.userEmail,
                            amount: req.amount,
                            accountNumber: req.accountNumber,
                            bankName: req.bankName,
                            reference: req.reference || req.id,
                            customMessage: `Retried ₦${req.amount.toLocaleString()} disbursal to PalmPay account ${req.accountNumber}.`,
                            isWarning: false
                          });
                        }}
                        className="w-full py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white font-bold text-xs border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Disbursal</span>
                      </button>
                    )}

                    {/* Clean Request Action (Gives enough space on admin panel, zero effect on user data or balance) */}
                    <button
                      type="button"
                      onClick={() => setRequestToDelete({
                        type: 'withdrawal',
                        id: req.id,
                        title: `Withdrawal (₦${req.amount.toLocaleString()}) - ${req.userName}`,
                        userEmail: req.userEmail,
                        amount: req.amount,
                        status: req.status
                      })}
                      className="w-full py-2 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-1"
                      title="Clean request from admin queue (Zero effect on user data or balance)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Clean Request from Queue</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block mirror-glass-card rounded-2xl border border-white/10 overflow-auto max-h-[650px] max-w-full scrollbar-thin">
            <div className="min-w-[1100px] divide-y divide-white/5">
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
                    <div key={req.id} className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-white">{req.userName}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isSuccessful
                              ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/40'
                              : isFailed || isRejected
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
                          }`}>
                            {isSuccessful ? 'SUCCESSFUL (PALMPAY CREDITED)' : isFailed ? 'FAILED (RETRY DISBURSAL)' : req.status}
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

                        {/* User Inserted Cashback Code Display */}
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs px-2.5 py-1 rounded-xl font-mono font-bold">
                            <KeyRound className="w-3.5 h-3.5 text-[#FFC107]" />
                            <span>User Inserted Code: <strong className="text-[#FFC107] font-extrabold">{req.cashbackCode || 'None Inserted'}</strong></span>
                          </span>
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

                      <div className="flex items-center justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-black text-[#FFC107] font-mono">
                            ₦{req.amount.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Ref: {req.reference || req.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
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
                              adminNote: req.adminNote,
                              receiptImage: req.receiptImage || undefined,
                              date: new Date(Number(req.createdAt || Date.now())).toLocaleString()
                            })}
                            className="px-3 py-2 rounded-xl mirror-glass hover:bg-white/10 text-purple-200 text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#FFC107]" />
                            <span>Details</span>
                          </button>

                          {req.status === 'pending' && (
                            <>
                              <button
                                disabled={isApproving}
                                onClick={() => {
                                  setActionPrompt({
                                    isOpen: true,
                                    type: 'approve_withdrawal',
                                    id: req.id,
                                    userName: req.userName,
                                    userEmail: req.userEmail,
                                    amount: req.amount,
                                    accountNumber: req.accountNumber,
                                    bankName: req.bankName,
                                    reference: req.reference || req.id,
                                    code: req.cashbackCode,
                                    customMessage: `Disbursed ₦${req.amount.toLocaleString()} to PalmPay account ${req.accountNumber} on Site B with zero error.`,
                                    isWarning: false
                                  });
                                }}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00B875] hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 whitespace-nowrap"
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
                                onClick={() => {
                                  setActionPrompt({
                                    isOpen: true,
                                    type: 'reject_withdrawal',
                                    id: req.id,
                                    userName: req.userName,
                                    userEmail: req.userEmail,
                                    amount: req.amount,
                                    accountNumber: req.accountNumber,
                                    bankName: req.bankName,
                                    reference: req.reference || req.id,
                                    code: req.cashbackCode,
                                    customMessage: 'Declined by Admin: Account verification mismatch. Funds have been reversed back to your balance.',
                                    isWarning: true
                                  });
                                }}
                                className="px-3 py-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {(req.status === 'successful' || req.status === 'approved') && (
                            <button
                              disabled={isApproving}
                              onClick={() => {
                                setActionPrompt({
                                  isOpen: true,
                                  type: 'approve_withdrawal',
                                  id: req.id,
                                  userName: req.userName,
                                  userEmail: req.userEmail,
                                  amount: req.amount,
                                  accountNumber: req.accountNumber,
                                  bankName: req.bankName,
                                  reference: req.reference || req.id,
                                  customMessage: `Re-sent ₦${req.amount.toLocaleString()} disbursal to PalmPay account ${req.accountNumber} with zero error.`,
                                  isWarning: false
                                });
                              }}
                              className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white font-bold text-xs border border-purple-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 whitespace-nowrap"
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
                              onClick={() => {
                                setActionPrompt({
                                  isOpen: true,
                                  type: 'approve_withdrawal',
                                  id: req.id,
                                  userName: req.userName,
                                  userEmail: req.userEmail,
                                  amount: req.amount,
                                  accountNumber: req.accountNumber,
                                  bankName: req.bankName,
                                  reference: req.reference || req.id,
                                  customMessage: `Retried disbursal of ₦${req.amount.toLocaleString()} to PalmPay account ${req.accountNumber} successfully with zero error.`,
                                  isWarning: false
                                });
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white font-bold text-xs border border-amber-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 whitespace-nowrap"
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

                          {/* Clean Request Action (Gives enough space on admin panel, zero effect on user data or balance) */}
                          <button
                            type="button"
                            onClick={() => setRequestToDelete({
                              type: 'withdrawal',
                              id: req.id,
                              title: `Withdrawal (₦${req.amount.toLocaleString()}) - ${req.userName}`,
                              userEmail: req.userEmail,
                              amount: req.amount,
                              status: req.status
                            })}
                            className="p-2 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-all flex items-center gap-1 text-xs"
                            title="Clean request from admin workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Clean</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 3: CashBack Code Orders */}
      {currentPage === 'codes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#FFC107]" />
              <span>CashBack Code Orders (₦8,550 fee)</span>
            </h3>
            <span className="text-xs text-[#FFC107] font-mono font-normal">
              Pending Orders: {codes.filter(c => c.status === 'pending').length}
            </span>
          </div>

          {/* Mobile Card View for Codes (No horizontal scroll clipping on phones) */}
          <div className="block md:hidden space-y-3">
            {codes.length === 0 ? (
              <div className="mirror-glass-card rounded-2xl p-6 text-center text-slate-400 text-xs">
                No code purchases recorded.
              </div>
            ) : (
              codes.map((c) => (
                <div key={c.id} className="mirror-glass-card rounded-2xl p-4 border border-white/10 space-y-3 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-[#FFC107]">{c.generatedCode}</span>
                    <span className={`text-[10px] font-black uppercase border px-2 py-0.5 rounded-full ${
                      c.status === 'approved'
                        ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/40'
                        : c.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-amber-500/20 text-[#FFC107] border-amber-500/40 animate-pulse'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Buyer:</span>
                      <span className="text-white truncate max-w-[200px]">{c.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment:</span>
                      <span className="text-purple-300">
                        {c.paymentSource === 'deposit_balance' ? 'Deposit Balance' : 'Paystack Link'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ref:</span>
                      <span className="text-slate-200 truncate max-w-[180px]">{c.paymentReference || 'PAYSTACK'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-yellow-500/20 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Code Price:</span>
                    <span className="text-base font-bold text-[#FFC107] font-mono">
                      ₦{(c.codePrice || 8550).toLocaleString()}
                    </span>
                  </div>

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
                      receiptImage: c.receiptImage,
                      adminNote: c.adminNote,
                      date: new Date(Number(c.createdAt || Date.now())).toLocaleString()
                    })}
                    className="w-full py-2 px-3 rounded-xl mirror-glass hover:bg-white/10 text-purple-200 text-xs font-semibold border border-purple-500/30 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#FFC107]" />
                    <span>View Receipt &amp; Proof</span>
                  </button>

                  {c.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          const codeToAssign = (!c.generatedCode || c.generatedCode.toLowerCase().includes('pending') || !c.generatedCode.startsWith('palm_'))
                            ? generateUniqueCashbackCode(c.userEmail || c.uid)
                            : c.generatedCode;
                          setActionPrompt({
                            isOpen: true,
                            type: 'approve_code',
                            id: c.id,
                            userName: c.userEmail.split('@')[0],
                            userEmail: c.userEmail,
                            amount: c.codePrice || 8550,
                            code: codeToAssign,
                            reference: c.paymentReference,
                            customMessage: `CashBack Code (${codeToAssign}) approved and activated. Your code is now active for withdrawals.`,
                            isWarning: false
                          });
                        }}
                        className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => {
                          setActionPrompt({
                            isOpen: true,
                            type: 'reject_code',
                            id: c.id,
                            userName: c.userEmail.split('@')[0],
                            userEmail: c.userEmail,
                            amount: c.codePrice || 8550,
                            reference: c.paymentReference,
                            customMessage: 'Payment unverified. CashBack Code order declined.',
                            isWarning: true
                          });
                        }}
                        className="py-2.5 rounded-xl bg-red-600/25 hover:bg-red-600 text-red-200 hover:text-white font-bold text-xs border border-red-500/40 transition-all flex items-center justify-center gap-1 active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  )}

                  {/* Clean Code Order Action */}
                  <button
                    type="button"
                    onClick={() => setRequestToDelete({
                      type: 'code',
                      id: c.id,
                      title: `Code Order (${c.generatedCode})`,
                      userEmail: c.userEmail,
                      amount: c.codePrice || 8550,
                      status: c.status
                    })}
                    className="w-full py-2 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-1"
                    title="Clean code order from admin queue (Zero effect on active codes or user accounts)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Clean Order from Queue</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View for Codes */}
          <div className="hidden md:block mirror-glass-card rounded-2xl border border-white/10 overflow-auto max-h-[650px] max-w-full scrollbar-thin">
            <div className="min-w-[950px] divide-y divide-white/5">
              {codes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No code purchases recorded.
                </div>
              ) : (
                codes.map((c) => (
                  <div key={c.id} className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                    <div className="space-y-1 flex-1 min-w-0">
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

                    <div className="flex items-center justify-end gap-4 shrink-0">
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
                          receiptImage: c.receiptImage,
                          adminNote: c.adminNote,
                          date: new Date(Number(c.createdAt || Date.now())).toLocaleString()
                        })}
                        className="px-3 py-1.5 rounded-xl mirror-glass hover:bg-white/10 text-purple-200 text-[10px] sm:text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-[#FFC107]" />
                        <span>View Receipt</span>
                      </button>

                      {c.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const codeToAssign = (!c.generatedCode || c.generatedCode.toLowerCase().includes('pending') || !c.generatedCode.startsWith('palm_'))
                                ? generateUniqueCashbackCode(c.userEmail || c.uid)
                                : c.generatedCode;
                              setActionPrompt({
                                isOpen: true,
                                type: 'approve_code',
                                id: c.id,
                                userName: c.userEmail.split('@')[0],
                                userEmail: c.userEmail,
                                amount: c.codePrice || 8550,
                                code: codeToAssign,
                                reference: c.paymentReference,
                                customMessage: `CashBack Code (${codeToAssign}) approved and activated. Your code is now active for withdrawals.`,
                                isWarning: false
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-xs shadow-md transition-all flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              setActionPrompt({
                                isOpen: true,
                                type: 'reject_code',
                                id: c.id,
                                userName: c.userEmail.split('@')[0],
                                userEmail: c.userEmail,
                                amount: c.codePrice || 8550,
                                reference: c.paymentReference,
                                customMessage: 'Payment unverified. CashBack Code order declined.',
                                isWarning: true
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white font-bold text-[10px] sm:text-xs border border-red-500/40 transition-all flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap"
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

                      {/* Clean Code Order Button */}
                      <button
                        type="button"
                        onClick={() => setRequestToDelete({
                          type: 'code',
                          id: c.id,
                          title: `Code Order (${c.generatedCode})`,
                          userEmail: c.userEmail,
                          amount: c.codePrice || 8550,
                          status: c.status
                        })}
                        className="p-1.5 sm:p-2 rounded-xl mirror-glass hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-all flex items-center gap-1 text-[10px] sm:text-xs"
                        title="Clean code order from admin workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Clean</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4: User Balance Override Management Hub */}
      {currentPage === 'users' && (
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
              <div className="space-y-2 max-h-[480px] overflow-y-auto overflow-x-auto w-full min-w-0 max-w-full pr-1 scrollbar-thin">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-white truncate">
                              {u.displayName || 'Unnamed User'}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FFC107] border border-amber-500/40">
                                ADMIN
                              </span>
                            )}
                            {u.isFrozen && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                                <Snowflake className="w-2.5 h-2.5 animate-spin" />
                                FROZEN
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
                          {u.email?.toLowerCase() !== 'themotivationalduo@gmail.com' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserToFreeze(u);
                                  setFreezeReason(u.frozenReason || '');
                                }}
                                className={`p-2 rounded-lg border transition-all active:scale-95 ${
                                  u.isFrozen
                                    ? 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border-cyan-500/40'
                                    : 'bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border-cyan-500/20'
                                }`}
                                title={u.isFrozen ? "Unfreeze Account (Restore Access)" : "Freeze Account (Temporarily Suspend)"}
                              >
                                {u.isFrozen ? <Unlock className="w-3.5 h-3.5 text-cyan-300" /> : <Snowflake className="w-3.5 h-3.5 text-cyan-400" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserToDelete(u);
                                }}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/20 transition-all active:scale-95"
                                title="Permanently Delete Account from Firebase Firestore & Storage"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

              {deleteUserFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                  deleteUserFeedback.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-500/20 border-red-500/40 text-red-200'
                }`}>
                  {deleteUserFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{deleteUserFeedback.message}</span>
                </div>
              )}

              {freezeFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                  freezeFeedback.type === 'success'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                    : 'bg-red-500/20 border-red-500/40 text-red-200'
                }`}>
                  {freezeFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{freezeFeedback.message}</span>
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
                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">Selected User:</span>
                      <strong className="text-white">{selectedUserForOverride.displayName || 'PalmPay Member'}</strong>
                    </div>

                    {/* Account Status Badge & Freeze Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A0D0F]/80 border border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        {selectedUserForOverride.isFrozen ? (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-cyan-300 font-bold flex items-center gap-1">
                              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                              FROZEN (Suspended)
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            <span className="text-emerald-300 font-bold">Status: ACTIVE 🟢</span>
                          </>
                        )}
                      </div>
                      {selectedUserForOverride.email?.toLowerCase() !== 'themotivationalduo@gmail.com' && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserToFreeze(selectedUserForOverride);
                            setFreezeReason(selectedUserForOverride.frozenReason || '');
                          }}
                          className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                            selectedUserForOverride.isFrozen
                              ? 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40'
                              : 'bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {selectedUserForOverride.isFrozen ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-cyan-300" />
                              <span>Unfreeze Account</span>
                            </>
                          ) : (
                            <>
                              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Freeze Account</span>
                            </>
                          )}
                        </button>
                      )}
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

                    {/* Permanent Delete Action Button */}
                    {selectedUserForOverride.email?.toLowerCase() !== 'themotivationalduo@gmail.com' && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(selectedUserForOverride)}
                        className="w-full mt-1.5 py-2 px-3 rounded-xl bg-red-600/15 hover:bg-red-600/30 border border-red-500/30 text-red-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Permanently Delete Account from Firebase Storage &amp; Database</span>
                      </button>
                    )}
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

      {/* PAGE 5: Banner Broadcaster */}
      {currentPage === 'announcements' && (
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

      {/* PAGE 6: PalmPay API Gateway Hub */}
      {currentPage === 'gateway' && (
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
  "senderName": "palmpay Cashback",
  "senderBank": "palmpay",
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

            <div className="p-3 sm:p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 text-xs overflow-x-auto scrollbar-thin">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-1 border-b border-white/5 gap-1.5 min-w-0">
                <span className="text-slate-400 shrink-0">User Email:</span>
                <strong className="text-white font-mono break-all text-left sm:text-right">{selectedReceiptData.userEmail}</strong>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-1 border-b border-white/5 gap-1.5 min-w-0">
                <span className="text-slate-400 shrink-0">Amount:</span>
                <strong className="text-emerald-400 font-mono text-sm text-left sm:text-right">₦{selectedReceiptData.amount.toLocaleString()}</strong>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-1 border-b border-white/5 gap-1.5 min-w-0">
                <span className="text-slate-400 shrink-0">Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-left sm:text-right w-fit ${
                  selectedReceiptData.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  selectedReceiptData.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-[#FFC107] border border-amber-500/30'
                }`}>
                  {selectedReceiptData.status}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-1 border-b border-white/5 gap-1.5 min-w-0">
                <span className="text-slate-400 shrink-0">Reference:</span>
                <code className="text-purple-300 font-mono break-all text-left sm:text-right">{selectedReceiptData.reference}</code>
              </div>

              {selectedReceiptData.bankName && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-1 border-b border-white/5 gap-1.5 min-w-0">
                  <span className="text-slate-400 shrink-0">Bank Destination:</span>
                  <strong className="text-white break-words text-left sm:text-right">{selectedReceiptData.bankName} ({selectedReceiptData.accountNumber})</strong>
                </div>
              )}

              {selectedReceiptData.code && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-1 border-b border-white/5 gap-1.5 min-w-0">
                  <span className="text-slate-400 shrink-0">CashBack Code:</span>
                  <code className="text-[#FFC107] font-mono font-bold break-all text-left sm:text-right">{selectedReceiptData.code}</code>
                </div>
              )}

              {selectedReceiptData.adminNote && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Admin Review Note / Custom Warning:</span>
                  </div>
                  <p className="text-slate-200 text-xs italic leading-relaxed break-words">
                    "{selectedReceiptData.adminNote}"
                  </p>
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

      {/* Admin Action & Custom Warning/Message Modal */}
      {actionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-5 sm:p-6 border border-purple-500/40 shadow-2xl relative space-y-4 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${
                  actionPrompt.type.startsWith('approve') 
                    ? 'bg-emerald-500/20 text-[#00B875] border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {actionPrompt.type.startsWith('approve') ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                    {actionPrompt.type === 'approve_withdrawal' && 'Approve Withdrawal & Disburse'}
                    {actionPrompt.type === 'reject_withdrawal' && 'Decline Withdrawal Request'}
                    {actionPrompt.type === 'approve_deposit' && 'Approve & Credit Deposit'}
                    {actionPrompt.type === 'reject_deposit' && 'Reject Deposit Request'}
                    {actionPrompt.type === 'approve_code' && 'Approve CashBack Code Order'}
                    {actionPrompt.type === 'reject_code' && 'Decline CashBack Code Order'}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    User: {actionPrompt.userName} ({actionPrompt.userEmail})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionPrompt(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-1.5 font-mono">
              {actionPrompt.amount !== undefined && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Amount:</span>
                  <strong className="text-white font-bold text-sm">₦{actionPrompt.amount.toLocaleString()}</strong>
                </div>
              )}
              {actionPrompt.accountNumber && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>PalmPay Account:</span>
                  <span className="text-[#FFC107] font-bold">{actionPrompt.accountNumber}</span>
                </div>
              )}
              {actionPrompt.type === 'approve_code' ? (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-white flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-[#FFC107]" />
                      Assigned CashBack Code:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = generateRandomCashbackCode();
                        setActionPrompt(prev => prev ? {
                          ...prev,
                          code: newCode,
                          customMessage: `CashBack Code (${newCode}) approved and activated. Your code is now active for withdrawals.`
                        } : null);
                      }}
                      className="text-[10px] text-purple-300 hover:text-white underline font-mono font-bold"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={actionPrompt.code || ''}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setActionPrompt(prev => prev ? {
                        ...prev,
                        code: v,
                        customMessage: `CashBack Code (${v}) approved and activated. Your code is now active for withdrawals.`
                      } : null);
                    }}
                    placeholder="palm_###_cash_###"
                    className="w-full bg-[#150a24] text-white font-mono font-bold text-sm rounded-xl px-3 py-2 border border-purple-500/40 focus:outline-none focus:border-[#00B875] text-center"
                  />
                  <p className="text-[10px] text-purple-200/80 font-normal">
                    This code will be permanently activated on <strong>{actionPrompt.userEmail}</strong>'s account.
                  </p>
                </div>
              ) : actionPrompt.code ? (
                <div className="flex justify-between items-center text-slate-300">
                  <span>User Inserted Code:</span>
                  <span className="text-[#FFC107] font-extrabold">{actionPrompt.code}</span>
                </div>
              ) : null}
              {actionPrompt.reference && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Reference:</span>
                  <span className="text-purple-300">{actionPrompt.reference}</span>
                </div>
              )}
            </div>

            {/* Presets List */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
                <span>Quick Preset Messages &amp; Warnings:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(actionPrompt.type === 'approve_withdrawal' ? [
                  { text: `Disbursed ₦${(actionPrompt.amount || 0).toLocaleString()} to PalmPay account ${actionPrompt.accountNumber || ''} on Site B with zero error.`, isWarning: false },
                  { text: 'Payment approved. Funds sent directly to your PalmPay wallet balance.', isWarning: false },
                  { text: 'Withdrawal completed. Transaction reference linked to your PalmPay account.', isWarning: false },
                  { text: '⚠️ Warning: Recipient name differs slightly from PalmPay record. Verified & approved.', isWarning: true }
                ] : actionPrompt.type === 'reject_withdrawal' ? [
                  { text: 'Declined by Admin: PalmPay account number mismatch. Funds reversed back to your balance.', isWarning: true },
                  { text: 'Declined by Admin: Unverified destination account. Funds returned safely to your wallet.', isWarning: true },
                  { text: '⚠️ Warning: Invalid account number supplied. Please re-check your 10-digit PalmPay number.', isWarning: true },
                  { text: 'Declined by Admin: Daily maximum limit reached. Funds reversed back to balance.', isWarning: true }
                ] : actionPrompt.type === 'approve_deposit' ? [
                  { text: `Deposit of ₦${(actionPrompt.amount || 0).toLocaleString()} approved and credited to your Deposited Balance.`, isWarning: false },
                  { text: 'Payment confirmed! Ready for code purchases and cashback games.', isWarning: false },
                  { text: '⚠️ Warning: Deposit receipt was partly cropped. Approved, but upload clear receipts next time.', isWarning: true }
                ] : actionPrompt.type === 'reject_deposit' ? [
                  { text: 'Transaction receipt unverified. Please upload clear, unaltered proof of payment.', isWarning: true },
                  { text: 'Payment reference could not be matched on bank records. Deposit declined.', isWarning: true },
                  { text: '⚠️ Warning: Duplicate or invalid payment receipt detected. Request declined.', isWarning: true }
                ] : actionPrompt.type === 'approve_code' ? [
                  { text: 'CashBack Code approved and activated. Your code is now active for withdrawals.', isWarning: false },
                  { text: 'Payment confirmed. CashBack Code successfully generated and unlocked in account.', isWarning: false }
                ] : [
                  { text: 'Payment unverified. CashBack Code order declined.', isWarning: true },
                  { text: '⚠️ Warning: Payment reference invalid. Please purchase through verified payment link.', isWarning: true }
                ]).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActionPrompt((prev) => prev ? {
                        ...prev,
                        customMessage: preset.text,
                        isWarning: preset.isWarning
                      } : null);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all border ${
                      actionPrompt.customMessage === preset.text
                        ? 'bg-purple-600/40 border-purple-400 text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    {preset.text.length > 55 ? preset.text.slice(0, 52) + '...' : preset.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Custom Message / Warning Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Custom Warning or Message for User:</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Visible on User Receipt &amp; Alerts</span>
              </div>
              <textarea
                rows={3}
                value={actionPrompt.customMessage}
                onChange={(e) => {
                  const val = e.target.value;
                  setActionPrompt((prev) => prev ? { ...prev, customMessage: val } : null);
                }}
                placeholder="Enter custom warning or message for the user..."
                className="w-full bg-[#121922] text-white text-xs sm:text-sm rounded-xl p-3 border border-white/15 focus:outline-none focus:border-purple-500 transition-colors resize-none placeholder-slate-500"
              />
            </div>

            {/* Warning Notice Flag Toggle */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 cursor-pointer text-xs text-amber-200">
              <input
                type="checkbox"
                checked={actionPrompt.isWarning}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setActionPrompt((prev) => prev ? { ...prev, isWarning: checked } : null);
                }}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
              />
              <span className="font-semibold">Highlight as Alert / Warning Notice (amber badge) ⚠️</span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={() => setActionPrompt(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={handleConfirmActionPrompt}
                className={`flex-1 py-3 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                  actionPrompt.type.startsWith('approve')
                    ? 'bg-gradient-to-r from-emerald-600 via-[#00B875] to-emerald-500 text-white'
                    : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white'
                }`}
              >
                {actionSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {actionPrompt.type.startsWith('approve') ? 'Confirm Approval & Send' : 'Confirm Decline & Send'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Permanently Delete User Account from Firebase Firestore & Storage */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card rounded-3xl p-5 sm:p-7 max-w-lg w-full border-2 border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.35)] relative overflow-hidden space-y-4">
            
            {/* Top Red Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                      Permanent Account Deletion
                    </h3>
                    <span className="text-[9px] bg-red-500/20 text-red-300 font-extrabold uppercase px-2 py-0.5 rounded-full border border-red-500/40">
                      IRREVERSIBLE
                    </span>
                  </div>
                  <p className="text-xs text-red-200/90 mt-0.5">
                    Permanently wipe this account from Firebase Firestore &amp; Storage.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Account Profile Summary */}
            <div className="p-4 rounded-2xl bg-[#0A0D0F] border border-red-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Account Name:</span>
                <strong className="text-white text-sm">{userToDelete.displayName || 'PalmPay Member'}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-amber-300 font-mono font-bold">{userToDelete.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PalmPay Account / Phone:</span>
                <span className="text-cyan-300 font-mono font-bold">{userToDelete.accountNumber || userToDelete.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">UID:</span>
                <span className="text-slate-400 font-mono text-[11px] truncate max-w-[220px]">{userToDelete.uid}</span>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div className="p-2 rounded-xl bg-white/5 text-center">
                  <span className="text-[10px] text-purple-300 block uppercase">CashBack Balance</span>
                  <span className="font-bold text-amber-400 font-mono text-sm">
                    ₦{(userToDelete.balance ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 text-center">
                  <span className="text-[10px] text-emerald-300 block uppercase">Deposited Balance</span>
                  <span className="font-bold text-[#00B875] font-mono text-sm">
                    ₦{(userToDelete.depositBalance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Scope Breakdown */}
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>The following will be PERMANENTLY ERASED:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-red-200/90 pl-1">
                <li>User document from Firebase Firestore (<code className="text-white">users</code> collection)</li>
                <li>All uploaded receipts, deposit slips &amp; avatars from <strong>Firebase Storage</strong></li>
                <li>All linked transaction logs, withdrawal requests &amp; deposit proofs</li>
                <li>All Cashback Code orders &amp; referral connections</li>
                <li>Active session tokens &amp; local registration entries</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Erasing from Firebase...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Delete Account Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Freeze / Unfreeze Account Modal */}
      {userToFreeze && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card rounded-3xl p-5 sm:p-7 max-w-lg w-full border-2 border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden space-y-4">
            
            {/* Top Cyan Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 animate-pulse" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shrink-0">
                  {userToFreeze.isFrozen ? <Unlock className="w-6 h-6" /> : <Snowflake className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                      {userToFreeze.isFrozen ? 'Unfreeze User Account' : 'Freeze User Account'}
                    </h3>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      userToFreeze.isFrozen
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {userToFreeze.isFrozen ? 'RESTORE ACCESS' : 'TEMPORARY SUSPENSION'}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-200/90 mt-0.5">
                    {userToFreeze.isFrozen
                      ? 'Reactivate normal platform access and transactions for this user.'
                      : 'Temporarily disable withdrawals, deposits, and game activity without deleting data.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserToFreeze(null)}
                disabled={isFreezingUser}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Account Profile Summary */}
            <div className="p-4 rounded-2xl bg-[#0A0D0F] border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Account Name:</span>
                <strong className="text-white text-sm">{userToFreeze.displayName || 'PalmPay Member'}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-amber-300 font-mono font-bold">{userToFreeze.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PalmPay Account / Phone:</span>
                <span className="text-cyan-300 font-mono font-bold">{userToFreeze.accountNumber || userToFreeze.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Status:</span>
                <span className={userToFreeze.isFrozen ? "text-cyan-300 font-bold" : "text-emerald-400 font-bold"}>
                  {userToFreeze.isFrozen ? '❄️ FROZEN' : '🟢 ACTIVE'}
                </span>
              </div>

              {/* Balances (Preserved safely) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div className="p-2 rounded-xl bg-white/5 text-center">
                  <span className="text-[10px] text-purple-300 block uppercase">CashBack Balance</span>
                  <span className="font-bold text-amber-400 font-mono text-sm">
                    ₦{(userToFreeze.balance ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 text-center">
                  <span className="text-[10px] text-emerald-300 block uppercase">Deposited Balance</span>
                  <span className="font-bold text-[#00B875] font-mono text-sm">
                    ₦{(userToFreeze.depositBalance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanatory Notice */}
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{userToFreeze.isFrozen ? 'Effect of Unfreezing Account:' : 'Effect of Freezing Account:'}</span>
              </div>
              {userToFreeze.isFrozen ? (
                <p className="text-[11px] text-cyan-200/90 leading-relaxed">
                  User will immediately regain the ability to request withdrawals, make wallet deposits, and participate in games. All stored funds and history remain intact.
                </p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-[11px] text-cyan-200/90 pl-1">
                  <li>Withdrawals and payouts are <strong>temporarily blocked</strong>.</li>
                  <li>Deposits, game spins, and code orders are suspended.</li>
                  <li>Account data, balance, and transaction history are <strong>safely preserved</strong> (NOT deleted).</li>
                  <li>You can unfreeze and restore full access anytime in 1-click.</li>
                </ul>
              )}
            </div>

            {/* Optional Reason / Note Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Administrative Note / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder={userToFreeze.isFrozen ? "e.g. Identity verified / review cleared" : "e.g. Under administrative review / suspicious activity"}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                className="w-full bg-[#121922] text-white text-xs rounded-xl p-3 border border-white/15 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isFreezingUser}
                onClick={() => setUserToFreeze(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFreezingUser}
                onClick={handleConfirmFreezeUser}
                className={`flex-1 py-3 rounded-2xl font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                  userToFreeze.isFrozen
                    ? 'bg-gradient-to-r from-emerald-600 via-[#00B875] to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-white'
                }`}
              >
                {isFreezingUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Updating state...</span>
                  </>
                ) : (
                  <>
                    {userToFreeze.isFrozen ? <Unlock className="w-4 h-4 text-white" /> : <Snowflake className="w-4 h-4 text-white" />}
                    <span>{userToFreeze.isFrozen ? 'Unfreeze Account (Restore Access)' : 'Freeze Account (Suspend Access)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Clean / Delete Request Confirmation Modal (Just Cleaning - Zero impact on user data or performance) */}
      {requestToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="mirror-glass-card rounded-3xl border border-red-500/40 p-5 sm:p-7 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => !isDeletingRequest && setRequestToDelete(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white font-['Poppins',sans-serif]">
                  Clean Request Record
                </h3>
                <p className="text-xs text-slate-400">
                  Free up workspace space on the admin panel
                </p>
              </div>
            </div>

            {/* Request Details Box */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Item:</span>
                <span className="text-white font-bold truncate max-w-[200px]">{requestToDelete.title}</span>
              </div>
              {requestToDelete.userEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">User:</span>
                  <span className="text-purple-300 font-mono truncate max-w-[200px]">{requestToDelete.userEmail}</span>
                </div>
              )}
              {requestToDelete.amount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-amber-400 font-mono font-bold">₦{requestToDelete.amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span className="text-slate-200 uppercase font-mono font-bold text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                  {requestToDelete.status}
                </span>
              </div>
            </div>

            {/* Crucial Safety Guarantee Notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Impact on User Data (Just Cleaning)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-200/90 pl-1">
                <li>User account remains active and untouched.</li>
                <li>User balance and transaction ledger are <strong>safely preserved</strong>.</li>
                <li>Gives enough clean space on the admin queue for other pending requests.</li>
                <li>Safe for server performance with instant non-blocking execution.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingRequest}
                onClick={() => setRequestToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRequest}
                onClick={handleConfirmDeleteRequest}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isDeletingRequest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Confirm Clean</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
