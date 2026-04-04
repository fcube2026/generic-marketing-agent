interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-100">
          {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
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
  highlight?: boolean;
}

export function StatCard({ label, value, icon, trend, highlight }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${highlight ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {trend && <span className="text-xs font-medium text-green-600">{trend}</span>}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 mt-3">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
