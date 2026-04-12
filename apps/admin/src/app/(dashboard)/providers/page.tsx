'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';

interface Provider {
  id: string;
  name: string;
  specialization: string;
  isVerified: boolean;
  isActive: boolean;
  isAvailable: boolean;
  serviceRadius: number;
  createdAt: string;
  user?: { phone: string };
  providerServices?: { serviceCategory?: { name: string } }[];
}

type TabType = 'pending' | 'active' | 'rejected' | 'all';

function getProviderStatus(p: Provider): string {
  if (p.isVerified && p.isActive) return 'verified';
  if (!p.isVerified && p.isActive) return 'pending';
  if (!p.isVerified && !p.isActive) return 'rejected';
  return 'inactive';
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchProviders = (status?: string) => {
    setLoading(true);
    const query = status && status !== 'all' ? `?status=${status}` : '';
    console.log(`[Providers] Fetching /admin/providers${query}`);
    api
      .get(`/admin/providers${query}`)
      .then((res) => {
        console.log('[Providers] Response:', res.data?.length, 'records');
        setProviders(res.data);
      })
      .catch((err) => {
        console.error('[Providers] Fetch error:', err?.response?.status, err?.message);
        setProviders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders(tab);
  }, [tab]);

  const handleVerify = async (id: string) => {
    try {
      await api.put(`/admin/providers/${id}/verify`, { notes: 'Approved via admin panel' });
      fetchProviders(tab);
    } catch {
      alert('Failed to verify provider');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/admin/providers/${id}/reject`, { reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      fetchProviders(tab);
    } catch {
      alert('Failed to reject provider');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this provider?')) return;
    try {
      await api.put(`/admin/providers/${id}/deactivate`, { notes: 'Deactivated via admin panel' });
      fetchProviders(tab);
    } catch {
      alert('Failed to deactivate provider');
    }
  };

  const renderStatusBadge = (provider: Provider) => {
    const status = getProviderStatus(provider);
    if (status === 'verified') return <Badge variant="success">Verified</Badge>;
    if (status === 'pending') return <Badge variant="warning">Pending</Badge>;
    if (status === 'rejected') return <Badge variant="error">Rejected</Badge>;
    return <Badge variant="default">Inactive</Badge>;
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage healthcare provider accounts</p>
        </div>
        <button
          onClick={() => fetchProviders(tab)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60 flex-shrink-0"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'pending', label: '⏳ Pending' },
          { key: 'active', label: '✅ Active' },
          { key: 'rejected', label: '❌ Rejected' },
          { key: 'all', label: '📋 All' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Provider</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejecting this provider. This will be sent as a notification.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                Reject Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">👨‍⚕️</p>
          <p className="text-lg font-medium">No providers found</p>
          <p className="text-sm mt-1">
            {tab === 'pending'
              ? 'No providers pending verification.'
              : tab === 'rejected'
                ? 'No rejected providers.'
                : 'No providers match this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Specialization</th>
                <th className="px-6 py-3 text-left">Services</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {providers.map((provider) => {
                const status = getProviderStatus(provider);
                return (
                  <tr key={provider.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <Link href={`/providers/${provider.id}`} className="font-medium text-gray-900 hover:text-primary">
                        {provider.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{provider.user?.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{provider.specialization}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {provider.providerServices?.map((ps, i) => (
                          <Badge key={i} variant="info">{ps.serviceCategory?.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderStatusBadge(provider)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(provider.id)}
                              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(provider.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        {status === 'verified' && (
                          <button
                            onClick={() => handleDeactivate(provider.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                          >
                            Deactivate
                          </button>
                        )}
                        <Link
                          href={`/providers/${provider.id}`}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
