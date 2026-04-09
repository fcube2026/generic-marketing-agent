'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/Card';
import api from '@/lib/api';

interface Payout {
  id: string;
  providerId: string;
  bookingId: string;
  amount: number;
  status: string;
  processedAt: string | null;
  createdAt: string;
  provider?: { name: string };
  booking?: {
    totalFee: number;
    patient?: { name: string };
    serviceCategory?: { name: string };
    payment?: { status: string };
  };
}

interface PayoutsResponse {
  data: Payout[];
  total: number;
  page: number;
  totalPages: number;
}

interface PayoutsSummary {
  totalPayouts: number;
  pendingCount: number;
  processedCount: number;
  totalAmount: number;
  pendingAmount: number;
  processedAmount: number;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPayouts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);

    Promise.all([
      api.get(`/admin/payouts?${params}`),
      api.get('/admin/payouts/summary'),
    ])
      .then(([payoutsRes, summaryRes]) => {
        const data: PayoutsResponse = payoutsRes.data;
        setPayouts(data.data);
        setTotalPages(data.totalPages);
        setSummary(summaryRes.data);
      })
      .catch(() => {
        setPayouts([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleProcess = (payoutId: string) => {
    setProcessing(payoutId);
    api
      .put(`/admin/payouts/${payoutId}/process`)
      .then(() => fetchPayouts())
      .catch(() => alert('Failed to process payout'))
      .finally(() => setProcessing(null));
  };

  const statuses = ['', 'PENDING', 'PROCESSED'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track and manage provider payouts (80/20 revenue split)
        </p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            icon="💰"
            label="Total Payouts"
            value={summary.totalPayouts}
          />
          <StatCard
            icon="⏳"
            label="Pending"
            value={`₹${summary.pendingAmount.toLocaleString()}`}
            highlight={summary.pendingCount > 0}
          />
          <StatCard
            icon="✅"
            label="Processed"
            value={`₹${summary.processedAmount.toLocaleString()}`}
          />
          <StatCard
            icon="📊"
            label="Total Amount"
            value={`₹${summary.totalAmount.toLocaleString()}`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-500 font-medium">
          Filter by status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s || 'All Statuses'}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">💰</p>
          <p className="text-lg font-medium">No payouts found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">Provider</th>
                  <th className="px-5 py-3 text-left">Patient</th>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th className="px-5 py-3 text-left">Booking Fee</th>
                  <th className="px-5 py-3 text-left">Provider Cut (80%)</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-3 text-sm text-gray-500 font-mono">
                      {payout.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {payout.provider?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {payout.booking?.patient?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {payout.booking?.serviceCategory?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      ₹{payout.booking?.totalFee?.toLocaleString() || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                      ₹{payout.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={payout.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {payout.status === 'PENDING' ? (
                        <button
                          onClick={() => handleProcess(payout.id)}
                          disabled={processing === payout.id}
                          className="text-primary text-sm font-medium hover:underline disabled:opacity-50"
                        >
                          {processing === payout.id
                            ? 'Processing…'
                            : 'Mark Processed'}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {payout.processedAt
                            ? new Date(
                                payout.processedAt,
                              ).toLocaleDateString()
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
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
