'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPatientByUHID, USE_SEED, type Consultation, type Patient, type LabParameter } from '@/lib/seed-data';
import { use } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Scheduled',   cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-amber' },
  completed:   { label: 'Completed',   cls: 'badge-green' },
  cancelled:   { label: 'Cancelled',   cls: 'badge-red' },
};

const typeLabel: Record<string, string> = {
  in_person:   'In-Person Consultation',
  video:       'Video Consultation',
  teleconsult: 'Teleconsultation',
};

const routeBadge: Record<string, string> = {
  Oral:        'badge-blue',
  Topical:     'badge-teal',
  Injection:   'badge-red',
  Inhalation:  'badge-purple',
  Sublingual:  'badge-amber',
};

function ParamRow({ param }: { param: LabParameter }) {
  const colorMap: Record<string, string> = {
    normal:   'param-normal',
    high:     'param-high',
    low:      'param-low',
    critical: 'param-critical',
  };
  const arrowMap: Record<string, string> = {
    normal: '',
    high: '↑',
    low: '↓',
    critical: '⚠',
  };
  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="py-2.5 px-4 text-sm text-navy font-medium">{param.name}</td>
      <td className="py-2.5 px-4 text-sm">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${colorMap[param.status]}`}>
          {param.value} {param.unit}
          {arrowMap[param.status] && <span>{arrowMap[param.status]}</span>}
        </span>
      </td>
      <td className="py-2.5 px-4 text-xs text-gray-400">{param.normalRange} {param.unit}</td>
      <td className="py-2.5 px-4">
        <span className={`badge text-[10px] ${
          param.status === 'normal' ? 'badge-green' :
          param.status === 'critical' ? 'badge-red' :
          'badge-amber'
        }`}>
          {param.status.toUpperCase()}
        </span>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ uhid: string; consultationId: string }>;
}) {
  const { uhid, consultationId } = use(params);
  const patient: Patient | undefined = USE_SEED ? getPatientByUHID(uhid) : undefined;
  if (!patient) return notFound();

  const consultation: Consultation | undefined = patient.consultations.find((c) => c.id === consultationId);
  if (!consultation) return notFound();

  const sc = statusConfig[consultation.status] ?? { label: consultation.status, cls: 'badge-gray' };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/patients" className="hover:text-primary transition">Patients</Link>
        <span>/</span>
        <Link href={`/patients/${patient.uhid}`} className="hover:text-primary transition">{patient.name}</Link>
        <span>/</span>
        <span className="text-navy font-medium">Consultation</span>
      </nav>

      {/* Consultation header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={sc.cls}>{sc.label}</span>
              <span className="badge badge-gray">{typeLabel[consultation.type] ?? consultation.type}</span>
              <span className="badge badge-gray">{consultation.specialty}</span>
            </div>
            <h1 className="text-lg font-bold text-navy">
              {consultation.chiefComplaint || consultation.diagnosis || 'Consultation Record'}
            </h1>
            {consultation.diagnosis && (
              <p className="text-sm text-teal-dark font-semibold mt-1">
                Diagnosis: {consultation.diagnosis}
                {consultation.icd10Code && (
                  <span className="ml-2 text-xs font-mono bg-teal-light text-teal-dark px-2 py-0.5 rounded">
                    ICD-10: {consultation.icd10Code}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-navy">
              {new Date(consultation.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(consultation.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {consultation.durationMin > 0 && ` · ${consultation.durationMin} min`}
            </p>
            <p className="text-xs text-gray-400 mt-1">{consultation.doctorName}</p>
          </div>
        </div>

        {/* Patient mini-card */}
        <div className="mt-5 pt-5 border-t border-surface-border flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-lighter text-primary font-bold flex items-center justify-center text-sm">
              {patient.profilePhotoInitials}
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">{patient.name}</p>
              <p className="text-xs text-gray-500">{patient.age} yrs · {patient.gender} · {patient.bloodGroup}</p>
            </div>
          </div>
          <span className="uhid-chip">{patient.uhid}</span>
          {patient.allergies.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
              ⚠️ Allergies: {patient.allergies.join(', ')}
            </div>
          )}
          <Link
            href={`/patients/${patient.uhid}`}
            className="ml-auto text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View full record →
          </Link>
        </div>
      </div>

      {/* Vitals */}
      {consultation.vitals && (
        <div className="card p-5">
          <h2 className="section-title">Vitals at Visit</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Blood Pressure', value: consultation.vitals.bp, unit: 'mmHg', warn: parseInt(consultation.vitals.bp.split('/')[0]) > 140 },
              { label: 'Temperature', value: `${consultation.vitals.tempF}°F`, unit: '', warn: consultation.vitals.tempF > 99 },
              { label: 'SpO₂', value: `${consultation.vitals.spo2Percent}%`, unit: 'Oxygen', warn: consultation.vitals.spo2Percent < 95 },
              { label: 'Pulse', value: consultation.vitals.pulsePerMin, unit: '/min', warn: consultation.vitals.pulsePerMin > 100 },
              { label: 'Resp. Rate', value: consultation.vitals.rr, unit: '/min', warn: consultation.vitals.rr > 20 },
              { label: 'Weight', value: `${consultation.vitals.weightKg} kg`, unit: '' },
              { label: 'Height', value: `${consultation.vitals.heightCm} cm`, unit: '' },
              { label: 'BMI', value: consultation.vitals.bmi, unit: 'kg/m²', warn: consultation.vitals.bmi > 30 },
            ].map((v) => (
              <div
                key={v.label}
                className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border text-center ${
                  v.warn ? 'border-amber-200 bg-amber-50' : 'border-surface-border bg-surface-muted'
                }`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{v.label}</span>
                <span className={`text-base font-bold ${v.warn ? 'text-amber-700' : 'text-navy'}`}>{v.value}</span>
                {v.unit && <span className="text-[9px] text-gray-400">{v.unit}</span>}
                {v.warn && <span className="text-[9px] font-bold text-amber-600 mt-0.5">⚠ Review</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      {consultation.clinicalNotes && (
        <div className="card p-5">
          <h2 className="section-title">Clinical Notes</h2>
          <div className="bg-surface-muted rounded-xl border border-surface-border p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line font-mono">
            {consultation.clinicalNotes}
          </div>
          {consultation.referral && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <svg className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-purple-700 mb-0.5">Referral Issued</p>
                <p className="text-sm text-purple-800">{consultation.referral}</p>
              </div>
            </div>
          )}
          {consultation.followUpDate && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-blue-800 font-medium">
                Follow-up scheduled: {new Date(consultation.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prescription */}
      {consultation.prescription.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Prescription (Rx)</h2>
            <div className="flex items-center gap-2">
              <span className="badge badge-teal">💊 {consultation.prescription.length} medication{consultation.prescription.length > 1 ? 's' : ''}</span>
              <button className="text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1 hover:bg-primary-lighter transition">
                🖨 Print Rx
              </button>
            </div>
          </div>

          {/* Prescription header strip */}
          <div className="bg-gradient-to-r from-primary-lighter to-teal-light border border-primary/10 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-gray-500 font-medium">Prescribing Doctor</p>
                <p className="text-sm font-bold text-navy">{consultation.doctorName}</p>
                <p className="text-xs text-gray-500">{consultation.specialty}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Patient</p>
                <p className="text-sm font-bold text-navy">{patient.name}</p>
                <p className="text-xs font-mono text-primary">{patient.uhid}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-semibold text-navy">
                  {new Date(consultation.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs font-mono text-gray-400">{consultation.id}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {consultation.prescription.map((rx, index) => (
              <div key={rx.id} className="border border-surface-border rounded-xl p-4 hover:border-primary/20 hover:bg-primary-lighter/30 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-teal text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-navy">{rx.medication}</p>
                        <span className="text-xs text-gray-400 italic">({rx.genericName})</span>
                        <span className={routeBadge[rx.route] ?? 'badge-gray'}>{rx.route}</span>
                        {rx.refills > 0 && (
                          <span className="badge badge-teal text-[10px]">{rx.refills} refill{rx.refills > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="bg-surface-muted rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">Dosage</p>
                          <p className="text-sm font-semibold text-navy">{rx.dosage}</p>
                        </div>
                        <div className="bg-surface-muted rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">Frequency</p>
                          <p className="text-sm font-semibold text-navy">{rx.frequency}</p>
                        </div>
                        <div className="bg-surface-muted rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase">Duration</p>
                          <p className="text-sm font-semibold text-navy">{rx.duration}</p>
                        </div>
                      </div>
                      {rx.instructions && (
                        <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {rx.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Reports */}
      {consultation.labReports.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Laboratory Reports</h2>
            <span className="badge badge-purple">🧪 {consultation.labReports.length} report{consultation.labReports.length > 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-4">
            {consultation.labReports.map((lab) => {
              const labStatus = lab.status === 'completed' ? 'badge-green' : lab.status === 'pending' ? 'badge-amber' : 'badge-blue';
              return (
                <div key={lab.id} className="border border-surface-border rounded-xl overflow-hidden">
                  {/* Lab header */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-surface-muted border-b border-surface-border">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-navy">{lab.testName}</h3>
                        <span className={labStatus}>{lab.status.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-gray-500">{lab.labName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">Requested</p>
                      <p className="text-xs font-semibold text-navy">
                        {new Date(lab.requestedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {lab.reportDate && (
                        <>
                          <p className="text-xs text-gray-400 mt-1">Reported</p>
                          <p className="text-xs font-semibold text-navy">
                            {new Date(lab.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Findings */}
                  {lab.findings && lab.status !== 'pending' && (
                    <div className="px-4 py-3 border-b border-surface-border bg-teal-light/20">
                      <p className="text-xs font-semibold text-teal-dark mb-1">Clinical Findings</p>
                      <p className="text-sm text-gray-700">{lab.findings}</p>
                    </div>
                  )}

                  {/* Parameters table */}
                  {lab.parameters.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-surface-border">
                            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Parameter</th>
                            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Result</th>
                            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Normal Range</th>
                            <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lab.parameters.map((param) => (
                            <ParamRow key={param.name} param={param} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {lab.status === 'pending' && (
                    <div className="p-4 text-center text-sm text-amber-600 font-medium">
                      ⏳ Results pending from lab
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between py-4 border-t border-surface-border">
        <Link
          href={`/patients/${patient.uhid}`}
          className="text-sm font-semibold text-gray-500 hover:text-navy transition flex items-center gap-1.5"
        >
          ← Back to Patient Record
        </Link>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-semibold border border-surface-border rounded-lg text-gray-600 hover:bg-white hover:border-gray-300 transition">
            🖨 Print Summary
          </button>
          <button className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition">
            ✏️ Edit Consultation
          </button>
        </div>
      </div>
    </div>
  );
}
