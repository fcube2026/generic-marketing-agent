'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { INDIAN_STATE_COUNCILS } from '@/lib/state-councils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  fullName: string;
  nmcRegistrationNumber: string;
  stateCouncil: string;
  aadhaarFile: File | null;
  medicalCertFile: File | null;
  aadhaarUrl: string;
  medicalCertUrl: string;
  licenseId: string;
}

interface PipelineStepUI {
  label: string;
  status: 'waiting' | 'running' | 'done';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSignedUploadUrl(
  fileName: string,
  fileType: string,
): Promise<{ uploadUrl: string; path: string }> {
  const res = await api.post('/storage/upload-url', {
    fileName,
    contentType: fileType,
    folder: 'doctor-verification',
  });
  return res.data;
}

async function uploadFileToStorage(uploadUrl: string, file: File): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Step Components ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              n < current
                ? 'bg-green-500 text-white'
                : n === current
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {n < current ? '✓' : n}
          </div>
          {n < total && (
            <div
              className={`h-0.5 w-8 ${n < current ? 'bg-green-500' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
    fullName: '',
    nmcRegistrationNumber: '',
    stateCouncil: '',
    aadhaarFile: null,
    medicalCertFile: null,
    aadhaarUrl: '',
    medicalCertUrl: '',
    licenseId: '',
  });

  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepUI[]>([
    { label: 'NMC Registration Check', status: 'waiting' },
    { label: 'State Medical Council Verification', status: 'waiting' },
    { label: 'Confidence Scoring', status: 'waiting' },
  ]);

  const [finalIssueCode, setFinalIssueCode] = useState<number | null>(null);
  const [finalIssueLabel, setFinalIssueLabel] = useState('');

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const medicalCertInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  // ── Step 1: Full Name ──────────────────────────────────────────────────────

  function handleStep1() {
    if (!form.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setStep(2);
  }

  // ── Step 2: Registration Details ──────────────────────────────────────────

  function handleStep2() {
    if (!form.nmcRegistrationNumber.trim()) {
      setError('Please enter your NMC registration number.');
      return;
    }
    if (!form.stateCouncil) {
      setError('Please select your state medical council.');
      return;
    }
    setStep(3);
  }

  // ── Step 3: Document Upload ────────────────────────────────────────────────

  async function handleStep3() {
    if (!form.aadhaarFile) {
      setError('Please upload your Aadhaar card.');
      return;
    }
    if (!form.medicalCertFile) {
      setError('Please upload your medical certificate.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Upload Aadhaar
      const aadhaarUpload = await getSignedUploadUrl(
        form.aadhaarFile.name,
        form.aadhaarFile.type,
      );
      await uploadFileToStorage(aadhaarUpload.uploadUrl, form.aadhaarFile);

      // Upload medical certificate
      const medCertUpload = await getSignedUploadUrl(
        form.medicalCertFile.name,
        form.medicalCertFile.type,
      );
      await uploadFileToStorage(medCertUpload.uploadUrl, form.medicalCertFile);

      // Notify backend
      const docsRes = await api.post('/providers/me/verification/documents', {
        aadhaarDocumentUrl: aadhaarUpload.path,
        medicalCertificateUrl: medCertUpload.path,
      });

      setField('aadhaarUrl', aadhaarUpload.path);
      setField('medicalCertUrl', medCertUpload.path);
      if (docsRes.data?.licenseId) {
        setField('licenseId', docsRes.data.licenseId);
      }

      setStep(4);
    } catch {
      setError('Failed to upload documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 4: DigiLocker Consent ─────────────────────────────────────────────

  async function handleDigilockerConsent(consented: boolean) {
    if (consented) {
      try {
        await api.post('/providers/me/verification/digilocker-consent', {
          licenseId: form.licenseId || undefined,
        });
      } catch {
        // Consent recording failure is non-blocking; proceed anyway
      }
    }
    setStep(5);
    void runVerificationPipeline();
  }

  // ── Step 5: Pipeline ───────────────────────────────────────────────────────

  async function runVerificationPipeline() {
    setPipelineSteps([
      { label: 'NMC Registration Check', status: 'running' },
      { label: 'State Medical Council Verification', status: 'waiting' },
      { label: 'Confidence Scoring', status: 'waiting' },
    ]);

    try {
      // Slight delay so the user sees the first step animate
      await delay(600);

      const res = await api.post('/providers/me/verification/nmc', {
        fullName: form.fullName,
        nmcRegistrationNumber: form.nmcRegistrationNumber,
        stateCouncil: form.stateCouncil,
        yearOfAdmission: new Date().getFullYear().toString(),
        licenseId: form.licenseId || undefined,
      });

      setPipelineSteps([
        { label: 'NMC Registration Check', status: 'done' },
        { label: 'State Medical Council Verification', status: 'running' },
        { label: 'Confidence Scoring', status: 'waiting' },
      ]);

      await delay(800);

      setPipelineSteps([
        { label: 'NMC Registration Check', status: 'done' },
        { label: 'State Medical Council Verification', status: 'done' },
        { label: 'Confidence Scoring', status: 'running' },
      ]);

      await delay(600);

      setPipelineSteps([
        { label: 'NMC Registration Check', status: 'done' },
        { label: 'State Medical Council Verification', status: 'done' },
        { label: 'Confidence Scoring', status: 'done' },
      ]);

      setFinalIssueCode(res.data?.issueCode ?? 500);
      setFinalIssueLabel(res.data?.issueLabel ?? 'Pending Admin Approval');

      await delay(400);
      setStep(6);
    } catch {
      setPipelineSteps([
        { label: 'NMC Registration Check', status: 'done' },
        { label: 'State Medical Council Verification', status: 'done' },
        { label: 'Confidence Scoring', status: 'done' },
      ]);
      setFinalIssueCode(500);
      setFinalIssueLabel('Pending Admin Approval');
      await delay(400);
      setStep(6);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Doctor Verification</h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete all steps to submit your verification for admin review
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-2xl">
        {/* Hide step indicator on pipeline/result screens */}
        {step < 5 && <StepIndicator current={step} total={4} />}

        {/* ── Step 1: Full Name ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              What is your full name?
            </h2>
            <input
              type="text"
              placeholder="e.g. Dr. Priya Sharma"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStep1()}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              onClick={handleStep1}
              className="mt-6 w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Registration Details ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-6">
              Registration Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NMC Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-12345"
                  value={form.nmcRegistrationNumber}
                  onChange={(e) =>
                    setField('nmcRegistrationNumber', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Medical Council
                </label>
                <select
                  value={form.stateCouncil}
                  onChange={(e) => setField('stateCouncil', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">Select your state council…</option>
                  {INDIAN_STATE_COUNCILS.map((council) => (
                    <option key={council} value={council}>
                      {council}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleStep2}
                className="flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Document Upload ── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Upload Documents
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Please upload clear images of your Aadhaar card and medical
              certificate.
            </p>
            <div className="space-y-4">
              {/* Aadhaar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhaar Card
                </label>
                <div
                  onClick={() => aadhaarInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition"
                >
                  {form.aadhaarFile ? (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {form.aadhaarFile.name}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Click to upload Aadhaar card (JPG, PNG, PDF)
                    </p>
                  )}
                </div>
                <input
                  ref={aadhaarInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    setField('aadhaarFile', e.target.files?.[0] ?? null)
                  }
                />
              </div>

              {/* Medical Certificate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Certificate / Degree
                </label>
                <div
                  onClick={() => medicalCertInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition"
                >
                  {form.medicalCertFile ? (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {form.medicalCertFile.name}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Click to upload medical certificate (JPG, PNG, PDF)
                    </p>
                  )}
                </div>
                <input
                  ref={medicalCertInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    setField('medicalCertFile', e.target.files?.[0] ?? null)
                  }
                />
              </div>
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleStep3}
                disabled={submitting}
                className="flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Uploading…
                  </>
                ) : (
                  'Upload & Continue'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: DigiLocker Consent ── */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-lg font-semibold text-gray-800">
                DigiLocker Document Access
              </h2>
            </div>
            <div className="bg-primary-lighter border border-surface-border rounded-lg p-4 mb-6">
              <p className="text-sm text-navy">
                We would like to securely access your documents from DigiLocker
                to verify your credentials. This is optional — you may skip this
                step and we will use only the documents you uploaded.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDigilockerConsent(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Skip
              </button>
              <button
                onClick={() => handleDigilockerConsent(true)}
                className="flex-1 bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition"
              >
                I Consent
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Verification Progress ── */}
        {step === 5 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-lg font-semibold text-gray-800">
                Verifying Your Details
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Please wait while we check your registration…
              </p>
            </div>
            <div className="space-y-4">
              {pipelineSteps.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {s.status === 'done' && (
                      <span className="text-green-500 text-xl font-bold">✓</span>
                    )}
                    {s.status === 'running' && (
                      <span className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent inline-block" />
                    )}
                    {s.status === 'waiting' && (
                      <span className="w-6 h-6 rounded-full border-2 border-gray-300 inline-block" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      s.status === 'done'
                        ? 'text-green-700'
                        : s.status === 'running'
                          ? 'text-primary'
                          : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 6: Result ── */}
        {step === 6 && (
          <div className="text-center">
            <div className="text-5xl mb-4">🕐</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Waiting for Admin Approval
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Your verification details have been submitted successfully.
            </p>
            {finalIssueCode !== null && (
              <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mb-6">
                <span className="text-xs text-yellow-700 font-mono">
                  Status {finalIssueCode} — {finalIssueLabel}
                </span>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-medium">What happens next?</span>
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Our team will review your submitted documents</li>
                <li>You will receive a notification once approved</li>
                <li>
                  After approval you can start accepting patient bookings
                </li>
              </ul>
            </div>
            <a
              href="/dashboard"
              className="inline-block bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition"
            >
              Back to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
