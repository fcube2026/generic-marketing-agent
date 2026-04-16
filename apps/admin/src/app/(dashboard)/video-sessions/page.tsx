'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';

interface VideoSession {
  id: string;
  roomId: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
  booking?: {
    patient?: { name: string };
    provider?: { name: string };
  };
}

interface VideoSessionsResponse {
  data: VideoSession[];
  total: number;
  page: number;
  totalPages: number;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function VideoSessionsPage() {
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSessions = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);

    api
      .get(`/admin/video-sessions?${params}`)
      .then((res) => {
        const data: VideoSessionsResponse = res.data;
        setSessions(data.data);
        setTotalPages(data.totalPages);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const statuses = ['', 'CREATED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED'];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Sessions</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor all video consultation sessions</p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60 flex-shrink-0"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-500 font-medium">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🎥</p>
          <p className="text-lg font-medium">No video sessions found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Room ID</th>
                  <th className="px-5 py-3 text-left">Patient</th>
                  <th className="px-5 py-3 text-left">Provider</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Started At</th>
                  <th className="px-5 py-3 text-left">Duration</th>
                  <th className="px-5 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-sm text-gray-500 font-mono">{session.roomId}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">
                      {session.booking?.patient?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {session.booking?.provider?.name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {formatDuration(session.duration)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
