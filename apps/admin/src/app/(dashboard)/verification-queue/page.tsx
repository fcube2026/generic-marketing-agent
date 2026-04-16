'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import api from '@/lib/api';

interface PipelineStep {
  source: string;
  found: boolean;
  score: number;
  details: Record<string, unknown>;
  error?: string;
}

interface License {
  id: string;
  type: string;
  documentUrl: string;
  status: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  nmcRegistrationNumber: string | null;
  stateCouncil: string | null;
  verificationAttempts: number;
}

interface VerificationLog {
  id: string;
  status: string;
  verificationSource: string;
  registrationNumber: string;
  createdAt: string;
  errorCode: string | null;
  rawResponse?: {
    issueCode?: number;
    issueLabel?: string;
    confidenceScore?: number;
    steps?: PipelineStep[];
  };
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
  confidenceScore?: number;
  issueCode?: number;
  issueLabel?: string;
  steps?: PipelineStep[];
}

type ActionType = 'approve' | 'reject' | 'request-info';

const ISSUE_CODE_COLORS: Record<number, string> = {
  100: 'bg-green-100 text-green-800',
  200: 'bg-emerald-100 text-emerald-800',
  300: 'bg-yellow-100 text-yellow-800',
  400: 'bg-red-100 text-red-800',
  500: 'bg-indigo-100 text-indigo-800',
  600: 'bg-red-100 text-red-800',
  700: 'bg-gray-100 text-gray-600',
};

export default function VerificationQueuePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterCode, setFilterCode] = useState<number | ''>('');
  const [verificationDetails, setVerificationDetails] = useState<Record<string, VerificationLog[]>>({});

  const fetchQueue = () => {
    setLoading(true);
    api
      .get('/admin/providers/pending')
      .then((res) => {
        setProviders(res.data);
      })
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  };

  const fetchVerificationDetail = async (providerId: string) => {
    try {
      const res = await api.get(`/admin/verification/providers/${providerId}`);
      const data = res.data;
      if (data.logs) {
        setVerificationDetails((prev) => ({ ...prev, [providerId]: data.logs }));
      }
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? {
                ...p,
                confidenceScore: data.confidenceScore,
                issueCode: data.issueCode,
                issueLabel: data.issueLabel,
                steps: data.steps,
              }
            : p,
        ),
      );
    } catch {
      // ignore
    }
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

  const handleExpand = (providerId: string) => {
    if (expandedId === providerId) {
      setExpandedId(null);
    } else {
      setExpandedId(providerId);
      if (!verificationDetails[providerId]) {
        fetchVerificationDetail(providerId);
      }
    }
  };

  const openAction = (id: string, type: ActionType) => {
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

  const handleRequestInfo = async (id: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/verification/providers/${id}/request-info`, { message: notes });
      setFeedback({ type: 'success', message: 'Request sent to provider successfully.' });
      closeAction();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to send request. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAction = () => {
    if (!actionId || !actionType) return;
    if (actionType === 'approve') handleApprove(actionId);
    else if (actionType === 'reject') handleReject(actionId);
    else if (actionType === 'request-info') handleRequestInfo(actionId);
  };

  const filteredProviders = filterCode
    ? providers.filter((p) => p.issueCode === filterCode)
    : providers;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and approve new provider registrations
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <select
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value ? Number(e.target.value) : '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">All Statuses</option>
            <option value="100">100 – Fully Verified</option>
            <option value="200">200 – Verified via Docs</option>
            <option value="300">300 – Needs SMC Email</option>
            <option value="400">400 – Data Mismatch</option>
            <option value="500">500 – Pending Approval</option>
            <option value="600">600 – Face Mismatch</option>
            <option value="700">700 – Incomplete</option>
          </select>
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
          >
            <span className={loading ? 'animate-spin' : ''}>↻</span>
            Refresh
          </button>
        </div>
      </div>

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

      {actionId && actionType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {actionType === 'approve'
                ? 'Approve Provider'
                : actionType === 'reject'
                  ? 'Reject Provider'
                  : 'Request More Information'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {actionType === 'approve'
                ? 'Add optional notes for this approval. The provider will be notified and can start accepting bookings.'
                : actionType === 'reject'
                  ? 'Please provide a reason for rejection. This will be sent as a notification to the provider.'
                  : 'Describe what additional information is needed. This will be sent to the provider as a notification.'}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Approval notes (optional)...'
                  : actionType === 'reject'
                    ? 'Reason for rejection (optional)...'
                    : 'What information do you need from the doctor?'
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
                    : actionType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : actionType === 'approve'
                    ? 'Approve Provider'
                    : actionType === 'reject'
                      ? 'Reject Provider'
                      : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">✅</p>
          <p className="text-lg font-medium">Queue is empty</p>
          <p className="text-sm mt-1">No providers are pending verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} awaiting review
          </p>

          {filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {provider.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/providers/${provider.id}`}
                        className="font-semibold text-gray-900 hover:text-primary truncate"
                      >
                        {provider.name}
                      </Link>
                      <Badge variant="warning">Pending</Badge>
                      {provider.issueCode != null && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ISSUE_CODE_COLORS[provider.issueCode] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          Code {provider.issueCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-sm text-gray-500 truncate">
                        {provider.specialization} · {provider.user?.phone || 'No phone'} · Registered{' '}
                        {new Date(provider.createdAt).toLocaleDateString()}
                      </p>
                      {provider.confidenceScore != null && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${provider.confidenceScore >= 90 ? 'bg-green-500' : provider.confidenceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${provider.confidenceScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {provider.confidenceScore}%
                          </span>
                        </div>
                      )}
                    </div>
                    {provider.issueLabel && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">{provider.issueLabel}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4 flex-wrap justify-end">
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
                    onClick={() => openAction(provider.id, 'request-info')}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                  >
                    ? Info
                  </button>
                  <button
                    onClick={() => handleExpand(provider.id)}
                    className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition"
                  >
                    {expandedId === provider.id ? '▲ Less' : '▼ Details'}
                  </button>
                </div>
              </div>

              {expandedId === provider.id && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          <span className="font-medium">{provider.licenseNumber || '—'}</span>
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

                    <Card title="Verification Results">
                      <div className="space-y-3">
                        {provider.confidenceScore != null && (
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-sm font-medium text-gray-700">Confidence Score</span>
                              <span className={`text-sm font-bold ${provider.confidenceScore >= 90 ? 'text-green-600' : provider.confidenceScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {provider.confidenceScore} / 100
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${provider.confidenceScore >= 90 ? 'bg-green-500' : provider.confidenceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${provider.confidenceScore}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {provider.issueCode != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Issue Code</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ISSUE_CODE_COLORS[provider.issueCode] ?? 'bg-gray-100 text-gray-600'}`}>
                              {provider.issueCode} — {provider.issueLabel}
                            </span>
                          </div>
                        )}

                        {provider.steps && provider.steps.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pipeline Breakdown</p>
                            <div className="space-y-2">
                              {provider.steps.map((step) => (
                                <div key={step.source} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{step.found ? '✅' : '❌'}</span>
                                    <span className="text-xs font-medium text-gray-700">
                                      {step.source.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">+{step.score} pts</span>
                                    {step.error && (
                                      <span className="text-xs text-red-500 max-w-xs truncate" title={step.error}>
                                        ⚠ Error
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {verificationDetails[provider.id]?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Audit Logs</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {verificationDetails[provider.id].map((log) => (
                                <div key={log.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5">
                                  <span className="font-medium">{log.verificationSource}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : log.status === 'MANUAL_REVIEW' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}`}>
                                    {log.status}
                                  </span>
                                  <span className="text-gray-400">
                                    {new Date(log.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

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
                                {lic.nmcRegistrationNumber && (
                                  <p className="text-xs text-gray-500">
                                    Reg: {lic.nmcRegistrationNumber} · {lic.stateCouncil}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {lic.status === 'APPROVED'
                                    ? `✅ Approved${lic.verifiedAt ? ` on ${new Date(lic.verifiedAt).toLocaleDateString()}` : ''}`
                                    : lic.status === 'REJECTED'
                                      ? '❌ Rejected'
                                      : `⏳ Pending (${lic.verificationAttempts} attempt${lic.verificationAttempts !== 1 ? 's' : ''})`}
                                </p>
                                {lic.expiresAt && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Expires: {new Date(lic.expiresAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {lic.documentUrl && (
                                <a
                                  href={lic.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary font-medium hover:underline"
                                >
                                  View →
                                </a>
                              )}
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
