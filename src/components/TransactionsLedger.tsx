import React, { useState } from 'react';
import { History, ArrowDownLeft, ArrowUpRight, Search, ChevronRight, CheckCircle2, Clock, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TransactionsLedgerProps {
  isFullPage?: boolean;
  onViewAll?: () => void;
}

interface LedgerItem {
  id: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'approved' | 'rejected' | 'won';
  reference?: string;
  email?: string;
  balanceSource?: 'cashback' | 'deposit';
}

export const TransactionsLedger: React.FC<TransactionsLedgerProps> = ({
  isFullPage = false,
  onViewAll
}) => {
  const { transactions, depositRequests, withdrawalRequests } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<LedgerItem | null>(null);

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

  // Combine completed transactions with pending deposit and withdrawal requests
  const allLedgerItems: LedgerItem[] = [];
  const txReferences = new Set(transactions.map((t) => t.reference));

  // 1. Add deposit requests (filtering out completed ones if already in transactions list)
  (depositRequests || []).forEach((dep) => {
    if (!txReferences.has(dep.paymentReference)) {
      allLedgerItems.push({
        id: dep.id,
        title: `Deposit Request (₦${dep.amount.toLocaleString()})`,
        amount: dep.amount,
        type: 'credit',
        category: 'deposit',
        timestamp: Number(dep.createdAt || Date.now()),
        status: dep.status === 'approved' ? 'completed' : (dep.status as any),
        reference: dep.paymentReference || dep.id,
        email: dep.userEmail,
        balanceSource: 'deposit'
      });
    }
  });

  // 2. Add withdrawal requests (only if not already tracked in transactions)
  (withdrawalRequests || []).forEach((wd) => {
    if (!txReferences.has(wd.reference)) {
      allLedgerItems.push({
        id: wd.id,
        title: `Withdrawal Request to ${wd.bankName} (${wd.accountNumber ? wd.accountNumber.slice(0, 3) + '***' : ''})`,
        amount: wd.amount,
        type: 'debit',
        category: 'withdrawal',
        timestamp: Number(wd.createdAt || Date.now()),
        status: (wd.status === 'approved' || wd.status === 'successful') ? 'completed' : (wd.status === 'failed' || wd.status === 'rejected') ? 'rejected' : (wd.status as any),
        reference: wd.reference || wd.id,
        email: wd.userEmail,
        balanceSource: wd.balanceSource || 'cashback'
      });
    }
  });

  // 3. Add regular transactions (resolving latest approval status from requests)
  (transactions || []).forEach((tx) => {
    const matchingWd = (withdrawalRequests || []).find(
      (w) => w.reference === tx.reference || w.id === tx.id || `WD-${w.id}` === tx.reference || `WD-${w.reference}` === tx.reference
    );
    const matchingDep = (depositRequests || []).find(
      (d) => d.paymentReference === tx.reference || d.id === tx.id
    );

    let resolvedStatus: 'pending' | 'completed' | 'approved' | 'rejected' | 'won' = 
      (tx.status as string) === 'approved' ? 'completed' : (tx.status as any);
    let resolvedTitle = tx.title;

    if (matchingWd) {
      if (matchingWd.status === 'successful' || matchingWd.status === 'approved') {
        resolvedStatus = 'completed';
        if (resolvedTitle.toLowerCase().includes('pending') || resolvedTitle.startsWith('Withdrawal Request')) {
          resolvedTitle = `Withdrawal to ${matchingWd.bankName || 'PalmPay Account'} (${matchingWd.accountNumber ? matchingWd.accountNumber.slice(0, 3) + '***' : ''})`;
        }
      } else if (matchingWd.status === 'rejected' || matchingWd.status === 'failed') {
        resolvedStatus = 'rejected';
      }
    } else if (matchingDep) {
      if (matchingDep.status === 'approved') {
        resolvedStatus = 'completed';
        if (resolvedTitle.toLowerCase().includes('pending') || resolvedTitle.startsWith('Deposit Request')) {
          resolvedTitle = `Deposit Credited (₦${matchingDep.amount.toLocaleString()})`;
        }
      } else if (matchingDep.status === 'rejected') {
        resolvedStatus = 'rejected';
      }
    }

    allLedgerItems.push({
      id: tx.id,
      title: resolvedTitle,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      timestamp: Number(tx.timestamp),
      status: resolvedStatus,
      reference: tx.reference,
      email: tx.email,
      balanceSource: tx.balanceSource
    });
  });

  // Deduplicate and sort descending by date
  const seenIds = new Set<string>();
  const seenRefs = new Set<string>();
  const uniqueItems: LedgerItem[] = [];

  allLedgerItems
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((item) => {
      const refKey = item.reference ? item.reference : null;
      if (!seenIds.has(item.id) && (!refKey || !seenRefs.has(refKey))) {
        seenIds.add(item.id);
        if (refKey) seenRefs.add(refKey);
        uniqueItems.push(item);
      }
    });

  const filteredTransactions = uniqueItems.filter((tx) => {
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
            Recent Activity &amp; Approval Ledger
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

      {/* Regulation Approval Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-purple-900/30 to-black/60 border border-purple-500/30 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-purple-600/30 text-[#FFC107] shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="text-xs text-purple-200/90 space-y-0.5">
          <div className="font-bold text-white flex items-center gap-2">
            <span>PalmPay Approval &amp; Settlement System</span>
            <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/30 font-black">
              ADMIN VERIFIED
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            All deposit and withdrawal items display real-time <strong className="text-amber-400">PENDING</strong> or <strong className="text-emerald-400">COMPLETED</strong> approval status badges. Balance is updated upon Admin approval.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
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
            No items found matching your filter criteria.
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
                className="p-3 sm:p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 group"
              >
                {/* Left side icon & info */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${tagBg}`}
                  >
                    {isCredit ? (
                      <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#00B875]" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00B875] transition-colors truncate">
                      {tx.title}
                    </h4>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
                      <span className="shrink-0">{formatTimestamp(tx.timestamp)}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400 uppercase text-[9px] sm:text-[10px] truncate">
                        {tx.reference || 'REF-N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side amount & explicit status badge */}
                <div className="text-right shrink-0 space-y-0.5 sm:space-y-1">
                  <div className={`text-xs sm:text-base font-extrabold font-mono ${amountColor}`}>
                    {amountPrefix}{tx.amount.toLocaleString()}
                  </div>
                  <div>
                    {tx.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/40 animate-pulse shadow-sm">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#FFC107]" />
                        <span className="hidden xs:inline">Pending</span>
                        <span className="xs:hidden">Wait</span>
                      </span>
                    ) : tx.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400" />
                        <span>Declined</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#00B875] border border-emerald-500/40 shadow-sm">
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#00B875]" />
                        <span>Done</span>
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
                PalmPay Transaction Receipt
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
                <span>Approval Status:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  selectedTx.status === 'pending' ? 'text-amber-400' : selectedTx.status === 'rejected' ? 'text-rose-400' : 'text-[#00B875]'
                }`}>
                  {selectedTx.status === 'pending' ? (
                    <><Clock className="w-3.5 h-3.5 text-[#FFC107]" /> Pending Admin Approval</>
                  ) : selectedTx.status === 'rejected' ? (
                    <><X className="w-3.5 h-3.5 text-rose-400" /> Declined by Admin</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-[#00B875]" /> Approved &amp; Completed</>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Date &amp; Time:</span>
                <span className="text-slate-200">{formatTimestamp(selectedTx.timestamp)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Reference ID:</span>
                <span className="font-mono text-amber-400 font-bold">{selectedTx.reference || 'REF-PENDING'}</span>
              </div>
              <div className="pt-2 border-t border-white/10 text-[11px] text-purple-200/80 leading-relaxed">
                ℹ️ Deposits and withdrawals require Admin approval on the Control Panel before balance updates and disbursements complete.
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
