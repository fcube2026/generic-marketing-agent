'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface ApiPatient {
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
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

const statusBadge: Record<string, string> = {
  COMPLETED: 'badge-green', CLOSED: 'badge-green',
  REQUESTED: 'badge-blue', ACCEPTED: 'badge-blue',
  CANCELLED: 'badge-red', REJECTED: 'badge-red',
};

// kept for legacy usage only
const _unused = {};

function PatientAvatar({ initials }: { initials: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-primary-lighter text-primary font-bold text-sm flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterGender, setFilterGender] = useState('All');

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get('/providers/me/patients')
      .then((res) => setPatients(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError('Failed to load patients. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.phone.includes(q) && !(p.email ?? '').toLowerCase().includes(q)) return false;
      if (filterGender !== 'All' && (p.gender ?? 'Unknown') !== filterGender) return false;
      return true;
    });
  }, [patients, query, filterGender]);

  const stats = useMemo(() => ({
    total: patients.length,
    male: patients.filter((p) => p.gender === 'Male' || p.gender === 'MALE').length,
    female: patients.filter((p) => p.gender === 'Female' || p.gender === 'FEMALE').length,
    totalVisits: patients.reduce((sum, p) => sum + p.visitCount, 0),
  }), [patients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-16 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-500 font-medium">{error}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">My Patients</h1>
          <p className="page-subtitle">Patients you have consulted — live staging database</p>
        </div>
        <span className="badge badge-teal gap-1.5 flex items-center">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Live Data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: stats.total, color: 'text-primary', icon: '👥' },
          { label: 'Male', value: stats.male, color: 'text-primary', icon: '♂️' },
          { label: 'Female', value: stats.female, color: 'text-purple-600', icon: '♀️' },
          { label: 'Total Visits', value: stats.totalVisits, color: 'text-amber-600', icon: '🩺' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-lg">{s.icon}</span>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-700"
        >
          {['All', 'Male', 'Female', 'Other'].map((g) => (
            <option key={g} value={g}>{g === 'All' ? 'All Genders' : g}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of {patients.length} patients
      </p>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">{patients.length === 0 ? '🩺' : '🔍'}</div>
          <p className="text-gray-500 font-medium">{patients.length === 0 ? 'No consultations yet' : 'No patients found'}</p>
          <p className="text-gray-400 text-sm mt-1">
            {patients.length === 0 ? 'Patients will appear here once you complete consultations.' : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age / Gender</th>
                <th>Contact</th>
                <th>Visits</th>
                <th>Last Visit</th>
                <th>Last Diagnosis</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => {
                const age = calcAge(patient.dateOfBirth);
                const statusCls = statusBadge[patient.lastStatus] ?? 'badge-gray';
                return (
                  <tr key={patient.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <PatientAvatar initials={getInitials(patient.name)} />
                        <div>
                          <p className="font-semibold text-navy text-sm">{patient.name}</p>
                          <p className="text-xs text-gray-400">{patient.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-navy">{age !== null ? `${age} yrs` : '—'}</span>
                        <span className="badge badge-gray text-[10px]">{patient.gender ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs text-gray-700 font-medium">{patient.phone}</p>
                    </td>
                    <td>
                      <span className="font-semibold text-navy">{patient.visitCount}</span>
                      <span className="text-gray-400 text-xs ml-1">visit{patient.visitCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-700">
                          {new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className={`badge text-[10px] ${statusCls}`}>{patient.lastStatus}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-gray-500 line-clamp-2 max-w-[180px]">
                        {patient.lastDiagnosis ?? '—'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition"
                      >
                        View Record
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
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
