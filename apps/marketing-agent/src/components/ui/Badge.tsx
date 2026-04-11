interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  children: React.ReactNode;
  className?: string;
}

const variants: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    'on-track': { variant: 'success', label: 'On Track' },
    'at-risk': { variant: 'warning', label: 'At Risk' },
    'behind': { variant: 'error', label: 'Behind' },
    active: { variant: 'success', label: 'Active' },
    planned: { variant: 'info', label: 'Planned' },
    completed: { variant: 'default', label: 'Completed' },
    paused: { variant: 'warning', label: 'Paused' },
    draft: { variant: 'warning', label: 'Draft' },
    running: { variant: 'purple', label: 'Running' },
    live: { variant: 'success', label: 'Live' },
    'in-progress': { variant: 'info', label: 'In Progress' },
    published: { variant: 'success', label: 'Published' },
    ready: { variant: 'info', label: 'Ready' },
  };
  const config = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
