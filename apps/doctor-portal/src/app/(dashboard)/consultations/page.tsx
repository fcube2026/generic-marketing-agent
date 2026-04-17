'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface VideoSession {
  id: string;
  status: string;
  roomId: string;
}

interface Consultation {
  id: string;
  patientName: string;
  scheduledAt: string;
  status: string;
  type: string;
  videoSession?: VideoSession;
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/providers/me/consultations')
      .then((res) => setConsultations(res.data?.consultations ?? []))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error('[Consultations] Error:', err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const sessionStatusColor: Record<string, string> = {
    CREATED: 'bg-gray-100 text-gray-600',
    WAITING: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your patient consultations</p>
      </div>

      {consultations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-lg">No consultations found</p>
          <p className="text-gray-400 text-sm mt-1">Your upcoming consultations will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Scheduled</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consultations.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.patientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{c.type?.replace('_', ' ') || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(c.scheduledAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        statusColor[c.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {c.type === 'VIDEO_CONSULTATION' ? (
                      <div className="flex items-center gap-2">
                        {c.videoSession && (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              sessionStatusColor[c.videoSession.status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {c.videoSession.status.replace('_', ' ')}
                          </span>
                        )}
                        <Link
                          href={`/video-consultations/${c.id}`}
                          className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition"
                        >
                          🎥 Open
                        </Link>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
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
