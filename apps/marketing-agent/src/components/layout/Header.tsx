'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Marketing Dashboard', subtitle: 'North star metrics, quick actions, and weekly priorities' },
  '/intake': { title: 'Business Intake', subtitle: 'Answer key questions to personalise your marketing strategy' },
  '/strategy': { title: 'Marketing Strategy', subtitle: 'Full strategy framework: brand, GTM, channels, lifecycle, growth' },
  '/campaigns': { title: 'Campaigns', subtitle: 'Campaign briefs, ad copy, and execution tracking' },
  '/content-calendar': { title: 'Content Calendar', subtitle: 'Monthly content plan across platforms and pillars' },
  '/seo': { title: 'SEO Strategy', subtitle: 'Keyword clusters, content SEO pages, and ranking opportunities' },
  '/lifecycle': { title: 'Lifecycle & CRM', subtitle: 'Member onboarding, re-engagement, and retention flows' },
  '/experiments': { title: 'Experiments', subtitle: 'A/B tests, experiment log, results, and learnings' },
  '/reports': { title: 'Reports & KPIs', subtitle: 'Performance reporting, funnel analysis, and channel comparison' },
  '/agent': { title: 'AI Marketing Agent', subtitle: 'Chat with your AI CMO for strategy, copy, and execution guidance' },
  '/create': { title: 'AI Content Studio', subtitle: 'Generate posts, visuals, and ad creatives — powered by ChatGPT, DALL-E 3, Midjourney, and more' },
};

export default function Header() {
  const pathname = usePathname() ?? '/dashboard';
  const { user, logout } = useAuth();
  const meta = pageTitles[pathname] ?? { title: 'Marketing Agent', subtitle: '' };

  const initials = user?.email ? user.email[0].toUpperCase() : 'M';

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{meta.title}</h2>
        {meta.subtitle && <p className="text-sm text-gray-500 mt-0.5">{meta.subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 leading-none">{user.email}</p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{user.role.toLowerCase()}</p>
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          {initials}
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
