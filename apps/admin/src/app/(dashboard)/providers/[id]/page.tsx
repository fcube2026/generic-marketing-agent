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
  licenses?: { id: string; type: string; documentUrl: string; expiresAt: string | null; verifiedAt: string | null }[];
  providerServices?: { serviceCategory?: { name: string } }[];
}

function getProviderStatus(p: Provider): string {
  if (p.isVerified && p.isActive) return 'verified';
  if (!p.isVerified && p.isActive) return 'pending';
  if (!p.isVerified && !p.isActive) return 'rejected';
  return 'inactive';
}

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchProvider = () => {
    setLoading(true);
    api
      .get(`/admin/providers/${params.id}`)
      .then((res) => setProvider(res.data))
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProvider();
  }, [params.id]);

  const handleVerify = async () => {
    try {
      await api.put(`/admin/providers/${params.id}/verify`, { notes: 'Approved via admin panel' });
      setProvider((prev) => prev ? { ...prev, isVerified: true, isActive: true } : null);
    } catch {
      alert('Failed to verify provider');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/admin/providers/${params.id}/reject`, { reason: rejectReason });
      setProvider((prev) => prev ? { ...prev, isVerified: false, isActive: false } : null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch {
      alert('Failed to reject provider');
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

  const status = getProviderStatus(provider);

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
          {status === 'pending' && (
            <>
              <button
                onClick={handleVerify}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                ✓ Approve & Verify
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                ✗ Reject
              </button>
            </>
          )}
          {status === 'verified' && (
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Provider</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejecting this provider. This will be sent as a notification to the provider.
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
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                Reject Provider
              </button>
            </div>
          </div>
        </div>
      )}

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
              <span className="text-gray-500">Registered</span>
              <span className="font-medium">{new Date(provider.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <div className="flex gap-2">
                {status === 'verified' && <Badge variant="success">Verified</Badge>}
                {status === 'pending' && <Badge variant="warning">Pending Review</Badge>}
                {status === 'rejected' && <Badge variant="error">Rejected</Badge>}
                {status === 'inactive' && <Badge variant="default">Inactive</Badge>}
                {provider.isActive ? <Badge variant="success">Active</Badge> : status !== 'rejected' && <Badge variant="error">Inactive</Badge>}
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
              <span className="text-gray-500">{"Doctor's Place"}</span>
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

        {/* License Documents (KYC) */}
        <Card title="KYC / License Documents" className="lg:col-span-2">
          {provider.licenses && provider.licenses.length > 0 ? (
            <div className="space-y-3">
              {provider.licenses.map((lic) => (
                <div key={lic.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{lic.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lic.verifiedAt
                        ? `✅ Verified on ${new Date(lic.verifiedAt).toLocaleDateString()}`
                        : '⏳ Not verified'}
                    </p>
                    {lic.expiresAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Expires: {new Date(lic.expiresAt).toLocaleDateString()}
                      </p>
                    )}
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
            <p className="text-sm text-gray-400">No KYC documents uploaded</p>
          )}
        </Card>
      </div>
    </div>
  );
}
