'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import MiniBarChart from '@/components/ui/MiniBarChart';
import StatusBreakdownChart from '@/components/ui/StatusBreakdownChart';
import api from '@/lib/api';

interface DashboardStats {
  totalBookings: number;
  activeProviders: number;
  pendingVerification: number;
  totalPatients: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  bookingsByStatus: Record<string, number>;
}

interface DashboardCharts {
  bookingsPerDay: Record<string, number>;
  earningsPerDay: Record<string, number>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard').catch(() => ({
        data: {
          totalBookings: 0,
          activeProviders: 0,
          pendingVerification: 0,
          totalPatients: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalEarnings: 0,
          bookingsByStatus: {},
        },
      })),
      api.get('/admin/dashboard/charts').catch(() => ({
        data: {
          bookingsPerDay: {},
          earningsPerDay: {},
        },
      })),
    ])
      .then(([statsRes, chartsRes]) => {
        setStats(statsRes.data);
        setCharts(chartsRes.data);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon="💰"
          label="Total Earnings"
          value={formatCurrency(stats?.totalEarnings ?? 0)}
        />
        <StatCard
          icon="✅"
          label="Completed Bookings"
          value={stats?.completedBookings ?? 0}
        />
        <StatCard
          icon="❌"
          label="Cancelled Bookings"
          value={stats?.cancelledBookings ?? 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {charts && Object.keys(charts.bookingsPerDay).length > 0 && (
          <MiniBarChart
            data={charts.bookingsPerDay}
            label="Bookings (Last 30 Days)"
            color="#6366f1"
          />
        )}
        {charts && Object.keys(charts.earningsPerDay).length > 0 && (
          <MiniBarChart
            data={charts.earningsPerDay}
            label="Earnings (Last 30 Days)"
            color="#22c55e"
            formatValue={formatCurrency}
          />
        )}
      </div>

      {stats && Object.keys(stats.bookingsByStatus).length > 0 && (
        <div className="mb-8">
          <StatusBreakdownChart data={stats.bookingsByStatus} />
        </div>
      )}

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
