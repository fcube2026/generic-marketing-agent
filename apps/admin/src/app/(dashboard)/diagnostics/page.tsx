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
  const [uploadModal, setUploadModal] = useState<string | null>(null);
  const [resultFileUrl, setResultFileUrl] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleUploadResult = async () => {
    if (!uploadModal) return;
    setUploading(true);
    try {
      await api.post(`/diagnostics/${uploadModal}/result`, {
        resultFileUrl: resultFileUrl || undefined,
        notes: resultNotes || undefined,
      });
      setUploadModal(null);
      setResultFileUrl('');
      setResultNotes('');
      fetchDiagnostics();
    } catch {
      alert('Failed to upload result');
    } finally {
      setUploading(false);
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
                          onClick={() => setUploadModal(d.id)}
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

      {/* Upload Result Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Lab Result</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result File URL</label>
                <input
                  type="text"
                  value={resultFileUrl}
                  onChange={(e) => setResultFileUrl(e.target.value)}
                  placeholder="https://storage.example.com/results/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  placeholder="Add any notes about the result..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => {
                  setUploadModal(null);
                  setResultFileUrl('');
                  setResultNotes('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadResult}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
