interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function Card({ title, subtitle, children, className = '', action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  target?: string;
  highlight?: boolean;
  status?: 'on-track' | 'at-risk' | 'behind';
}

const statusColors: Record<string, string> = {
  'on-track': 'border-green-400 ring-1 ring-green-100',
  'at-risk': 'border-yellow-400 ring-1 ring-yellow-100',
  'behind': 'border-red-400 ring-1 ring-red-100',
};

const trendColors: Record<string, string> = {
  'on-track': 'text-green-600',
  'at-risk': 'text-yellow-600',
  'behind': 'text-red-600',
};

export function StatCard({ label, value, icon, trend, target, highlight, status }: StatCardProps) {
  const borderClass = status ? statusColors[status] : highlight ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200';
  const trendClass = status ? trendColors[status] : 'text-green-600';
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${borderClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {trend && <span className={`text-xs font-medium ${trendClass}`}>{trend}</span>}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mt-3">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {target && <p className="text-xs text-gray-400 mt-1">Target: {target}</p>}
    </div>
  );
}
