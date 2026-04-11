'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/intake', label: 'Business Intake', icon: '📝' },
  { href: '/strategy', label: 'Strategy', icon: '🎯' },
  { href: '/campaigns', label: 'Campaigns', icon: '📣' },
  { href: '/content-calendar', label: 'Content Calendar', icon: '📅' },
  { href: '/seo', label: 'SEO', icon: '🔍' },
  { href: '/lifecycle', label: 'Lifecycle & CRM', icon: '🔄' },
  { href: '/experiments', label: 'Experiments', icon: '🧪' },
  { href: '/reports', label: 'Reports & KPIs', icon: '📈' },
  { href: '/agent', label: 'AI Marketing Agent', icon: '🤖' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-primary">curex24</h1>
        <p className="text-xs text-gray-400 mt-0.5">Marketing Agent</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 space-y-0.5">
          <p className="font-semibold text-gray-500">Marketing Agent v1.0</p>
          <p>Healthcare, anytime. Anywhere.</p>
        </div>
      </div>
    </aside>
  );
}
