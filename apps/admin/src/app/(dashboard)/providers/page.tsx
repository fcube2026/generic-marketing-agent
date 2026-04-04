'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge, { StatusBadge } from '@/components/ui/Badge';
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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'active' | 'all'>('pending');

  const fetchProviders = () => {
    setLoading(true);
    api
      .get('/admin/providers/pending')
      .then((res) => setProviders(res.data))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await api.put(`/admin/providers/${id}/verify`, { notes: 'Approved via admin panel' });
      fetchProviders();
    } catch {
      alert('Failed to verify provider');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this provider?')) return;
    try {
      await api.put(`/admin/providers/${id}/deactivate`, { notes: 'Deactivated via admin panel' });
      fetchProviders();
    } catch {
      alert('Failed to deactivate provider');
    }
  };

  const filteredProviders = providers.filter((p) => {
    if (tab === 'pending') return !p.isVerified;
    if (tab === 'active') return p.isActive && p.isVerified;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
        <p className="text-gray-500 text-sm mt-1">Manage healthcare provider accounts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'active', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'pending' ? '⏳ Pending' : t === 'active' ? '✅ Active' : '📋 All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">👨‍⚕️</p>
          <p className="text-lg font-medium">No providers found</p>
          <p className="text-sm mt-1">
            {tab === 'pending' ? 'No providers pending verification.' : 'No providers match this filter.'}
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
              {filteredProviders.map((provider) => (
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
                  <td className="px-6 py-4">
                    {provider.isVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {!provider.isVerified && (
                        <button
                          onClick={() => handleVerify(provider.id)}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition"
                        >
                          ✓ Verify
                        </button>
                      )}
                      {provider.isActive && (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
