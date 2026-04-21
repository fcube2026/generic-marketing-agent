'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  performedBy: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

interface IdDocument {
  id: string;
  documentType: string;
  storagePath: string;
  extractedName: string | null;
  extractedDob: string | null;
  extractedIdNumber: string | null;
  ocrRawResult: Record<string, unknown> | null;
  uploadedAt: string;
}

interface Verification {
  id: string;
  status: string;
  riskScore: number;
  riskTier: string;
  riskTriggers: string[];
  isMinor: boolean;
  emergencyOverride: boolean;
  overrideReason: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { name: string; userId: string };
  idDocuments: IdDocument[];
  verificationAuditLogs: AuditLog[];
  manualReviewQueues: { reason: string; priority: string; status: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  FLAGGED: 'bg-red-100 text-red-800',
  EMERGENCY_OVERRIDE: 'bg-purple-100 text-purple-800',
  ID_UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  CONSENT_GIVEN: 'bg-blue-100 text-blue-800',
  OTP_VERIFIED: 'bg-gray-100 text-gray-700',
};

const TIER_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-400 text-gray-900',
  LOW: 'bg-green-500 text-white',
};

export default function VerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const verificationId = params.id;

  const [data, setData] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activePanel, setActivePanel] = useState<'approve' | 'reject' | 'override' | null>(null);

  const fetchDetail = () => {
    setLoading(true);
    api
      .get(`/admin/verification/${verificationId}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [verificationId]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const doAction = async (action: 'approve' | 'reject' | 'override') => {
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await api.post(`/admin/verification/${verificationId}/approve`, { notes });
        setFeedback({ type: 'success', message: 'Verification approved.' });
      } else if (action === 'reject') {
        await api.post(`/admin/verification/${verificationId}/reject`, {
          reason: rejectReason,
          notifyPatient: true,
        });
        setFeedback({ type: 'success', message: 'Verification rejected and patient notified.' });
      } else {
        await api.post(`/admin/verification/${verificationId}/emergency-override`, {
          reason: overrideReason,
        });
        setFeedback({ type: 'success', message: 'Emergency override applied.' });
      }
      setActivePanel(null);
      fetchDetail();
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.response?.data?.message ?? 'Action failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading…</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Verification record not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-primary hover:underline text-sm"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const currentReview = data.manualReviewQueues?.[0];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.patient.name}</h1>
          <p className="text-sm text-gray-500">Verification ID: {data.id}</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Status + Risk */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">Status</p>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              STATUS_COLORS[data.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {data.status.replace(/_/g, ' ')}
          </span>
          {data.isMinor && (
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
              MINOR
            </span>
          )}
          {data.emergencyOverride && (
            <p className="text-xs text-purple-600 mt-2">
              Override reason: {data.overrideReason}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">Risk Assessment</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.riskScore}</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                TIER_COLORS[data.riskTier] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {data.riskTier}
            </span>
          </div>
          {data.riskTriggers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.riskTriggers.map((t) => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Queue Item */}
      {currentReview && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Review Queue Item</h2>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Reason: </span>
              <span className="font-medium">{currentReview.reason.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-gray-500">Priority: </span>
              <span className="font-medium">{currentReview.priority}</span>
            </div>
            <div>
              <span className="text-gray-500">Status: </span>
              <span className="font-medium">{currentReview.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ID Documents */}
      {data.idDocuments.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Uploaded Documents</h2>
          <div className="space-y-3">
            {data.idDocuments.map((doc) => (
              <div key={doc.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700">{doc.documentType.replace(/_/g, ' ')}</p>
                {doc.extractedName && (
                  <p className="text-gray-500 mt-1">
                    Name: <span className="text-gray-700">{doc.extractedName}</span>
                  </p>
                )}
                {doc.extractedIdNumber && (
                  <p className="text-gray-500">
                    ID: <span className="text-gray-700">{doc.extractedIdNumber}</span>
                  </p>
                )}
                {doc.ocrRawResult && (doc.ocrRawResult as any).stub && (
                  <p className="text-xs text-orange-500 mt-1">⚠️ OCR stub (Phase 1) — manual review required</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Uploaded {new Date(doc.uploadedAt).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {data.status !== 'CONFIRMED' && data.status !== 'FLAGGED' && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Admin Actions</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            <button
              onClick={() => setActivePanel(activePanel === 'approve' ? null : 'approve')}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'reject' ? null : 'reject')}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              ✗ Reject
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'override' ? null : 'override')}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
            >
              ⚡ Emergency Override
            </button>
          </div>

          {activePanel === 'approve' && (
            <div className="space-y-3 bg-green-50 p-4 rounded-lg">
              <textarea
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Notes (optional)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                onClick={() => doAction('approve')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Approving…' : 'Confirm Approval'}
              </button>
            </div>
          )}

          {activePanel === 'reject' && (
            <div className="space-y-3 bg-red-50 p-4 rounded-lg">
              <textarea
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Reason for rejection *"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <button
                onClick={() => doAction('reject')}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          )}

          {activePanel === 'override' && (
            <div className="space-y-3 bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-purple-600">
                Emergency override bypasses verification. A mandatory reason is required and audit-logged.
              </p>
              <textarea
                className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Override reason *"
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
              <button
                onClick={() => doAction('override')}
                disabled={actionLoading || !overrideReason.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Applying…' : 'Apply Emergency Override'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Audit Timeline</h2>
        {data.verificationAuditLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No audit events yet.</p>
        ) : (
          <div className="space-y-3">
            {data.verificationAuditLogs.map((log) => (
              <div key={log.id} className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="font-medium text-gray-800">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-gray-400 text-xs">
                    {log.performedBy ?? 'SYSTEM'} ·{' '}
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </p>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {JSON.stringify(log.meta)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
