'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';

interface Booking {
  id: string;
  mode: string;
  status: string;
  totalFee: number;
  createdAt: string;
  patient?: { name: string };
  provider?: { name: string };
  serviceCategory?: { name: string };
  payment?: { status: string };
}

interface BookingsResponse {
  data: Booking[];
  total: number;
  page: number;
  totalPages: number;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);

    api
      .get(`/admin/bookings?${params}`)
      .then((res) => {
        const data: BookingsResponse = res.data;
        setBookings(data.data);
        setTotalPages(data.totalPages);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

  const statuses = [
    '', 'REQUESTED', 'ACCEPTED', 'DECLINED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS',
    'COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED', 'CANCELLED',
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor all platform bookings</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-500 font-medium">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-lg font-medium">No bookings found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-sm text-gray-500 font-mono">{booking.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{booking.patient?.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{booking.provider?.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{booking.serviceCategory?.name || '—'}</td>
                    <td className="px-5 py-3 text-sm">
                      {booking.mode === 'HOME_VISIT' ? '🏠 Home' : '🏥 Clinic'}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={booking.status} /></td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">₹{booking.totalFee}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(booking.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
