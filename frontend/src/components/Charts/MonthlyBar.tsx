import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyData } from '../../types';

interface Props { data: MonthlyData[] }

export default function MonthlyBar({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-64 text-gray-500">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={4}>
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
          contentStyle={{ backgroundColor: '#12121a', border: '1px solid #22223a', borderRadius: '8px' }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
