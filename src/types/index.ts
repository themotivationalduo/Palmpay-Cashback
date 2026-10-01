export type NavigationPage = 'dashboard' | 'game' | 'code' | 'transactions' | 'admin' | 'profile';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  balance: number; // Cashback balance (Withdrawable only)
  depositBalance: number; // Deposited balance (For Games & Code Purchases)
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  signupBonusClaimed: boolean;
  dailyClaimDate?: string;
  dailyClaimTimestamp?: number;
  memberSince: string;
  role: 'admin' | 'user';
  hasActiveCode: boolean;
  activeCashbackCode?: string;
}

export interface Transaction {
  id: string;
  uid: string;
  email: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
  category: 'welcome_bonus' | 'daily_claim' | 'game_win' | 'game_loss' | 'withdrawal' | 'code_purchase' | 'referral' | 'deposit';
  balanceSource?: 'cashback' | 'deposit';
  timestamp: number | string;
  status: 'completed' | 'pending' | 'rejected';
  reference?: string;
  bankName?: string;
  accountNumber?: string;
  receiptImage?: string;
}

export interface WithdrawalRequest {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  balanceSource?: 'cashback' | 'deposit';
  cashbackCode: string;
  receiptImage?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'successful' | 'failed';
  reference?: string;
  createdAt: number | string;
  processedAt?: number | string;
  adminNote?: string;
  siteBResponse?: any;
}

export interface DepositRequest {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  amount: number;
  receiptImage: string; // base64 or preview data
  paymentReference?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number | string;
  processedAt?: number | string;
  adminNote?: string;
}

export interface CodeOrder {
  id: string;
  uid: string;
  userEmail: string;
  codePrice: number;
  generatedCode: string;
  status: 'approved' | 'pending' | 'rejected';
  paymentReference?: string;
  paymentSource?: 'paystack' | 'deposit_balance';
  receiptImage?: string;
  adminNote?: string;
  createdAt: number | string;
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referrerEmail: string;
  referredUid: string;
  referredEmail: string;
  referredName: string;
  rewardAmount: number;
  createdAt: number | string;
  status: 'rewarded' | 'pending';
}

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
  type: 'bonus' | 'win' | 'withdrawal' | 'deposit' | 'security' | 'code' | 'success' | 'reject' | 'system';
  fullDetails?: {
    type: 'deposit' | 'code' | 'withdrawal' | 'bonus';
    amount?: number;
    status?: string;
    reference?: string;
    code?: string;
    receiptImage?: string;
    adminNote?: string;
    createdAt?: number | string;
  };
}
