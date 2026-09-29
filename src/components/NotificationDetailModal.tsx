import React from 'react';
import { X, CheckCircle2, XCircle, KeyRound, ShieldCheck, Sparkles, Calendar, FileText, ExternalLink } from 'lucide-react';
import { PlatformNotification } from '../types';

interface NotificationDetailModalProps {
  notification: PlatformNotification | null;
  onClose: () => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose
}) => {
  if (!notification) return null;

  const details = notification.fullDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="mirror-glass-card rounded-3xl max-w-lg w-full p-6 border border-purple-500/30 shadow-[0_20px_60px_rgba(126,29,198,0.5)] relative overflow-hidden space-y-5">
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-[#FFC107] to-purple-600" />

        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-[#FFC107]">
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
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Poppins',sans-serif]">
                {notification.title}
              </h3>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3" /> {notification.timestamp}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl mirror-glass hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Banner */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">Notification Message</span>
          <p className="text-xs sm:text-sm text-white leading-relaxed">
            {notification.message}
          </p>
        </div>

        {/* Structured Full Information Details */}
        {details && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-purple-200 tracking-wider uppercase flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#FFC107]" /> Transaction &amp; Order Full Info
            </h4>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs">
              {details.amount && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Amount:</span>
                  <strong className="text-emerald-400 font-mono text-sm">₦{details.amount.toLocaleString()}</strong>
                </div>
              )}

              {details.status && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    details.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    details.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-amber-500/20 text-[#FFC107] border border-amber-500/30'
                  }`}>
                    {details.status}
                  </span>
                </div>
              )}

              {details.reference && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">Reference:</span>
                  <code className="text-purple-300 font-mono">{details.reference}</code>
                </div>
              )}

              {details.code && (
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400">CashBack Code:</span>
                  <code className="text-[#FFC107] font-mono font-bold">{details.code}</code>
                </div>
              )}

              {details.adminNote && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-1">Admin / Review Note:</span>
                  <p className="p-2.5 rounded-xl bg-white/5 text-rose-200 italic text-[11px] border border-white/10">
                    "{details.adminNote}"
                  </p>
                </div>
              )}

              {details.receiptImage && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Submitted Receipt:</span>
                  <div className="rounded-xl overflow-hidden border border-white/15 max-h-48 flex items-center justify-center bg-black">
                    <img src={details.receiptImage} alt="Deposit Receipt" className="max-h-48 object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all"
          >
            Close &amp; Got It
          </button>
        </div>
      </div>
    </div>
  );
};
