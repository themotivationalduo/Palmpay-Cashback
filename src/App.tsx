/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CelebrationProvider } from './context/CelebrationContext';
import { CelebrationModal } from './components/CelebrationModal';
import { TopAlertBanner } from './components/TopAlertBanner';
import { Header } from './components/Header';
import { FloatingBottomNav } from './components/FloatingBottomNav';
import { UserPersonalizationHeader } from './components/UserPersonalizationHeader';
import { BalanceCard } from './components/BalanceCard';
import { RewardInitiatives } from './components/RewardInitiatives';
import { TransactionsLedger } from './components/TransactionsLedger';
import { SpinBottleGame } from './components/SpinBottleGame';
import { BuyCashbackCodeModal } from './components/BuyCashbackCodeModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { VerificationNotificationModal } from './components/VerificationNotificationModal';
import { SettingsProfileModal } from './components/SettingsProfileModal';
import { AdminPanel } from './components/AdminPanel';
import { Footer } from './components/Footer';
import { AuthScreen } from './components/AuthScreen';
import { SplashScreen } from './components/SplashScreen';
import { CommunityModal, AddMoneyModal, SupportModal } from './components/Modals/QuickActionModals';
import { WhatsAppChannelModal } from './components/Modals/WhatsAppChannelModal';
import { NotificationToast } from './components/NotificationToast';
import { NotificationDetailModal } from './components/NotificationDetailModal';
import { NavigationPage, PlatformNotification } from './types';
import { Sparkles, ShieldCheck, KeyRound, Award, Lock } from 'lucide-react';

const DashboardContent: React.FC<{
  currentPage: NavigationPage;
  setCurrentPage: (page: NavigationPage) => void;
  onOpenWithdrawal: () => void;
  onOpenBuyCode: () => void;
  onOpenAddMoney: () => void;
  onOpenVerification: () => void;
  onOpenSettings: () => void;
  onOpenCommunity: () => void;
  onOpenSupport: () => void;
}> = ({
  currentPage,
  setCurrentPage,
  onOpenWithdrawal,
  onOpenBuyCode,
  onOpenAddMoney,
  onOpenVerification,
  onOpenSettings,
  onOpenCommunity,
  onOpenSupport
}) => {
  const { user, isAdmin } = useAuth();

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-32 space-y-6 sm:space-y-8">
      {/* 1. Main Dashboard View */}
      {currentPage === 'dashboard' && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          
          {/* User Personalization Header: "Good afternoon, 👋" */}
          <UserPersonalizationHeader />

          {/* Balance & Withdrawal Card */}
          <BalanceCard
            onWithdraw={onOpenWithdrawal}
            onAddMoney={onOpenAddMoney}
            onBuyCode={onOpenBuyCode}
            onViewHistory={() => setCurrentPage('transactions')}
          />

          {/* Reward Initiatives & Perks (Welcome bonus, Daily claim, Refer & earn) */}
          <RewardInitiatives onOpenReferralModal={onOpenSettings} />

          {/* Activity & History Ledger ("Recent Transactions" with "View All") */}
          <TransactionsLedger
            isFullPage={false}
            onViewAll={() => setCurrentPage('transactions')}
          />
        </div>
      )}

      {/* 2. Interactive Gaming Initiative: Spin da' Bottle */}
      {currentPage === 'game' && (
        <div className="animate-in fade-in duration-300">
          <SpinBottleGame onBack={() => setCurrentPage('dashboard')} />
        </div>
      )}

      {/* 3. CashBack Code Portal (Dedicated Exclusively to Code Purchases) */}
      {currentPage === 'code' && (
        <div className="max-w-xl mx-auto space-y-6 py-4 sm:py-8 animate-in fade-in duration-300">
          <div className="mirror-glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl relative text-center space-y-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#FFC107] text-black shadow-lg flex items-center justify-center">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white font-['Poppins',sans-serif]">
                CashBack Code Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Official PalmPay Clearance Code Purchase &amp; Activation
              </p>
            </div>

            {user?.hasActiveCode && user?.activeCashbackCode ? (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00B875]" />
                    Code Active on Account
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-[#00B875] font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    PURCHASED
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90">
                  You have already purchased and linked a verified CashBack Code to your account. Code purchase is disabled.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-300 font-medium">Clearance Code Price:</span>
                <span className="text-lg sm:text-xl font-extrabold text-[#FFC107] font-mono">₦8,550</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onOpenBuyCode}
                disabled={Boolean(user?.hasActiveCode && user?.activeCashbackCode)}
                className={`flex-1 py-3.5 rounded-2xl font-extrabold text-sm shadow-lg transition-all text-center flex items-center justify-center gap-2 ${
                  user?.hasActiveCode && user?.activeCashbackCode
                    ? 'bg-white/10 text-slate-400 border border-white/15 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-[#FFC107] to-amber-400 text-black hover:opacity-95 active:scale-95'
                }`}
              >
                {user?.hasActiveCode && user?.activeCashbackCode ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Code Already Purchased</span>
                  </>
                ) : (
                  <span>Purchase CashBack Code (₦8,550)</span>
                )}
              </button>
              <button
                onClick={onOpenVerification}
                className="flex-1 py-3.5 rounded-2xl mirror-glass hover:bg-white/10 text-white font-bold text-sm border border-white/20 transition-all text-center"
              >
                View Clearance Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Full Activity & History Ledger Page */}
      {currentPage === 'transactions' && (
        <div className="animate-in fade-in duration-300">
          <TransactionsLedger isFullPage={true} />
        </div>
      )}

      {/* 5. Admin Panel View for themotivationalduo@gmail.com */}
      {currentPage === 'admin' && (
        <div className="animate-in fade-in duration-300">
          <AdminPanel />
        </div>
      )}
    </main>
  );
};

const getPageFromPath = (): NavigationPage => {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (path.endsWith('/game')) return 'game';
  if (path.endsWith('/code')) return 'code';
  if (path.endsWith('/transactions') || path.endsWith('/ledger')) return 'transactions';
  if (path.endsWith('/admin')) return 'admin';
  if (path.endsWith('/profile')) return 'profile';
  return 'dashboard';
};

const MainAppContent: React.FC = () => {
  const { user, loading, activeToast, setActiveToast } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [currentPage, setCurrentPageState] = useState<NavigationPage>(() => getPageFromPath());
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(() => getPageFromPath() === 'profile');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [showBuyCodeModal, setShowBuyCodeModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showCommunityModal, setShowCommunityModal] = useState<boolean>(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [selectedNotification, setSelectedNotification] = useState<PlatformNotification | null>(null);
  
  const [showWAModal, setShowWAModal] = useState<boolean>(false);
  const [isFirstTimeAuth, setIsFirstTimeAuth] = useState<boolean>(false);

  // Prompt user to follow WhatsApp Channel upon authentication
  React.useEffect(() => {
    if (user?.uid) {
      const waFollowedKey = `palmpay_wa_channel_followed_${user.uid}`;
      const waSeenKey = `palmpay_wa_seen_${user.uid}`;
      
      const hasFollowed = localStorage.getItem(waFollowedKey);
      const hasSeenBefore = localStorage.getItem(waSeenKey);

      if (!hasFollowed) {
        const isFirst = !hasSeenBefore;
        setIsFirstTimeAuth(isFirst);
        setShowWAModal(true);
        localStorage.setItem(waSeenKey, 'true');
      }
    } else {
      setShowWAModal(false);
    }
  }, [user?.uid]);

  const handleCloseWAModal = () => {
    if (user?.uid) {
      localStorage.setItem(`palmpay_wa_channel_followed_${user.uid}`, 'true');
    }
    setShowWAModal(false);
  };

  // Sync state -> URL prefix (/dashboard, /game, /code, /transactions, /admin, /profile)
  const setCurrentPage = (page: NavigationPage) => {
    setCurrentPageState(page);
    if (page === 'profile') {
      setShowSettingsModal(true);
    }
    if (typeof window !== 'undefined') {
      const targetPath = page === 'dashboard' ? '/dashboard' : `/${page}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ page }, '', targetPath);
      }
    }
  };

  // Sync browser back/forward buttons and initial load URL prefix
  React.useEffect(() => {
    const handlePopState = () => {
      const page = getPageFromPath();
      setCurrentPageState(page);
      if (page === 'profile') {
        setShowSettingsModal(true);
      }
    };

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '') {
        window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
      } else {
        const initialPage = getPageFromPath();
        if (initialPage === 'profile') {
          setShowSettingsModal(true);
        }
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <div className="min-h-screen bg-[#0B0614] text-slate-100 flex flex-col justify-between selection:bg-[#7E1DC6] selection:text-white">
      {/* Top Alert Announcement Banner */}
      <TopAlertBanner />

      {/* Header Navigation with PalmPay Logo */}
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenNotifications={() => setCurrentPage('transactions')}
        onSelectNotification={(notif) => setSelectedNotification(notif)}
      />

      {/* Real-time In-App Toast Notification */}
      <NotificationToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onViewDetails={(notif) => setSelectedNotification(notif)}
      />

      {/* Notification Detail Full Information Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

      {/* Conditional Rendering: If user is not registered / logged in, require account registration */}
      {!user ? (
        <AuthScreen />
      ) : (
        <>
          {/* Central Dashboard / Pages View */}
          <DashboardContent
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onOpenWithdrawal={() => setShowWithdrawalModal(true)}
            onOpenBuyCode={() => setShowBuyCodeModal(true)}
            onOpenAddMoney={() => setShowAddMoneyModal(true)}
            onOpenVerification={() => setShowVerificationModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenCommunity={() => setShowCommunityModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
          />

          {/* Floating Bottom Navigation Bar (hides on scroll, visible when stopped) */}
          <FloatingBottomNav
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onOpenProfile={() => setShowSettingsModal(true)}
          />

          {/* Modals & Overlays */}
          <SettingsProfileModal
            isOpen={showSettingsModal}
            onClose={() => {
              setShowSettingsModal(false);
              if (currentPage === 'profile') {
                setCurrentPage('dashboard');
              }
            }}
          />

          <WithdrawalModal
            isOpen={showWithdrawalModal}
            onClose={() => setShowWithdrawalModal(false)}
            onOpenBuyCode={() => setShowBuyCodeModal(true)}
          />

          <BuyCashbackCodeModal
            isOpen={showBuyCodeModal}
            onClose={() => setShowBuyCodeModal(false)}
            onCodePurchased={() => setShowVerificationModal(true)}
            onProceedToWithdraw={() => setShowWithdrawalModal(true)}
          />

          <VerificationNotificationModal
            isOpen={showVerificationModal}
            onClose={() => setShowVerificationModal(false)}
            onProceedToWithdraw={() => setShowWithdrawalModal(true)}
          />

          <CommunityModal
            isOpen={showCommunityModal}
            onClose={() => setShowCommunityModal(false)}
          />

          <AddMoneyModal
            isOpen={showAddMoneyModal}
            onClose={() => setShowAddMoneyModal(false)}
          />

          <SupportModal
            isOpen={showSupportModal}
            onClose={() => setShowSupportModal(false)}
          />

          <WhatsAppChannelModal
            isOpen={showWAModal}
            onClose={handleCloseWAModal}
            isFirstTimeAuth={isFirstTimeAuth}
          />
        </>
      )}

      {/* Global Celebration & Subtitle Animation Modal */}
      <CelebrationModal />

      {/* Footer & Compliance Bar with CBN License */}
      <Footer />
    </div>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CelebrationProvider>
        <MainAppContent />
      </CelebrationProvider>
    </AuthProvider>
  );
}
