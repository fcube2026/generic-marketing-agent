'use client';

import { useEffect, useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card, { StatCard } from '@/components/ui/Card';
import api from '@/lib/api';

type PrescriptionStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REUPLOAD_REQUIRED';

type VerifyAction = 'APPROVE' | 'REJECT' | 'REUPLOAD';
type ReviewerRole = 'ADMIN' | 'PHARMACIST';

interface Reviewer {
  id: string;
  email: string | null;
  phone: string;
  role: ReviewerRole;
}

interface QueueItem {
  id: string;
  userId: string;
  status: PrescriptionStatus;
  assignedReviewerId: string | null;
  assignedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
  };
  assignedReviewer: Reviewer | null;
  sla: {
    targetMs: number;
    elapsedMs: number;
    breached: boolean;
  };
}

interface QueueResponse {
  data: QueueItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PrescriptionDetails extends QueueItem {
  fileUrl: string;
}

const statusVariant: Record<PrescriptionStatus, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  REUPLOAD_REQUIRED: 'info',
};

function formatDuration(elapsedMs: number): string {
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function PharmacyPrescriptionsPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PrescriptionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [action, setAction] = useState<VerifyAction>('APPROVE');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentRole === 'ADMIN';

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get<QueueResponse>('/admin/pharmacy/prescriptions/queue', {
        params: { page: 1, limit: 50, sortBy: 'createdAt', order: 'asc' },
      });
      setQueue(response.data.data);
    } catch {
      setQueue([]);
      setFeedback({ type: 'error', message: 'Failed to load prescription verification queue.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewers = async () => {
    try {
      const response = await api.get<Reviewer[]>('/admin/pharmacy/prescriptions/reviewers');
      setReviewers(response.data);
    } catch {
      setReviewers([]);
    }
  };

  const syncQueueItem = (updated: PrescriptionDetails) => {
    setQueue((current) =>
      current.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              assignedReviewerId: updated.assignedReviewerId,
              assignedAt: updated.assignedAt,
              assignedReviewer: updated.assignedReviewer,
              reviewNotes: updated.reviewNotes,
              status: updated.status,
              updatedAt: updated.updatedAt,
            }
          : item,
      ),
    );
  };

  useEffect(() => {
    fetchQueue();
    fetchReviewers();

    try {
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as { role?: string };
        setCurrentRole(parsed.role ?? null);
      }
    } catch {
      setCurrentRole(null);
    }
  }, []);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const stats = useMemo(() => {
    const pending = queue.length;
    const breached = queue.filter((item) => item.sla.breached).length;
    const avgElapsedMs =
      queue.length === 0
        ? 0
        : Math.round(
            queue.reduce((total, item) => total + item.sla.elapsedMs, 0) / queue.length,
          );

    return { pending, breached, avgElapsedMs };
  }, [queue]);

  const openDetails = async (id: string) => {
    setDetailsLoading(true);
    setSelected(null);
    setNotes('');
    setAction('APPROVE');
    setZoom(1);
    try {
      const response = await api.get<PrescriptionDetails>(`/admin/pharmacy/prescriptions/${id}`);
      setSelected(response.data);
      setSelectedReviewerId(response.data.assignedReviewer?.id ?? '');
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load prescription details.' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelected(null);
    setNotes('');
    setAction('APPROVE');
    setSelectedReviewerId('');
    setZoom(1);
  };

  const assignReviewer = async () => {
    if (!selected || !selectedReviewerId) {
      return;
    }

    setAssigning(true);
    try {
      const response = await api.post<PrescriptionDetails>(
        `/admin/pharmacy/prescriptions/${selected.id}/assign`,
        {
          reviewerId: selectedReviewerId,
        },
      );
      setSelected((current) => (current ? { ...current, ...response.data } : response.data));
      syncQueueItem(response.data);
      setFeedback({ type: 'success', message: 'Reviewer assignment updated.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update reviewer assignment.' });
    } finally {
      setAssigning(false);
    }
  };

  const submitDecision = async () => {
    if (!selected) {
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/admin/pharmacy/prescriptions/${selected.id}/verify`, {
        action,
        notes: notes || undefined,
      });
      setFeedback({ type: 'success', message: 'Prescription review decision saved.' });
      closeDetails();
      await fetchQueue();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save prescription review decision.' });
    } finally {
      setSubmitting(false);
    }
  };

  const reviewerLabel = (reviewer: Reviewer | null) => {
    if (!reviewer) {
      return 'Unassigned';
    }

    return reviewer.email || reviewer.phone;
  };

  const adjustZoom = (delta: number) => {
    setZoom((current) => {
      const next = Math.min(2.5, Math.max(0.75, current + delta));
      return Math.round(next * 100) / 100;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescription Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review uploaded prescriptions before pharmacy orders are placed.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Review" value={stats.pending} icon="📄" highlight />
        <StatCard label="SLA Breached" value={stats.breached} icon="⏱️" />
        <StatCard label="Average Queue Age" value={formatDuration(stats.avgElapsedMs)} icon="🕒" />
      </div>

      <Card
        title="Uploaded Prescriptions"
        subtitle="Pending patient uploads awaiting pharmacist or admin review"
      >
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : queue.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-lg font-medium">Queue is empty</p>
            <p className="mt-1 text-sm">No prescriptions are waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{item.user.email || item.user.phone || item.userId}</p>
                    <Badge variant={statusVariant[item.status]}>{item.status.replace(/_/g, ' ')}</Badge>
                    {item.sla.breached && <Badge variant="error">SLA Breached</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Uploaded {new Date(item.createdAt).toLocaleString()} · Queue age {formatDuration(item.sla.elapsedMs)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Assigned reviewer: {reviewerLabel(item.assignedReviewer)}
                    {item.assignedAt ? ` · ${new Date(item.assignedAt).toLocaleString()}` : ''}
                  </p>
                  {item.reviewNotes && (
                    <p className="mt-1 text-sm text-gray-500">Latest note: {item.reviewNotes}</p>
                  )}
                </div>
                <button
                  onClick={() => openDetails(item.id)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(detailsLoading || selected) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-xl">
            {detailsLoading || !selected ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="border-b border-gray-100 p-6 lg:border-b-0 lg:border-r">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Prescription Review</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Uploaded by {selected.user.email || selected.user.phone || selected.userId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
                        <button
                          onClick={() => adjustZoom(-0.25)}
                          className="px-3 py-2 transition hover:bg-gray-50"
                          type="button"
                        >
                          −
                        </button>
                        <span className="border-x border-gray-200 px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          onClick={() => adjustZoom(0.25)}
                          className="px-3 py-2 transition hover:bg-gray-50"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => setZoom(1)}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                        type="button"
                      >
                        Reset Zoom
                      </button>
                      <a
                        href={selected.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                      >
                        Open File
                      </a>
                    </div>
                  </div>
                  <div className="h-[60vh] overflow-auto rounded-xl border border-gray-200 bg-gray-50">
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: `${100 / zoom}%`,
                        minHeight: `${60 / zoom}vh`,
                      }}
                    >
                      <iframe
                        src={selected.fileUrl}
                        title="Prescription preview"
                        className="h-[60vh] w-full rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status</p>
                      <div className="mt-2">
                        <Badge variant={statusVariant[selected.status]}>
                          {selected.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">SLA</p>
                      <p className="mt-2 text-sm text-gray-700">
                        Queue age {formatDuration(selected.sla.elapsedMs)} of target {formatDuration(selected.sla.targetMs)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assigned Reviewer</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={selected.assignedReviewer ? 'info' : 'default'}>
                          {reviewerLabel(selected.assignedReviewer)}
                        </Badge>
                        {selected.assignedReviewer && (
                          <span className="text-xs text-gray-500">{selected.assignedReviewer.role}</span>
                        )}
                      </div>
                      {selected.assignedAt && (
                        <p className="mt-2 text-sm text-gray-500">
                          Assigned on {new Date(selected.assignedAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Reassign Reviewer
                        </label>
                        <div className="mt-2 flex gap-2">
                          <select
                            value={selectedReviewerId}
                            onChange={(event) => setSelectedReviewerId(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select a reviewer</option>
                            {reviewers.map((reviewer) => (
                              <option key={reviewer.id} value={reviewer.id}>
                                {(reviewer.email || reviewer.phone)} ({reviewer.role})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={assignReviewer}
                            disabled={assigning || !selectedReviewerId}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                            type="button"
                          >
                            {assigning ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Decision
                      </label>
                      <select
                        value={action}
                        onChange={(event) => setAction(event.target.value as VerifyAction)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                      >
                        <option value="APPROVE">Approve</option>
                        <option value="REJECT">Reject</option>
                        <option value="REUPLOAD">Request Re-upload</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={5}
                        placeholder="Add pharmacist or admin review notes"
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={closeDetails}
                        className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                      >
                        Close
                      </button>
                      <button
                        onClick={submitDecision}
                        disabled={submitting}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {submitting ? 'Saving...' : 'Save Decision'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}