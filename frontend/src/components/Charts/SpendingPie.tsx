import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'];

interface Props {
  data: { category: string; amount: number }[];
}

export default function SpendingPie({ data }: Props) {
  if (!data.length) return <div className="flex items-center justify-center h-64 text-gray-500">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="amount"
          nameKey="category"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
          contentStyle={{ backgroundColor: '#1a1a27', border: '1px solid #2d2d4a', borderRadius: '8px', padding: '8px 12px' }}
          labelStyle={{ color: '#ffffff', fontWeight: 600 }}
          itemStyle={{ color: '#d1d5db' }}
        />
        <Legend
          formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
