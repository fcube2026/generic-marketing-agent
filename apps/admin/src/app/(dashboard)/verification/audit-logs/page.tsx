'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

interface AuditLog {
  id: string;
  verificationId: string;
  action: string;
  performedBy: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  VERIFICATION_INITIATED: 'bg-blue-100 text-blue-700',
  MANUAL_APPROVED: 'bg-green-100 text-green-700',
  MANUAL_REJECTED: 'bg-red-100 text-red-700',
  EMERGENCY_OVERRIDE_APPLIED: 'bg-purple-100 text-purple-700',
  CONSENT_ACCEPTED: 'bg-teal-100 text-teal-700',
  ID_UPLOAD_URL_GENERATED: 'bg-yellow-100 text-yellow-700',
  OCR_STUB_PROCESSED: 'bg-orange-100 text-orange-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [verificationIdFilter, setVerificationIdFilter] = useState('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(() => {
    setLoading(true);
    api
      .get('/admin/verification/audit-logs/all', {
        params: {
          page,
          limit,
          ...(verificationIdFilter ? { verificationId: verificationIdFilter } : {}),
          ...(patientIdFilter ? { patientId: patientIdFilter } : {}),
        },
      })
      .then((res) => {
        setLogs(res.data.logs ?? []);
        setTotal(res.data.total ?? 0);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, verificationIdFilter, patientIdFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Full append-only audit trail for all patient verification events
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Verification ID</label>
          <input
            type="text"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 bg-white"
            placeholder="Filter by verification ID…"
            value={verificationIdFilter}
            onChange={(e) => { setVerificationIdFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Patient ID</label>
          <input
            type="text"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 bg-white"
            placeholder="Filter by patient ID…"
            value={patientIdFilter}
            onChange={(e) => { setPatientIdFilter(e.target.value); setPage(1); }}
          />
        </div>
        <button
          onClick={() => { setVerificationIdFilter(''); setPatientIdFilter(''); setPage(1); }}
          className="text-sm text-gray-500 hover:text-gray-700 pb-2"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Verification ID</th>
              <th className="px-4 py-3 text-left">Performed By</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {log.verificationId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.performedBy ?? 'SYSTEM'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {log.meta ? JSON.stringify(log.meta) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
