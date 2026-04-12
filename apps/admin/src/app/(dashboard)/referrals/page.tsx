'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';

interface Referral {
  id: string;
  specialistType: string;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    patient?: { name: string };
    provider?: { name: string };
  };
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = () => {
    setLoading(true);
    console.log('[Referrals] Fetching /admin/referrals');
    api
      .get('/admin/referrals')
      .then((res) => {
        console.log('[Referrals] Response:', res.data?.length, 'records');
        setReferrals(res.data);
      })
      .catch((err) => {
        console.error('[Referrals] Fetch error:', err?.response?.status, err?.message);
        setReferrals([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/referrals/${id}`, { status });
      fetchReferrals();
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Specialist Referrals</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage specialist referrals from providers</p>
        </div>
        <button
          onClick={fetchReferrals}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60 flex-shrink-0"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🏥</p>
          <p className="text-lg font-medium">No specialist referrals</p>
          <p className="text-sm mt-1">Referrals from providers will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Specialist Type</th>
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Referred By</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Notes</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.specialistType}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.booking?.patient?.name || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.booking?.provider?.name || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-[200px] truncate">{r.notes || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {r.status === 'RECOMMENDED' && (
                        <button
                          onClick={() => updateStatus(r.id, 'BOOKED')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                        >
                          Mark Booked
                        </button>
                      )}
                      {r.status === 'BOOKED' && (
                        <button
                          onClick={() => updateStatus(r.id, 'COMPLETED')}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
