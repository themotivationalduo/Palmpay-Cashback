import React, { useState } from 'react';
import { Bell, Settings, Shield, Sparkles, CheckCircle2, AlertCircle, X, ChevronRight, User, KeyRound, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavigationPage, PlatformNotification } from '../types';
import { PalmPayLogo } from './PalmPayLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  currentPage: NavigationPage;
  setCurrentPage: (page: NavigationPage) => void;
  onSelectNotification?: (notif: PlatformNotification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  currentPage,
  setCurrentPage,
  onSelectNotification
}) => {
  const { user, isAdmin, notifications, notificationsCount } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <header className="sticky top-[37px] z-40 w-full mirror-glass border-b border-purple-500/20 px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo Top Left with the exact uploaded PalmPay Logo */}
          <div 
            onClick={() => setCurrentPage('dashboard')}
            className="cursor-pointer group flex items-center"
          >
            <PalmPayLogo size="md" />
          </div>

          {/* Center Navigation Shortcuts for Desktop */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#150A24]/80 p-1 rounded-2xl border border-purple-500/25 shadow-inner">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentPage === 'dashboard'
                  ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-[0_2px_14px_rgba(126,29,198,0.4)]'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/5'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('game')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentPage === 'game'
                  ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-[0_2px_14px_rgba(126,29,198,0.4)]'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
              Spin da' Bottle
            </button>
            <button
              onClick={() => setCurrentPage('code')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentPage === 'code'
                  ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-[0_2px_14px_rgba(126,29,198,0.4)]'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/5'
              }`}
            >
              Buy Code (₦8,550)
            </button>
            <button
              onClick={() => setCurrentPage('transactions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentPage === 'transactions'
                  ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-[0_2px_14px_rgba(126,29,198,0.4)]'
                  : 'text-purple-200/80 hover:text-white hover:bg-white/5'
              }`}
            >
              Ledger
            </button>
            {isAdmin && (
              <button
                onClick={() => setCurrentPage('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  currentPage === 'admin'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Right Header Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstallButton variant="compact" />
            
            {user ? (
              <>
                {/* Admin Quick Mode if admin */}
                {isAdmin && (
                  <div className="hidden md:flex items-center">
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/40 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-amber-400" />
                      <span>Admin Access</span>
                    </span>
                  </div>
                )}

                {/* Notification Bell with Badge */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 rounded-xl mirror-glass hover:bg-purple-900/30 text-purple-200 hover:text-white transition-all active:scale-95 border border-purple-400/20"
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5 text-purple-200" />
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A855F7] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A855F7]"></span>
                    </span>
                  </button>

                  {/* Live Web Notification Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 mirror-glass-card rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 border border-purple-400/30">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#A855F7]" />
                          <span className="font-bold text-sm text-white">Live Notifications</span>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                            {notificationsCount} New
                          </span>
                        </div>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="divide-y divide-white/5 max-h-72 overflow-y-auto mt-2 space-y-2">
                        {notifications.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => {
                                setShowNotifications(false);
                                if (onSelectNotification) onSelectNotification(n);
                              }}
                              className="pt-2 pb-2 px-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-purple-500/15 text-[#A855F7]">
                                  {n.type === 'success' || n.type === 'deposit' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : n.type === 'reject' ? (
                                    <XCircle className="w-4 h-4 text-rose-400" />
                                  ) : n.type === 'code' ? (
                                    <KeyRound className="w-4 h-4 text-[#FFC107]" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 text-[#FFC107]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">{n.timestamp}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 text-center">
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            setCurrentPage('transactions');
                          }}
                          className="text-xs text-[#A855F7] hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          View All Activity Ledger <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings & Profile Gear Icon */}
                <button
                  onClick={onOpenSettings}
                  className="p-2.5 rounded-xl mirror-glass hover:bg-purple-900/30 text-purple-200 hover:text-white transition-all active:scale-95 border border-purple-400/20 group"
                  aria-label="Settings and Profile"
                >
                  <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                </button>

                {/* Profile Avatar Quick View */}
                <div
                  onClick={onOpenSettings}
                  className="cursor-pointer flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/5 border border-transparent hover:border-purple-400/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#621494] via-[#7E1DC6] to-[#A855F7] p-[1.5px] shadow-sm">
                    <div className="w-full h-full rounded-full bg-[#120A1E] flex items-center justify-center text-xs font-bold text-white uppercase">
                      {user.displayName ? user.displayName.slice(0, 2) : 'PM'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-300/80 hidden sm:inline">New user?</span>
                <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white text-xs font-bold shadow-md border border-purple-300/30">
                  Registration Required
                </span>
              </div>
            )}

          </div>

        </div>
      </header>
    </>
  );
};

