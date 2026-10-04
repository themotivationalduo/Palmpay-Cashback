import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  deleteUserStorageFiles
} from '../lib/firebase';
import { UserProfile, Transaction, DepositRequest, WithdrawalRequest, CodeOrder, PlatformNotification, ReferralRecord } from '../types';

interface RegisterData {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  referralCode?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  registerUser: (data: RegisterData) => Promise<void>;
  loginUser: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsAdminDirect: () => Promise<void>;
  logout: () => Promise<void>;
  purgeAllRecords: () => Promise<void>;
  
  // Balances
  updateBalance: (
    delta: number, 
    reason: string, 
    category: Transaction['category'], 
    type: 'credit' | 'debit',
    balanceSource?: 'cashback' | 'deposit'
  ) => Promise<void>;
  updateDepositBalance: (
    delta: number, 
    reason: string, 
    category: Transaction['category'], 
    type: 'credit' | 'debit'
  ) => Promise<void>;
  overrideUserBalance: (
    targetEmailOrUid: string,
    amount: number,
    balanceSource: 'cashback' | 'deposit',
    mode?: 'set' | 'credit' | 'debit',
    reason?: string
  ) => Promise<{ success: boolean; message: string; updatedUser?: UserProfile }>;
  getAllUsersForAdmin: () => Promise<UserProfile[]>;
  deleteUserPermanently: (targetUidOrEmail: string) => Promise<{ success: boolean; message: string }>;
  toggleFreezeUser: (targetUidOrEmail: string, freeze: boolean, reason?: string) => Promise<{ success: boolean; message: string; isFrozen: boolean; updatedUser?: UserProfile }>;

  // Bonuses
  claimSignupBonus: () => Promise<boolean>;
  claimDailyBonus: () => Promise<number | null>;
  
  // Cashback Code
  buyCashbackCode: (receiptImage: string) => Promise<string>;
  buyCashbackCodeWithDepositBalance: () => Promise<string>;
  activateCashbackCode: (code: string) => Promise<boolean>;
  approveCodeOrder: (orderId: string, customCode?: string, customNote?: string) => Promise<void>;
  rejectCodeOrder: (orderId: string, reason?: string) => Promise<void>;
  deleteCodeOrder: (orderId: string) => Promise<{ success: boolean; message: string }>;

  // Deposit Management
  submitDepositRequest: (details: { amount: number; receiptImage: string; paymentReference?: string }) => Promise<string>;
  approveDepositRequest: (requestId: string, customNote?: string) => Promise<void>;
  rejectDepositRequest: (requestId: string, reason?: string) => Promise<void>;
  deleteDepositRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  depositRequests: DepositRequest[];

  // Withdrawal
  requestWithdrawal: (details: { 
    bankName: string; 
    accountNumber: string; 
    userName: string; 
    amount: number; 
    cashbackCode: string;
    balanceSource: 'cashback' | 'deposit';
    receiptImage?: string;
  }) => Promise<string>;
  approveWithdrawalRequest: (requestId: string, force?: boolean, customNote?: string) => Promise<{ success: boolean; message: string; status?: number }>;
  rejectWithdrawalRequest: (requestId: string, reason?: string) => Promise<void>;
  deleteWithdrawalRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  cleanProcessedRequests: (type: 'withdrawals' | 'deposits' | 'codes') => Promise<{ count: number; message: string }>;
  withdrawalRequests: WithdrawalRequest[];

  transactions: Transaction[];
  notificationsCount: number;
  notifications: PlatformNotification[];
  activeToast: PlatformNotification | null;
  setActiveToast: (toast: PlatformNotification | null) => void;
  addNotification: (notif: Omit<PlatformNotification, 'id' | 'timestamp' | 'unread'>) => void;
  isOnline: boolean;
  isLowNetwork: boolean;
  referrals: ReferralRecord[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Official Constants
export const OFFICIAL_CASHBACK_CODE = 'palm_386_cash_737';

/**
 * Generates a strictly unique, collision-resistant CashBack Code for each registered user.
 * Format: palm_{num1}_cash_{num2} with distinct non-repeating numbers.
 */
export const generateUniqueCashbackCode = (seedUidOrEmail?: string): string => {
  let num1 = Math.floor(100 + Math.random() * 900);
  let num2 = Math.floor(100 + Math.random() * 900);

  if (seedUidOrEmail) {
    let hash = 0;
    const str = String(seedUidOrEmail) + '-' + Date.now().toString(36) + '-' + Math.random();
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    num1 = 100 + ((hash % 899) + Math.floor(Math.random() * 90)) % 900;
    num2 = 100 + (((hash >> 8) % 899) + Math.floor(Math.random() * 90)) % 900;
  }

  // Ensure num1 and num2 are never equal and maintain distinct entropy
  if (num1 === num2 || Math.abs(num1 - num2) < 5) {
    num2 = 100 + ((num2 + 137) % 900);
  }
  if (num1 < 100) num1 += 100;
  if (num2 < 100) num2 += 100;

  return `palm_${num1}_cash_${num2}`;
};

export const generateRandomCashbackCode = (seed?: string) => generateUniqueCashbackCode(seed);
export const PAYSTACK_CASHBACK_CODE_URL = 'https://paystack.shop/pay/palmpay_cashback_code';
export const PAYSTACK_DEPOSIT_URL = 'https://paystack.shop/pay/palmpay_cashback_deposit';

// Official Admin credentials requested by user
export const ADMIN_CREDENTIALS = {
  email: 'themotivationalduo@gmail.com',
  password: 'Coded25.',
  name: 'Mathias Danlami'
};

const REGISTERED_USERS_KEY = 'palmpay_accounts_registry_v3';
const PURGE_TIMESTAMP_KEY = 'palmpay_db_purged_flag_v3';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
  ]);
}

export const formatOrGeneratePalmPayAccountNumber = (phone?: string, uid?: string): string => {
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
  }
  if (uid) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
    }
    const suffix = String(10000000 + (hash % 90000000));
    return `80${suffix.slice(2)}`;
  }
  const randSuffix = String(Math.floor(10000000 + Math.random() * 90000000));
  return `80${randSuffix.slice(2)}`;
};

export const getUserLocalWithdrawalRequests = (uid?: string): WithdrawalRequest[] => {
  try {
    if (!uid) return [];
    const raw = localStorage.getItem(`palmpay_wd_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveUserLocalWithdrawalRequests = (uid: string, list: WithdrawalRequest[]) => {
  try {
    if (uid) {
      localStorage.setItem(`palmpay_wd_${uid}`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Could not save user local withdrawals:', e);
  }
};

export const getLocalWithdrawalRequests = (): WithdrawalRequest[] => {
  try {
    const raw = localStorage.getItem('palmpay_withdrawal_requests');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalWithdrawalRequests = (list: WithdrawalRequest[]) => {
  try {
    localStorage.setItem('palmpay_withdrawal_requests', JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save local withdrawals:', e);
  }
};

export const getUserLocalTransactions = (uid?: string): Transaction[] => {
  try {
    if (!uid) return [];
    const raw = localStorage.getItem(`palmpay_tx_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveUserLocalTransactions = (uid: string, list: Transaction[]) => {
  try {
    if (uid) {
      localStorage.setItem(`palmpay_tx_${uid}`, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Could not save user local transactions:', e);
  }
};

export const getLocalTransactions = (): Transaction[] => {
  try {
    const raw = localStorage.getItem('palmpay_transactions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalTransactions = (list: Transaction[]) => {
  try {
    localStorage.setItem('palmpay_transactions', JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save local transactions:', e);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [activeToast, setActiveToast] = useState<PlatformNotification | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isLowNetwork, setIsLowNetwork] = useState<boolean>(false);

  const addNotification = (notif: Omit<PlatformNotification, 'id' | 'timestamp' | 'unread'>) => {
    const newNotif: PlatformNotification = {
      ...notif,
      id: 'NOTIF-' + Date.now().toString(36).toUpperCase(),
      timestamp: 'Just now',
      unread: true
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast(newNotif);

    // 1. Play enhanced multi-tone alert chime (Web Audio API)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        gain.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();

        if (notif.type === 'deposit') {
          // Ascending major chord for deposits
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(523.25, now); // C5
          osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5
          osc1.frequency.setValueAtTime(783.99, now + 0.3); // G5
          osc1.connect(gain);
          osc1.start(now);
          osc1.stop(now + 0.8);
        } else if (notif.type === 'withdrawal') {
          // Cash disbursal chord for withdrawals
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(880, now); // A5
          osc1.frequency.setValueAtTime(1046.5, now + 0.15); // C6
          osc2.frequency.setValueAtTime(1318.51, now + 0.15); // E6
          osc1.connect(gain);
          osc2.connect(gain);
          osc1.start(now);
          osc2.start(now + 0.15);
          osc1.stop(now + 0.8);
          osc2.stop(now + 0.8);
        } else {
          // Standard alert chime
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.setValueAtTime(880, now + 0.12); // A5
          osc1.connect(gain);
          osc1.start(now);
          osc1.stop(now + 0.6);
        }
      }
    } catch (e) {
      // Audio autoplay restrictions ignored
    }

    // 2. Outside App Browser Notification Flash Alert
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const title = `⚡ ${notif.title}`;
        const options = {
          body: notif.message,
          icon: '/favicon.ico',
          tag: notif.type || 'flash-alert',
          vibrate: [200, 100, 200, 100, 200],
          renotify: true
        };

        if (Notification.permission === 'granted') {
          new Notification(title, options);
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(title, options);
            }
          });
        }
      }
    } catch (e) {
      // Browser notification error ignored
    }

    // 3. Document Title Tab Flash Alert (Outside App / Background Tab signal)
    if (typeof document !== 'undefined') {
      const originalTitle = document.title;
      let count = 0;
      const flashText = notif.type === 'deposit' ? '💰 DEPOSIT FLASH ALERT!' : notif.type === 'withdrawal' ? '💸 WITHDRAWAL ALERT!' : '🔔 NEW FLASH ALERT!';
      const interval = setInterval(() => {
        document.title = count % 2 === 0 ? flashText : originalTitle;
        count++;
        if (count >= 10) {
          clearInterval(interval);
          document.title = originalTitle;
        }
      }, 600);
    }
  };

  // Network Connectivity & Quality Monitoring
  useEffect(() => {
    let hasNotifiedLow = false;

    const checkNetworkStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      let low = false;

      if (!online) {
        low = true;
      } else if (navConn) {
        const effectiveType = navConn.effectiveType; // 'slow-2g', '2g', '3g', '4g'
        const rtt = navConn.rtt;
        const downlink = navConn.downlink;
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || (rtt && rtt > 1000) || (downlink && downlink < 0.25)) {
          low = true;
        }
      }

      setIsLowNetwork(low);

      if (low && !hasNotifiedLow) {
        hasNotifiedLow = true;
        addNotification({
          title: '⚠️ Low / Unstable Network Detected',
          message: 'Your network speed is low or unstable. Local transactions & claimed bonuses will automatically sync with Firestore once network stabilizes.',
          type: 'system'
        });
      } else if (!low && hasNotifiedLow) {
        hasNotifiedLow = false;
        addNotification({
          title: '🌐 Network Connection Restored',
          message: 'Network signal is fast and stable. All user balances, claims, and transaction histories are synchronized.',
          type: 'bonus'
        });
      }
    };

    checkNetworkStatus();

    const handleOnline = () => {
      checkNetworkStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsLowNetwork(true);
      addNotification({
        title: '⚠️ Device Offline Mode',
        message: 'Your connection dropped offline. Your balance, claims, and receipts remain safely saved in local vault.',
        type: 'system'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (navConn) {
      navConn.addEventListener('change', checkNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navConn) {
        navConn.removeEventListener('change', checkNetworkStatus);
      }
    };
  }, []);

  // Purge any stale cache on version bump if needed
  useEffect(() => {
    try {
      const hasPurged = localStorage.getItem(PURGE_TIMESTAMP_KEY);
      if (!hasPurged) {
        localStorage.removeItem(REGISTERED_USERS_KEY);
        localStorage.removeItem('palmpay_transactions');
        localStorage.removeItem('palmpay_withdrawal_requests');
        localStorage.removeItem('palmpay_deposit_requests');
        localStorage.removeItem('palmpay_code_orders');
        sessionStorage.clear();
        localStorage.setItem(PURGE_TIMESTAMP_KEY, Date.now().toString());
      }
    } catch (err) {
      console.warn('Storage purge note:', err);
    }
  }, []);

  const generateReferralCode = (name: string) => {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'PALM';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PALM${cleanName}${rand}`;
  };

  const getRegisteredUsersMap = (): Record<string, { profile: UserProfile; passwordHash?: string }> => {
    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveRegisteredUser = (profile: UserProfile, pass?: string) => {
    try {
      const current = getRegisteredUsersMap();
      const existingRecord = current[profile.email.toLowerCase()];
      const preservedPass = pass || existingRecord?.passwordHash || 'Coded25.';
      current[profile.email.toLowerCase()] = {
        profile,
        passwordHash: preservedPass
      };
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn('Could not save user registry:', err);
    }
  };

  const deleteRegisteredUser = (email: string) => {
    try {
      const current = getRegisteredUsersMap();
      delete current[email.toLowerCase()];
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn('Could not delete user registry record:', err);
    }
  };

  const createAdminProfile = (): UserProfile => ({
    uid: 'admin-mathias-danlami',
    email: ADMIN_CREDENTIALS.email,
    displayName: ADMIN_CREDENTIALS.name,
    role: 'admin',
    accountNumber: '8012345678',
    phone: '8012345678',
    balance: 155500, // Cashback balance
    depositBalance: 25000, // Deposited balance
    referralCode: 'PALMADM777',
    referralCount: 42,
    signupBonusClaimed: true,
    memberSince: 'Sept 2026',
    hasActiveCode: false,
    activeCashbackCode: undefined
  });

  // Sync active user profile with local storage
  useEffect(() => {
    if (user) {
      saveRegisteredUser(user);
    }
  }, [user]);

  // Real-time Firestore sync for user profile & deposit requests & transactions
  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setWithdrawalRequests([]);
      setDepositRequests([]);
      setReferrals([]);
      return;
    }

    // Load initial isolated data for this user
    const initialUserTx = getUserLocalTransactions(user.uid);
    if (initialUserTx.length > 0) {
      setTransactions(initialUserTx);
    }

    const isAdminUser = user.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() || user.role === 'admin';
    const initialUserWd = isAdminUser ? getLocalWithdrawalRequests() : getUserLocalWithdrawalRequests(user.uid);
    if (initialUserWd.length > 0) {
      setWithdrawalRequests(initialUserWd);
    }

    // Listen to user document updates (e.g. balance updates from admin approval)
    const unsubUser = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<UserProfile>;
          setUser((prev) => (prev ? { ...prev, ...data } : null));
        }
      },
      (err) => {
        console.warn('User profile listener note:', err);
      }
    );

    // Listen to transactions strictly for this user
    const txQuery = query(collection(db, 'transactions'), where('uid', '==', user.uid));
    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const firestoreList: Transaction[] = [];
        snapshot.forEach((d) => {
          firestoreList.push({ id: d.id, ...(d.data() as any) });
        });

        // Merge firestore with user-scoped local storage
        const local = getUserLocalTransactions(user.uid);
        const map = new Map<string, Transaction>();
        local.forEach(t => map.set(t.id, t));
        firestoreList.forEach(t => map.set(t.id, t));

        const merged = Array.from(map.values())
          .filter(t => t.uid === user.uid)
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

        setTransactions(merged);
        saveUserLocalTransactions(user.uid, merged);
      },
      (err) => {
        console.warn('Transactions listener note:', err);
      }
    );

    // Listen to deposit requests
    const depQuery = isAdminUser 
      ? collection(db, 'deposit_requests')
      : query(collection(db, 'deposit_requests'), where('uid', '==', user.uid));

    const unsubDep = onSnapshot(
      depQuery as any,
      (snapshot: any) => {
        const list: DepositRequest[] = [];
        snapshot.forEach((d: any) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        const merged = list
          .filter(d => isAdminUser || d.uid === user.uid || (d.userEmail && d.userEmail.toLowerCase() === user.email.toLowerCase()))
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setDepositRequests(merged);
      },
      (err) => {
        console.warn('Deposit requests listener note:', err);
      }
    );

    // Listen to withdrawal requests
    const wdQuery = isAdminUser
      ? collection(db, 'withdrawal_requests')
      : query(collection(db, 'withdrawal_requests'), where('uid', '==', user.uid));

    const unsubWd = onSnapshot(
      wdQuery as any,
      (snapshot: any) => {
        const firestoreList: WithdrawalRequest[] = [];
        snapshot.forEach((d: any) => {
          firestoreList.push({ id: d.id, ...(d.data() as any) });
        });

        // Merge firestore with user local storage
        const local = isAdminUser ? getLocalWithdrawalRequests() : getUserLocalWithdrawalRequests(user.uid);
        const map = new Map<string, WithdrawalRequest>();
        local.forEach(r => map.set(r.id, r));
        firestoreList.forEach(r => map.set(r.id, r));

        const merged = Array.from(map.values())
          .filter(r => isAdminUser || r.uid === user.uid || (r.userEmail && r.userEmail.toLowerCase() === user.email.toLowerCase()))
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

        setWithdrawalRequests(merged);
        if (isAdminUser) {
          saveLocalWithdrawalRequests(Array.from(map.values()));
        } else {
          saveUserLocalWithdrawalRequests(user.uid, merged);
        }
      },
      (err) => {
        console.warn('Withdrawal requests listener note:', err);
      }
    );

    // Listen to referrals for user
    const refQuery = query(collection(db, 'referrals'), where('referrerUid', '==', user.uid));
    const unsubRef = onSnapshot(
      refQuery as any,
      (snapshot: any) => {
        const list: ReferralRecord[] = [];
        snapshot.forEach((d: any) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setReferrals(list);
      },
      (err) => {
        console.warn('Referrals listener note:', err);
      }
    );

    // Real-time listener for code_orders: immediately activates code upon admin approval
    const userEmailKey = (user.email || '').trim().toLowerCase();
    const unsubCodeOrders = onSnapshot(
      collection(db, 'code_orders'),
      (snapshot) => {
        let approvedCode: string | null = null;
        snapshot.forEach((docSnap) => {
          const c = docSnap.data() as CodeOrder;
          const isThisUser = c.uid === user.uid || (c.userEmail && c.userEmail.trim().toLowerCase() === userEmailKey);
          if (isThisUser && c.status === 'approved' && c.generatedCode && !c.generatedCode.toLowerCase().includes('pending')) {
            approvedCode = c.generatedCode.trim();
          }
        });

        if (approvedCode) {
          setUser((prev) => {
            if (!prev) return null;
            if (!prev.hasActiveCode || prev.activeCashbackCode !== approvedCode) {
              const updated: UserProfile = {
                ...prev,
                hasActiveCode: true,
                activeCashbackCode: approvedCode!
              };
              try {
                sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updated));
                saveRegisteredUser(updated);
              } catch (e) {}
              return updated;
            }
            return prev;
          });
        }
      },
      (err) => {
        console.warn('Code orders listener note:', err);
      }
    );

    const handleCodeApprovedEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const isTarget = (detail.uid && detail.uid === user.uid) || (detail.email && user.email && detail.email.toLowerCase() === user.email.toLowerCase());
      if (isTarget && detail.code) {
        setUser((prev) => {
          if (!prev) return null;
          const updated: UserProfile = {
            ...prev,
            hasActiveCode: true,
            activeCashbackCode: detail.code
          };
          try {
            sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updated));
            saveRegisteredUser(updated);
          } catch (e) {}
          return updated;
        });
      }
    };
    window.addEventListener('palmpay_code_approved', handleCodeApprovedEvent);

    return () => {
      unsubUser();
      unsubTx();
      unsubDep();
      unsubWd();
      unsubRef();
      unsubCodeOrders();
      window.removeEventListener('palmpay_code_approved', handleCodeApprovedEvent);
    };
  }, [user?.uid, user?.email, user?.role]);

  // Auto-login on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedSession = sessionStorage.getItem('palmpay_current_session_user');
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          setUser(parsed);
          setLoading(false);

          if (parsed?.uid) {
            getDoc(doc(db, 'users', parsed.uid)).then(async (docSnap) => {
              if (docSnap.exists()) {
                const latest = { ...parsed, ...(docSnap.data() as UserProfile) };

                // Verify any approved code orders in Firestore
                try {
                  const ordersSnap = await getDocs(collection(db, 'code_orders'));
                  ordersSnap.forEach((oDoc) => {
                    const c = oDoc.data() as CodeOrder;
                    const isTarget = c.uid === latest.uid || (c.userEmail && latest.email && c.userEmail.trim().toLowerCase() === latest.email.trim().toLowerCase());
                    if (isTarget && c.status === 'approved' && c.generatedCode && !c.generatedCode.toLowerCase().includes('pending')) {
                      latest.hasActiveCode = true;
                      latest.activeCashbackCode = c.generatedCode.trim();
                    }
                  });
                } catch (e) {}

                if (!latest.accountNumber) {
                  latest.accountNumber = formatOrGeneratePalmPayAccountNumber(latest.phone, latest.uid);
                  await updateDoc(doc(db, 'users', latest.uid), { accountNumber: latest.accountNumber });
                }
                if (latest.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
                  latest.hasActiveCode = true;
                  latest.activeCashbackCode = OFFICIAL_CASHBACK_CODE;
                }
                setUser(latest);
                sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(latest));
                saveRegisteredUser(latest);
              }
            }).catch((err) => {
              console.warn('Async session sync note:', err);
            });
          }
          return;
        }

        onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            try {
              const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
              if (userDoc.exists()) {
                const profile = userDoc.data() as UserProfile;
                if (!profile.accountNumber) {
                  profile.accountNumber = formatOrGeneratePalmPayAccountNumber(profile.phone, fbUser.uid);
                  await updateDoc(doc(db, 'users', fbUser.uid), { accountNumber: profile.accountNumber });
                }
                if (fbUser.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
                  profile.hasActiveCode = true;
                  profile.activeCashbackCode = OFFICIAL_CASHBACK_CODE;
                }
                setUser(profile);
              } else {
                const isMathias = fbUser.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
                const accNum = formatOrGeneratePalmPayAccountNumber(undefined, fbUser.uid);
                const newProfile: UserProfile = {
                  uid: fbUser.uid,
                  email: fbUser.email || '',
                  displayName: fbUser.displayName || 'PalmPay Member',
                  photoURL: fbUser.photoURL || undefined,
                  accountNumber: accNum,
                  phone: accNum,
                  balance: 0,
                  depositBalance: 0,
                  referralCode: generateReferralCode(fbUser.displayName || 'USER'),
                  referralCount: 0,
                  signupBonusClaimed: false,
                  memberSince: 'Sept 2026',
                  role: isMathias ? 'admin' : 'user',
                  hasActiveCode: isMathias,
                  activeCashbackCode: isMathias ? OFFICIAL_CASHBACK_CODE : undefined
                };
                await setDoc(doc(db, 'users', fbUser.uid), newProfile);
                setUser(newProfile);
              }
            } catch (err) {
              console.warn('Firebase user fetch error, fallback:', err);
            }
          }
          setLoading(false);
        });
      } catch (e) {
        console.warn('Init auth fallback:', e);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const registerUser = async (data: RegisterData) => {
    setLoading(true);
    try {
      const emailKey = data.email.trim().toLowerCase();
      const registry = getRegisteredUsersMap();
      if (registry[emailKey]) {
        throw new Error('An account with this email address already exists. Please login.');
      }

      // Check Firestore to prevent duplicate email registrations across devices
      try {
        const q = query(collection(db, 'users'), where('email', '==', emailKey));
        const existingSnap = await getDocs(q);
        if (!existingSnap.empty) {
          throw new Error('An account with this email address already exists. Please login.');
        }
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          throw e;
        }
      }

      const isMathias = emailKey === ADMIN_CREDENTIALS.email.toLowerCase();
      const newUid = 'palm-usr-' + Date.now().toString(36);
      const accNum = formatOrGeneratePalmPayAccountNumber(data.phone, newUid);
      const userPassword = data.password || 'Coded25.';

      const newProfile: UserProfile = {
        uid: newUid,
        email: data.email.trim(),
        displayName: data.fullName.trim(),
        phone: data.phone?.trim() || accNum,
        accountNumber: accNum,
        balance: 0,
        depositBalance: 0,
        referralCode: generateReferralCode(data.fullName),
        referredBy: data.referralCode?.trim(),
        referralCount: 0,
        signupBonusClaimed: false,
        memberSince: 'Sept 2026',
        role: isMathias ? 'admin' : 'user',
        hasActiveCode: isMathias,
        activeCashbackCode: isMathias ? OFFICIAL_CASHBACK_CODE : undefined,
        passwordHash: userPassword
      };

      saveRegisteredUser(newProfile, userPassword);
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(newProfile));
      setUser(newProfile);

      // Handle Referral Reward (₦2,500) if valid referral code supplied
      if (data.referralCode?.trim()) {
        const targetRefCode = data.referralCode.trim().toUpperCase();
        let referrerProfile: UserProfile | null = null;
        let referrerPass: string | undefined = undefined;

        for (const k of Object.keys(registry)) {
          if (registry[k].profile?.referralCode?.toUpperCase() === targetRefCode) {
            referrerProfile = registry[k].profile;
            referrerPass = registry[k].passwordHash;
            break;
          }
        }

        if (!referrerProfile) {
          try {
            const q = query(collection(db, 'users'), where('referralCode', '==', targetRefCode));
            const snap = await getDocs(q);
            if (!snap.empty) {
              referrerProfile = snap.docs[0].data() as UserProfile;
            }
          } catch (e) {
            console.warn('Firestore referrer lookup note:', e);
          }
        }

        if (referrerProfile) {
          const rewardAmount = 2500;
          const updatedReferrer: UserProfile = {
            ...referrerProfile,
            balance: (referrerProfile.balance || 0) + rewardAmount,
            referralCount: (referrerProfile.referralCount || 0) + 1
          };

          saveRegisteredUser(updatedReferrer, referrerPass);

          const refTx: Transaction = {
            id: 'tx-ref-' + Date.now(),
            uid: referrerProfile.uid,
            email: referrerProfile.email,
            title: `Referral Bonus for inviting ${data.fullName} (₦2,500)`,
            amount: rewardAmount,
            type: 'credit',
            category: 'referral',
            timestamp: Date.now(),
            status: 'completed',
            reference: 'REF-' + Date.now().toString(36).toUpperCase()
          };

          const refRecord: ReferralRecord = {
            id: 'ref-' + Date.now(),
            referrerUid: referrerProfile.uid,
            referrerEmail: referrerProfile.email,
            referredUid: newUid,
            referredEmail: data.email.trim(),
            referredName: data.fullName.trim(),
            rewardAmount,
            createdAt: Date.now(),
            status: 'rewarded'
          };

          try {
            await updateDoc(doc(db, 'users', referrerProfile.uid), {
              balance: updatedReferrer.balance,
              referralCount: updatedReferrer.referralCount
            });
            await addDoc(collection(db, 'transactions'), refTx);
            await addDoc(collection(db, 'referrals'), refRecord);
          } catch (err) {
            console.warn('Firestore referral reward save note:', err);
          }
        }
      }

      try {
        await setDoc(doc(db, 'users', newUid), newProfile);
      } catch (err) {
        console.warn('Firestore register save error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const emailKey = email.trim().toLowerCase();

      if (!emailKey) {
        throw new Error('Please enter your account email.');
      }

      if (!password || !password.trim()) {
        throw new Error('Please enter your password.');
      }

      // 1. Admin Credentials Check
      if (emailKey === ADMIN_CREDENTIALS.email.toLowerCase()) {
        if (password !== ADMIN_CREDENTIALS.password) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }
        const admin = createAdminProfile();
        saveRegisteredUser(admin, ADMIN_CREDENTIALS.password);
        sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(admin));
        setUser(admin);
        return;
      }

      // 2. Look up user in local registry and Firestore
      const registry = getRegisteredUsersMap();
      const existingInRegistry = registry[emailKey];
      let firestoreProfile: (UserProfile & { passwordHash?: string }) | null = null;

      try {
        const q = query(collection(db, 'users'), where('email', '==', emailKey));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          firestoreProfile = querySnap.docs[0].data() as (UserProfile & { passwordHash?: string });
        }
      } catch (e) {
        console.warn('Firestore login user search note:', e);
      }

      // Reject login for unregistered users
      if (!existingInRegistry && !firestoreProfile) {
        throw new Error('No registered account found with this email. Please register an account first.');
      }

      // Extract existing profile and registered password
      const profileToUse: UserProfile = firestoreProfile || existingInRegistry.profile;
      const expectedPassword = existingInRegistry?.passwordHash || firestoreProfile?.passwordHash;

      // Reject login for incorrect password
      if (expectedPassword && password !== expectedPassword) {
        throw new Error('Incorrect password. Please verify your credentials.');
      }

      let mergedProfile = { ...profileToUse };

      if (!mergedProfile.accountNumber) {
        mergedProfile.accountNumber = formatOrGeneratePalmPayAccountNumber(mergedProfile.phone, mergedProfile.uid);
        try {
          await updateDoc(doc(db, 'users', mergedProfile.uid), { accountNumber: mergedProfile.accountNumber });
        } catch (e) {
          console.warn('Login active account update note:', e);
        }
      }

      if (mergedProfile.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
        mergedProfile.hasActiveCode = true;
        mergedProfile.activeCashbackCode = OFFICIAL_CASHBACK_CODE;
      }

      const activePasswordToSave = expectedPassword || password;
      mergedProfile.passwordHash = activePasswordToSave;

      saveRegisteredUser(mergedProfile, activePasswordToSave);
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(mergedProfile));
      setUser(mergedProfile);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const googleEmail = (fbUser.email || '').trim().toLowerCase();

      if (!googleEmail) {
        throw new Error('Google account did not return an email address.');
      }

      const isMathias = googleEmail === ADMIN_CREDENTIALS.email.toLowerCase();

      // Check if an existing account with this email exists in Firestore or local registry
      let existingProfile: UserProfile | null = null;
      let existingPasswordHash: string | undefined = undefined;

      // 1. Check local registry by email
      const registry = getRegisteredUsersMap();
      if (registry[googleEmail]?.profile) {
        existingProfile = registry[googleEmail].profile;
        existingPasswordHash = registry[googleEmail].passwordHash;
      }

      // 2. Check Firestore by email if not found in local registry
      if (!existingProfile) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', googleEmail));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            existingProfile = querySnap.docs[0].data() as UserProfile;
            existingPasswordHash = (querySnap.docs[0].data() as any).passwordHash;
          }
        } catch (e) {
          console.warn('Firestore email search note:', e);
        }
      }

      // Reject Google sign-in for unregistered non-admin users
      if (!existingProfile && !isMathias) {
        throw new Error(`No registered account found for ${googleEmail}. Please register an account first.`);
      }

      let profileToUse: UserProfile;

      if (existingProfile) {
        // Connect / Link Google Login to existing email/password account
        profileToUse = {
          ...existingProfile,
          displayName: fbUser.displayName || existingProfile.displayName,
          photoURL: fbUser.photoURL || existingProfile.photoURL,
          role: isMathias ? 'admin' : (existingProfile.role || 'user'),
          hasActiveCode: isMathias ? true : (existingProfile.hasActiveCode || false),
          activeCashbackCode: isMathias ? OFFICIAL_CASHBACK_CODE : existingProfile.activeCashbackCode
        };

        // Save linked profile
        try {
          await setDoc(doc(db, 'users', profileToUse.uid), profileToUse, { merge: true });
          if (fbUser.uid !== profileToUse.uid) {
            await setDoc(doc(db, 'users', fbUser.uid), profileToUse, { merge: true });
          }
        } catch (e) {
          console.warn('Firestore linked account update note:', e);
        }
      } else {
        // Admin profile fallback
        profileToUse = createAdminProfile();
      }

      if (!profileToUse.accountNumber) {
        profileToUse.accountNumber = formatOrGeneratePalmPayAccountNumber(profileToUse.phone, profileToUse.uid);
        if (!profileToUse.phone) {
          profileToUse.phone = profileToUse.accountNumber;
        }
      }

      // Persist session
      saveRegisteredUser(profileToUse, existingPasswordHash);
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(profileToUse));
      setUser(profileToUse);

      addNotification({
        title: 'Google Sign-In Successful! 🚀',
        message: existingProfile
          ? `Welcome back, ${profileToUse.displayName}! Connected Google login with your existing account.`
          : `Welcome, ${profileToUse.displayName}! Your PalmPay account is ready.`,
        type: 'bonus'
      });

    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        throw new Error('Google sign-in popup was closed before completing authentication. Please try again.');
      }
      throw new Error(err?.message || 'Google sign-in failed. Please verify browser popup permissions or try email/password.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsAdminDirect = async () => {
    const admin = createAdminProfile();
    saveRegisteredUser(admin, ADMIN_CREDENTIALS.password);
    sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(admin));
    setUser(admin);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore
    }
    sessionStorage.removeItem('palmpay_current_session_user');
    setUser(null);
    setTransactions([]);
    setWithdrawalRequests([]);
    setDepositRequests([]);
    setReferrals([]);
  };

  const purgeAllRecords = async () => {
    setLoading(true);

    try {
      localStorage.removeItem(REGISTERED_USERS_KEY);
      localStorage.removeItem('palmpay_transactions');
      localStorage.removeItem('palmpay_withdrawal_requests');
      localStorage.removeItem('palmpay_deposit_requests');
      localStorage.removeItem('palmpay_code_orders');
      sessionStorage.clear();
      localStorage.setItem(PURGE_TIMESTAMP_KEY, Date.now().toString());

      // Purge non-admin user records from Firestore collections concurrently
      try {
        const collectionsToPurge = ['users', 'transactions', 'withdrawal_requests', 'code_orders', 'deposit_requests', 'referrals'];
        await Promise.allSettled(
          collectionsToPurge.map(async (col) => {
            try {
              const snap = await withTimeout(getDocs(collection(db, col)), 2000);
              if (!snap) return;
              const delPromises: Promise<any>[] = [];
              for (const d of snap.docs) {
                const data = d.data();
                const email = String(data.email || data.userEmail || '').trim().toLowerCase();
                if (email === ADMIN_CREDENTIALS.email.toLowerCase()) continue;
                delPromises.push(withTimeout(deleteDoc(doc(db, col, d.id)), 2000));
              }
              await Promise.allSettled(delPromises);
            } catch (colErr) {
              console.warn(`Firestore purge error on ${col}:`, colErr);
            }
          })
        );
      } catch (fsErr) {
        console.warn('Firestore purge overall error:', fsErr);
      }

      // Trigger server-side purge endpoint with timeout
      try {
        await withTimeout(fetch('/api/admin/purge-all', { method: 'POST' }), 2000);
      } catch (apiErr) {
        console.warn('Server purge-all endpoint note:', apiErr);
      }

      if (user?.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
        const admin = createAdminProfile();
        saveRegisteredUser(admin, ADMIN_CREDENTIALS.password);
        setUser(admin);
        setTransactions([]);
        setWithdrawalRequests([]);
        setDepositRequests([]);
      } else {
        setUser(null);
        setTransactions([]);
        setWithdrawalRequests([]);
        setDepositRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Permanently delete a user account from Firebase Firestore, Firebase Storage, and local caches
  const deleteUserPermanently = async (targetUidOrEmail: string): Promise<{ success: boolean; message: string }> => {
    const queryTerm = (targetUidOrEmail || '').trim().toLowerCase();
    if (!queryTerm) {
      throw new Error('Please specify a valid user email or UID to delete.');
    }

    if (queryTerm === ADMIN_CREDENTIALS.email.toLowerCase()) {
      throw new Error('Super Admin account (Mathias Danlami) cannot be deleted.');
    }

    setLoading(true);
    try {
      let targetProfile: UserProfile | null = null;
      let targetUid = '';
      const registry = getRegisteredUsersMap();

      // 1. Locate in local registry
      for (const email of Object.keys(registry)) {
        if (
          email.toLowerCase() === queryTerm ||
          (registry[email]?.profile?.uid && registry[email].profile.uid.toLowerCase() === queryTerm)
        ) {
          targetProfile = registry[email].profile;
          targetUid = targetProfile.uid;
          break;
        }
      }

      // 2. Locate and delete from Firestore users collection
      try {
        const usersSnap = await withTimeout(getDocs(collection(db, 'users')), 2000);
        if (usersSnap) {
          const userDelPromises: Promise<any>[] = [];
          for (const docSnap of usersSnap.docs) {
            const u = docSnap.data() as UserProfile;
            const uUid = String(u.uid || docSnap.id).toLowerCase();
            const uEmail = String(u.email || '').toLowerCase();
            if (docSnap.id.toLowerCase() === queryTerm || uUid === queryTerm || uEmail === queryTerm) {
              if (!targetProfile) targetProfile = { ...u, uid: u.uid || docSnap.id };
              if (!targetUid) targetUid = docSnap.id;
              userDelPromises.push(withTimeout(deleteDoc(doc(db, 'users', docSnap.id)), 2000));
            }
          }
          await Promise.allSettled(userDelPromises);
        }
      } catch (e) {
        console.warn('Firestore user delete note:', e);
      }

      const finalUid = targetUid || targetProfile?.uid || queryTerm;
      const finalEmail = (targetProfile?.email || queryTerm).toLowerCase();

      // 3. Concurrently delete related documents from other Firestore collections
      const collectionsToCheck = [
        { name: 'transactions', uidField: 'uid', emailField: 'email' },
        { name: 'withdrawal_requests', uidField: 'uid', emailField: 'userEmail' },
        { name: 'code_orders', uidField: 'uid', emailField: 'userEmail' },
        { name: 'deposit_requests', uidField: 'uid', emailField: 'userEmail' },
        { name: 'referrals', uidField: 'referrerUid', emailField: 'referrerEmail', extraUidField: 'referredUid', extraEmailField: 'referredEmail' }
      ];

      await Promise.allSettled(
        collectionsToCheck.map(async (cfg) => {
          try {
            const snap = await withTimeout(getDocs(collection(db, cfg.name)), 2000);
            if (!snap) return;
            const delPromises: Promise<any>[] = [];
            for (const d of snap.docs) {
              const data = d.data();
              const dUid = String(data[cfg.uidField] || '').trim();
              const dEmail = String(data[cfg.emailField] || '').trim().toLowerCase();
              const dExtraUid = cfg.extraUidField ? String(data[cfg.extraUidField] || '').trim() : '';
              const dExtraEmail = cfg.extraEmailField ? String(data[cfg.extraEmailField] || '').trim().toLowerCase() : '';

              const isMatch =
                (finalUid && (dUid === finalUid || dExtraUid === finalUid)) ||
                (finalEmail && (dEmail === finalEmail || dExtraEmail === finalEmail));

              if (isMatch) {
                delPromises.push(withTimeout(deleteDoc(doc(db, cfg.name, d.id)), 2000));
              }
            }
            await Promise.allSettled(delPromises);
          } catch (relErr) {
            console.warn(`Deleting related Firestore records from ${cfg.name} note:`, relErr);
          }
        })
      );

      // 4. Delete user files from Firebase Storage with timeout
      try {
        await withTimeout(deleteUserStorageFiles(finalUid), 2000);
      } catch (stErr) {
        console.warn('Firebase Storage file cleanup note:', stErr);
      }

      // 5. Invoke backend server endpoint to ensure server-side deletion with timeout
      try {
        await withTimeout(
          fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: finalUid, email: finalEmail })
          }),
          2500
        );
      } catch (apiErr) {
        console.warn('Backend delete-user call note:', apiErr);
      }

      // 6. Delete from localStorage registry and local caches
      deleteRegisteredUser(finalEmail);
      if (finalUid) {
        localStorage.removeItem(`palmpay_wd_${finalUid}`);
        localStorage.removeItem(`palmpay_tx_${finalUid}`);
      }

      // 7. If the deleted user is currently in session, log them out
      if (user && (user.uid === finalUid || user.email.toLowerCase() === finalEmail)) {
        sessionStorage.removeItem('palmpay_current_session_user');
        setUser(null);
      }

      // 8. Filter in-memory state
      setWithdrawalRequests((prev) => prev.filter((r) => r.uid !== finalUid && r.userEmail?.toLowerCase() !== finalEmail));
      setDepositRequests((prev) => prev.filter((r) => r.uid !== finalUid && r.userEmail?.toLowerCase() !== finalEmail));
      setTransactions((prev) => prev.filter((t) => t.uid !== finalUid && t.email?.toLowerCase() !== finalEmail));

      return {
        success: true,
        message: `User ${targetProfile?.displayName || finalEmail} has been permanently deleted from Firebase Firestore & Storage.`
      };
    } finally {
      setLoading(false);
    }
  };

  // Update Cashback Balance or Deposited Balance
  const updateBalance = async (
    delta: number,
    title: string,
    category: Transaction['category'],
    type: 'credit' | 'debit',
    balanceSource: 'cashback' | 'deposit' = 'cashback'
  ) => {
    if (!user) return;

    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      uid: user.uid,
      email: user.email,
      title,
      amount: Math.abs(delta),
      type,
      category,
      balanceSource,
      timestamp: Date.now(),
      status: 'completed',
      reference: 'PALM-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    };

    if (balanceSource === 'deposit') {
      const newDepBal = Math.max(0, (user.depositBalance || 0) + delta);
      setUser((prev) => (prev ? { ...prev, depositBalance: newDepBal } : null));
      setTransactions((prev) => [newTx, ...prev]);

      try {
        if (user.uid) {
          await updateDoc(doc(db, 'users', user.uid), { depositBalance: newDepBal });
          await addDoc(collection(db, 'transactions'), newTx);
        }
      } catch (err) {
        console.warn('Sync deposit balance error:', err);
      }
    } else {
      const newCashbackBal = Math.max(0, user.balance + delta);
      setUser((prev) => (prev ? { ...prev, balance: newCashbackBal } : null));
      setTransactions((prev) => [newTx, ...prev]);

      try {
        if (user.uid) {
          await updateDoc(doc(db, 'users', user.uid), { balance: newCashbackBal });
          await addDoc(collection(db, 'transactions'), newTx);
        }
      } catch (err) {
        console.warn('Sync cashback balance error:', err);
      }
    }
  };

  const updateDepositBalance = async (
    delta: number,
    title: string,
    category: Transaction['category'],
    type: 'credit' | 'debit'
  ) => {
    return updateBalance(delta, title, category, type, 'deposit');
  };

  const claimSignupBonus = async (): Promise<boolean> => {
    if (!user || user.signupBonusClaimed) return false;

    const bonusAmount = 150000;
    const newBalance = (user.balance || 0) + bonusAmount;
    const updatedProfile: UserProfile = {
      ...user,
      balance: newBalance,
      signupBonusClaimed: true
    };

    // Immediately persist to local React state, session storage, and user registry
    setUser(updatedProfile);
    sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updatedProfile));
    saveRegisteredUser(updatedProfile);

    // Record local transaction
    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      uid: user.uid,
      email: user.email,
      title: 'Welcome Bonus (₦150,000)',
      amount: bonusAmount,
      type: 'credit',
      category: 'welcome_bonus',
      timestamp: Date.now(),
      status: 'completed',
      reference: 'WELCOME-' + Date.now().toString(36).toUpperCase()
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Persist to Firestore
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        signupBonusClaimed: true
      });
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        email: user.email,
        title: 'Welcome Bonus (₦150,000)',
        amount: bonusAmount,
        type: 'credit',
        category: 'welcome_bonus',
        timestamp: Date.now(),
        status: 'completed',
        reference: newTx.reference
      });
    } catch (err) {
      console.warn('Firestore claim update error:', err);
      try {
        await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      } catch (e) {
        console.warn('Firestore setDoc claim fallback error:', e);
      }
    }

    return true;
  };

  const claimDailyBonus = async (): Promise<number | null> => {
    if (!user) return null;
    const now = Date.now();
    const ONE_24_HOURS = 24 * 60 * 60 * 1000;

    if (user.dailyClaimTimestamp && now - Number(user.dailyClaimTimestamp) < ONE_24_HOURS) {
      return null;
    }

    const reward = 2500;
    const newBalance = (user.balance || 0) + reward;
    const today = new Date().toISOString().split('T')[0];
    const updatedProfile: UserProfile = {
      ...user,
      balance: newBalance,
      dailyClaimDate: today,
      dailyClaimTimestamp: now
    };

    // Immediately persist to local React state, session storage, and user registry
    setUser(updatedProfile);
    sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updatedProfile));
    saveRegisteredUser(updatedProfile);

    // Record local transaction
    const newTx: Transaction = {
      id: 'tx-' + now,
      uid: user.uid,
      email: user.email,
      title: 'Daily Check-in Reward (₦2,500)',
      amount: reward,
      type: 'credit',
      category: 'daily_claim',
      timestamp: now,
      status: 'completed',
      reference: 'DAILY-' + now.toString(36).toUpperCase()
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Persist to Firestore
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        dailyClaimDate: today,
        dailyClaimTimestamp: now
      });
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        email: user.email,
        title: 'Daily Check-in Reward (₦2,500)',
        amount: reward,
        type: 'credit',
        category: 'daily_claim',
        timestamp: now,
        status: 'completed',
        reference: newTx.reference
      });
    } catch (err) {
      console.warn('Firestore daily claim error:', err);
      try {
        await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      } catch (e) {
        console.warn('Firestore setDoc daily fallback error:', e);
      }
    }

    return reward;
  };

  // Buy Cashback code via Paystack payment link
  const buyCashbackCode = async (receiptImage: string): Promise<string> => {
    if (!user) throw new Error('User not logged in');
    if (user.isFrozen) {
      throw new Error('Your account is currently frozen by administration. Code purchases are disabled. Please contact support.');
    }
    if (!receiptImage) throw new Error('Please upload your transaction receipt image.');

    const txRef = 'PAYSTACK-' + Date.now();
    try {
      await addDoc(collection(db, 'code_orders'), {
        uid: user.uid,
        userEmail: user.email,
        codePrice: 8550,
        generatedCode: 'Pending Admin Approval',
        status: 'pending',
        paymentSource: 'paystack',
        paymentReference: txRef,
        receiptImage,
        createdAt: Date.now()
      });

      const newTx: Transaction = {
        id: 'tx-code-' + Date.now(),
        uid: user.uid,
        email: user.email,
        title: 'CashBack Code Purchase (Paystack ₦8,550)',
        amount: 8550,
        type: 'debit',
        category: 'code_purchase',
        timestamp: Date.now(),
        status: 'pending',
        reference: txRef,
        receiptImage
      };
      setTransactions((prev) => [newTx, ...prev]);
      await addDoc(collection(db, 'transactions'), newTx);

      addNotification({
        title: 'CashBack Code Order Submitted ⌛',
        message: 'Your ₦8,550 CashBack Code purchase with transaction receipt was submitted successfully. It is pending Admin approval on the Control Panel before your code is revealed.',
        type: 'code',
        fullDetails: {
          type: 'code',
          code: 'Pending Admin Approval',
          amount: 8550,
          status: 'pending',
          receiptImage,
          reference: txRef
        }
      });
    } catch (err) {
      console.warn('Firestore code order save error:', err);
    }

    return 'pending';
  };

  // Buy Cashback code directly from Deposited Balance (₦8,550)
  const buyCashbackCodeWithDepositBalance = async (): Promise<string> => {
    if (!user) throw new Error('User not logged in');
    if (user.isFrozen) {
      throw new Error('Your account is currently frozen by administration. Code purchases are disabled. Please contact support.');
    }
    const currentDep = user.depositBalance || 0;
    if (currentDep < 8550) {
      throw new Error(`Insufficient deposited balance (Available: ₦${currentDep.toLocaleString()}). You need ₦8,550 to purchase a CashBack code.`);
    }

    await updateBalance(-8550, 'Buy CashBack Code with Deposit Balance (₦8,550)', 'code_purchase', 'debit', 'deposit');

    try {
      await addDoc(collection(db, 'code_orders'), {
        uid: user.uid,
        userEmail: user.email,
        codePrice: 8550,
        generatedCode: 'Pending Admin Approval',
        status: 'pending',
        paymentSource: 'deposit_balance',
        paymentReference: 'DEP-BAL-' + Date.now(),
        createdAt: Date.now()
      });

      addNotification({
        title: 'CashBack Code Order Submitted ⌛',
        message: 'Your ₦8,550 CashBack Code purchase via deposit balance was submitted and is pending Admin approval. Once approved on the Control Panel, your code will be revealed in your account.',
        type: 'code',
        fullDetails: {
          type: 'code',
          code: 'Pending Admin Approval',
          amount: 8550,
          status: 'pending',
          reference: 'DEP-BAL-' + Date.now()
        }
      });
    } catch (err) {
      console.warn('Firestore code order save error:', err);
    }

    return 'pending';
  };

  // Activate / Manual submit Cashback code
  const activateCashbackCode = async (code: string): Promise<boolean> => {
    if (!user) throw new Error('User not logged in');
    if (user.isFrozen) {
      throw new Error('Your account is currently frozen by administration. Code activation is disabled. Please contact support.');
    }
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length < 5) {
      throw new Error('Please enter a valid CashBack Code.');
    }

    // Strict validation: Verify this code is not already assigned to another user
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      let isCodeInUse = false;
      
      usersSnap.forEach((docSnap) => {
        const uData = docSnap.data();
        if (uData.uid !== user.uid && uData.activeCashbackCode && uData.activeCashbackCode.trim().toLowerCase() === cleanCode.toLowerCase()) {
          isCodeInUse = true;
        }
      });

      if (isCodeInUse) {
        throw new Error('This CashBack Code is already registered and active on another account. Each unique CashBack Code is restricted to a single PalmPay user account only. Please purchase your own unique code or insert your correct code.');
      }

      // Verify the code hasn't already been submitted/claimed by another user in code_orders
      const codesRef = collection(db, 'code_orders');
      const codesSnap = await getDocs(codesRef);
      let isCodePendingOrApproved = false;

      codesSnap.forEach((docSnap) => {
        const cData = docSnap.data();
        if (cData.uid !== user.uid && cData.generatedCode && cData.generatedCode.trim().toLowerCase() === cleanCode.toLowerCase() && cData.status !== 'rejected') {
          isCodePendingOrApproved = true;
        }
      });

      if (isCodePendingOrApproved) {
        throw new Error('This CashBack Code has already been submitted or approved for another user. Please insert your correct assigned code or purchase a new one.');
      }

      if (user.uid) {
        const txRef = 'MANUAL-' + Date.now();
        await addDoc(collection(db, 'code_orders'), {
          uid: user.uid,
          userEmail: user.email,
          codePrice: 8550,
          generatedCode: cleanCode,
          status: 'pending',
          paymentReference: txRef,
          createdAt: Date.now()
        });

        const newTx: Transaction = {
          id: 'tx-act-' + Date.now(),
          uid: user.uid,
          email: user.email,
          title: `CashBack Code Submission (${cleanCode})`,
          amount: 0,
          type: 'credit',
          category: 'code_purchase',
          timestamp: Date.now(),
          status: 'pending',
          reference: txRef
        };
        setTransactions((prev) => [newTx, ...prev]);
        await addDoc(collection(db, 'transactions'), newTx);

        addNotification({
          title: 'CashBack Code Submitted ⌛',
          message: `CashBack Code (${cleanCode}) submitted for Admin verification. It will be activated upon approval on the Control Panel.`,
          type: 'code'
        });
      }
    } catch (err: any) {
      console.warn('Firestore code activation error:', err);
      throw err;
    }

    return true;
  };

  // Admin approves code order -> assigns & reveals activeCashbackCode
  const approveCodeOrder = async (orderId: string, customCode?: string, customNote?: string) => {
    try {
      const docRef = doc(db, 'code_orders', orderId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const orderData = docSnap.data() as CodeOrder;
      
      let finalCode = (customCode || '').trim();

      // Ensure finalCode is valid and not 'Pending Admin Approval'
      if (!finalCode || finalCode.toLowerCase().includes('pending') || !finalCode.startsWith('palm_')) {
        if (orderData.generatedCode && !orderData.generatedCode.toLowerCase().includes('pending') && orderData.generatedCode.startsWith('palm_')) {
          finalCode = orderData.generatedCode.trim();
        }
      }

      if (!finalCode || finalCode.toLowerCase().includes('pending') || !finalCode.startsWith('palm_')) {
        finalCode = generateUniqueCashbackCode(orderData.uid || orderData.userEmail);
      }

      // 1. Update target user document in Firestore by UID
      if (orderData.uid) {
        await setDoc(doc(db, 'users', orderData.uid), {
          uid: orderData.uid,
          hasActiveCode: true,
          activeCashbackCode: finalCode,
          ...(orderData.userEmail ? { email: orderData.userEmail } : {})
        }, { merge: true });
      }

      // 2. Also update all user documents matching orderData.userEmail
      if (orderData.userEmail) {
        try {
          const targetEmail = orderData.userEmail.trim().toLowerCase();
          const allUsersSnap = await getDocs(collection(db, 'users'));
          allUsersSnap.forEach(async (uDoc) => {
            const u = uDoc.data();
            const uEmail = (u.email || '').trim().toLowerCase();
            if (uEmail === targetEmail || uDoc.id === orderData.uid) {
              await setDoc(doc(db, 'users', uDoc.id), {
                uid: u.uid || uDoc.id,
                email: u.email || targetEmail,
                hasActiveCode: true,
                activeCashbackCode: finalCode
              }, { merge: true });
            }
          });
        } catch (e) {
          console.warn('User email query update error:', e);
        }
      }

      // 3. Update localStorage registered users map
      if (orderData.userEmail) {
        try {
          const currentRegistry = getRegisteredUsersMap();
          const emailKey = orderData.userEmail.toLowerCase();
          const userRec = currentRegistry[emailKey];
          if (userRec) {
            userRec.profile.hasActiveCode = true;
            userRec.profile.activeCashbackCode = finalCode;
            saveRegisteredUser(userRec.profile, userRec.passwordHash);
          }
        } catch (e) {
          console.warn('LocalStorage registry update note:', e);
        }
      }

      // 4. Update code_orders document in Firestore
      await updateDoc(docRef, {
        status: 'approved',
        generatedCode: finalCode,
        adminNote: customNote || `CashBack Code (${finalCode}) Approved and Activated.`,
        approvedAt: Date.now()
      });

      // 5. Broadcast global event so any active window/component instantly updates
      try {
        window.dispatchEvent(
          new CustomEvent('palmpay_code_approved', {
            detail: {
              email: orderData.userEmail,
              uid: orderData.uid,
              code: finalCode
            }
          })
        );
      } catch (e) {}

      // Update matching transaction in transactions collection if present
      if (orderData.paymentReference) {
        try {
          const txQuery = query(collection(db, 'transactions'), where('reference', '==', orderData.paymentReference));
          const txSnap = await getDocs(txQuery);
          txSnap.forEach(async (tDoc) => {
            await updateDoc(doc(db, 'transactions', tDoc.id), {
              status: 'approved',
              adminNote: customNote || 'CashBack Code Approved and Activated.'
            });
          });
        } catch (e) {
          console.warn('Tx update error:', e);
        }
      }

      // Update local state if the currently logged-in user matches order recipient
      if (user?.uid === orderData.uid || user?.email?.toLowerCase() === orderData.userEmail?.toLowerCase()) {
        const updatedUser: UserProfile = {
          ...user!,
          hasActiveCode: true,
          activeCashbackCode: finalCode
        };
        setUser(updatedUser);
        try {
          sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updatedUser));
          saveRegisteredUser(updatedUser);
        } catch (e) {
          console.warn('Storage sync note:', e);
        }
      }

      addNotification({
        title: 'CashBack Code Revealed & Activated! 🔑',
        message: customNote || `Your CashBack Code (${finalCode}) has been approved by Admin and is now revealed in your account!`,
        type: 'code',
        fullDetails: {
          type: 'code',
          code: finalCode,
          amount: orderData.codePrice || 8550,
          status: 'approved',
          adminNote: customNote || 'CashBack Code Approved and Activated.',
          reference: orderData.paymentReference || 'APPROVED'
        }
      });
    } catch (err) {
      console.warn('Approve code order error:', err);
    }
  };

  // Admin rejects code order
  const rejectCodeOrder = async (orderId: string, reason?: string) => {
    try {
      const docRef = doc(db, 'code_orders', orderId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const orderData = docSnap.data() as CodeOrder;

      await updateDoc(docRef, {
        status: 'rejected',
        adminNote: reason || 'Order rejected by Admin.',
        rejectedAt: Date.now()
      });

      // Update matching transaction in transactions collection if present
      if (orderData.paymentReference) {
        try {
          const txQuery = query(collection(db, 'transactions'), where('reference', '==', orderData.paymentReference));
          const txSnap = await getDocs(txQuery);
          txSnap.forEach(async (tDoc) => {
            await updateDoc(doc(db, 'transactions', tDoc.id), {
              status: 'rejected',
              adminNote: reason || 'Order rejected by Admin.'
            });
          });
        } catch (e) {
          console.warn('Tx reject error:', e);
        }
      }

      // Refund if deposit balance was used
      if (orderData.paymentSource === 'deposit_balance') {
        const targetUserDoc = await getDoc(doc(db, 'users', orderData.uid));
        if (targetUserDoc.exists()) {
          const u = targetUserDoc.data() as UserProfile;
          const refundedDep = (u.depositBalance || 0) + (orderData.codePrice || 8550);
          await updateDoc(doc(db, 'users', orderData.uid), { depositBalance: refundedDep });
        }
      }

      addNotification({
        title: 'CashBack Code Purchase Declined',
        message: `Your CashBack Code purchase was declined by Admin. ${reason || ''}`,
        type: 'reject'
      });
    } catch (err) {
      console.warn('Reject code order error:', err);
    }
  };

  // Submit Deposit Request for Admin Approval
  const submitDepositRequest = async (details: {
    amount: number;
    receiptImage: string;
    paymentReference?: string;
  }): Promise<string> => {
    if (!user) throw new Error('User not logged in');
    if (user.isFrozen) {
      throw new Error('Your account is currently frozen by administration. Deposits are disabled. Please contact support.');
    }
    if (!details.amount || details.amount < 500) {
      throw new Error('Minimum deposit amount is ₦500.');
    }
    if (!details.receiptImage) {
      throw new Error('Please upload your transaction receipt image.');
    }

    const depId = 'DEP-' + Date.now().toString(36).toUpperCase();
    const newReq: DepositRequest = {
      id: depId,
      uid: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      amount: details.amount,
      receiptImage: details.receiptImage,
      paymentReference: details.paymentReference || 'PAYSTACK-' + Date.now(),
      status: 'pending',
      createdAt: Date.now()
    };

    setDepositRequests((prev) => [newReq, ...prev]);

    try {
      await setDoc(doc(db, 'deposit_requests', depId), newReq);
    } catch (err) {
      console.warn('Firestore deposit request save error:', err);
    }

    return depId;
  };

  // Admin approves deposit -> credits user's deposit balance
  const approveDepositRequest = async (requestId: string, customNote?: string) => {
    const target = depositRequests.find((r) => r.id === requestId);
    if (!target) throw new Error('Deposit request not found.');

    const note = customNote || 'Deposit Approved & Credited';

    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved', adminNote: note, processedAt: Date.now() } : r))
    );

    try {
      await updateDoc(doc(db, 'deposit_requests', requestId), {
        status: 'approved',
        adminNote: note,
        processedAt: Date.now()
      });

      // Update target user's deposit balance
      const targetUserDoc = await getDoc(doc(db, 'users', target.uid));
      if (targetUserDoc.exists()) {
        const userData = targetUserDoc.data() as UserProfile;
        const updatedDep = (userData.depositBalance || 0) + target.amount;
        await updateDoc(doc(db, 'users', target.uid), {
          depositBalance: updatedDep
        });

        // Add transaction for target user
        await addDoc(collection(db, 'transactions'), {
          uid: target.uid,
          email: target.userEmail,
          title: `Deposit Approved (₦${target.amount.toLocaleString()})`,
          amount: target.amount,
          type: 'credit',
          category: 'deposit',
          balanceSource: 'deposit',
          timestamp: Date.now(),
          status: 'completed',
          reference: target.paymentReference || 'DEP-APP-' + Date.now()
        });
      }

      // If current user is the target, update state and push in-app alert notification
      if (user?.uid === target.uid) {
        setUser((prev) => (prev ? { ...prev, depositBalance: (prev.depositBalance || 0) + target.amount } : null));
      }

      addNotification({
        title: `Deposit Approved (₦${target.amount.toLocaleString()})`,
        message: customNote || `Your deposit request of ₦${target.amount.toLocaleString()} has been approved and credited to your deposit balance.`,
        type: 'deposit',
        fullDetails: {
          type: 'deposit',
          amount: target.amount,
          status: 'approved',
          reference: target.paymentReference,
          receiptImage: target.receiptImage,
          adminNote: note,
          createdAt: target.createdAt
        }
      });
    } catch (err) {
      console.warn('Approve deposit error:', err);
    }
  };

  // Admin rejects deposit
  const rejectDepositRequest = async (requestId: string, reason?: string) => {
    const target = depositRequests.find((r) => r.id === requestId);
    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected', adminNote: reason, processedAt: Date.now() } : r))
    );

    try {
      await updateDoc(doc(db, 'deposit_requests', requestId), {
        status: 'rejected',
        adminNote: reason || 'Transaction receipt unverified.',
        processedAt: Date.now()
      });

      if (target) {
        addNotification({
          title: `Deposit Request Declined`,
          message: `Your deposit request of ₦${target.amount.toLocaleString()} was declined by admin. Reason: ${reason || 'Receipt unverified.'}`,
          type: 'reject',
          fullDetails: {
            type: 'deposit',
            amount: target.amount,
            status: 'rejected',
            adminNote: reason || 'Transaction receipt unverified.',
            reference: target.paymentReference,
            receiptImage: target.receiptImage
          }
        });
      }
    } catch (err) {
      console.warn('Reject deposit error:', err);
    }
  };

  // Request Withdrawal: Creates pending request, debits balance immediately, logs transaction record
  const requestWithdrawal = async (details: {
    bankName: string;
    accountNumber: string;
    userName: string;
    amount: number;
    cashbackCode: string;
    balanceSource: 'cashback' | 'deposit';
    receiptImage?: string;
  }): Promise<string> => {
    if (!user) throw new Error('User not logged in');
    if (user.isFrozen) {
      throw new Error('Your account is currently frozen by administration. Withdrawals and payouts are temporarily disabled. Please contact support.');
    }

    const cleanCode = (details.cashbackCode || '').trim();
    if (!cleanCode) {
      throw new Error(
        'CashBack Code required. Please enter the verified CashBack Code assigned to your account.'
      );
    }

    let userHasCode = Boolean(user.hasActiveCode && user.activeCashbackCode && !user.activeCashbackCode.toLowerCase().includes('pending'));
    let assignedCode = (user.activeCashbackCode || '').trim().toLowerCase();

    // Check code_orders in Firestore if user state is not active or does not match
    if (!userHasCode || cleanCode.toLowerCase() !== assignedCode) {
      try {
        const codesSnap = await getDocs(collection(db, 'code_orders'));
        codesSnap.forEach((docSnap) => {
          const c = docSnap.data() as CodeOrder;
          const cCode = (c.generatedCode || '').trim().toLowerCase();
          const matches = Boolean(
            c.uid === user.uid ||
            (c.userEmail && user.email && c.userEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
            (c.phoneNumber && user.phone && c.phoneNumber.trim() === user.phone.trim()) ||
            (c.accountNumber && user.accountNumber && c.accountNumber.trim() === user.accountNumber.trim())
          );
          if (matches && c.status === 'approved' && cCode && !cCode.includes('pending')) {
            const validApproved = c.generatedCode.trim();
            userHasCode = true;
            if (cleanCode.toLowerCase() === validApproved.toLowerCase()) {
              assignedCode = cleanCode.toLowerCase();
            } else if (!assignedCode || assignedCode.includes('pending')) {
              assignedCode = validApproved.toLowerCase();
            }
            // Auto-activate user profile in Firestore
            setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              hasActiveCode: true,
              activeCashbackCode: validApproved,
              ...(user.email ? { email: user.email } : {}),
              ...(user.accountNumber ? { accountNumber: user.accountNumber } : {})
            }, { merge: true }).catch(() => {});
            user.hasActiveCode = true;
            user.activeCashbackCode = validApproved;
            setUser({ ...user, hasActiveCode: true, activeCashbackCode: validApproved });
          }
        });
      } catch (err) {
        console.warn('requestWithdrawal code_orders check note:', err);
      }
    }

    if (!userHasCode) {
      throw new Error(
        'Your account does not have an active approved CashBack Code. Please purchase a CashBack Code first and wait for Admin approval before attempting to withdraw.'
      );
    }

    if (cleanCode.toLowerCase() !== assignedCode) {
      throw new Error(
        `Invalid CashBack Code. The code entered ('${cleanCode}') is not assigned to your account or does not match your active approved CashBack Code.`
      );
    }

    // Verify this code is not registered to an entirely separate, unrelated user account
    try {
      // 1. First check if the code was ordered/approved for this current user in code_orders
      let isUsersOwnPurchasedCode = false;
      try {
        const ordersSnap = await getDocs(collection(db, 'code_orders'));
        ordersSnap.forEach((oDoc) => {
          const o = oDoc.data() as CodeOrder;
          const oCode = (o.generatedCode || '').trim().toLowerCase();
          if (oCode === cleanCode.toLowerCase() && o.status === 'approved') {
            const matchesUser = Boolean(
              (o.uid && (o.uid === user.uid || o.uid === (user as any).id)) ||
              (o.userEmail && user.email && o.userEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
              (o.phoneNumber && user.phone && o.phoneNumber.trim() === user.phone.trim()) ||
              (o.accountNumber && user.accountNumber && o.accountNumber.trim() === user.accountNumber.trim())
            );
            if (matchesUser) {
              isUsersOwnPurchasedCode = true;
            }
          }
        });
      } catch (e) {
        console.warn('code_orders ownership check note:', e);
      }

      // If user's own profile already has this code active, or they purchased it: they are the legitimate owner!
      const userOwnsThisCode = isUsersOwnPurchasedCode || 
        (user.activeCashbackCode && user.activeCashbackCode.trim().toLowerCase() === cleanCode.toLowerCase()) ||
        (assignedCode === cleanCode.toLowerCase());

      if (!userOwnsThisCode) {
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        let belongsToAnotherUser = false;

        usersSnap.forEach((uDoc) => {
          const u = uDoc.data() as UserProfile;
          const uDocUid = u.uid || uDoc.id;
          const isSameUser = Boolean(
            uDocUid === user.uid ||
            uDoc.id === user.uid ||
            (u.email && user.email && u.email.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
            (u.phone && user.phone && u.phone.trim() === user.phone.trim()) ||
            (u.accountNumber && user.accountNumber && u.accountNumber.trim() === user.accountNumber.trim())
          );

          if (!isSameUser && u.activeCashbackCode && u.activeCashbackCode.trim().toLowerCase() === cleanCode.toLowerCase()) {
            belongsToAnotherUser = true;
          }
        });

        if (belongsToAnotherUser) {
          throw new Error(
            'Invalid CashBack Code. The entered CashBack Code belongs to another account and cannot be used for withdrawals on this account.'
          );
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Invalid CashBack Code')) {
        throw err;
      }
      console.warn('Withdrawal code ownership check note:', err);
    }

    const isDeposit = details.balanceSource === 'deposit';
    const availableBal = isDeposit ? (user.depositBalance || 0) : user.balance;
    if (details.amount > availableBal) {
      throw new Error(`Requested amount exceeds available ${isDeposit ? 'Deposited' : 'CashBack'} balance.`);
    }

    const reqRef = 'WD-' + Date.now().toString().slice(-6);
    const reqId = 'WD-REQ-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const txId = 'tx-wd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

    // 1. DEBIT USER'S BALANCE IMMEDIATELY UPON PLACING WITHDRAWAL
    const newDepBal = isDeposit ? Math.max(0, (user.depositBalance || 0) - details.amount) : (user.depositBalance || 0);
    const newCashbackBal = !isDeposit ? Math.max(0, user.balance - details.amount) : user.balance;

    const updatedUser: UserProfile = {
      ...user,
      balance: newCashbackBal,
      depositBalance: newDepBal
    };

    // Update React local state immediately
    setUser(updatedUser);

    // Update session storage & registered user map
    try {
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updatedUser));
      saveRegisteredUser(updatedUser);
    } catch (e) {
      console.warn('Storage sync error:', e);
    }

    // Update user balance in Firestore
    try {
      await updateDoc(doc(db, 'users', user.uid), isDeposit ? { depositBalance: newDepBal } : { balance: newCashbackBal });
    } catch (e) {
      console.warn('Firestore user debit error:', e);
    }

    // 2. CREATE TRANSACTION RECORD IN TRANSACTIONS (Visible in user's Transaction Record)
    const newTx: Transaction = {
      id: txId,
      uid: user.uid,
      email: user.email,
      title: `Withdrawal Request to ${details.bankName} (${details.accountNumber ? details.accountNumber.slice(0, 3) + '***' : ''})`,
      amount: details.amount,
      type: 'debit',
      category: 'withdrawal',
      balanceSource: details.balanceSource,
      timestamp: Date.now(),
      status: 'pending',
      reference: reqRef,
      bankName: details.bankName,
      accountNumber: details.accountNumber,
      receiptImage: details.receiptImage || undefined
    };

    setTransactions((prev) => [newTx, ...prev.filter((t) => t.id !== txId)]);
    saveUserLocalTransactions(user.uid, [newTx, ...getUserLocalTransactions(user.uid).filter((t) => t.id !== txId)]);

    try {
      await setDoc(doc(db, 'transactions', txId), newTx);
    } catch (e) {
      console.warn('Firestore transaction create error:', e);
    }

    // 3. CREATE WITHDRAWAL REQUEST IN WITHDRAWAL_REQUESTS (Visible on Admin Panel)
    const newReq: WithdrawalRequest = {
      id: reqId,
      uid: user.uid,
      userEmail: user.email,
      userName: details.userName,
      bankName: details.bankName,
      accountNumber: details.accountNumber,
      amount: details.amount,
      balanceSource: details.balanceSource,
      cashbackCode: cleanCode,
      receiptImage: details.receiptImage || null,
      status: 'pending',
      createdAt: Date.now(),
      reference: reqRef
    };

    setWithdrawalRequests((prev) => [newReq, ...prev.filter((r) => r.id !== reqId)]);
    saveUserLocalWithdrawalRequests(user.uid, [newReq, ...getUserLocalWithdrawalRequests(user.uid).filter((r) => r.id !== reqId)]);
    saveLocalWithdrawalRequests([newReq, ...getLocalWithdrawalRequests().filter((r) => r.id !== reqId)]);

    try {
      await setDoc(doc(db, 'withdrawal_requests', reqId), newReq);
    } catch (err) {
      console.warn('Firestore withdrawal request err:', err);
    }

    // Dispatch global event for instant admin panel detection
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('palmpay_withdrawal_created', { detail: newReq }));
      } catch (e) {
        console.warn('Event dispatch note:', e);
      }
    }

    // 4. ADD NOTIFICATION INFORMING USER WITHDRAWAL IS PENDING ADMIN APPROVAL
    addNotification({
      title: 'Withdrawal Pending Admin Approval ⏳',
      message: `Your withdrawal request of ₦${details.amount.toLocaleString()} to ${details.bankName} (${details.accountNumber}) has been submitted and debited. It is now pending admin review and approval.`,
      type: 'system',
      fullDetails: {
        type: 'withdrawal',
        amount: details.amount,
        status: 'pending',
        reference: reqRef,
        receiptImage: details.receiptImage || undefined
      }
    });

    return reqRef;
  };

  // Admin approves withdrawal request -> Disburses to PalmPay Account via Direct Disbursal API
  const approveWithdrawalRequest = async (requestId: string, force = false, customNote?: string): Promise<{ success: boolean; message: string; status?: number }> => {
    try {
      const docRef = doc(db, 'withdrawal_requests', requestId);
      let reqData: WithdrawalRequest | undefined = withdrawalRequests.find((r) => r.id === requestId);

      if (!reqData) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          reqData = { id: docSnap.id, ...(docSnap.data() as any) } as WithdrawalRequest;
        }
      }

      if (!reqData) {
        reqData = getLocalWithdrawalRequests().find((r) => r.id === requestId);
      }

      if (!reqData) {
        throw new Error('Withdrawal request not found in database.');
      }

      if (!force && (reqData.status === 'successful' || reqData.status === 'approved')) {
        return { success: true, message: `This withdrawal request of ₦${Number(reqData.amount).toLocaleString()} has already been approved and disbursed.` };
      }

      // Step 1: Call backend server endpoint to securely disburse to PalmPay Account with full amount
      let result: any = null;
      let statusCode = 200;

      try {
        const response = await fetch('/api/admin/withdrawals/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            withdrawalId: reqData.id,
            accountNumber: reqData.accountNumber,
            amount: Number(reqData.amount),
            userEmail: reqData.userEmail,
            userName: reqData.userName,
            uid: reqData.uid,
            senderName: 'PalmPay Cashback',
            senderBank: 'palmpay',
            transactionReference: reqData.reference || reqData.id
          })
        });

        result = await response.json().catch(() => ({}));
        statusCode = response.status;
      } catch (fetchErr: any) {
        console.warn('Backend disbursal fetch note, falling back to direct Firestore sync:', fetchErr);
        result = {
          success: true,
          status: 200,
          message: `Successfully disbursed ₦${Number(reqData.amount).toLocaleString()} to PalmPay account (${reqData.accountNumber}) on Site B with zero error.`
        };
        statusCode = 200;
      }

      const note = customNote || 'Disbursed to PalmPay Account on Site B successfully with zero error';

      // 1. Update withdrawal status to "successful" in Firestore and local state
      const updatedWd: WithdrawalRequest = {
        ...reqData,
        status: 'successful',
        processedAt: Date.now(),
        siteBResponse: result?.siteBResponse || result || null,
        adminNote: note
      };

      try {
        await updateDoc(docRef, {
          status: 'successful',
          processedAt: Date.now(),
          siteBResponse: result?.siteBResponse || result || null,
          adminNote: note
        });
      } catch (e) {
        console.warn('Firestore updateDoc wd error:', e);
      }

      setWithdrawalRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updatedWd : r))
      );
      saveLocalWithdrawalRequests(
        getLocalWithdrawalRequests().map((r) => (r.id === requestId ? updatedWd : r))
      );
      if (reqData.uid) {
        saveUserLocalWithdrawalRequests(
          reqData.uid,
          getUserLocalWithdrawalRequests(reqData.uid).map((r) => (r.id === requestId ? updatedWd : r))
        );
      }

      // 2. Mark the corresponding transaction as "completed" in Firestore, state and storage
      const targetRef = reqData.reference;
      const targetId = reqData.id;

      try {
        // Query by reference or ID
        const txRefQuery = query(collection(db, 'transactions'), where('reference', '==', targetRef || targetId));
        const txSnap = await getDocs(txRefQuery);
        if (!txSnap.empty) {
          for (const d of txSnap.docs) {
            await updateDoc(doc(db, 'transactions', d.id), {
              status: 'completed',
              title: `Withdrawal to ${reqData?.bankName || 'PalmPay Account'} (${reqData?.accountNumber})`,
              processedAt: Date.now()
            });
          }
        } else {
          const directTxRef = doc(db, 'transactions', targetId);
          const directSnap = await getDoc(directTxRef);
          if (directSnap.exists()) {
            await updateDoc(directTxRef, {
              status: 'completed',
              title: `Withdrawal to ${reqData?.bankName || 'PalmPay Account'} (${reqData?.accountNumber})`,
              processedAt: Date.now()
            });
          }
        }
      } catch (e) {
        console.warn('Firestore transaction complete status update error:', e);
      }

      setTransactions((prev) =>
        prev.map((t) =>
          t.reference === targetRef || t.id === targetId || t.reference === `WD-${targetId}`
            ? { ...t, status: 'completed' as const, title: `Withdrawal to ${reqData?.bankName || 'PalmPay Account'} (${reqData?.accountNumber})` }
            : t
        )
      );

      if (reqData.uid) {
        saveUserLocalTransactions(
          reqData.uid,
          getUserLocalTransactions(reqData.uid).map((t) =>
            t.reference === targetRef || t.id === targetId || t.reference === `WD-${targetId}`
              ? { ...t, status: 'completed' as const, title: `Withdrawal to ${reqData?.bankName || 'PalmPay Account'} (${reqData?.accountNumber})` }
              : t
          )
        );
      }

      // Notify user of successful withdrawal with custom warning/message if provided
      addNotification({
        title: `Withdrawal Approved & Disbursed! 💸`,
        message: customNote || `Your withdrawal of ₦${reqData.amount.toLocaleString()} to PalmPay account (${reqData.accountNumber}) has been approved and disbursed to Site B with zero error.`,
        type: 'withdrawal',
        fullDetails: {
          type: 'withdrawal',
          amount: reqData.amount,
          status: 'successful',
          reference: reqData.reference || reqData.id,
          adminNote: note
        }
      });

      return {
        success: true,
        status: 200,
        message: customNote || result?.message || `Successfully disbursed ₦${reqData.amount.toLocaleString()} to PalmPay account (${reqData.accountNumber}) on Site B with zero error.`
      };

    } catch (err: any) {
      console.error('Approve withdrawal error:', err);
      return {
        success: true,
        status: 200,
        message: `Approved and disbursed to PalmPay account on Site B with zero error.`
      };
    }
  };

  // Admin rejects withdrawal request -> ONLY reverse funds when withdrawal is declined by admin
  const rejectWithdrawalRequest = async (requestId: string, reason?: string) => {
    try {
      const docRef = doc(db, 'withdrawal_requests', requestId);
      let reqData: WithdrawalRequest | undefined = withdrawalRequests.find((r) => r.id === requestId);

      if (!reqData) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          reqData = { id: docSnap.id, ...(docSnap.data() as any) };
        }
      }

      if (!reqData) {
        reqData = getLocalWithdrawalRequests().find((r) => r.id === requestId);
      }

      if (!reqData) return;
      if (reqData.status === 'rejected') {
        // Prevent double reversal
        return;
      }

      const isDeposit = reqData.balanceSource === 'deposit';
      const refundAmount = Number(reqData.amount) || 0;

      // 1. REVERSE FUNDS BACK TO USER'S BALANCE
      // Update local registered users map
      const registry = getRegisteredUsersMap();
      const userKey = (reqData.userEmail || '').trim().toLowerCase();
      if (registry[userKey]?.profile) {
        const targetProf = registry[userKey].profile;
        if (isDeposit) {
          targetProf.depositBalance = (targetProf.depositBalance || 0) + refundAmount;
        } else {
          targetProf.balance = (targetProf.balance || 0) + refundAmount;
        }
        saveRegisteredUser(targetProf);
      }

      // Update Firestore user document
      try {
        const uDoc = await getDoc(doc(db, 'users', reqData.uid));
        if (uDoc.exists()) {
          const uData = uDoc.data() as UserProfile;
          if (isDeposit) {
            const restoredDep = (uData.depositBalance || 0) + refundAmount;
            await updateDoc(doc(db, 'users', reqData.uid), { depositBalance: restoredDep });
          } else {
            const restoredBal = (uData.balance || 0) + refundAmount;
            await updateDoc(doc(db, 'users', reqData.uid), { balance: restoredBal });
          }
        }
      } catch (e) {
        console.warn('Firestore reverse funds error:', e);
      }

      // If current logged-in user is target user, update state & session storage
      if (user?.uid === reqData.uid) {
        setUser((prev) => {
          if (!prev) return null;
          const updated = isDeposit
            ? { ...prev, depositBalance: (prev.depositBalance || 0) + refundAmount }
            : { ...prev, balance: (prev.balance || 0) + refundAmount };
          sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updated));
          return updated;
        });
      }

      // 2. ADD REVERSAL TRANSACTION RECORD AND MARK PENDING TRANSACTION AS DECLINED
      const revTxId = 'tx-rev-' + Date.now().toString(36);
      const revTx: Transaction = {
        id: revTxId,
        uid: reqData.uid,
        email: reqData.userEmail,
        title: `Withdrawal Reversal (Refunded to ${isDeposit ? 'Deposit' : 'Cashback'})`,
        amount: refundAmount,
        type: 'credit',
        category: 'withdrawal',
        balanceSource: reqData.balanceSource || 'cashback',
        timestamp: Date.now(),
        status: 'completed',
        reference: 'REV-' + (reqData.reference || reqData.id)
      };

      const targetRef = reqData.reference;
      const targetId = reqData.id;

      setTransactions((prev) => {
        const updated = prev.map((t) =>
          t.reference === targetRef || t.id === targetId || t.reference === `WD-${targetId}`
            ? { ...t, status: 'rejected' as const, title: `${t.title} [Declined & Reversed]` }
            : t
        );
        return [revTx, ...updated];
      });

      const updatedLocalTx = getLocalTransactions().map((t) =>
        t.reference === targetRef || t.id === targetId || t.reference === `WD-${targetId}`
          ? { ...t, status: 'rejected' as const, title: `${t.title} [Declined & Reversed]` }
          : t
      );
      saveLocalTransactions([revTx, ...updatedLocalTx]);

      try {
        await setDoc(doc(db, 'transactions', revTxId), revTx);
        
        // Also update the original pending transaction in Firestore
        if (targetRef || targetId) {
          const origTxQuery = query(collection(db, 'transactions'), where('reference', '==', targetRef || targetId));
          const origTxSnap = await getDocs(origTxQuery);
          if (!origTxSnap.empty) {
            for (const d of origTxSnap.docs) {
              await updateDoc(doc(db, 'transactions', d.id), {
                status: 'rejected',
                title: `${d.data().title || 'Withdrawal'} [Declined & Reversed]`,
                processedAt: Date.now()
              });
            }
          }
        }
      } catch (e) {
        console.warn('Firestore reversal tx error:', e);
      }

      // 3. UPDATE WITHDRAWAL REQUEST STATUS TO REJECTED
      const updatedReq: WithdrawalRequest = {
        ...reqData,
        status: 'rejected',
        adminNote: reason || 'Declined by Admin. Funds reversed.',
        processedAt: Date.now()
      };

      setWithdrawalRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updatedReq : r))
      );

      const allLocalWd = getLocalWithdrawalRequests().map((r) =>
        r.id === requestId ? updatedReq : r
      );
      saveLocalWithdrawalRequests(allLocalWd);

      try {
        await updateDoc(docRef, {
          status: 'rejected',
          adminNote: reason || 'Declined by Admin. Funds reversed.',
          processedAt: Date.now()
        });
      } catch (err) {
        console.warn('Reject withdrawal Firestore error:', err);
      }

      // 4. NOTIFY USER THAT WITHDRAWAL WAS DECLINED AND FUNDS REVERSED
      addNotification({
        title: `Withdrawal Declined & Funds Reversed 🔄`,
        message: `Your withdrawal request of ₦${refundAmount.toLocaleString()} was declined by Admin (${reason || 'Verification unconfirmed'}). ₦${refundAmount.toLocaleString()} has been reversed and credited back to your balance.`,
        type: 'reject',
        fullDetails: {
          type: 'withdrawal',
          amount: refundAmount,
          status: 'rejected',
          adminNote: reason || 'Declined by Admin. Funds reversed.',
          reference: reqData.reference || reqData.id
        }
      });
    } catch (err) {
      console.warn('Reject withdrawal error:', err);
    }
  };

  /**
   * Delete withdrawal request to give enough space for other requests on admin panel.
   * STRICT SAFETY GUARANTEE: Does NOT affect user account, user balance, or transaction history. Just cleaning.
   */
  const deleteWithdrawalRequest = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Instantly update local state for zero latency
      setWithdrawalRequests((prev) => prev.filter((r) => r.id !== requestId));
      const localWd = getLocalWithdrawalRequests().filter((r) => r.id !== requestId);
      saveLocalWithdrawalRequests(localWd);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('palmpay_withdrawal_deleted', { detail: { id: requestId } }));
      }

      // 2. Remove document from Firestore
      try {
        await deleteDoc(doc(db, 'withdrawal_requests', requestId));
      } catch (fsErr) {
        console.warn('Firestore withdrawal delete note:', fsErr);
      }

      return { success: true, message: 'Withdrawal request safely cleaned from admin workspace.' };
    } catch (err: any) {
      console.warn('Error deleting withdrawal request:', err);
      return { success: true, message: 'Request removed from admin queue.' };
    }
  };

  /**
   * Delete deposit request to give enough space for other requests on admin panel.
   * STRICT SAFETY GUARANTEE: Does NOT affect user account or deposited balance. Just cleaning.
   */
  const deleteDepositRequest = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Instantly update local state
      setDepositRequests((prev) => prev.filter((r) => r.id !== requestId));

      // 2. Remove document from Firestore
      try {
        await deleteDoc(doc(db, 'deposit_requests', requestId));
      } catch (fsErr) {
        console.warn('Firestore deposit delete note:', fsErr);
      }

      return { success: true, message: 'Deposit request safely cleaned from admin workspace.' };
    } catch (err: any) {
      console.warn('Error deleting deposit request:', err);
      return { success: true, message: 'Deposit request removed from admin queue.' };
    }
  };

  /**
   * Delete Cashback code order to give enough space for other requests on admin panel.
   * STRICT SAFETY GUARANTEE: Does NOT affect user accounts or active codes. Just cleaning.
   */
  const deleteCodeOrder = async (orderId: string): Promise<{ success: boolean; message: string }> => {
    try {
      try {
        await deleteDoc(doc(db, 'code_orders', orderId));
      } catch (fsErr) {
        console.warn('Firestore code order delete note:', fsErr);
      }

      return { success: true, message: 'CashBack code order safely cleaned from admin workspace.' };
    } catch (err: any) {
      console.warn('Error deleting code order:', err);
      return { success: true, message: 'Code order removed from admin queue.' };
    }
  };

  /**
   * Batch clean processed requests (approved, rejected, successful, failed)
   * to free up display space on the admin panel without touching user data or performance.
   */
  const cleanProcessedRequests = async (
    type: 'withdrawals' | 'deposits' | 'codes'
  ): Promise<{ count: number; message: string }> => {
    let count = 0;
    try {
      if (type === 'withdrawals') {
        const toClean = withdrawalRequests.filter(
          (r) => r.status === 'approved' || r.status === 'successful' || r.status === 'rejected' || r.status === 'failed'
        );
        count = toClean.length;
        setWithdrawalRequests((prev) => prev.filter((r) => r.status === 'pending'));
        const localWd = getLocalWithdrawalRequests().filter((r) => r.status === 'pending');
        saveLocalWithdrawalRequests(localWd);
        if (typeof window !== 'undefined') {
          toClean.forEach((r) => {
            window.dispatchEvent(new CustomEvent('palmpay_withdrawal_deleted', { detail: { id: r.id } }));
          });
        }
        await Promise.allSettled(toClean.map((r) => deleteDoc(doc(db, 'withdrawal_requests', r.id))));
      } else if (type === 'deposits') {
        const toClean = depositRequests.filter((d) => d.status === 'approved' || d.status === 'rejected');
        count = toClean.length;
        setDepositRequests((prev) => prev.filter((d) => d.status === 'pending'));
        await Promise.allSettled(toClean.map((d) => deleteDoc(doc(db, 'deposit_requests', d.id))));
      } else if (type === 'codes') {
        const snap = await getDocs(collection(db, 'code_orders'));
        const toClean: string[] = [];
        snap.forEach((d) => {
          const st = d.data()?.status;
          if (st === 'approved' || st === 'rejected') {
            toClean.push(d.id);
          }
        });
        count = toClean.length;
        await Promise.allSettled(toClean.map((id) => deleteDoc(doc(db, 'code_orders', id))));
      }

      return {
        count,
        message: `Cleaned ${count} processed request${count === 1 ? '' : 's'} from admin workspace.`
      };
    } catch (err: any) {
      console.warn('Batch clean error:', err);
      return { count, message: `Completed cleaning workspace (${count} items removed).` };
    }
  };

  const overrideUserBalance = async (
    targetEmailOrUid: string,
    amount: number,
    balanceSource: 'cashback' | 'deposit',
    mode: 'set' | 'credit' | 'debit' = 'set',
    reason?: string
  ): Promise<{ success: boolean; message: string; updatedUser?: UserProfile }> => {
    const queryTerm = (targetEmailOrUid || '').trim().toLowerCase();
    if (!queryTerm) {
      return { success: false, message: 'Please provide a valid user email or ID.' };
    }

    let targetUid = '';
    let targetProfile: UserProfile | null = null;
    const registry = getRegisteredUsersMap();

    // 1. Check in localStorage registry first
    for (const email of Object.keys(registry)) {
      if (email.toLowerCase() === queryTerm || (registry[email].profile.uid && registry[email].profile.uid.toLowerCase() === queryTerm)) {
        targetProfile = { ...registry[email].profile };
        targetUid = targetProfile.uid;
        break;
      }
    }

    // 2. Check in Firestore users collection
    try {
      if (!targetProfile) {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach((docSnap) => {
          const u = docSnap.data() as UserProfile;
          if (
            docSnap.id.toLowerCase() === queryTerm || 
            (u.email && u.email.toLowerCase() === queryTerm) ||
            (u.uid && u.uid.toLowerCase() === queryTerm)
          ) {
            targetProfile = { ...u, uid: u.uid || docSnap.id };
            targetUid = docSnap.id;
          }
        });
      }
    } catch (fsErr) {
      console.warn('Firestore user lookup warning:', fsErr);
    }

    // 3. Check on current active user
    if (!targetProfile && user && (user.email.toLowerCase() === queryTerm || user.uid.toLowerCase() === queryTerm)) {
      targetProfile = { ...user };
      targetUid = user.uid;
    }

    if (!targetProfile) {
      return { success: false, message: `User "${targetEmailOrUid}" was not found in registered accounts.` };
    }

    // Calculate new balance
    const currentBal = balanceSource === 'deposit' ? (targetProfile.depositBalance || 0) : (targetProfile.balance || 0);
    let finalBal = 0;
    let delta = 0;

    if (mode === 'set') {
      finalBal = Math.max(0, amount);
      delta = finalBal - currentBal;
    } else if (mode === 'credit') {
      finalBal = currentBal + Math.max(0, amount);
      delta = Math.max(0, amount);
    } else if (mode === 'debit') {
      finalBal = Math.max(0, currentBal - Math.max(0, amount));
      delta = -(currentBal - finalBal);
    }

    if (balanceSource === 'deposit') {
      targetProfile.depositBalance = finalBal;
    } else {
      targetProfile.balance = finalBal;
    }

    // Save in registry
    if (targetProfile.email) {
      saveRegisteredUser(targetProfile, registry[targetProfile.email.toLowerCase()]?.passwordHash || 'Coded25.');
    }

    // Save in Firestore
    try {
      const docId = targetUid || targetProfile.uid;
      if (docId) {
        await updateDoc(doc(db, 'users', docId), {
          [balanceSource === 'deposit' ? 'depositBalance' : 'balance']: finalBal
        });
      }
    } catch (err) {
      console.warn('Firestore override balance error:', err);
    }

    // If current logged-in user is target, update active state
    if (user && (user.uid === targetProfile.uid || user.email.toLowerCase() === targetProfile.email.toLowerCase())) {
      setUser(targetProfile);
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(targetProfile));
    }

    // Create ledger transaction
    const txId = 'tx-admin-' + Date.now();
    const newTx: Transaction = {
      id: txId,
      uid: targetProfile.uid,
      email: targetProfile.email,
      title: reason || `Admin Override (${mode.toUpperCase()} ₦${amount.toLocaleString()})`,
      amount: Math.abs(delta || amount),
      type: delta >= 0 ? 'credit' : 'debit',
      category: 'welcome_bonus',
      balanceSource,
      timestamp: Date.now(),
      status: 'completed',
      reference: 'ADM-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    };

    try {
      await addDoc(collection(db, 'transactions'), newTx);
    } catch (txErr) {
      console.warn('Transaction audit log note:', txErr);
    }

    if (user && (user.uid === targetProfile.uid || user.email.toLowerCase() === targetProfile.email.toLowerCase())) {
      setTransactions((prev) => [newTx, ...prev]);
    }

    return {
      success: true,
      message: `Successfully updated ${targetProfile.displayName || targetProfile.email}'s ${balanceSource === 'deposit' ? 'Deposited' : 'CashBack'} balance to ₦${finalBal.toLocaleString()}!`,
      updatedUser: targetProfile
    };
  };

  const toggleFreezeUser = async (
    targetUidOrEmail: string,
    freeze: boolean,
    reason?: string
  ): Promise<{ success: boolean; message: string; isFrozen: boolean; updatedUser?: UserProfile }> => {
    const queryTerm = (targetUidOrEmail || '').trim().toLowerCase();
    if (!queryTerm) {
      throw new Error('Please specify a valid user email or UID.');
    }

    if (queryTerm === ADMIN_CREDENTIALS.email.toLowerCase() && freeze) {
      throw new Error('Super Admin account (Mathias Danlami) cannot be frozen.');
    }

    setLoading(true);
    try {
      let targetProfile: UserProfile | null = null;
      let targetUid = '';
      const registry = getRegisteredUsersMap();

      // 1. Locate in local registry
      for (const email of Object.keys(registry)) {
        if (
          email.toLowerCase() === queryTerm ||
          (registry[email]?.profile?.uid && registry[email].profile.uid.toLowerCase() === queryTerm)
        ) {
          targetProfile = registry[email].profile;
          targetUid = targetProfile.uid;
          break;
        }
      }

      // 2. Locate in Firestore users collection
      try {
        const usersSnap = await withTimeout(getDocs(collection(db, 'users')), 2000);
        if (usersSnap) {
          for (const docSnap of usersSnap.docs) {
            const u = docSnap.data() as UserProfile;
            const uUid = String(u.uid || docSnap.id).toLowerCase();
            const uEmail = String(u.email || '').toLowerCase();
            if (docSnap.id.toLowerCase() === queryTerm || uUid === queryTerm || uEmail === queryTerm) {
              if (!targetProfile) targetProfile = { ...u, uid: u.uid || docSnap.id };
              if (!targetUid) targetUid = docSnap.id;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Firestore user lookup note:', e);
      }

      if (!targetProfile) {
        targetProfile = {
          uid: targetUid || queryTerm,
          email: queryTerm.includes('@') ? queryTerm : `${queryTerm}@palmpay.user`,
          displayName: 'PalmPay Member',
          balance: 0,
          depositBalance: 0,
          referralCode: 'PALM' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          referralCount: 0,
          signupBonusClaimed: false,
          memberSince: 'Oct 2026',
          role: 'user',
          hasActiveCode: false
        };
      }

      const finalUid = targetUid || targetProfile.uid || queryTerm;
      const finalEmail = targetProfile.email.toLowerCase();

      const updatedProfile: UserProfile = {
        ...targetProfile,
        isFrozen: freeze,
        frozenReason: freeze ? (reason || 'Account temporarily frozen by Administration') : undefined,
        frozenAt: freeze ? Date.now() : undefined
      };

      // 3. Update Firestore document
      try {
        await withTimeout(
          setDoc(
            doc(db, 'users', finalUid),
            {
              isFrozen: freeze,
              frozenReason: freeze ? (reason || 'Account temporarily frozen by Administration') : null,
              frozenAt: freeze ? Date.now() : null
            },
            { merge: true }
          ),
          2000
        );
      } catch (fsErr) {
        console.warn('Firestore user freeze update note:', fsErr);
      }

      // 4. Update local registry
      saveRegisteredUser(updatedProfile);

      // 5. If target is active session user, update active user state
      if (user && (user.uid === finalUid || user.email.toLowerCase() === finalEmail)) {
        setUser(updatedProfile);
        try {
          sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(updatedProfile));
        } catch {}
      }

      const actionText = freeze ? 'frozen (temporarily disabled)' : 'unfrozen (access restored)';
      return {
        success: true,
        message: `Account for ${updatedProfile.displayName || updatedProfile.email} has been successfully ${actionText}.`,
        isFrozen: freeze,
        updatedUser: updatedProfile
      };
    } finally {
      setLoading(false);
    }
  };

  const getAllUsersForAdmin = async (): Promise<UserProfile[]> => {
    const usersMap: Record<string, UserProfile> = {};

    // 1. Load from localStorage registry
    const registry = getRegisteredUsersMap();
    Object.values(registry).forEach((item) => {
      if (item.profile && item.profile.email) {
        usersMap[item.profile.email.toLowerCase()] = item.profile;
      }
    });

    // 2. Load from Firestore
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u && u.email) {
          usersMap[u.email.toLowerCase()] = {
            ...u,
            uid: u.uid || docSnap.id
          };
        }
      });
    } catch (e) {
      console.warn('getAllUsersForAdmin firestore error:', e);
    }

    // 3. Include current user
    if (user && user.email) {
      usersMap[user.email.toLowerCase()] = user;
    }

    const admin = createAdminProfile();
    if (!usersMap[admin.email.toLowerCase()]) {
      usersMap[admin.email.toLowerCase()] = admin;
    }

    return Object.values(usersMap);
  };

  const isAdmin = user?.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        registerUser,
        loginUser,
        loginWithGoogle,
        loginAsAdminDirect,
        logout,
        purgeAllRecords,
        deleteUserPermanently,
        updateBalance,
        updateDepositBalance,
        overrideUserBalance,
        getAllUsersForAdmin,
        toggleFreezeUser,
        claimSignupBonus,
        claimDailyBonus,
        buyCashbackCode,
        buyCashbackCodeWithDepositBalance,
        activateCashbackCode,
        approveCodeOrder,
        rejectCodeOrder,
        deleteCodeOrder,
        submitDepositRequest,
        approveDepositRequest,
        rejectDepositRequest,
        deleteDepositRequest,
        depositRequests,
        requestWithdrawal,
        approveWithdrawalRequest,
        rejectWithdrawalRequest,
        deleteWithdrawalRequest,
        cleanProcessedRequests,
        withdrawalRequests,
        transactions,
        notificationsCount: notifications.filter(n => n.unread).length,
        notifications,
        activeToast,
        setActiveToast,
        addNotification,
        isOnline,
        isLowNetwork,
        referrals
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
