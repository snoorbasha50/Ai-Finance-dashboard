interface Props {
  title: string;
  value: string;
  sub?: string;
  color?: 'green' | 'red' | 'blue' | 'purple';
  icon: string;
}

const colors = {
  green: 'border-green-500/30 bg-green-500/5',
  red: 'border-red-500/30 bg-red-500/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
  purple: 'border-accent-500/30 bg-accent-500/5',
};

const textColors = {
  green: 'text-green-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  purple: 'text-accent-400',
};

export default function StatCard({ title, value, sub, color = 'purple', icon }: Props) {
  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
    </div>
  );
}
