import React from 'react';
import { CheckCircle2, XCircle, Sparkles, KeyRound, Bell, X, ExternalLink } from 'lucide-react';
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

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="mirror-glass-card rounded-2xl p-4 border border-purple-500/40 shadow-[0_10px_40px_rgba(126,29,198,0.4)] bg-[#140924]/95 backdrop-blur-xl relative overflow-hidden">
        {/* Top gold shine */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-[#FFC107] to-purple-500" />

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-[#FFC107] shrink-0 mt-0.5 shadow-inner">
            {notification.type === 'success' || notification.type === 'deposit' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
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
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white text-[11px] font-bold hover:opacity-95 shadow-sm flex items-center gap-1 transition-transform active:scale-95"
              >
                <span>View Full Info</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={onClose}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-semibold transition-colors"
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
