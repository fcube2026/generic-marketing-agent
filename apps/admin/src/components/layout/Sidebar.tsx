'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/providers', label: 'Providers', icon: '👨‍⚕️' },
  { href: '/bookings', label: 'Bookings', icon: '📋' },
  { href: '/payouts', label: 'Payouts', icon: '💰' },
  { href: '/diagnostics', label: 'Diagnostics', icon: '🧪' },
  { href: '/support', label: 'Support', icon: '💬' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-primary">Curex24</h1>
        <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Healthcare, anytime. Anywhere.</p>
      </div>
    </aside>
  );
}
