'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import api from '@/lib/api';

interface DashboardStats {
  totalBookings: number;
  activeProviders: number;
  pendingVerification: number;
  totalPatients: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => {
        // Fallback demo data when API unavailable
        setStats({
          totalBookings: 0,
          activeProviders: 0,
          pendingVerification: 0,
          totalPatients: 0,
        });
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your healthcare platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon="📋" label="Total Bookings" value={stats?.totalBookings ?? 0} />
        <StatCard icon="👨‍⚕️" label="Active Providers" value={stats?.activeProviders ?? 0} />
        <StatCard
          icon="⏳"
          label="Pending Verification"
          value={stats?.pendingVerification ?? 0}
          highlight={(stats?.pendingVerification ?? 0) > 0}
        />
        <StatCard icon="🧑‍🤝‍🧑" label="Total Patients" value={stats?.totalPatients ?? 0} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/providers"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition group"
        >
          <div className="text-2xl mb-3">👨‍⚕️</div>
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition">
            Manage Providers
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Review pending verifications and manage provider profiles
          </p>
        </Link>

        <Link
          href="/bookings"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition group"
        >
          <div className="text-2xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition">
            View Bookings
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Monitor all bookings, statuses, and patient-provider interactions
          </p>
        </Link>

        <Link
          href="/diagnostics"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition group"
        >
          <div className="text-2xl mb-3">🧪</div>
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition">
            Diagnostics
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Coordinate lab tests, sample collections, and result uploads
          </p>
        </Link>

        <Link
          href="/payouts"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition group"
        >
          <div className="text-2xl mb-3">💰</div>
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition">
            Payouts
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Track provider payouts and manage the 80/20 revenue split
          </p>
        </Link>
      </div>
    </div>
  );
}
