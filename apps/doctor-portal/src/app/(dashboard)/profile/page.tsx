'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ProviderProfile {
  name: string;
  phone?: string;
  email?: string | null;
  specialization: string | null;
  contactInfo?: string | null;
  licenseNumber: string | null;
  bio?: string | null;
  clinicAddress?: string | null;
  consultationFeeDoctorPlace?: number | null;
  consultationFeeHomeVisit?: number | null;
  consultationFeeVideoConsultation?: number | null;
  doctorPlaceVisitEnabled?: boolean;
  homeVisitEnabled?: boolean;
  videoConsultationEnabled?: boolean;
  verificationStatus: string;
  user?: { phone?: string | null; email?: string | null };
}

const statusColor: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  verified: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-yellow-100 text-yellow-700',
  PENDING_ADMIN_APPROVAL: 'bg-yellow-100 text-yellow-700',
  pending_admin_approval: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusLabel: Record<string, string> = {
  APPROVED: 'Verified',
  verified: 'Verified',
  PENDING: 'Waiting for Admin Approval',
  pending: 'Waiting for Admin Approval',
  PENDING_ADMIN_APPROVAL: 'Waiting for Admin Approval',
  pending_admin_approval: 'Waiting for Admin Approval',
  REJECTED: 'Rejected',
  rejected: 'Rejected',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [bio, setBio] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [feeClinic, setFeeClinic] = useState('');
  const [feeHome, setFeeHome] = useState('');
  const [feeVideo, setFeeVideo] = useState('');
  const [doctorPlaceVisitEnabled, setDoctorPlaceVisitEnabled] = useState(true);
  const [homeVisitEnabled, setHomeVisitEnabled] = useState(false);
  const [videoConsultationEnabled, setVideoConsultationEnabled] = useState(true);

  const populate = (p: ProviderProfile) => {
    setProfile(p);
    setName(p.name ?? '');
    setSpecialization(p.specialization ?? '');
    setContactInfo(p.contactInfo ?? p.user?.phone ?? '');
    setBio(p.bio ?? '');
    setClinicAddress(p.clinicAddress ?? '');
    setFeeClinic(p.consultationFeeDoctorPlace != null ? String(p.consultationFeeDoctorPlace) : '');
    setFeeHome(p.consultationFeeHomeVisit != null ? String(p.consultationFeeHomeVisit) : '');
    setFeeVideo(p.consultationFeeVideoConsultation != null ? String(p.consultationFeeVideoConsultation) : '');
    setDoctorPlaceVisitEnabled(p.doctorPlaceVisitEnabled ?? true);
    setHomeVisitEnabled(p.homeVisitEnabled ?? false);
    setVideoConsultationEnabled(p.videoConsultationEnabled ?? true);
  };

  useEffect(() => {
    api
      .get('/providers/me')
      .then((res) => populate(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error('[Profile] Error:', err?.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        specialization: specialization.trim(),
        contactInfo: contactInfo.trim(),
        bio: bio.trim(),
        clinicAddress: clinicAddress.trim(),
        doctorPlaceVisitEnabled,
        homeVisitEnabled,
        videoConsultationEnabled,
      };
      if (doctorPlaceVisitEnabled && feeClinic) {
        payload.consultationFeeDoctorPlace = Number(feeClinic);
      }
      if (homeVisitEnabled && feeHome) {
        payload.consultationFeeHomeVisit = Number(feeHome);
      }
      // Always send video fee; default to 500 when left blank
      payload.consultationFeeVideoConsultation = feeVideo ? Number(feeVideo) : 500;

      await api.put('/providers/me', payload);
      const refreshed = await api.get('/providers/me');
      populate(refreshed.data);
      setEditing(false);
      setMessage({
        kind: 'ok',
        text: 'Profile updated. Admin and patient app will now see the latest details.',
      });
    } catch (err: any) {
      const text =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to update profile.';
      setMessage({
        kind: 'err',
        text: Array.isArray(text) ? text.join(', ') : String(text),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const phone = profile?.phone ?? profile?.user?.phone ?? '—';
  const email = profile?.email ?? profile?.user?.email ?? '—';

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage your professional details</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-dark transition"
          >
            Edit profile
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            message.kind === 'ok'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-2xl space-y-5"
        >
          <Field label="Full name *">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Specialization *">
            <input
              type="text"
              required
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Contact phone / email *">
            <input
              type="text"
              required
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Short bio">
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Clinic address">
            <input
              type="text"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModeBlock
              label="Clinic visit"
              enabled={doctorPlaceVisitEnabled}
              onToggle={setDoctorPlaceVisitEnabled}
              fee={feeClinic}
              onFee={setFeeClinic}
            />
            <ModeBlock
              label="Home visit"
              enabled={homeVisitEnabled}
              onToggle={setHomeVisitEnabled}
              fee={feeHome}
              onFee={setFeeHome}
            />
            <ModeBlock
              label="📹 Video consultation"
              enabled={videoConsultationEnabled}
              onToggle={setVideoConsultationEnabled}
              fee={feeVideo}
              onFee={setFeeVideo}
              feePlaceholder="500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white text-sm rounded-lg font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (profile) populate(profile);
                setEditing(false);
                setMessage(null);
              }}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-2xl">
          <div className="space-y-6">
            <Row label="Full Name" value={profile?.name ?? '—'} />
            <Row label="Phone" value={phone} />
            <Row label="Email" value={email} />
            <Row label="Specialization" value={profile?.specialization ?? '—'} />
            <Row label="License Number" value={profile?.licenseNumber ?? '—'} />
            <Row label="Bio" value={profile?.bio ?? '—'} />
            <Row label="Clinic Address" value={profile?.clinicAddress ?? '—'} />
            <Row
              label="Clinic visit fee"
              value={
                profile?.doctorPlaceVisitEnabled
                  ? `₹${profile?.consultationFeeDoctorPlace ?? 0}`
                  : 'Disabled'
              }
            />
            <Row
              label="Home visit fee"
              value={
                profile?.homeVisitEnabled
                  ? `₹${profile?.consultationFeeHomeVisit ?? 0}`
                  : 'Disabled'
              }
            />
            <Row
              label="Video consultation fee"
              value={
                profile?.videoConsultationEnabled !== false
                  ? `₹${profile?.consultationFeeVideoConsultation ?? 500}`
                  : 'Disabled'
              }
            />
            <div>
              <p className="text-sm font-medium text-gray-500">Verification Status</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                  statusColor[profile?.verificationStatus ?? ''] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {statusLabel[profile?.verificationStatus ?? ''] ??
                  profile?.verificationStatus ??
                  'Unknown'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-lg text-gray-900 mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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
  feePlaceholder = '0',
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  fee: string;
  onFee: (v: string) => void;
  feePlaceholder?: string;
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder={feePlaceholder}
          />
        </div>
      )}
    </div>
  );
}
