import React from 'react';
import { ShieldCheck, ExternalLink, WifiOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TopAlertBanner: React.FC = () => {
  const { isOnline, isLowNetwork } = useAuth();

  if (!isOnline || isLowNetwork) {
    return (
      <aside aria-label="Network alert banner" className="w-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white py-2 px-3 sm:px-6 shadow-md border-b border-amber-400/40 sticky top-0 z-50 animate-pulse">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs sm:text-sm font-medium tracking-wide">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-300 animate-ping shrink-0" />
            {!isOnline ? <WifiOff className="w-4 h-4 shrink-0 text-amber-200" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />}
            <span className="font-bold tracking-tight uppercase text-[10px] sm:text-xs bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-300/40 text-amber-200">
              {!isOnline ? 'OFFLINE MODE' : 'LOW NETWORK DETECTED'}
            </span>
            <span className="truncate font-semibold text-amber-100">
              {!isOnline 
                ? 'Device is offline. Local balances and claims are safely cached and auto-sync when online.' 
                : 'Network signal is low or slow. Transactions and claims will auto-sync with Firestore once network stabilizes.'}
            </span>
          </div>

          <span className="hidden md:inline-block text-[11px] font-mono bg-black/30 px-2 py-0.5 rounded-lg border border-amber-300/30 text-amber-200 shrink-0">
            Auto-Sync Active
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Official verification banner" className="w-full bg-gradient-to-r from-[#4A0C72] via-[#621494] to-[#7E1DC6] text-white py-2 px-3 sm:px-6 shadow-md border-b border-purple-400/30 sticky top-0 z-50 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs sm:text-sm font-medium tracking-wide">
        
        {/* Left Badge Indicator */}
        <div className="flex items-center gap-2 shrink-0 z-10 bg-gradient-to-r from-[#4A0C72] to-[#621494] pr-3 py-0.5">
          <span className="flex h-2 w-2 rounded-full bg-[#FFC107] animate-ping shrink-0" />
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#FFC107]" />
          <span className="font-bold tracking-tight uppercase text-[10px] sm:text-xs bg-black/40 px-2.5 py-0.5 rounded-full border border-purple-300/30 text-purple-200">
            OFFICIAL PORTAL
          </span>
        </div>

        {/* Continuous Horizontally Moving Text Container */}
        <div className="flex-1 overflow-hidden relative font-semibold text-xs sm:text-sm mx-1 sm:mx-2 cursor-pointer">
          <div className="animate-horizontal-marquee inline-flex items-center gap-12 select-none">
            
            {/* Set 1 */}
            <span className="flex items-center gap-2 text-white">
              <span>PalmPayCashBack — Only valid on</span>
              <a 
                href="https://www.palmpay-cashback.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline decoration-[#FFC107] font-bold text-[#FFC107] hover:text-white"
              >
                https://www.palmpay-cashback.vercel.app
              </a>
            </span>

            <span className="flex items-center gap-2 text-purple-200">
              <span>🛡️ Official CBN Clearance Protocol — 100% Interbank Disburser Channel</span>
            </span>

            <span className="flex items-center gap-2 text-emerald-300">
              <span>⚡ PalmPay CashBack Vault — Instant Withdrawals to PalmPay Bank</span>
            </span>

            {/* Set 2 (Duplicate for Seamless Endless Horizontal Marquee Loop) */}
            <span className="flex items-center gap-2 text-white">
              <span>PalmPayCashBack — Only valid on</span>
              <a 
                href="https://www.palmpay-cashback.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline decoration-[#FFC107] font-bold text-[#FFC107] hover:text-white"
              >
                https://www.palmpay-cashback.vercel.app
              </a>
            </span>

            <span className="flex items-center gap-2 text-purple-200">
              <span>🛡️ Official CBN Clearance Protocol — 100% Interbank Disburser Channel</span>
            </span>

            <span className="flex items-center gap-2 text-emerald-300">
              <span>⚡ PalmPay CashBack Vault — Instant Withdrawals to PalmPay Bank</span>
            </span>

          </div>
        </div>

        {/* Right Action / Security Indicators */}
        <div className="hidden md:flex items-center gap-3 shrink-0 text-xs z-10 bg-gradient-to-l from-[#7E1DC6] to-[#621494] pl-3 py-0.5">
          <span className="bg-black/25 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/20 flex items-center gap-1 font-mono text-purple-200">
            SSL 256-bit
          </span>
          <a
            href="https://www.palmpay-cashback.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 opacity-90 hover:opacity-100 font-semibold text-purple-100"
          >
            Verify <ExternalLink className="w-3 h-3 text-[#FFC107]" />
          </a>
        </div>

      </div>
    </aside>
  );
};

