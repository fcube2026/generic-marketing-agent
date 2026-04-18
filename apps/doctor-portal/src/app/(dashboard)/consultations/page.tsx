'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { USE_SEED, getSeedConsultationsList } from '@/lib/seed-data';

interface VideoSession {
  id: string;
  status: string;
  roomId: string;
}

interface ConsultationRow {
  id: string;
  patientName: string;
  patientUHID?: string;
  patientAge?: number;
  patientGender?: string;
  scheduledAt: string;
  status: string;
  type: string;
  chiefComplaint?: string;
  diagnosis?: string;
  specialty?: string;
  durationMin?: number;
  prescription?: unknown[];
  labReports?: unknown[];
  videoSession?: VideoSession;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Scheduled',   cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-amber' },
  completed:   { label: 'Completed',   cls: 'badge-green' },
  cancelled:   { label: 'Cancelled',   cls: 'badge-red' },
};

const typeLabel: Record<string, string> = {
  in_person:           'In-Person',
  VIDEO_CONSULTATION:  'Video',
  video:               'Video',
  teleconsult:         'Teleconsult',
};

const sessionStatusCls: Record<string, string> = {
  CREATED:     'badge-gray',
  WAITING:     'badge-amber',
  IN_PROGRESS: 'badge-red',
  COMPLETED:   'badge-green',
  FAILED:      'badge-red',
  EXPIRED:     'badge-gray',
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (USE_SEED) {
      setConsultations(getSeedConsultationsList() as ConsultationRow[]);
      setLoading(false);
      return;
    }
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

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return consultations.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (q && !c.patientName.toLowerCase().includes(q) && !(c.patientUHID ?? '').toLowerCase().includes(q) && !(c.chiefComplaint ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [consultations, filterStatus, filterType, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-gray-400">Loading consultations...</p>
        </div>
      </div>
    );
  }

  const counts = {
    total:       consultations.length,
    scheduled:   consultations.filter((c) => c.status === 'scheduled').length,
    in_progress: consultations.filter((c) => c.status === 'in_progress').length,
    completed:   consultations.filter((c) => c.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Consultations</h1>
          <p className="page-subtitle">All your patient consultations with prescriptions and lab reports</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, cls: 'text-navy', icon: '📋' },
          { label: 'Scheduled', value: counts.scheduled, cls: 'text-blue-600', icon: '📅' },
          { label: 'In Progress', value: counts.in_progress, cls: 'text-amber-600', icon: '⏳' },
          { label: 'Completed', value: counts.completed, cls: 'text-green-600', icon: '✅' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-lg">{s.icon}</span>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, UHID, or complaint..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-700"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-700"
          >
            <option value="all">All Types</option>
            <option value="in_person">In-Person</option>
            <option value="video">Video</option>
            <option value="teleconsult">Teleconsult</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of {consultations.length} consultations
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500 font-medium">No consultations found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>UHID</th>
                <th>Type</th>
                <th>Chief Complaint</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Rx / Labs</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const sc = statusConfig[c.status] ?? { label: c.status, cls: 'badge-gray' };
                const initials = (c.patientName || '??').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <tr key={c.id}>
                    {/* Patient */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-lighter text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-navy text-sm">{c.patientName}</p>
                          {c.patientAge && c.patientGender && (
                            <p className="text-[10px] text-gray-400">{c.patientAge} yrs · {c.patientGender}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* UHID */}
                    <td>
                      {c.patientUHID ? (
                        <Link href={`/patients/${c.patientUHID}`} className="uhid-chip hover:bg-primary-light transition">
                          {c.patientUHID}
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Type */}
                    <td>
                      <span className="badge badge-gray text-[10px]">
                        {typeLabel[c.type] ?? c.type}
                      </span>
                    </td>

                    {/* Chief Complaint */}
                    <td>
                      <p className="text-sm text-gray-700 max-w-[180px] truncate" title={c.chiefComplaint}>
                        {c.chiefComplaint || c.diagnosis || <span className="text-gray-300">—</span>}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="text-xs text-gray-600">
                      <p className="font-medium">{new Date(c.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-gray-400">{new Date(c.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={sc.cls}>{sc.label}</span>
                      {/* Video session status */}
                      {c.videoSession && (
                        <div className="mt-1">
                          <span className={`${sessionStatusCls[c.videoSession.status] ?? 'badge-gray'} text-[9px]`}>
                            {c.videoSession.status.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Rx / Labs */}
                    <td>
                      <div className="flex flex-col gap-1">
                        {(c.prescription as unknown[])?.length > 0 && (
                          <span className="badge badge-teal text-[10px]">💊 {(c.prescription as unknown[]).length} Rx</span>
                        )}
                        {(c.labReports as unknown[])?.length > 0 && (
                          <span className="badge badge-purple text-[10px]">🧪 {(c.labReports as unknown[]).length} Lab{(c.labReports as unknown[]).length > 1 ? 's' : ''}</span>
                        )}
                        {!(c.prescription as unknown[])?.length && !(c.labReports as unknown[])?.length && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {c.patientUHID && (
                          <Link
                            href={`/patients/${c.patientUHID}/consultations/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition"
                          >
                            Details →
                          </Link>
                        )}
                        {(c.type === 'VIDEO_CONSULTATION' || c.type === 'video') && (
                          <Link
                            href={`/video-consultations/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-primary/30 text-primary text-xs font-semibold rounded-lg hover:bg-primary-lighter transition"
                          >
                            🎥 Join
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

