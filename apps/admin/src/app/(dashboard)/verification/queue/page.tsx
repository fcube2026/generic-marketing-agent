'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';

interface ReviewItem {
  reviewId: string;
  patientName: string;
  reason: string;
  priority: string;
  riskScore: number;
  createdAt: string;
  status: string;
  verificationId: string;
}

const REASON_LABELS: Record<string, string> = {
  HIGH_RISK_SCORE: 'High Risk Score',
  OCR_MISMATCH: 'OCR Mismatch',
  FACE_MATCH_FAILED: 'Face Match Failed',
  MINOR_PATIENT: 'Minor Patient',
  PROVIDER_FLAGGED: 'Provider Flagged',
  SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
  EMERGENCY_OVERRIDE_REQUESTED: 'Emergency Override',
  REPEAT_ADDRESS_MISMATCH: 'Address Mismatch',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-600',
};

export default function PatientVerificationQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const limit = 20;

  const fetchQueue = useCallback(() => {
    setLoading(true);
    api
      .get('/admin/verification/review-queue', { params: { page, limit } })
      .then((res) => {
        let data: ReviewItem[] = res.data.items ?? [];
        if (priorityFilter) data = data.filter((i) => i.priority === priorityFilter);
        if (reasonFilter) data = data.filter((i) => i.reason === reasonFilter);
        setItems(data);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, priorityFilter, reasonFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Verification Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Open manual review items requiring admin action
          </p>
        </div>
        <Link
          href="/verification/audit-logs"
          className="text-sm text-primary font-medium hover:underline"
        >
          View Audit Logs →
        </Link>
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Reasons</option>
          {Object.entries(REASON_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => { setPriorityFilter(''); setReasonFilter(''); setPage(1); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Risk Score</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No open review items. 🎉
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.reviewId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.patientName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {REASON_LABELS[item.reason] ?? item.reason}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        PRIORITY_COLORS[item.priority] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        item.riskScore >= 80
                          ? 'text-red-600'
                          : item.riskScore >= 55
                          ? 'text-orange-600'
                          : item.riskScore >= 30
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {item.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/verification/${item.verificationId}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded border border-gray-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded border border-gray-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
