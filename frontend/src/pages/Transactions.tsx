import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import { Transaction } from '../types';

const CATEGORIES = ['All', 'Food & Dining', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Healthcare', 'Income', 'Investment', 'Education', 'Other'];

function badge(type: string) {
  return type === 'credit'
    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
    : 'bg-red-500/20 text-red-400 border border-red-500/30';
}

function exportCSV(transactions: Transaction[]) {
  const rows = [
    ['Date', 'Description', 'Category', 'Type', 'Amount'],
    ...transactions.map((t) => [
      new Date(t.date).toLocaleDateString('en-IN'),
      t.cleanDescription,
      t.category,
      t.type,
      t.amount,
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
}

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, category, type, search],
    queryFn: () =>
      transactionsApi.getAll({ page, limit: 20, category: category || undefined, type: type || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Transactions</h2>
        {data?.data && (
          <button
            onClick={() => exportCSV(data.data)}
            className="bg-dark-700 hover:bg-dark-600 border border-dark-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Export CSV ↓
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent-500 w-64"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-gray-300 text-sm focus:outline-none focus:border-accent-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c === 'All' ? '' : c}>{c}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-gray-300 text-sm focus:outline-none focus:border-accent-500"
        >
          <option value="">All Types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left p-4 text-xs text-gray-500 font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left p-4 text-xs text-gray-500 font-medium uppercase tracking-wider">Description</th>
                  <th className="text-left p-4 text-xs text-gray-500 font-medium uppercase tracking-wider">Category</th>
                  <th className="text-left p-4 text-xs text-gray-500 font-medium uppercase tracking-wider">Type</th>
                  <th className="text-right p-4 text-xs text-gray-500 font-medium uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((t) => (
                  <tr key={t.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                    <td className="p-4 text-sm text-gray-400">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                    <td className="p-4">
                      <p className="text-sm text-white">{t.cleanDescription}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{t.description}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-300">{t.category}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${badge(t.type)}`}>{t.type}</span>
                    </td>
                    <td className={`p-4 text-sm font-semibold text-right ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-dark-600">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.total)} of {data.total}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 rounded bg-dark-700 text-gray-300 text-sm disabled:opacity-40 hover:bg-dark-600"
                  >← Prev</button>
                  <button
                    disabled={page >= data.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 rounded bg-dark-700 text-gray-300 text-sm disabled:opacity-40 hover:bg-dark-600"
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
