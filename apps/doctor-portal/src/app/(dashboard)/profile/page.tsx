'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ProviderProfile {
  name: string;
  phone: string;
  email: string | null;
  specialization: string | null;
  licenseNumber: string | null;
  verificationStatus: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/providers/me')
      .then((res) => setProfile(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error('[Profile] Error:', err?.message);
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
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage your professional details</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Full Name</p>
            <p className="text-lg text-gray-900 mt-1">{profile?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-lg text-gray-900 mt-1">{profile?.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-lg text-gray-900 mt-1">{profile?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Specialization</p>
            <p className="text-lg text-gray-900 mt-1">{profile?.specialization ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">License Number</p>
            <p className="text-lg text-gray-900 mt-1">{profile?.licenseNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Verification Status</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                statusColor[profile?.verificationStatus ?? ''] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {profile?.verificationStatus ?? 'unknown'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
