'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/lib/api';

interface License {
  id: string;
  type: string;
  documentUrl: string;
  status: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
}

interface Provider {
  id: string;
  name: string;
  bio: string | null;
  specialization: string;
  contactInfo: string;
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
  licenses?: License[];
  providerServices?: { serviceCategory?: { name: string } }[];
}

export default function VerificationQueuePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchQueue = () => {
    setLoading(true);
    api
      .get('/admin/providers/pending')
      .then((res) => setProviders(res.data))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const openAction = (id: string, type: 'approve' | 'reject') => {
    setActionId(id);
    setActionType(type);
    setNotes('');
  };

  const closeAction = () => {
    setActionId(null);
    setActionType(null);
    setNotes('');
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/providers/${id}/verify`, { notes: notes || 'Approved via verification queue' });
      setFeedback({ type: 'success', message: 'Provider approved successfully. They will be notified.' });
      closeAction();
      fetchQueue();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to approve provider. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/providers/${id}/reject`, { reason: notes });
      setFeedback({ type: 'success', message: 'Provider rejected. They will be notified.' });
      closeAction();
      fetchQueue();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to reject provider. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAction = () => {
    if (!actionId || !actionType) return;
    if (actionType === 'approve') {
      handleApprove(actionId);
    } else {
      handleReject(actionId);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review and approve new provider registrations
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? '✓ ' : '✗ '}
          {feedback.message}
        </div>
      )}

      {/* Action Modal */}
      {actionId && actionType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {actionType === 'approve' ? 'Approve Provider' : 'Reject Provider'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {actionType === 'approve'
                ? 'Add optional notes for this approval. The provider will be notified and can start accepting bookings.'
                : 'Please provide a reason for rejection. This will be sent as a notification to the provider.'}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Approval notes (optional)...'
                  : 'Reason for rejection (optional)...'
              }
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeAction}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : actionType === 'approve'
                    ? 'Approve Provider'
                    : 'Reject Provider'}
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
          <p className="text-4xl mb-4">✅</p>
          <p className="text-lg font-medium">Queue is empty</p>
          <p className="text-sm mt-1">No providers are pending verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {providers.length} provider{providers.length !== 1 ? 's' : ''} awaiting review
          </p>

          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Provider Summary Row */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {provider.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/providers/${provider.id}`}
                        className="font-semibold text-gray-900 hover:text-primary truncate"
                      >
                        {provider.name}
                      </Link>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {provider.specialization} · {provider.user?.phone || 'No phone'} · Registered{' '}
                      {new Date(provider.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => openAction(provider.id, 'approve')}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => openAction(provider.id, 'reject')}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === provider.id ? null : provider.id)
                    }
                    className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition"
                  >
                    {expandedId === provider.id ? '▲ Less' : '▼ Details'}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === provider.id && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Profile Info */}
                    <Card title="Profile Information">
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone</span>
                          <span className="font-medium">{provider.user?.phone || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Contact</span>
                          <span className="font-medium">{provider.contactInfo || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">License #</span>
                          <span className="font-medium">
                            {provider.licenseNumber || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Home Visit</span>
                          <span>
                            {provider.homeVisitEnabled
                              ? `✅ ₹${provider.consultationFeeHomeVisit}`
                              : '❌ Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{"Doctor's Place"}</span>
                          <span>
                            {provider.doctorPlaceVisitEnabled
                              ? `✅ ₹${provider.consultationFeeDoctorPlace}`
                              : '❌ Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Service Radius</span>
                          <span className="font-medium">{provider.serviceRadius} km</span>
                        </div>
                        {provider.bio && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-gray-500 mb-1">Bio</p>
                            <p className="text-gray-700">{provider.bio}</p>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-gray-500 mb-2">Services</p>
                          <div className="flex flex-wrap gap-1">
                            {provider.providerServices?.length ? (
                              provider.providerServices.map((ps, i) => (
                                <Badge key={i} variant="info">
                                  {ps.serviceCategory?.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400">None set</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* KYC Documents */}
                    <Card title="KYC / License Documents">
                      {provider.licenses && provider.licenses.length > 0 ? (
                        <div className="space-y-3">
                          {provider.licenses.map((lic) => (
                            <div
                              key={lic.id}
                              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                            >
                              <div>
                                <p className="font-medium text-sm text-gray-900">
                                  {lic.type}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {lic.status === 'APPROVED'
                                    ? `✅ Approved${lic.verifiedAt ? ` on ${new Date(lic.verifiedAt).toLocaleDateString()}` : ''}`
                                    : lic.status === 'REJECTED'
                                      ? '❌ Rejected'
                                      : '⏳ Pending review'}
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
                                View →
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No KYC documents uploaded
                        </p>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
