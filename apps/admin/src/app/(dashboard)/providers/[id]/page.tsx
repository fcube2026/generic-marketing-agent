'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/lib/api';

interface Provider {
  id: string;
  name: string;
  bio: string | null;
  specialization: string;
  licenseNumber: string | null;
  isVerified: boolean;
  isActive: boolean;
  isAvailable: boolean;
  homeVisitEnabled: boolean;
  doctorPlaceVisitEnabled: boolean;
  serviceRadius: number;
  consultationFeeHomeVisit: number;
  consultationFeeDoctorPlace: number;
  createdAt: string;
  user?: { phone: string };
  licenses?: { id: string; type: string; documentUrl: string; verifiedAt: string | null }[];
  providerServices?: { serviceCategory?: { name: string } }[];
}

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Re-use pending providers endpoint & find by ID for MVP
    api
      .get('/admin/providers/pending')
      .then((res) => {
        const found = res.data.find((p: Provider) => p.id === params.id);
        setProvider(found || null);
      })
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleVerify = async () => {
    try {
      await api.put(`/admin/providers/${params.id}/verify`, { notes: 'Approved via admin panel' });
      setProvider((prev) => prev ? { ...prev, isVerified: true } : null);
    } catch {
      alert('Failed to verify provider');
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this provider?')) return;
    try {
      await api.put(`/admin/providers/${params.id}/deactivate`, { notes: 'Deactivated via admin panel' });
      setProvider((prev) => prev ? { ...prev, isActive: false, isAvailable: false } : null);
    } catch {
      alert('Failed to deactivate provider');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-lg font-medium">Provider not found</p>
        <button onClick={() => router.push('/providers')} className="mt-4 text-primary font-medium text-sm hover:underline">
          ← Back to Providers
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => router.push('/providers')} className="text-sm text-primary font-medium hover:underline mb-4 inline-block">
        ← Back to Providers
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
          <p className="text-gray-500">{provider.specialization}</p>
        </div>
        <div className="flex gap-2">
          {!provider.isVerified && (
            <button
              onClick={handleVerify}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
            >
              ✓ Approve & Verify
            </button>
          )}
          {provider.isActive && (
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile */}
        <Card title="Profile Information">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{provider.user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">License #</span>
              <span className="font-medium">{provider.licenseNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <div className="flex gap-2">
                {provider.isVerified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending</Badge>}
                {provider.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="error">Inactive</Badge>}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Available</span>
              <span>{provider.isAvailable ? '🟢 Yes' : '🔴 No'}</span>
            </div>
            {provider.bio && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500 mb-1">Bio</p>
                <p className="text-gray-700">{provider.bio}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Service Configuration */}
        <Card title="Service Configuration">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Home Visit</span>
              <span>{provider.homeVisitEnabled ? `✅ ₹${provider.consultationFeeHomeVisit}` : '❌ Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Doctor&apos;s Place</span>
              <span>{provider.doctorPlaceVisitEnabled ? `✅ ₹${provider.consultationFeeDoctorPlace}` : '❌ Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service Radius</span>
              <span className="font-medium">{provider.serviceRadius} km</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 mb-2">Service Categories</p>
              <div className="flex flex-wrap gap-1">
                {provider.providerServices?.map((ps, i) => (
                  <Badge key={i} variant="info">{ps.serviceCategory?.name}</Badge>
                )) || <span className="text-gray-400">None set</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* License Documents */}
        <Card title="License Documents" className="lg:col-span-2">
          {provider.licenses && provider.licenses.length > 0 ? (
            <div className="space-y-3">
              {provider.licenses.map((lic) => (
                <div key={lic.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{lic.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lic.verifiedAt ? `Verified on ${new Date(lic.verifiedAt).toLocaleDateString()}` : 'Not verified'}
                    </p>
                  </div>
                  <a
                    href={lic.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    View Document →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No documents uploaded</p>
          )}
        </Card>
      </div>
    </div>
  );
}
