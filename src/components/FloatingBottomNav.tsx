import React, { useState, useEffect, useRef } from 'react';
import { Home, Sparkles, Key, History, Shield, User, LayoutGrid, DollarSign, Wallet, Users, ArrowLeft } from 'lucide-react';
import { NavigationPage, AdminSubPage } from '../types';
import { useAuth } from '../context/AuthContext';

interface FloatingBottomNavProps {
  currentPage: NavigationPage;
  setCurrentPage: (page: NavigationPage) => void;
  adminSubPage?: AdminSubPage;
  setAdminSubPage?: (page: AdminSubPage) => void;
  onOpenProfile: () => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  currentPage,
  setCurrentPage,
  adminSubPage = 'overview',
  setAdminSubPage,
  onOpenProfile
}) => {
  const { isAdmin, depositRequests, withdrawalRequests } = useAuth();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef<number>(0);

  const pendingDepositsCount = depositRequests?.filter((d) => d.status === 'pending').length || 0;
  const pendingWithdrawalsCount = withdrawalRequests?.filter((w) => w.status === 'pending').length || 0;

  useEffect(() => {
    const handleScrollOrTouch = () => {
      const currentScrollY = window.scrollY;

      // When actively scrolling or dragging, hide bottom nav to maximize screen visibility
      if (Math.abs(currentScrollY - lastScrollY.current) > 3) {
        setIsVisible(false);
      }

      // Clear existing stop-timer
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // When scrolling stops for 220ms, float bottom nav into view smoothly
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 220);

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScrollOrTouch, { passive: true });
    window.addEventListener('touchmove', handleScrollOrTouch, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrTouch);
      window.removeEventListener('touchmove', handleScrollOrTouch);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Bottom Navigation Bar items when user is inside the Admin Panel
  const adminNavItems = [
    {
      id: 'overview',
      label: 'Hub',
      icon: LayoutGrid
    },
    {
      id: 'withdrawals',
      label: 'Withdraw',
      icon: DollarSign,
      badge: pendingWithdrawalsCount > 0 ? String(pendingWithdrawalsCount) : undefined
    },
    {
      id: 'deposits',
      label: 'Deposit',
      icon: Wallet,
      badge: pendingDepositsCount > 0 ? String(pendingDepositsCount) : undefined
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users
    },
    {
      id: 'exit',
      label: 'App',
      icon: Home
    }
  ];

  // Standard user platform bottom navigation items
  const userNavItems = [
    {
      id: 'dashboard' as NavigationPage,
      label: 'Home',
      icon: Home
    },
    {
      id: 'game' as NavigationPage,
      label: 'Spin & Win',
      icon: Sparkles,
      badge: 'HOT'
    },
    {
      id: 'code' as NavigationPage,
      label: 'Buy Code',
      icon: Key
    },
    {
      id: 'transactions' as NavigationPage,
      label: 'Ledger',
      icon: History
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as NavigationPage,
            label: 'Admin',
            icon: Shield,
            badge: (pendingWithdrawalsCount + pendingDepositsCount > 0)
              ? String(pendingWithdrawalsCount + pendingDepositsCount)
              : 'DUO'
          }
        ]
      : [
          {
            id: 'profile' as NavigationPage,
            label: 'Profile',
            icon: User
          }
        ])
  ];

  const isInAdminMode = currentPage === 'admin';

  return (
    <nav
      aria-label="Floating main navigation"
      className={`fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out will-change-transform w-full max-w-[calc(100vw-1rem)] sm:max-w-md px-1 sm:px-0 flex justify-center ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 pointer-events-none scale-95'
      }`}
    >
      <div className="mirror-glass-nav rounded-2xl sm:rounded-full px-1.5 sm:px-4 py-1.5 sm:py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-purple-500/30 flex items-center justify-around sm:justify-between gap-0.5 sm:gap-2 w-full">
        {isInAdminMode ? (
          // Admin Mode Navigation Buttons
          adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'exit' ? false : adminSubPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'exit') {
                    setCurrentPage('dashboard');
                  } else if (setAdminSubPage) {
                    setAdminSubPage(item.id as AdminSubPage);
                  }
                }}
                className={`relative flex flex-col items-center justify-center px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-full transition-all duration-200 group active:scale-90 flex-1 min-w-0 max-w-[72px] sm:max-w-none ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-[#7E1DC6] text-white shadow-[0_4px_18px_rgba(255,193,7,0.4)] border border-amber-300/40'
                    : 'text-purple-200/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {/* Dynamic Notification Badge */}
                {item.badge && (
                  <span className="absolute -top-1 sm:-top-1.5 right-0.5 sm:right-1 text-[7px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.2 rounded-full uppercase tracking-tighter bg-amber-500 text-black shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}

                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-105'}`} />
                <span className={`text-[8.5px] sm:text-[11px] font-semibold mt-0.5 tracking-tight truncate max-w-full text-center ${
                  isActive ? 'text-white' : 'text-purple-300/70 group-hover:text-purple-100'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })
        ) : (
          // Main Platform User Navigation Buttons
          userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'profile') {
                    onOpenProfile();
                  } else {
                    setCurrentPage(item.id);
                  }
                }}
                className={`relative flex flex-col items-center justify-center px-1.5 sm:px-4 py-1 sm:py-1.5 rounded-xl sm:rounded-full transition-all duration-200 group active:scale-90 flex-1 min-w-0 max-w-[72px] sm:max-w-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white shadow-[0_4px_18px_rgba(126,29,198,0.5)] border border-purple-300/30'
                    : 'text-purple-200/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {/* Badge if present */}
                {item.badge && (
                  <span className={`absolute -top-1 sm:-top-1.5 right-0.5 sm:right-1 text-[7px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.2 rounded-full uppercase tracking-tighter ${
                    item.badge === 'HOT' ? 'bg-[#FFC107] text-black shadow-sm' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}

                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-105'}`} />
                <span className={`text-[8.5px] sm:text-[11px] font-semibold mt-0.5 tracking-tight truncate max-w-full text-center ${
                  isActive ? 'text-white' : 'text-purple-300/70 group-hover:text-purple-100'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
};

