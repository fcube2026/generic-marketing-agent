interface MiniBarChartProps {
  data: Record<string, number>;
  label: string;
  color?: string;
  formatValue?: (v: number) => string;
}

const MIN_BAR_HEIGHT_PERCENT = 2;

export default function MiniBarChart({
  data,
  label,
  color = '#6366f1',
  formatValue = (v) => String(v),
}: MiniBarChartProps) {
  const entries = Object.entries(data);
  const values = entries.map(([, v]) => v);
  const max = Math.max(...values, 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{label}</h3>
      <div className="flex items-end gap-[2px] h-32">
        {entries.map(([date, value]) => (
          <div
            key={date}
            className="flex-1 group relative"
            title={`${date}: ${formatValue(value)}`}
          >
            <div
              className="w-full rounded-t transition-all duration-200 group-hover:opacity-80"
              style={{
                height: `${Math.max((value / max) * 100, MIN_BAR_HEIGHT_PERCENT)}%`,
                backgroundColor: color,
              }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {date.slice(5)}: {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{entries[0]?.[0]?.slice(5) ?? ''}</span>
        <span>{entries[entries.length - 1]?.[0]?.slice(5) ?? ''}</span>
      </div>
    </div>
  );
}
