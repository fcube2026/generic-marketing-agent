'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const [initials, setInitials] = useState('DR');

  useEffect(() => {
    api
      .get('/providers/me')
      .then((res) => {
        const name: string = res.data?.name ?? '';
        const parts = name.replace(/^Dr\.?\s*/i, '').split(' ').filter(Boolean);
        const computed = parts.slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');
        if (computed) setInitials(computed);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('provider_token');
    localStorage.removeItem('provider_user');
    document.cookie = 'provider_token=; path=/; max-age=0; SameSite=Lax';
    router.push('/login');
  };

  return (
    <header
      className="h-14 bg-white border-b border-surface-border flex items-center justify-between px-6 shrink-0"
      data-testid="header"
    >
      {/* Left — breadcrumb / title */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="font-semibold text-navy">Doctor Portal</span>
        <span className="text-gray-300">|</span>
        <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-white font-semibold px-2.5 py-1 rounded-full border border-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
          Live Data
        </span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        {/* Quick UHID search */}
        <Link
          href="/patients"
          className="flex items-center gap-2 bg-surface-muted border border-surface-border text-gray-500 hover:text-navy hover:border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search Patient / UHID
          <kbd className="hidden sm:inline-flex text-[9px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-400">⌘K</kbd>
        </Link>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg border border-surface-border bg-surface-muted flex items-center justify-center text-gray-500 hover:text-navy hover:bg-white transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-medical-red rounded-full ring-1 ring-white" />
        </button>

        {/* Avatar + logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
          <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="text-xs text-gray-500 hover:text-medical-red font-medium transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
