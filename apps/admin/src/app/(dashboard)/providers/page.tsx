'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  licenseNumber?: string | null;
  bio?: string | null;
}

interface ProviderPatient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  visitCount: number;
  lastVisit: string;
  lastStatus: string;
  lastDiagnosis: string | null;
  lastService: string;
}

type TabType = 'pending' | 'active' | 'rejected' | 'all';

function getProviderStatus(p: Provider): string {
  if (p.isVerified && p.isActive) return 'verified';
  if (!p.isVerified && p.isActive) return 'pending';
  if (!p.isVerified && !p.isActive) return 'rejected';
  return 'inactive';
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Patient Side Peek (stacked on top of doctor peek) ────────────────────────
function PatientPeek({
  patient,
  onClose,
}: {
  patient: ProviderPatient;
  onClose: () => void;
}) {
  const age = calcAge(patient.dateOfBirth);
  const statusCls: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700', CLOSED: 'bg-green-100 text-green-700',
    REQUESTED: 'bg-blue-100 text-blue-700', ACCEPTED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700', REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      {/* Invisible click-catcher behind the peek */}
      <div
        className="fixed inset-0 bg-black/20"
        style={{ right: 480 }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col overflow-hidden"
        style={{ marginRight: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-500"
              title="Back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Patient Record</p>
              <h3 className="text-base font-bold text-gray-900">{patient.name}</h3>
            </div>
          </div>
          <Link
            href={`/users`}
            className="text-xs text-primary font-medium hover:underline"
          >
            Open in Users →
          </Link>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Patient header */}
          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="w-12 h-12 rounded-full bg-purple-200 text-purple-700 font-bold text-base flex items-center justify-center shrink-0">
              {getInitials(patient.name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{patient.name}</p>
              <p className="text-xs text-gray-500">
                {age !== null ? `${age} yrs` : '—'}
                {patient.gender ? ` · ${patient.gender}` : ''}
              </p>
              <p className="text-xs text-gray-500">{patient.phone}</p>
              {patient.email && <p className="text-xs text-gray-400">{patient.email}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{patient.visitCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Visits</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-gray-700">
                {new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Last Visit</p>
            </div>
          </div>

          {/* Last consultation */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Consultation</p>
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">{patient.lastService}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls[patient.lastStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {patient.lastStatus}
                </span>
              </div>
              {patient.lastDiagnosis && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Dx:</span> {patient.lastDiagnosis}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor / Provider Side Peek ──────────────────────────────────────────────
function ProviderPeek({
  provider,
  onClose,
  onVerify,
  onReject,
  onDeactivate,
}: {
  provider: Provider;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<ProviderPatient | null>(null);
  const status = getProviderStatus(provider);

  useEffect(() => {
    setPatientsLoading(true);
    api
      .get(`/admin/providers/${provider.id}/patients`)
      .then((res) => setPatients(res.data))
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [provider.id]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Peek panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Doctor Profile</p>
            <h3 className="text-base font-bold text-gray-900">{provider.name}</h3>
            <p className="text-xs text-gray-500">{provider.specialization}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/providers/${provider.id}`}
              className="text-xs text-primary font-medium hover:underline"
            >
              Full Page →
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-500"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Provider summary card */}
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0">
              {getInitials(provider.name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{provider.name}</p>
                {status === 'verified' && <Badge variant="success">Verified</Badge>}
                {status === 'pending' && <Badge variant="warning">Pending</Badge>}
                {status === 'rejected' && <Badge variant="error">Rejected</Badge>}
                {status === 'inactive' && <Badge variant="default">Inactive</Badge>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{provider.user?.phone || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">Service radius: {provider.serviceRadius} km</p>
            </div>
          </div>

          {/* Services */}
          {(provider.providerServices?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Services</p>
              <div className="flex flex-wrap gap-1.5">
                {provider.providerServices!.map((ps, i) => (
                  <Badge key={i} variant="info">{ps.serviceCategory?.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {status === 'pending' && (
              <>
                <button
                  onClick={() => onVerify(provider.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                >
                  ✓ Approve & Verify
                </button>
                <button
                  onClick={() => onReject(provider.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                >
                  ✗ Reject
                </button>
              </>
            )}
            {status === 'verified' && (
              <button
                onClick={() => onDeactivate(provider.id)}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
              >
                Deactivate
              </button>
            )}
          </div>

          {/* Consulted Patients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Consulted Patients</p>
              {!patientsLoading && <span className="text-xs text-gray-400">{patients.length} patient{patients.length !== 1 ? 's' : ''}</span>}
            </div>

            {patientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-2">🩺</p>
                <p className="text-sm">No consultations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {patients.map((patient) => {
                  const age = calcAge(patient.dateOfBirth);
                  const statusCls: Record<string, string> = {
                    COMPLETED: 'text-green-600', CLOSED: 'text-green-600',
                    REQUESTED: 'text-blue-600', ACCEPTED: 'text-blue-600',
                    CANCELLED: 'text-red-500', REJECTED: 'text-red-500',
                  };
                  return (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className="w-full text-left p-3 bg-white border border-gray-100 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition">
                          {getInitials(patient.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">{patient.name}</p>
                            <span className="text-[10px] font-medium text-gray-400 shrink-0">
                              {patient.visitCount} visit{patient.visitCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {age !== null ? `${age} yrs` : '—'}
                              {patient.gender ? ` · ${patient.gender}` : ''}
                            </span>
                            {patient.lastStatus && (
                              <span className={`text-[10px] font-medium ${statusCls[patient.lastStatus] ?? 'text-gray-400'}`}>
                                · {patient.lastStatus}
                              </span>
                            )}
                          </div>
                          {patient.lastDiagnosis && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                              Dx: {patient.lastDiagnosis}
                            </p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stacked patient peek */}
      {selectedPatient && (
        <PatientPeek
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [peekProvider, setPeekProvider] = useState<Provider | null>(null);

  const fetchProviders = useCallback((status?: string) => {
    setLoading(true);
    const query = status && status !== 'all' ? `?status=${status}` : '';
    api
      .get(`/admin/providers${query}`)
      .then((res) => setProviders(res.data))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProviders(tab);
  }, [tab, fetchProviders]);

  const handleVerify = async (id: string) => {
    try {
      await api.put(`/admin/providers/${id}/verify`, { notes: 'Approved via admin panel' });
      fetchProviders(tab);
      // update peek if open
      setPeekProvider((prev) => prev?.id === id ? { ...prev, isVerified: true, isActive: true } : prev);
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
      setPeekProvider((prev) => prev?.id === id ? { ...prev, isVerified: false, isActive: false } : prev);
    } catch {
      alert('Failed to reject provider');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this provider?')) return;
    try {
      await api.put(`/admin/providers/${id}/deactivate`, { notes: 'Deactivated via admin panel' });
      fetchProviders(tab);
      setPeekProvider((prev) => prev?.id === id ? { ...prev, isActive: false, isAvailable: false } : prev);
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
                      <button
                        onClick={() => setPeekProvider(provider)}
                        className="font-medium text-gray-900 hover:text-primary text-left"
                      >
                        {provider.name}
                      </button>
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
                        <button
                          onClick={() => setPeekProvider(provider)}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition"
                        >
                          View Peek
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {peekProvider && (
        <ProviderPeek
          provider={peekProvider}
          onClose={() => setPeekProvider(null)}
          onVerify={handleVerify}
          onReject={(id) => setRejectingId(id)}
          onDeactivate={handleDeactivate}
        />
      )}
    </div>
  );
}
