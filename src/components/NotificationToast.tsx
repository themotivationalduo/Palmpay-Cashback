import React from 'react';
import { CheckCircle2, XCircle, Sparkles, KeyRound, Bell, X, ExternalLink, Zap, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { PlatformNotification } from '../types';

interface NotificationToastProps {
  notification: PlatformNotification | null;
  onClose: () => void;
  onViewDetails: (notif: PlatformNotification) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onViewDetails
}) => {
  if (!notification) return null;

  const isDeposit = notification.type === 'deposit';
  const isWithdrawal = notification.type === 'withdrawal';
  const isCodeApproval = notification.type === 'code' && (notification.title.includes('Revealed') || notification.title.includes('Activated'));
  const isFlashAlert = isDeposit || isWithdrawal || isCodeApproval;

  return (
    <div className="fixed top-2.5 sm:top-4 right-2 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100vw-1rem)] sm:w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`mirror-glass-card rounded-2xl p-4 relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
        isDeposit 
          ? 'border-2 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.5)] bg-[#071d18]/95 animate-pulse' 
          : isWithdrawal 
          ? 'border-2 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.5)] bg-[#1e1305]/95 animate-pulse' 
          : isCodeApproval
          ? 'border-2 border-purple-500/80 shadow-[0_0_35px_rgba(126,29,198,0.5)] bg-[#120822]/95 animate-pulse'
          : 'border border-purple-500/40 shadow-[0_10px_40px_rgba(126,29,198,0.4)] bg-[#140924]/95'
      }`}>
        {/* Animated Flash Header Line */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
          isDeposit 
            ? 'bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500 animate-pulse' 
            : isWithdrawal 
            ? 'bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-500 animate-pulse' 
            : isCodeApproval
            ? 'bg-gradient-to-r from-purple-500 via-amber-300 to-purple-500 animate-pulse'
            : 'bg-gradient-to-r from-purple-500 via-[#FFC107] to-purple-500'
        }`} />

        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[9px] font-extrabold uppercase tracking-wider text-purple-200">
            <Bell className="w-3 h-3 text-[#FFC107]" />
            <span>HEADER NOTIFICATION</span>
          </div>
          {isFlashAlert && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[9px] font-extrabold uppercase tracking-widest text-amber-300 animate-bounce">
              <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>FLASH</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 mt-0.5 shadow-inner ${
            isDeposit 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
              : isWithdrawal 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
              : 'bg-purple-500/20 text-[#FFC107]'
          }`}>
            {isDeposit ? (
              <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
            ) : isWithdrawal ? (
              <ArrowUpCircle className="w-5 h-5 text-amber-400" />
            ) : notification.type === 'reject' ? (
              <XCircle className="w-5 h-5 text-rose-400" />
            ) : notification.type === 'code' ? (
              <KeyRound className="w-5 h-5 text-[#FFC107]" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#FFC107]" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-white truncate">{notification.title}</h4>
              <span className="text-[10px] text-slate-400 font-mono">{notification.timestamp}</span>
            </div>
            <p className="text-[11px] text-purple-200/90 leading-relaxed line-clamp-2">
              {notification.message}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  onViewDetails(notification);
                  onClose();
                }}
                className={`px-3 py-1.5 rounded-xl text-white text-[11px] font-bold hover:opacity-95 shadow-sm flex items-center gap-1 transition-transform active:scale-95 ${
                  isDeposit 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                    : isWithdrawal 
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-black' 
                    : 'bg-gradient-to-r from-[#621494] to-[#7E1DC6]'
                }`}
              >
                <span>View Full Info</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={onClose}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
