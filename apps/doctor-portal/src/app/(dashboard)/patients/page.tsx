'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { SEED_PATIENTS, USE_SEED, type Patient } from '@/lib/seed-data';

const genderColor: Record<string, string> = {
  Male: 'badge-blue',
  Female: 'badge-purple',
  Other: 'badge-gray',
};

const bloodGroupColor: Record<string, string> = {
  'A+': 'badge-red', 'A-': 'badge-red',
  'B+': 'badge-amber', 'B-': 'badge-amber',
  'AB+': 'badge-purple', 'AB-': 'badge-purple',
  'O+': 'badge-teal', 'O-': 'badge-teal',
};

function PatientAvatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-primary-lighter text-primary font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}

export default function PatientsPage() {
  const [query, setQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterCondition, setFilterCondition] = useState<string>('All');

  const patients: Patient[] = USE_SEED ? SEED_PATIENTS : [];

  const allConditions = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => p.chronicConditions.forEach((c) => set.add(c)));
    return ['All', ...Array.from(set).sort()];
  }, [patients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.uhid.toLowerCase().includes(q) && !p.phone.includes(q) && !p.email.toLowerCase().includes(q)) return false;
      if (filterGender !== 'All' && p.gender !== filterGender) return false;
      if (filterCondition !== 'All' && !p.chronicConditions.includes(filterCondition)) return false;
      return true;
    });
  }, [patients, query, filterGender, filterCondition]);

  const stats = useMemo(() => ({
    total: patients.length,
    male: patients.filter((p) => p.gender === 'Male').length,
    female: patients.filter((p) => p.gender === 'Female').length,
    chronic: patients.filter((p) => p.chronicConditions.length > 0).length,
  }), [patients]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Manage patient records, UHID lookup, and medical history</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-teal gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Seed Data Active
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: stats.total, color: 'text-primary', icon: '👥' },
          { label: 'Male', value: stats.male, color: 'text-blue-600', icon: '♂️' },
          { label: 'Female', value: stats.female, color: 'text-purple-600', icon: '♀️' },
          { label: 'Chronic Conditions', value: stats.chronic, color: 'text-amber-600', icon: '🩺' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-lg">{s.icon}</span>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, UHID (CRX-...), phone or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Gender filter */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-700"
          >
            {['All', 'Male', 'Female', 'Other'].map((g) => (
              <option key={g} value={g}>{g === 'All' ? 'All Genders' : g}</option>
            ))}
          </select>

          {/* Condition filter */}
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-700 max-w-[200px]"
          >
            {allConditions.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Conditions' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 -mt-2">
        Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of {patients.length} patients
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 font-medium">No patients found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different name or UHID</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>UHID</th>
                <th>Age / Gender</th>
                <th>Blood Group</th>
                <th>Contact</th>
                <th>Conditions</th>
                <th>Consultations</th>
                <th>Registered</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.uhid}>
                  {/* Patient name + avatar */}
                  <td>
                    <div className="flex items-center gap-3">
                      <PatientAvatar initials={patient.profilePhotoInitials} />
                      <div>
                        <p className="font-semibold text-navy text-sm">{patient.name}</p>
                        <p className="text-xs text-gray-400">{patient.city}, {patient.state}</p>
                      </div>
                    </div>
                  </td>

                  {/* UHID */}
                  <td>
                    <span className="uhid-chip">{patient.uhid}</span>
                  </td>

                  {/* Age / Gender */}
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-navy">{patient.age} yrs</span>
                      <span className={genderColor[patient.gender]}>{patient.gender}</span>
                    </div>
                  </td>

                  {/* Blood Group */}
                  <td>
                    <span className={bloodGroupColor[patient.bloodGroup] ?? 'badge-gray'}>
                      {patient.bloodGroup}
                    </span>
                  </td>

                  {/* Contact */}
                  <td>
                    <p className="text-xs text-gray-700 font-medium">{patient.phone}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{patient.email}</p>
                  </td>

                  {/* Chronic conditions */}
                  <td>
                    {patient.chronicConditions.length === 0 ? (
                      <span className="text-xs text-gray-300">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {patient.chronicConditions.slice(0, 2).map((c) => (
                          <span key={c} className="badge badge-amber text-[10px]">{c}</span>
                        ))}
                        {patient.chronicConditions.length > 2 && (
                          <span className="badge badge-gray text-[10px]">+{patient.chronicConditions.length - 2}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Consultations count */}
                  <td>
                    <span className="font-semibold text-navy">{patient.consultations.length}</span>
                    <span className="text-gray-400 text-xs ml-1">visits</span>
                  </td>

                  {/* Registered */}
                  <td className="text-xs text-gray-500">
                    {new Date(patient.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Action */}
                  <td className="text-right">
                    <Link
                      href={`/patients/${patient.uhid}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition"
                    >
                      View Record
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
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
