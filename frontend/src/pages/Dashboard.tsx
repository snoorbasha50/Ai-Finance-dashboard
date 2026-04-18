import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import { useSocket } from '../hooks/useSocket';
import { Transaction } from '../types';
import StatCard from '../components/StatCard';
import SpendingPie from '../components/Charts/SpendingPie';
import MonthlyBar from '../components/Charts/MonthlyBar';

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([]);
  const [pulse, setPulse] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: () => transactionsApi.getSummary().then((r) => r.data),
  });

  const { data: monthly } = useQuery({
    queryKey: ['monthly'],
    queryFn: () => transactionsApi.getMonthly().then((r) => r.data),
  });

  const onNewTransaction = useCallback((t: Transaction) => {
    setLiveTransactions((prev) => [t, ...prev].slice(0, 10));
    setPulse(true);
    setTimeout(() => setPulse(false), 2000);
    qc.invalidateQueries({ queryKey: ['summary'] });
  }, [qc]);

  useSocket(onNewTransaction);

  const sendMock = async () => {
    await transactionsApi.createMock();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Your financial overview</p>
        </div>
        <button
          onClick={sendMock}
          className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <span className={`w-2 h-2 rounded-full bg-green-400 ${pulse ? 'animate-ping' : ''}`} />
          Send Mock Transaction
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Income" value={fmt(summary?.totalIncome || 0)} icon="💚" color="green" sub="All credits" />
        <StatCard title="Total Expense" value={fmt(summary?.totalExpense || 0)} icon="🔴" color="red" sub="All debits" />
        <StatCard title="Net Savings" value={fmt(summary?.netSavings || 0)} icon="💰" color="blue" sub="Income - Expense" />
        <StatCard title="Transactions" value={String(summary?.transactionCount || 0)} icon="📊" color="purple" sub="Total records" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
          <h3 className="text-white font-semibold mb-4">Spending by Category</h3>
          <SpendingPie data={summary?.categoryBreakdown || []} />
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
          <h3 className="text-white font-semibold mb-4">Monthly Overview</h3>
          <MonthlyBar data={monthly || []} />
        </div>
      </div>

      {/* Live feed */}
      {liveTransactions.length > 0 && (
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="text-white font-semibold">Live Transaction Feed</h3>
          </div>
          <div className="space-y-2">
            {liveTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-dark-600 last:border-0">
                <div>
                  <p className="text-sm text-white">{t.cleanDescription}</p>
                  <p className="text-xs text-gray-500">{t.category}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
