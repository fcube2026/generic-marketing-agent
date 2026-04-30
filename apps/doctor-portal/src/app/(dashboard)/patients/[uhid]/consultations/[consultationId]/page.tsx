'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useVideoCall } from '@/lib/useVideoCall';

const statusConfig: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Requested', cls: 'badge-blue' },
  ACCEPTED: { label: 'Accepted', cls: 'badge-blue' },
  ON_THE_WAY: { label: 'On The Way', cls: 'badge-amber' },
  ARRIVED: { label: 'Arrived', cls: 'badge-amber' },
  IN_PROGRESS: { label: 'In Progress', cls: 'badge-amber' },
  SUMMARY_SUBMITTED: { label: 'Summary Submitted', cls: 'badge-green' },
  COMPLETED: { label: 'Completed', cls: 'badge-green' },
  CLOSED: { label: 'Closed', cls: 'badge-green' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-red' },
  REJECTED: { label: 'Rejected', cls: 'badge-red' },
};

const modeLabel: Record<string, string> = {
  HOME_VISIT: 'Home Visit',
  DOCTOR_PLACE_VISIT: 'Clinic Visit',
  VIDEO_CONSULTATION: 'Video',
  TELECONSULT: 'Teleconsult',
};

interface Prescription {
  id: string;
  details?: string | null;
  fileUrl?: string | null;
  createdAt?: string;
}

interface Vitals {
  bp: string;
  tempF: number;
  spo2Percent: number;
  pulsePerMin: number;
  rr: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
}

interface Consultation {
  id: string;
  scheduledAt: string;
  status: string;
  mode: string;
  symptoms: string | null;
  totalFee: number;
  serviceCategory: string;
  vitals: Vitals | null;
  clinicalNotes: string | null;
  referral: string | null;
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
  gender: string | null;
  dateOfBirth: string | null;
  emergencyContact: string | null;
  visitCount: number;
  consultations: Consultation[];
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const VIDEO_STATUSES = new Set(['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']);

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uhid = params?.uhid as string;
  const consultationId = params?.consultationId as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoSessionStatus, setVideoSessionStatus] = useState<string | null>(null);
  const { joiningId: videoJoiningId, joinCall, endCall } = useVideoCall();

  const fetchPatient = useCallback(() => {
    if (!uhid) return;
    api
      .get(`/providers/me/patients/${uhid}`)
      .then((res) => setPatient(res.data))
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError('Patient not found or not treated by you.');
        } else if (err?.response?.status !== 401) {
          setError('Failed to load consultation.');
        }
      })
      .finally(() => setLoading(false));
  }, [uhid]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleJoinVideoCall = useCallback(async () => {
    const ok = await joinCall(consultationId);
    if (ok) setVideoSessionStatus('IN_PROGRESS');
  }, [consultationId, joinCall]);

  const handleEndConsultation = useCallback(async () => {
    const ok = await endCall(consultationId);
    if (ok) {
      setVideoSessionStatus('COMPLETED');
      fetchPatient();
    }
  }, [consultationId, endCall, fetchPatient]);

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
        <p className="text-lg font-medium">{error ?? 'Consultation not found'}</p>
        <button
          onClick={() => router.push('/patients')}
          className="mt-4 text-primary font-medium text-sm hover:underline"
        >
          ← Back to Patients
        </button>
      </div>
    );
  }

  const consultation = patient.consultations.find((c) => c.id === consultationId);
  if (!consultation) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-lg font-medium">Consultation not found</p>
        <Link
          href={`/patients/${patient.id}`}
          className="mt-4 inline-block text-primary font-medium text-sm hover:underline"
        >
          ← Back to {patient.name}
        </Link>
      </div>
    );
  }

  const sc = statusConfig[consultation.status] ?? { label: consultation.status, cls: 'badge-gray' };
  const age = calcAge(patient.dateOfBirth);
  const initials = getInitials(patient.name);
  const prescriptions = consultation.summary?.prescriptions ?? [];

  const isVideoConsultation = consultation.mode === 'VIDEO_CONSULTATION';
  const effectiveVideoStatus = videoSessionStatus ?? consultation.videoSession?.status ?? null;
  const canJoin = isVideoConsultation && VIDEO_STATUSES.has(consultation.status) && effectiveVideoStatus !== 'COMPLETED';
  const isLive = canJoin && (effectiveVideoStatus === 'IN_PROGRESS' || consultation.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/patients" className="hover:text-primary transition">
          Patients
        </Link>
        <span>/</span>
        <Link href={`/patients/${patient.id}`} className="hover:text-primary transition">
          {patient.name}
        </Link>
        <span>/</span>
        <span className="text-navy font-medium">Consultation</span>
      </nav>

      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`badge ${sc.cls}`}>{sc.label}</span>
              <span className="badge badge-gray">{modeLabel[consultation.mode] ?? consultation.mode}</span>
              <span className="badge badge-gray">{consultation.serviceCategory}</span>
              {consultation.videoSession && (
                <span className="badge badge-purple text-[10px]">📹 {consultation.videoSession.status}</span>
              )}
            </div>
            <h1 className="text-lg font-bold text-navy">
              {consultation.summary?.diagnosis || consultation.symptoms || 'Consultation Record'}
            </h1>
            {consultation.summary?.diagnosis && consultation.symptoms && (
              <p className="text-xs text-gray-500 mt-1">Symptoms: {consultation.symptoms}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-navy">
              {new Date(consultation.scheduledAt).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(consultation.scheduledAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-400 mt-1">Fee: ₹{consultation.totalFee}</p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-surface-border flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-lighter text-primary font-bold flex items-center justify-center text-sm">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">{patient.name}</p>
              <p className="text-xs text-gray-500">
                {age !== null ? `${age} yrs` : '—'}
                {patient.gender ? ` · ${patient.gender}` : ''}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-500">{patient.phone}</span>
          <Link
            href={`/patients/${patient.id}`}
            className="ml-auto text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View full record →
          </Link>
        </div>
      </div>

      {/* Video Call Panel */}
      {isVideoConsultation && canJoin && (
        <div className={`card p-5 border-2 ${isLive ? 'border-green-400 bg-green-50' : 'border-primary/30 bg-primary-lighter/20'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${isLive ? 'bg-green-100' : 'bg-primary-lighter'}`}>
                📹
              </div>
              <div>
                <p className={`text-sm font-bold ${isLive ? 'text-green-800' : 'text-navy'}`}>
                  {isLive ? 'Video Consultation In Progress' : 'Video Consultation Ready'}
                </p>
                <p className="text-xs text-gray-500">
                  {isLive
                    ? 'The call is active. Rejoin or end the session.'
                    : 'Click "Join Call" to start the video consultation with this patient.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              <button
                onClick={handleJoinVideoCall}
                disabled={videoJoiningId === consultationId}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60 transition"
              >
                {videoJoiningId === consultationId ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {isLive ? 'Rejoin Call' : 'Join Call'}
              </button>
              {isLive && (
                <button
                  onClick={handleEndConsultation}
                  disabled={videoJoiningId === consultationId}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                  </svg>
                  End Consultation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vitals */}
      {consultation.vitals && (
        <div className="card p-5">
          <h2 className="section-title">Vitals at Visit</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Blood Pressure', value: consultation.vitals.bp, unit: 'mmHg', warn: parseInt(consultation.vitals.bp.split('/')[0], 10) > 140 },
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
        </div>
      )}

      {consultation.summary && (
        <div className="card p-5 space-y-3">
          <h2 className="section-title">Clinical Summary</h2>
          {consultation.summary.diagnosis && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Diagnosis</p>
              <p className="text-sm text-navy">{consultation.summary.diagnosis}</p>
            </div>
          )}
          {consultation.summary.observations && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Observations</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{consultation.summary.observations}</p>
            </div>
          )}
          {consultation.summary.nextSteps && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Next Steps</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{consultation.summary.nextSteps}</p>
            </div>
          )}
          {consultation.summary.followUp && (
            <div className="flex items-center gap-2 p-3 bg-primary-lighter border border-surface-border rounded-lg">
              <p className="text-sm text-navy font-medium">Follow-up: {consultation.summary.followUp}</p>
            </div>
          )}
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Prescription (Rx)</h2>
            <span className="badge badge-teal">
              💊 {prescriptions.length} item{prescriptions.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {prescriptions.map((rx, index) => {
              const label = rx.details?.trim() || (rx.fileUrl ? 'Attached prescription' : 'Medicine');
              return (
                <div
                  key={rx.id}
                  className="border border-surface-border rounded-xl p-4 hover:border-primary/20 hover:bg-primary-lighter/30 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-teal text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy whitespace-pre-wrap">{label}</p>
                      {rx.fileUrl && (
                        <a
                          href={rx.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                        >
                          📎 View attachment
                        </a>
                      )}
                      {rx.createdAt && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(rx.createdAt).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!consultation.summary && prescriptions.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">No clinical summary submitted for this consultation yet.</p>
        </div>
      )}

      <div className="flex items-center justify-between py-4 border-t border-surface-border">
        <Link
          href={`/patients/${patient.id}`}
          className="text-sm text-gray-500 hover:text-primary transition flex items-center gap-1"
        >
          ← Back to patient record
        </Link>
      </div>
    </div>
  );
}
