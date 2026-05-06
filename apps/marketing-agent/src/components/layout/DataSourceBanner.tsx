'use client';

/**
 * Small pill in the header that shows which data source is currently
 * powering the app — Mock, External API, or a configured DB.
 *
 * Polls `/api/backend/datasource/status` every 30s so users see config
 * changes from the Settings page without a hard refresh.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Status {
  kind: 'mock' | 'sql' | 'rest';
  label: string;
  detail?: string;
  degraded?: boolean;
}

export default function DataSourceBanner() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get<Status>('/datasource/status');
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus(null);
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!status) return null;

  const tone = status.degraded
    ? 'bg-red-50 text-red-700 border-red-200'
    : status.kind === 'sql'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-gray-50 text-gray-600 border-gray-200';

  const dot = status.degraded
    ? 'bg-red-500'
    : status.kind === 'sql'
      ? 'bg-green-500'
      : 'bg-gray-400';

  return (
    <Link
      href="/settings/data-source"
      title={status.detail || status.label}
      className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium hover:opacity-90 transition ${tone}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="truncate max-w-[200px]">{status.label}</span>
    </Link>
  );
}
