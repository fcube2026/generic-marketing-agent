'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

const statusConfig: Record<string, { label: string; cls: string }> = {
  REQUESTED:   { label: 'Requested',   cls: 'badge-blue' },
  ACCEPTED:    { label: 'Accepted',    cls: 'badge-blue' },
  ON_THE_WAY:  { label: 'On The Way',  cls: 'badge-amber' },
  ARRIVED:     { label: 'Arrived',     cls: 'badge-amber' },
  COMPLETED:   { label: 'Completed',   cls: 'badge-green' },
  CLOSED:      { label: 'Closed',      cls: 'badge-green' },
  CANCELLED:   { label: 'Cancelled',   cls: 'badge-red' },
  REJECTED:    { label: 'Rejected',    cls: 'badge-red' },
};

const modeLabel: Record<string, string> = {
  HOME_VISIT:          'Home Visit',
  DOCTOR_PLACE_VISIT:  'Clinic Visit',
  VIDEO_CONSULTATION:  'Video',
  TELECONSULT:         'Teleconsult',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm text-navy font-medium">{value || '—'}</span>
    </div>
  );
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

interface Prescription { id: string; medicineName?: string; dosage?: string; frequency?: string; duration?: string; }
interface Consultation {
  id: string;
  scheduledAt: string;
  status: string;
  mode: string;
  symptoms: string | null;
  totalFee: number;
  serviceCategory: string;
  videoSession: { id: string; status: string; roomId: string } | null;
  summary: {
    diagnosis: string | null;
    observations: string | null;
    nextSteps: string | null;
    followUp: string | null;
    prescriptions: Prescription[];
  } | null;
}

interface PatientDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  emergencyContact: string | null;
  visitCount: number;
  consultations: Consultation[];
}

function ConsultationCard({ consultation }: { consultation: Consultation }) {
  const sc = statusConfig[consultation.status] ?? { label: consultation.status, cls: 'badge-gray' };
  const prescriptionCount = consultation.summary?.prescriptions?.length ?? 0;
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${sc.cls}`}>{sc.label}</span>
          <span className="badge badge-gray">{modeLabel[consultation.mode] ?? consultation.mode}</span>
          {prescriptionCount > 0 && (
            <span className="badge badge-teal">💊 {prescriptionCount} Rx</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-gray-700">
            {new Date(consultation.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {new Date(consultation.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">Service:</span> {consultation.serviceCategory}
      </div>

      {consultation.symptoms && (
        <div className="text-xs text-gray-600">
          <span className="font-medium text-gray-700">Symptoms:</span> {consultation.symptoms}
        </div>
      )}

      {consultation.summary && (
        <div className="border-t border-surface-border pt-3 space-y-1.5 text-xs">
          {consultation.summary.diagnosis && (
            <div><span className="font-medium text-gray-700">Diagnosis:</span> <span className="text-gray-600">{consultation.summary.diagnosis}</span></div>
          )}
          {consultation.summary.observations && (
            <div><span className="font-medium text-gray-700">Observations:</span> <span className="text-gray-600">{consultation.summary.observations}</span></div>
          )}
          {consultation.summary.nextSteps && (
            <div><span className="font-medium text-gray-700">Next Steps:</span> <span className="text-gray-600">{consultation.summary.nextSteps}</span></div>
          )}
          {consultation.summary.followUp && (
            <div><span className="font-medium text-gray-700">Follow-up:</span> <span className="text-gray-600">{consultation.summary.followUp}</span></div>
          )}
          {prescriptionCount > 0 && (
            <div className="mt-2">
              <p className="font-medium text-gray-700 mb-1">Prescriptions:</p>
              <div className="space-y-1">
                {consultation.summary.prescriptions.map((rx, i) => (
                  <div key={rx.id ?? i} className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-1.5">
                    <span>💊</span>
                    <span className="text-gray-700 font-medium">{rx.medicineName ?? 'Medicine'}</span>
                    {rx.dosage && <span className="text-gray-500">· {rx.dosage}</span>}
                    {rx.frequency && <span className="text-gray-500">· {rx.frequency}</span>}
                    {rx.duration && <span className="text-gray-500">· {rx.duration}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-surface-border pt-2">
        <span>Fee: <span className="font-semibold text-gray-700">₹{consultation.totalFee}</span></span>
        {consultation.videoSession && (
          <span className="badge badge-purple text-[10px]">📹 {consultation.videoSession.status}</span>
        )}
      </div>
    </div>
  );
}

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.uhid as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    api
      .get(`/providers/me/patients/${patientId}`)
      .then((res) => setPatient(res.data))
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError('Patient not found or not treated by you.');
        } else if (err?.response?.status !== 401) {
          setError('Failed to load patient record.');
        }
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-lg font-medium">{error ?? 'Patient not found'}</p>
        <button onClick={() => router.push('/patients')} className="mt-4 text-primary font-medium text-sm hover:underline">
          ← Back to Patients
        </button>
      </div>
    );
  }

  const age = calcAge(patient.dateOfBirth);
  const initials = getInitials(patient.name);
  const completedCount = patient.consultations.filter((c) => c.status === 'COMPLETED' || c.status === 'CLOSED').length;
  const upcomingCount = patient.consultations.filter((c) => ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'].includes(c.status)).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/patients" className="hover:text-primary transition">Patients</Link>
        <span>/</span>
        <span className="text-navy font-medium">{patient.name}</span>
      </nav>

      {/* Patient header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-navy">{patient.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {age !== null ? `${age} years` : '—'} {patient.gender ? `• ${patient.gender}` : ''}
                {patient.dateOfBirth ? ` • DOB: ${new Date(patient.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{patient.phone}</span>
                {patient.email && <><span>·</span><span>{patient.email}</span></>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:min-w-[280px]">
            {[
              { label: 'Total Visits', value: patient.visitCount, icon: '📋' },
              { label: 'Completed', value: completedCount, icon: '✅' },
              { label: 'Upcoming', value: upcomingCount, icon: '📅' },
            ].map((s) => (
              <div key={s.label} className="bg-surface-muted rounded-xl border border-surface-border p-3 text-center">
                <div className="text-lg">{s.icon}</div>
                <div className="text-xl font-bold text-navy">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Patient info */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="section-title">Patient Details</h2>
            <div className="grid grid-cols-1 gap-4">
              <InfoRow label="Phone" value={patient.phone} />
              <InfoRow label="Email" value={patient.email} />
              <InfoRow label="Gender" value={patient.gender} />
              <InfoRow label="Date of Birth" value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
            </div>
          </div>

          {patient.emergencyContact && (
            <div className="card p-5">
              <h2 className="section-title">Emergency Contact</h2>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">{patient.emergencyContact}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Consultation history */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">Consultation History</h2>
              <span className="text-xs text-gray-400">{patient.consultations.length} total visit{patient.consultations.length !== 1 ? 's' : ''}</span>
            </div>

            {patient.consultations.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No consultations recorded</p>
            ) : (
              <div className="space-y-4">
                {patient.consultations.map((consultation) => (
                  <ConsultationCard key={consultation.id} consultation={consultation} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Scheduled',   cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-amber' },
  completed:   { label: 'Completed',   cls: 'badge-green' },
  cancelled:   { label: 'Cancelled',   cls: 'badge-red' },
};

const typeLabel: Record<string, string> = {
  in_person:   'In-Person',
  video:       'Video',
  teleconsult: 'Teleconsult',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm text-navy font-medium">{value}</span>
    </div>
  );
}

function VitalChip({ label, value, unit, warn = false }: { label: string; value: string | number; unit: string; warn?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 px-4 py-3 rounded-xl border ${warn ? 'border-amber-200 bg-amber-50' : 'border-surface-border bg-white'}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`text-xl font-bold ${warn ? 'text-amber-700' : 'text-navy'}`}>{value}</span>
      <span className="text-[10px] text-gray-400">{unit}</span>
    </div>
  );
}

function ConsultationCard({ consultation, patientUhid }: { consultation: Consultation; patientUhid: string }) {
  const sc = statusConfig[consultation.status] ?? { label: consultation.status, cls: 'badge-gray' };
  return (
    <Link
      href={`/patients/${patientUhid}/consultations/${consultation.id}`}
      className="card-hover block p-5 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={sc.cls}>{sc.label}</span>
            <span className="badge badge-gray">{typeLabel[consultation.type] ?? consultation.type}</span>
            {consultation.prescription.length > 0 && (
              <span className="badge badge-teal">💊 {consultation.prescription.length} Rx</span>
            )}
            {consultation.labReports.length > 0 && (
              <span className="badge badge-purple">🧪 {consultation.labReports.length} Lab{consultation.labReports.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-navy group-hover:text-primary transition line-clamp-1">
            {consultation.chiefComplaint || consultation.diagnosis || 'Scheduled consultation'}
          </p>
          {consultation.diagnosis && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              Dx: {consultation.diagnosis}
              {consultation.icd10Code && <span className="text-gray-400 ml-1.5">({consultation.icd10Code})</span>}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-gray-700">
            {new Date(consultation.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {new Date(consultation.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {consultation.durationMin > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{consultation.durationMin} min</p>
          )}
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition">
            <span className="text-[10px] font-semibold text-primary flex items-center gap-1 justify-end">
              View details →
            </span>
          </div>
        </div>
      </div>

      {/* Vitals mini-strip */}
      {consultation.vitals && (
        <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span>BP: <strong className="text-navy">{consultation.vitals.bp}</strong></span>
          <span>Temp: <strong className="text-navy">{consultation.vitals.tempF}°F</strong></span>
          <span>SpO₂: <strong className="text-navy">{consultation.vitals.spo2Percent}%</strong></span>
          <span>Pulse: <strong className="text-navy">{consultation.vitals.pulsePerMin}/min</strong></span>
          <span>Wt: <strong className="text-navy">{consultation.vitals.weightKg} kg</strong></span>
        </div>
      )}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientProfilePage({ params }: { params: Promise<{ uhid: string }> }) {
  const { uhid } = use(params);
  const patient: Patient | undefined = USE_SEED ? getPatientByUHID(uhid) : undefined;

  if (!patient) return notFound();

  const completedConsultations = patient.consultations.filter((c) => c.status === 'completed');
  const upcomingConsultations = patient.consultations.filter((c) => c.status === 'scheduled' || c.status === 'in_progress');
  const allLabReports = patient.consultations.flatMap((c) => c.labReports);
  const pendingLabs = allLabReports.filter((l) => l.status === 'pending');
  const lastConsultation = completedConsultations.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/patients" className="hover:text-primary transition">Patients</Link>
        <span>/</span>
        <span className="text-navy font-medium">{patient.name}</span>
      </nav>

      {/* Patient header card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar + name */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-lg">
              {patient.profilePhotoInitials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-navy">{patient.name}</h1>
                <span className="uhid-chip text-sm">{patient.uhid}</span>
                {patient.insuranceId && (
                  <span className="badge badge-teal text-[10px]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Insured
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {patient.age} years • {patient.gender} • DOB: {new Date(patient.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{patient.phone}</span>
                <span>·</span>
                <span>{patient.email}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:min-w-[360px]">
            {[
              { label: 'Total Visits', value: patient.consultations.length, icon: '📋' },
              { label: 'Completed', value: completedConsultations.length, icon: '✅' },
              { label: 'Upcoming', value: upcomingConsultations.length, icon: '📅' },
              { label: 'Pending Labs', value: pendingLabs.length, icon: '🧪' },
            ].map((s) => (
              <div key={s.label} className="bg-surface-muted rounded-xl border border-surface-border p-3 text-center">
                <div className="text-lg">{s.icon}</div>
                <div className="text-xl font-bold text-navy">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Patient info */}
        <div className="space-y-5">
          {/* Personal details */}
          <div className="card p-5">
            <h2 className="section-title">Patient Details</h2>
            <div className="grid grid-cols-1 gap-4">
              <InfoRow label="Blood Group" value={
                <span className={`badge mt-0.5 ${['A+','A-'].includes(patient.bloodGroup) ? 'badge-red' : ['B+','B-'].includes(patient.bloodGroup) ? 'badge-amber' : ['O+','O-'].includes(patient.bloodGroup) ? 'badge-teal' : 'badge-purple'}`}>
                  {patient.bloodGroup}
                </span>
              } />
              <InfoRow label="Address" value={`${patient.address}, ${patient.city} — ${patient.pincode}`} />
              <InfoRow label="State" value={patient.state} />
              <InfoRow label="Insurance ID" value={patient.insuranceId ?? '—'} />
              <InfoRow label="Registered" value={new Date(patient.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {/* Emergency contact */}
          <div className="card p-5">
            <h2 className="section-title">Emergency Contact</h2>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">{patient.emergencyContact.name}</p>
                <p className="text-xs text-gray-500">{patient.emergencyContact.relation} · {patient.emergencyContact.phone}</p>
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div className="card p-5">
            <h2 className="section-title">Allergies</h2>
            {patient.allergies.length === 0 ? (
              <p className="text-sm text-gray-400">No known drug allergies</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-semibold">
                    ⚠️ {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Chronic Conditions */}
          <div className="card p-5">
            <h2 className="section-title">Chronic Conditions</h2>
            {patient.chronicConditions.length === 0 ? (
              <p className="text-sm text-gray-400">No chronic conditions recorded</p>
            ) : (
              <div className="space-y-2">
                {patient.chronicConditions.map((c) => (
                  <div key={c} className="flex items-center gap-2 py-1.5 px-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-amber-800">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Medications */}
          {patient.currentMedications.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title">Current Medications</h2>
              <div className="space-y-2">
                {patient.currentMedications.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm">
                    <span className="text-teal">💊</span>
                    <span className="text-gray-700">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Consultations timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Last visit vitals preview */}
          {lastConsultation?.vitals && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title mb-0">Last Visit Vitals</h2>
                <span className="text-xs text-gray-400">
                  {new Date(lastConsultation.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <VitalChip label="BP" value={lastConsultation.vitals.bp} unit="mmHg" warn={parseInt(lastConsultation.vitals.bp.split('/')[0]) > 140} />
                <VitalChip label="Temp" value={lastConsultation.vitals.tempF} unit="°F" warn={lastConsultation.vitals.tempF > 99} />
                <VitalChip label="SpO₂" value={`${lastConsultation.vitals.spo2Percent}%`} unit="Oxygen" warn={lastConsultation.vitals.spo2Percent < 95} />
                <VitalChip label="Pulse" value={lastConsultation.vitals.pulsePerMin} unit="/min" warn={lastConsultation.vitals.pulsePerMin > 100} />
                <VitalChip label="Weight" value={lastConsultation.vitals.weightKg} unit="kg" />
                <VitalChip label="BMI" value={lastConsultation.vitals.bmi} unit="kg/m²" warn={lastConsultation.vitals.bmi > 30} />
              </div>
            </div>
          )}

          {/* Consultation history */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">Consultation History</h2>
              <span className="text-xs text-gray-400">{patient.consultations.length} total visit{patient.consultations.length !== 1 ? 's' : ''}</span>
            </div>

            {patient.consultations.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No consultations recorded</p>
            ) : (
              <div className="space-y-3">
                {patient.consultations
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .map((consultation) => (
                    <ConsultationCard key={consultation.id} consultation={consultation} patientUhid={patient.uhid} />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
