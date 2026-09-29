import React, { useState } from 'react';
import { History, ArrowDownLeft, ArrowUpRight, Sparkles, Filter, Search, ChevronRight, CheckCircle2, Clock, X, ExternalLink, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types';

interface TransactionsLedgerProps {
  isFullPage?: boolean;
  onViewAll?: () => void;
}

export const TransactionsLedger: React.FC<TransactionsLedgerProps> = ({
  isFullPage = false,
  onViewAll
}) => {
  const { transactions } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const formatTimestamp = (ts: number | string) => {
    const num = Number(ts);
    if (!isNaN(num)) {
      const date = new Date(num);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return String(ts);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = tx.title.toLowerCase().includes(q);
      const emailMatch = tx.email && tx.email.toLowerCase().includes(q);
      const refMatch = tx.reference && tx.reference.toLowerCase().includes(q);
      const amountMatch = String(tx.amount).includes(q);
      const dateStr = formatTimestamp(tx.timestamp).toLowerCase();
      const dateMatch = dateStr.includes(q);
      return titleMatch || emailMatch || refMatch || amountMatch || dateMatch;
    }
    return true;
  });

  const displayList = isFullPage ? filteredTransactions : filteredTransactions.slice(0, 5);

  return (
    <div className="w-full space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#00B875]" />
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Recent Transactions &amp; Community Payouts
          </h3>
        </div>

        {!isFullPage && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-[#00B875] hover:text-white font-semibold flex items-center gap-1 hover:underline transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* PalmPay Community & CBN Regulation Approval Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-purple-900/30 to-black/60 border border-purple-500/30 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-purple-600/30 text-[#FFC107] shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="text-xs text-purple-200/90 space-y-0.5">
          <div className="font-bold text-white flex items-center gap-2">
            <span>PalmPay Community &amp; CBN Regulatory Compliance</span>
            <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/30 font-black">
              Strictly Regulated
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            All payments, bonuses, deposits, and payouts remain strictly <strong className="text-amber-400">PENDING</strong> until explicitly verified and approved by the PalmPay Community validation network &amp; CBN-regulated interbank settlement committee.
          </p>
        </div>
      </div>

      {/* Always-visible Search & Filter Bar at the top of TransactionsLedger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 mirror-glass p-1 rounded-xl border border-purple-500/20 w-fit">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white shadow-sm'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'credit'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            Credits (+)
          </button>
          <button
            onClick={() => setFilterType('debit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'debit'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Debits (-)
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by date, amount, name, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#120B20] text-white text-xs rounded-xl pl-10 pr-3 py-2.5 border border-purple-500/30 focus:outline-none focus:border-[#00B875] shadow-inner"
          />
        </div>
      </div>

      {/* Itemized Transactions List */}
      <div className="mirror-glass-card rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-lg">
        {displayList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions found matching your criteria.
          </div>
        ) : (
          displayList.map((tx) => {
            const isCredit = tx.type === 'credit';
            const amountPrefix = isCredit ? '+₦' : '-₦';
            const amountColor = isCredit ? 'text-[#00B875]' : 'text-rose-400';
            const tagBg = isCredit ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-rose-500/15 border-rose-500/30';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-3.5 sm:p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
              >
                {/* Left side icon & info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${tagBg}`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="w-5 h-5 text-[#00B875]" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-rose-400" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00B875] transition-colors">
                      {tx.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{formatTimestamp(tx.timestamp)}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400 uppercase text-[10px]">
                        {tx.reference || 'COMPLETED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side amount & status pill */}
                <div className="text-right shrink-0 space-y-1">
                  <div className={`text-sm sm:text-base font-extrabold font-mono ${amountColor}`}>
                    {amountPrefix}{tx.amount.toLocaleString()}
                  </div>
                  <div>
                    {tx.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/40 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Pending Community</span>
                      </span>
                    ) : tx.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        <X className="w-3 h-3 text-rose-400" />
                        <span>Rejected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00B875] border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-[#00B875]" />
                        <span>Approved &amp; Settled</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-sm w-full rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border mb-3 ${
                selectedTx.type === 'credit' ? 'bg-emerald-500/20 border-emerald-500/40 text-[#00B875]' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}>
                {selectedTx.type === 'credit' ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                PalmPay Community Receipt
              </span>

              <h4 className="text-lg font-bold text-white mt-1">
                {selectedTx.title}
              </h4>

              <div className={`text-2xl font-black font-mono mt-1 ${
                selectedTx.type === 'credit' ? 'text-[#00B875]' : 'text-rose-400'
              }`}>
                {selectedTx.type === 'credit' ? '+' : '-'}₦{selectedTx.amount.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Community Status:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  selectedTx.status === 'pending' ? 'text-amber-400' : selectedTx.status === 'rejected' ? 'text-rose-400' : 'text-[#00B875]'
                }`}>
                  {selectedTx.status === 'pending' ? <><Clock className="w-3.5 h-3.5" /> Pending Community Approval</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Approved by PalmPay Community</>}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Timestamp:</span>
                <span className="text-slate-200">{formatTimestamp(selectedTx.timestamp)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Reference:</span>
                <span className="font-mono text-amber-400 font-bold">{selectedTx.reference || 'PALM-COMMUNITY-PENDING'}</span>
              </div>
              <div className="pt-2 border-t border-white/10 text-[11px] text-purple-200/80 leading-relaxed">
                ℹ️ All payments stay pending until verified and approved by the PalmPay community validators under CBN regulatory oversight.
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
