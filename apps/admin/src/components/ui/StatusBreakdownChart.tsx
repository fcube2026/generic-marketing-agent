const STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#f59e0b',
  ACCEPTED: '#3b82f6',
  DECLINED: '#ef4444',
  ON_THE_WAY: '#8b5cf6',
  ARRIVED: '#6366f1',
  IN_PROGRESS: '#14b8a6',
  COMPLETED: '#22c55e',
  SUMMARY_SUBMITTED: '#10b981',
  CLOSED: '#6b7280',
  CANCELLED: '#dc2626',
};

interface StatusBreakdownChartProps {
  data: Record<string, number>;
}

export default function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Bookings by Status</h3>
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Bookings by Status</h3>
      <div className="space-y-2">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-32 truncate" title={status}>
              {status.replace(/_/g, ' ')}
            </span>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: STATUS_COLORS[status] || '#6b7280',
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-8 text-right">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
