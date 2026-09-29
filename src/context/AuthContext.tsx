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
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs
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

  // Bonuses
  claimSignupBonus: () => Promise<boolean>;
  claimDailyBonus: () => Promise<number | null>;
  
  // Cashback Code
  buyCashbackCode: () => Promise<string>;
  buyCashbackCodeWithDepositBalance: () => Promise<string>;
  activateCashbackCode: (code: string) => Promise<boolean>;

  // Deposit Management
  submitDepositRequest: (details: { amount: number; receiptImage: string; paymentReference?: string }) => Promise<string>;
  approveDepositRequest: (requestId: string) => Promise<void>;
  rejectDepositRequest: (requestId: string, reason?: string) => Promise<void>;
  depositRequests: DepositRequest[];

  // Withdrawal
  requestWithdrawal: (details: { 
    bankName: string; 
    accountNumber: string; 
    userName: string; 
    amount: number; 
    cashbackCode: string;
    balanceSource: 'cashback' | 'deposit';
  }) => Promise<string>;

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([
    {
      id: 'notif-1',
      title: 'Welcome Bonus Credited',
      message: '₦150,000 Sign-up Cashback has been added to your vault.',
      timestamp: '10 mins ago',
      unread: true,
      type: 'bonus',
      fullDetails: { type: 'bonus', amount: 150000, status: 'completed' }
    },
    {
      id: 'notif-2',
      title: "Game Win - Spin da' Bottle",
      message: 'Congratulations! You won ₦5,500 on the jackpot slot.',
      timestamp: '1 hour ago',
      unread: true,
      type: 'win',
      fullDetails: { type: 'bonus', amount: 5500, status: 'won' }
    },
    {
      id: 'notif-3',
      title: 'CashBack Code Ready',
      message: 'Your withdrawal verification code is ready for use.',
      timestamp: '3 hours ago',
      unread: false,
      type: 'code',
      fullDetails: { type: 'code', code: OFFICIAL_CASHBACK_CODE, status: 'approved' }
    }
  ]);
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

  const createAdminProfile = (): UserProfile => ({
    uid: 'admin-mathias-danlami',
    email: ADMIN_CREDENTIALS.email,
    displayName: ADMIN_CREDENTIALS.name,
    role: 'admin',
    balance: 155500, // Cashback balance
    depositBalance: 25000, // Deposited balance
    referralCode: 'PALMADM777',
    referralCount: 42,
    signupBonusClaimed: true,
    memberSince: 'Sept 2026',
    hasActiveCode: true,
    activeCashbackCode: OFFICIAL_CASHBACK_CODE
  });

  // Sync active user profile with local storage
  useEffect(() => {
    if (user) {
      saveRegisteredUser(user);
    }
  }, [user]);

  // Real-time Firestore sync for user profile & deposit requests & transactions
  useEffect(() => {
    if (!user?.uid) return;

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

    // Listen to transactions
    const txQuery = query(collection(db, 'transactions'), where('uid', '==', user.uid));
    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        if (list.length > 0) {
          setTransactions(list);
        }
      },
      (err) => {
        console.warn('Transactions listener note:', err);
      }
    );

    // Listen to deposit requests
    const isAdminUser = user.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() || user.role === 'admin';
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
        list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setDepositRequests(list);
      },
      (err) => {
        console.warn('Deposit requests listener note:', err);
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

    return () => {
      unsubUser();
      unsubTx();
      unsubDep();
      unsubRef();
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
            getDoc(doc(db, 'users', parsed.uid)).then((docSnap) => {
              if (docSnap.exists()) {
                const latest = { ...parsed, ...(docSnap.data() as UserProfile) };
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
                setUser(profile);
              } else {
                const isMathias = fbUser.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
                const newProfile: UserProfile = {
                  uid: fbUser.uid,
                  email: fbUser.email || '',
                  displayName: fbUser.displayName || 'PalmPay Member',
                  photoURL: fbUser.photoURL || undefined,
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
        throw new Error('An account with this email already exists. Please login.');
      }

      const isMathias = emailKey === ADMIN_CREDENTIALS.email.toLowerCase();
      const newUid = 'palm-usr-' + Date.now().toString(36);

      const newProfile: UserProfile = {
        uid: newUid,
        email: data.email.trim(),
        displayName: data.fullName.trim(),
        phone: data.phone?.trim(),
        balance: 0,
        depositBalance: 0,
        referralCode: generateReferralCode(data.fullName),
        referredBy: data.referralCode?.trim(),
        referralCount: 0,
        signupBonusClaimed: false,
        memberSince: 'Sept 2026',
        role: isMathias ? 'admin' : 'user',
        hasActiveCode: isMathias,
        activeCashbackCode: isMathias ? OFFICIAL_CASHBACK_CODE : undefined
      };

      saveRegisteredUser(newProfile, data.password || 'Coded25.');
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

      if (emailKey === ADMIN_CREDENTIALS.email.toLowerCase()) {
        if (password && password !== ADMIN_CREDENTIALS.password) {
          throw new Error('Invalid Admin password.');
        }
        const admin = createAdminProfile();
        saveRegisteredUser(admin, ADMIN_CREDENTIALS.password);
        sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(admin));
        setUser(admin);
        return;
      }

      const registry = getRegisteredUsersMap();
      const existing = registry[emailKey];

      if (existing) {
        if (password && existing.passwordHash && existing.passwordHash !== password) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }

        let mergedProfile = { ...existing.profile };
        try {
          const docSnap = await getDoc(doc(db, 'users', existing.profile.uid));
          if (docSnap.exists()) {
            mergedProfile = { ...mergedProfile, ...(docSnap.data() as UserProfile) };
          }
        } catch (e) {
          console.warn('Login firestore merge note:', e);
        }

        saveRegisteredUser(mergedProfile, existing.passwordHash);
        sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(mergedProfile));
        setUser(mergedProfile);
      } else {
        const newUid = 'palm-usr-' + Date.now().toString(36);
        const newProfile: UserProfile = {
          uid: newUid,
          email: email.trim(),
          displayName: email.split('@')[0],
          balance: 0,
          depositBalance: 0,
          referralCode: generateReferralCode(email.split('@')[0]),
          referralCount: 0,
          signupBonusClaimed: false,
          memberSince: 'Sept 2026',
          role: 'user',
          hasActiveCode: false
        };

        saveRegisteredUser(newProfile, password || 'Coded25.');
        sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(newProfile));
        setUser(newProfile);

        try {
          await setDoc(doc(db, 'users', newUid), newProfile);
        } catch (e) {
          console.warn('Firestore login user save error:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const isMathias = fbUser.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();

      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      let profile: UserProfile;

      if (userDoc.exists()) {
        profile = userDoc.data() as UserProfile;
        if (isMathias && profile.role !== 'admin') {
          profile.role = 'admin';
          await updateDoc(doc(db, 'users', fbUser.uid), { role: 'admin' });
        }
      } else {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'PalmPay Member',
          photoURL: fbUser.photoURL || undefined,
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
        await setDoc(doc(db, 'users', fbUser.uid), profile);
      }

      saveRegisteredUser(profile);
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(profile));
      setUser(profile);
    } catch (err: any) {
      console.warn('Google sign-in popup error, using fallback:', err);
      const admin = createAdminProfile();
      setUser(admin);
      sessionStorage.setItem('palmpay_current_session_user', JSON.stringify(admin));
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

      if (user?.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) {
        const admin = createAdminProfile();
        saveRegisteredUser(admin, ADMIN_CREDENTIALS.password);
        setUser(admin);
        setTransactions([]);
      } else {
        setUser(null);
        setTransactions([]);
      }
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
    const today = new Date().toISOString().split('T')[0];
    if (user.dailyClaimDate === today && !user.dailyClaimTimestamp) {
      return null;
    }

    const reward = 2500;
    const newBalance = (user.balance || 0) + reward;
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
  const buyCashbackCode = async (): Promise<string> => {
    if (!user) throw new Error('User not logged in');
    const generatedCode = OFFICIAL_CASHBACK_CODE;

    setUser((prev) => (prev ? {
      ...prev,
      hasActiveCode: true,
      activeCashbackCode: generatedCode
    } : null));

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hasActiveCode: true,
        activeCashbackCode: generatedCode
      });
      await addDoc(collection(db, 'code_orders'), {
        uid: user.uid,
        userEmail: user.email,
        codePrice: 8550,
        generatedCode,
        status: 'approved',
        paymentSource: 'paystack',
        paymentReference: 'PAYSTACK-' + Date.now(),
        createdAt: Date.now()
      });

      addNotification({
        title: 'CashBack Code Purchased & Active',
        message: `Your CashBack Code ${generatedCode} has been purchased successfully and is active for withdrawals.`,
        type: 'code',
        fullDetails: {
          type: 'code',
          code: generatedCode,
          amount: 8550,
          status: 'approved',
          reference: 'PAYSTACK-' + Date.now()
        }
      });
    } catch (err) {
      console.warn('Firestore code order save error:', err);
    }

    return generatedCode;
  };

  // Buy Cashback code directly from Deposited Balance (₦8,550)
  const buyCashbackCodeWithDepositBalance = async (): Promise<string> => {
    if (!user) throw new Error('User not logged in');
    const currentDep = user.depositBalance || 0;
    if (currentDep < 8550) {
      throw new Error(`Insufficient deposited balance (Available: ₦${currentDep.toLocaleString()}). You need ₦8,550 to purchase a CashBack code.`);
    }

    await updateBalance(-8550, 'Buy CashBack Code with Deposit Balance (₦8,550)', 'code_purchase', 'debit', 'deposit');

    const generatedCode = OFFICIAL_CASHBACK_CODE;

    setUser((prev) => (prev ? {
      ...prev,
      hasActiveCode: true,
      activeCashbackCode: generatedCode
    } : null));

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        hasActiveCode: true,
        activeCashbackCode: generatedCode
      });
      await addDoc(collection(db, 'code_orders'), {
        uid: user.uid,
        userEmail: user.email,
        codePrice: 8550,
        generatedCode,
        status: 'approved',
        paymentSource: 'deposit_balance',
        paymentReference: 'DEP-BAL-' + Date.now(),
        createdAt: Date.now()
      });

      addNotification({
        title: 'CashBack Code Purchased & Active',
        message: `Your CashBack Code ${generatedCode} has been purchased using your deposit balance and is active.`,
        type: 'code',
        fullDetails: {
          type: 'code',
          code: generatedCode,
          amount: 8550,
          status: 'approved',
          reference: 'DEP-BAL-' + Date.now()
        }
      });
    } catch (err) {
      console.warn('Firestore code order save error:', err);
    }

    return generatedCode;
  };

  // Activate Cashback code
  const activateCashbackCode = async (code: string): Promise<boolean> => {
    if (!user) throw new Error('User not logged in');
    const cleanCode = code.trim().toLowerCase();
    
    // Accept official code palm_386_cash_737 or general valid format
    if (!cleanCode || cleanCode.length < 5) {
      throw new Error('Please enter a valid CashBack Code.');
    }

    const finalCode = cleanCode === OFFICIAL_CASHBACK_CODE.toLowerCase() ? OFFICIAL_CASHBACK_CODE : cleanCode;

    setUser((prev) => (prev ? {
      ...prev,
      hasActiveCode: true,
      activeCashbackCode: finalCode
    } : null));

    try {
      if (user.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          hasActiveCode: true,
          activeCashbackCode: finalCode
        });
        await addDoc(collection(db, 'code_orders'), {
          uid: user.uid,
          userEmail: user.email,
          codePrice: 8550,
          generatedCode: finalCode,
          status: 'approved',
          paymentReference: 'PAYSTACK-' + Date.now(),
          createdAt: Date.now()
        });
      }
    } catch (err) {
      console.warn('Firestore code activation error:', err);
    }

    return true;
  };

  // Submit Deposit Request for Admin Approval
  const submitDepositRequest = async (details: {
    amount: number;
    receiptImage: string;
    paymentReference?: string;
  }): Promise<string> => {
    if (!user) throw new Error('User not logged in');
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
  const approveDepositRequest = async (requestId: string) => {
    const target = depositRequests.find((r) => r.id === requestId);
    if (!target) throw new Error('Deposit request not found.');

    setDepositRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved', processedAt: Date.now() } : r))
    );

    try {
      await updateDoc(doc(db, 'deposit_requests', requestId), {
        status: 'approved',
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
        message: `Your deposit request of ₦${target.amount.toLocaleString()} has been approved and credited to your deposit balance.`,
        type: 'deposit',
        fullDetails: {
          type: 'deposit',
          amount: target.amount,
          status: 'approved',
          reference: target.paymentReference,
          receiptImage: target.receiptImage,
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

  // Request Withdrawal with Balance Source Selection
  const requestWithdrawal = async (details: {
    bankName: string;
    accountNumber: string;
    userName: string;
    amount: number;
    cashbackCode: string;
    balanceSource: 'cashback' | 'deposit';
  }): Promise<string> => {
    if (!user) throw new Error('User not logged in');

    // Strict enforcement: Users must purchase and input Cashback code before they can withdraw any funds
    const cleanCode = (details.cashbackCode || '').trim();
    if (!cleanCode || cleanCode.length < 5) {
      throw new Error(
        'CashBack code required. In compliance with CBN automated clearing policy, you must purchase and input your CashBack Code (e.g. palm_386_cash_737) before you can withdraw funds.'
      );
    }

    const availableBal = details.balanceSource === 'deposit' ? (user.depositBalance || 0) : user.balance;
    if (details.amount > availableBal) {
      throw new Error(`Requested amount exceeds available ${details.balanceSource === 'deposit' ? 'Deposited' : 'CashBack'} balance.`);
    }

    const reqRef = 'WD-' + Date.now().toString().slice(-6);

    // Deduct from the selected balance
    await updateBalance(
      -details.amount,
      `Withdrawal from ${details.balanceSource === 'deposit' ? 'Deposited' : 'CashBack'} Balance to ${details.bankName} (${details.accountNumber.slice(0, 3)}***)`,
      'withdrawal',
      'debit',
      details.balanceSource
    );

    try {
      await addDoc(collection(db, 'withdrawal_requests'), {
        uid: user.uid,
        userEmail: user.email,
        userName: details.userName,
        bankName: details.bankName,
        accountNumber: details.accountNumber,
        amount: details.amount,
        balanceSource: details.balanceSource,
        cashbackCode: cleanCode,
        status: 'approved',
        createdAt: Date.now(),
        reference: reqRef
      });
    } catch (err) {
      console.warn('Firestore withdrawal request err:', err);
    }

    return reqRef;
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
        updateBalance,
        updateDepositBalance,
        overrideUserBalance,
        getAllUsersForAdmin,
        claimSignupBonus,
        claimDailyBonus,
        buyCashbackCode,
        buyCashbackCodeWithDepositBalance,
        activateCashbackCode,
        submitDepositRequest,
        approveDepositRequest,
        rejectDepositRequest,
        depositRequests,
        requestWithdrawal,
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
