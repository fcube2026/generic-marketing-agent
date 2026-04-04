export const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
export const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const formatDateTime = (d: string) => `${formatDate(d)} at ${formatTime(d)}`;
