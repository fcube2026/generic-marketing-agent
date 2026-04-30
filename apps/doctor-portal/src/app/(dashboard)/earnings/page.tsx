'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface EarningsSummary {
  totalEarnings: number;
  pendingPayout: number;
  lastPayout: number;
  lastPayoutDate: string | null;
}

export default function EarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/providers/me/earnings')
      .then((res) => setSummary(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error('[Earnings] Error:', err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 text-sm mt-1">Track your consultation earnings and payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Earnings</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatCurrency(summary?.totalEarnings ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Pending Payout</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {formatCurrency(summary?.pendingPayout ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Last Payout</p>
          <p className="text-3xl font-bold text-primary mt-2">
            {formatCurrency(summary?.lastPayout ?? 0)}
          </p>
          {summary?.lastPayoutDate && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(summary.lastPayoutDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <p className="text-gray-400 text-lg">Detailed earnings breakdown coming soon</p>
      </div>
    </div>
  );
}
