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
import { WelcomeScreen } from './components/WelcomeScreen';
import { SplashScreen } from './components/SplashScreen';
import { VIPLoyaltyCard } from './components/VIPLoyaltyCard';
import { extractReferralCodeFromUrl } from './utils/referral';
import { CommunityModal, AddMoneyModal, SupportModal } from './components/Modals/QuickActionModals';
import { WhatsAppChannelModal } from './components/Modals/WhatsAppChannelModal';
import { NotificationToast } from './components/NotificationToast';
import { NotificationDetailModal } from './components/NotificationDetailModal';
import { NavigationPage, PlatformNotification, AdminSubPage } from './types';
import { Sparkles, ShieldCheck, KeyRound, Award, Lock, Snowflake } from 'lucide-react';

const DashboardContent: React.FC<{
  currentPage: NavigationPage;
  setCurrentPage: (page: NavigationPage) => void;
  adminSubPage: AdminSubPage;
  setAdminSubPage: (page: AdminSubPage) => void;
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
  adminSubPage,
  setAdminSubPage,
  onOpenWithdrawal,
  onOpenBuyCode,
  onOpenAddMoney,
  onOpenVerification,
  onOpenSettings,
  onOpenCommunity,
  onOpenSupport
}) => {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-32 space-y-6 sm:space-y-8 min-h-[75vh]">
      {/* 0. Standalone Welcome Page */}
      {currentPage === 'welcome' && (
        <div className="animate-in fade-in duration-300">
          <WelcomeScreen
            onGetStarted={() => setCurrentPage('dashboard')}
            onOpenTerms={() => setCurrentPage('support')}
          />
        </div>
      )}

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

          {/* VIP Loyalty Status Tier Card */}
          <VIPLoyaltyCard onOpenSettings={onOpenSettings} />

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

      {/* 3. CashBack Code Portal (Standalone Page) */}
      {(currentPage === 'code' || currentPage === 'buy-code') && (
        <div className="animate-in fade-in duration-300">
          <BuyCashbackCodeModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
            onCodePurchased={() => setCurrentPage('verification')}
            onProceedToWithdraw={() => setCurrentPage('withdraw')}
          />
        </div>
      )}

      {/* 4. Standalone Withdrawal Page */}
      {currentPage === 'withdraw' && (
        <div className="animate-in fade-in duration-300">
          <WithdrawalModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
            onOpenBuyCode={() => setCurrentPage('buy-code')}
          />
        </div>
      )}

      {/* 5. Standalone Deposit / Fund Wallet Page */}
      {currentPage === 'add-money' && (
        <div className="animate-in fade-in duration-300">
          <AddMoneyModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
          />
        </div>
      )}

      {/* 6. Standalone Verification Clearance Page */}
      {currentPage === 'verification' && (
        <div className="animate-in fade-in duration-300">
          <VerificationNotificationModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
            onProceedToWithdraw={() => setCurrentPage('withdraw')}
          />
        </div>
      )}

      {/* 7. Standalone Settings & Profile Page */}
      {currentPage === 'profile' && (
        <div className="animate-in fade-in duration-300">
          <SettingsProfileModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
            onOpenAdminPanel={() => setCurrentPage('admin')}
            onOpenWelcome={() => setCurrentPage('welcome')}
          />
        </div>
      )}

      {/* 8. Standalone Community Hub Page */}
      {currentPage === 'community' && (
        <div className="animate-in fade-in duration-300">
          <CommunityModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
          />
        </div>
      )}

      {/* 9. Standalone 24/7 Support Desk Page */}
      {currentPage === 'support' && (
        <div className="animate-in fade-in duration-300">
          <SupportModal
            isOpen={true}
            isStandalone={true}
            onClose={() => setCurrentPage('dashboard')}
          />
        </div>
      )}

      {/* 10. Full Activity & History Ledger Page */}
      {currentPage === 'transactions' && (
        <div className="animate-in fade-in duration-300">
          <TransactionsLedger isFullPage={true} />
        </div>
      )}

      {/* 11. Admin Panel View */}
      {currentPage === 'admin' && (
        <div className="animate-in fade-in duration-300">
          <AdminPanel
            activeSubPage={adminSubPage}
            onSubPageChange={setAdminSubPage}
            onNavigateHome={() => setCurrentPage('dashboard')}
          />
        </div>
      )}
    </main>
  );
};

const getPageFromPath = (): NavigationPage => {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  
  // If user visits via referral link /ref/:code, capture code and show welcome/auth
  if (path.includes('/ref/')) {
    const extracted = extractReferralCodeFromUrl();
    if (extracted) {
      try {
        sessionStorage.setItem('palmpay_prefilled_referral_code', extracted);
        localStorage.setItem('palmpay_prefilled_referral_code', extracted);
      } catch (e) {}
    }
    return 'welcome';
  }

  if (path.endsWith('/welcome') || path.endsWith('/landing') || path.endsWith('/intro')) return 'welcome';
  if (path.endsWith('/game')) return 'game';
  if (path.endsWith('/code') || path.endsWith('/buy-code')) return 'buy-code';
  if (path.endsWith('/withdraw')) return 'withdraw';
  if (path.endsWith('/add-money') || path.endsWith('/deposit')) return 'add-money';
  if (path.endsWith('/verification') || path.endsWith('/clearance')) return 'verification';
  if (path.endsWith('/community') || path.endsWith('/whatsapp')) return 'community';
  if (path.endsWith('/support')) return 'support';
  if (path.endsWith('/transactions') || path.endsWith('/ledger')) return 'transactions';
  if (path.endsWith('/admin')) return 'admin';
  if (path.endsWith('/profile') || path.endsWith('/settings')) return 'profile';
  return 'dashboard';
};

const MainAppContent: React.FC = () => {
  const { user, activeToast, setActiveToast } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [currentPage, setCurrentPageState] = useState<NavigationPage>(() => getPageFromPath());
  const [adminSubPage, setAdminSubPage] = useState<AdminSubPage>('overview');
  const [showAuthForm, setShowAuthForm] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const extracted = extractReferralCodeFromUrl();
      if (extracted) {
        try {
          sessionStorage.setItem('palmpay_prefilled_referral_code', extracted);
          localStorage.setItem('palmpay_prefilled_referral_code', extracted);
        } catch (e) {}
        return true; // Directly show registration form with prefilled referral code!
      }
      if (p.includes('/login') || p.includes('/register') || p.includes('/auth') || p.includes('/signin')) {
        return true;
      }
    }
    return false;
  });
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

  // Sync state -> URL prefix (/dashboard, /game, /withdraw, /buy-code, /add-money, /transactions, /admin, /profile, /community, /support)
  const setCurrentPage = (page: NavigationPage) => {
    setCurrentPageState(page);
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
    };

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '') {
        window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If user is not authenticated and hasn't clicked "Get Started", show the exact Welcome Page
  if (!user && !showAuthForm) {
    return (
      <>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <WelcomeScreen
          onGetStarted={() => setShowAuthForm(true)}
          onOpenTerms={() => setShowAuthForm(true)}
        />
      </>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between selection:bg-[#7E1DC6] selection:text-white transition-colors duration-300">
      {/* Top Alert Announcement Banner */}
      <TopAlertBanner />

      {/* Header Navigation with PalmPay Logo */}
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onOpenSettings={() => setCurrentPage('profile')}
        onOpenNotifications={() => setCurrentPage('transactions')}
        onSelectNotification={(notif) => setSelectedNotification(notif)}
      />

      {/* Frozen Account Alert Banner */}
      {user?.isFrozen && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 animate-in fade-in">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] flex items-start sm:items-center justify-between gap-3 text-cyan-200 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
                <Snowflake className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-white text-sm font-bold">Account Access Temporarily Frozen</strong>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    RESTRICTED
                  </span>
                </div>
                <p className="text-cyan-200/90 mt-0.5 text-[11px] sm:text-xs">
                  {user.frozenReason || 'Your account is temporarily frozen by administration. You can view your balance and activity, but withdrawals, deposits, and game transactions are paused.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('support')}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-300 text-xs font-bold shrink-0 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      )}

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
        <AuthScreen onBackToWelcome={() => setShowAuthForm(false)} />
      ) : (
        <>
          {/* Central Dashboard / Standalone Pages View */}
          <DashboardContent
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            adminSubPage={adminSubPage}
            setAdminSubPage={setAdminSubPage}
            onOpenWithdrawal={() => setCurrentPage('withdraw')}
            onOpenBuyCode={() => setCurrentPage('buy-code')}
            onOpenAddMoney={() => setCurrentPage('add-money')}
            onOpenVerification={() => setCurrentPage('verification')}
            onOpenSettings={() => setCurrentPage('profile')}
            onOpenCommunity={() => setCurrentPage('community')}
            onOpenSupport={() => setCurrentPage('support')}
          />

          {/* Floating Bottom Navigation Bar (hides on scroll, visible when stopped) */}
          <FloatingBottomNav
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            adminSubPage={adminSubPage}
            setAdminSubPage={setAdminSubPage}
            onOpenProfile={() => setCurrentPage('profile')}
          />

          {/* WhatsApp Channel Onboarding Overlay */}
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
      <Footer
        onOpenWelcome={() => {
          if (!user) {
            setShowAuthForm(false);
          } else {
            setCurrentPage('welcome');
          }
        }}
      />
    </div>
    </>
  );
};

export default function App() {
  // Listen to system color scheme preferences and adapt dark/light class automatically
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDark = e.matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };
    
    // Initial check
    handleChange(mediaQuery);
    
    // Listen for updates
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return (
    <AuthProvider>
      <CelebrationProvider>
        <MainAppContent />
      </CelebrationProvider>
    </AuthProvider>
  );
}
