interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

const variants: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    REQUESTED: { variant: 'warning', label: 'Requested' },
    ACCEPTED: { variant: 'info', label: 'Accepted' },
    ON_THE_WAY: { variant: 'info', label: 'On the Way' },
    ARRIVED: { variant: 'info', label: 'Arrived' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    SUMMARY_SUBMITTED: { variant: 'success', label: 'Summary Submitted' },
    CLOSED: { variant: 'default', label: 'Closed' },
    CANCELLED: { variant: 'error', label: 'Cancelled' },
    PENDING: { variant: 'warning', label: 'Pending' },
    PAID: { variant: 'success', label: 'Paid' },
    REFUNDED: { variant: 'error', label: 'Refunded' },
    SCHEDULED: { variant: 'info', label: 'Scheduled' },
    COLLECTED: { variant: 'info', label: 'Collected' },
    RESULTED: { variant: 'success', label: 'Resulted' },
  };
  const config = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
