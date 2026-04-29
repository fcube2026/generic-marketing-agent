'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface OnboardingForm {
  name: string;
  specialization: string;
  contactInfo: string;
  licenseNumber: string;
  bio: string;
  clinicAddress: string;
  consultationFeeDoctorPlace: string;
  consultationFeeHomeVisit: string;
  doctorPlaceVisitEnabled: boolean;
  homeVisitEnabled: boolean;
}

const initialForm: OnboardingForm = {
  name: '',
  specialization: '',
  contactInfo: '',
  licenseNumber: '',
  bio: '',
  clinicAddress: '',
  consultationFeeDoctorPlace: '',
  consultationFeeHomeVisit: '',
  doctorPlaceVisitEnabled: true,
  homeVisitEnabled: false,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If the doctor already has a profile, skip straight to dashboard.
  useEffect(() => {
    api
      .get('/providers/me')
      .then(() => router.replace('/dashboard'))
      .catch((err) => {
        if (err?.response?.status !== 404) {
          // Network / auth issue — let user proceed and let interceptor handle 401
        }
      })
      .finally(() => setChecking(false));

    // Pre-fill phone from cached user if present
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('provider_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.phone) {
            setForm((f) => (f.contactInfo ? f : { ...f, contactInfo: parsed.phone }));
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [router]);

  const update = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        specialization: form.specialization.trim(),
        contactInfo: form.contactInfo.trim(),
        doctorPlaceVisitEnabled: form.doctorPlaceVisitEnabled,
        homeVisitEnabled: form.homeVisitEnabled,
      };
      if (form.bio.trim()) payload.bio = form.bio.trim();
      if (form.clinicAddress.trim()) payload.clinicAddress = form.clinicAddress.trim();
      if (form.licenseNumber.trim()) payload.licenseNumber = form.licenseNumber.trim();
      if (form.doctorPlaceVisitEnabled && form.consultationFeeDoctorPlace) {
        payload.consultationFeeDoctorPlace = Number(form.consultationFeeDoctorPlace);
      }
      if (form.homeVisitEnabled && form.consultationFeeHomeVisit) {
        payload.consultationFeeHomeVisit = Number(form.consultationFeeHomeVisit);
      }

      await api.post('/providers/onboard', payload);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to save your profile. Please check the fields and try again.';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome to Curex24. Tell us a bit about your practice so admin can verify you and
          patients can start booking consultations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5"
      >
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name *" htmlFor="o-name">
            <input
              id="o-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="input"
              placeholder="Dr. Arjun Kumar"
            />
          </Field>

          <Field label="Specialization *" htmlFor="o-spec">
            <input
              id="o-spec"
              type="text"
              required
              value={form.specialization}
              onChange={(e) => update('specialization', e.target.value)}
              className="input"
              placeholder="General Physician"
            />
          </Field>

          <Field label="Contact phone / email *" htmlFor="o-contact">
            <input
              id="o-contact"
              type="text"
              required
              value={form.contactInfo}
              onChange={(e) => update('contactInfo', e.target.value)}
              className="input"
              placeholder="+91 98765 43210"
            />
          </Field>

          <Field label="Medical license number" htmlFor="o-lic">
            <input
              id="o-lic"
              type="text"
              value={form.licenseNumber}
              onChange={(e) => update('licenseNumber', e.target.value)}
              className="input"
              placeholder="NMC / state council number"
            />
          </Field>
        </div>

        <Field label="Short bio" htmlFor="o-bio">
          <textarea
            id="o-bio"
            rows={3}
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            className="input"
            placeholder="Brief summary of your experience and approach"
          />
        </Field>

        <Field label="Clinic address" htmlFor="o-addr">
          <input
            id="o-addr"
            type="text"
            value={form.clinicAddress}
            onChange={(e) => update('clinicAddress', e.target.value)}
            className="input"
            placeholder="Street, area, city, PIN"
          />
        </Field>

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Consultation modes</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModeBlock
              label="Clinic visit"
              enabled={form.doctorPlaceVisitEnabled}
              onToggle={(v) => update('doctorPlaceVisitEnabled', v)}
              fee={form.consultationFeeDoctorPlace}
              onFee={(v) => update('consultationFeeDoctorPlace', v)}
            />
            <ModeBlock
              label="Home visit"
              enabled={form.homeVisitEnabled}
              onToggle={(v) => update('homeVisitEnabled', v)}
              fee={form.consultationFeeHomeVisit}
              onFee={(v) => update('consultationFeeHomeVisit', v)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold transition disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save and continue'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          After you save, your profile is sent to admin for verification. You can update these
          details any time from the Profile page.
        </p>
      </form>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input:focus) {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function ModeBlock({
  label,
  enabled,
  onToggle,
  fee,
  onFee,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  fee: string;
  onFee: (v: string) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4"
        />
        {label}
      </label>
      {enabled && (
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Consultation fee (₹)</label>
          <input
            type="number"
            min={0}
            value={fee}
            onChange={(e) => onFee(e.target.value)}
            className="input"
            placeholder="500"
          />
        </div>
      )}
    </div>
  );
}
