'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import MiniBarChart from '@/components/ui/MiniBarChart';
import StatusBreakdownChart from '@/components/ui/StatusBreakdownChart';
import { StatusBadge } from '@/components/ui/Badge';
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

interface RecentBooking {
  id: string;
  mode: string;
  status: string;
  totalFee: number;
  createdAt: string;
  patient?: { name: string };
  provider?: { name: string };
  serviceCategory?: { name: string };
}

function formatBookingMode(mode: string): string {
  if (mode === 'HOME_VISIT') return '🏠 Home';
  if (mode === 'VIDEO_CONSULTATION') return '🎥 Video';
  return '🏥 Clinic';
}

const REFRESH_INTERVAL_MS = 30_000;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);

    console.log('[Dashboard] Fetching data from API…', new Date().toISOString());

    Promise.all([
      api.get('/admin/dashboard').catch((err) => {
        if (err?.response?.status === 401) throw err;
        console.error('[Dashboard] /admin/dashboard error:', err?.response?.status, err?.message);
        return {
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
        };
      }),
      api.get('/admin/dashboard/charts').catch((err) => {
        if (err?.response?.status === 401) throw err;
        console.error('[Dashboard] /admin/dashboard/charts error:', err?.response?.status, err?.message);
        return {
          data: {
            bookingsPerDay: {},
            earningsPerDay: {},
          },
        };
      }),
      api.get('/admin/bookings?page=1&limit=5').catch((err) => {
        if (err?.response?.status === 401) throw err;
        console.error('[Dashboard] /admin/bookings error:', err?.response?.status, err?.message);
        return { data: { data: [] } };
      }),
    ])
      .then(([statsRes, chartsRes, bookingsRes]) => {
        console.log('[Dashboard] Stats response:', statsRes.data);
        console.log('[Dashboard] Charts response:', chartsRes.data);
        setStats(statsRes.data);
        setCharts(chartsRes.data);
        setRecentBookings(bookingsRes.data?.data ?? []);
        setLastUpdated(new Date());
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  // Initial load + auto-refresh every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-fetch when the browser tab regains focus
  useEffect(() => {
    const onFocus = () => {
      console.log('[Dashboard] Window focused — refreshing data');
      fetchData();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your healthcare platform</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            <span className={refreshing ? 'animate-spin' : ''}>↻</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
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

      {/* Recent Bookings */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/bookings" className="text-sm text-primary font-medium hover:underline">
            View all →
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-medium">No bookings yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Patient</th>
                  <th className="px-5 py-3 text-left">Provider</th>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th className="px-5 py-3 text-left">Mode</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Fee</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{booking.patient?.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{booking.provider?.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{booking.serviceCategory?.name || '—'}</td>
                    <td className="px-5 py-3 text-sm">
                      {formatBookingMode(booking.mode)}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={booking.status} /></td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">₹{booking.totalFee}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(booking.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <Link href={`/bookings/${booking.id}`} className="text-primary text-sm font-medium hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
