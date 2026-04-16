'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

interface DashboardStats {
  todayConsultations: number;
  upcomingConsultations: number;
  completedConsultations: number;
  totalEarnings: number;
}

const REFRESH_INTERVAL_MS = 30_000;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    api
      .get('/providers/me/dashboard')
      .then((res) => setStats(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error('[Doctor Dashboard] Error:', err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your consultation overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Today&apos;s Consultations</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.todayConsultations ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.upcomingConsultations ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.completedConsultations ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Total Earnings</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(stats?.totalEarnings ?? 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <a
          href="/consultations"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition group"
        >
          <div className="text-2xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition">
            View Consultations
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            See all your upcoming and past consultations
          </p>
        </a>
        <a
          href="/earnings"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition group"
        >
          <div className="text-2xl mb-3">💰</div>
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition">
            Earnings & Payouts
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Track your earnings and payout history
          </p>
        </a>
      </div>
    </div>
  );
}
