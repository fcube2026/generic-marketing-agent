'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import api from '@/lib/api';

interface DiagnosticRequest {
  id: string;
  testType: string;
  notes: string | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  booking?: {
    id: string;
    patient?: { name: string };
    provider?: { name: string };
  };
  labResults?: { id: string; resultFileUrl: string | null; notes: string | null; uploadedAt: string }[];
}

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostics = () => {
    setLoading(true);
    api
      .get('/admin/diagnostics')
      .then((res) => setDiagnostics(res.data))
      .catch(() => setDiagnostics([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/diagnostics/${id}`, { status });
      fetchDiagnostics();
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diagnostics Coordination</h1>
        <p className="text-gray-500 text-sm mt-1">Manage lab test requests, sample collections, and results</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : diagnostics.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">🧪</p>
          <p className="text-lg font-medium">No pending diagnostic requests</p>
          <p className="text-sm mt-1">Requests from providers will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Test Type</th>
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Provider</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Scheduled</th>
                <th className="px-5 py-3 text-left">Notes</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {diagnostics.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{d.testType}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{d.booking?.patient?.name || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{d.booking?.provider?.name || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {d.scheduledAt ? new Date(d.scheduledAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-[200px] truncate">{d.notes || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {d.status === 'REQUESTED' && (
                        <button
                          onClick={() => updateStatus(d.id, 'SCHEDULED')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                        >
                          Schedule
                        </button>
                      )}
                      {d.status === 'SCHEDULED' && (
                        <button
                          onClick={() => updateStatus(d.id, 'COLLECTED')}
                          className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 transition"
                        >
                          Mark Collected
                        </button>
                      )}
                      {d.status === 'COLLECTED' && (
                        <button
                          onClick={() => updateStatus(d.id, 'RESULTED')}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition"
                        >
                          Upload Result
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
