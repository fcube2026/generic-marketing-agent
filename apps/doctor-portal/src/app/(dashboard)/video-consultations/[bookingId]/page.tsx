'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface VideoSession {
  id: string;
  bookingId: string;
  roomId: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  totalFee: number;
  patient?: { name: string };
  serviceCategory?: { name: string };
  videoSession?: VideoSession;
}

const SESSION_STATUS_LABEL: Record<string, string> = {
  CREATED: '🕐 Scheduled',
  WAITING: '⏳ Waiting',
  IN_PROGRESS: '🔴 Live',
  COMPLETED: '✅ Completed',
  FAILED: '❌ Failed',
  EXPIRED: '⌛ Expired',
};

const SESSION_STATUS_COLOR: Record<string, string> = {
  CREATED: 'bg-primary-light text-navy border border-surface-border',
  WAITING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-primary text-white border border-primary',
  FAILED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
};

export default function VideoConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [session, setSession] = useState<VideoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [bookingRes, sessionRes] = await Promise.allSettled([
      api.get(`/bookings/${bookingId}`),
      api.get(`/video-sessions/${bookingId}`),
    ]);
    if (bookingRes.status === 'fulfilled') {
      setBooking(bookingRes.value.data);
    } else {
      setError('Failed to load appointment details.');
    }
    if (sessionRes.status === 'fulfilled') {
      setSession(sessionRes.value.data);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post(`/video-sessions/${bookingId}/create`);
      setSession(res.data);
    } catch {
      setError('Failed to create video room. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post(`/video-sessions/${bookingId}/end`);
      setSession(res.data);
    } catch {
      setError('Failed to end session. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    setError(null);
    try {
      const res = await api.get(`/video-sessions/${bookingId}/token`);
      const { token, roomId } = res.data as { token: string; roomId: string };
      window.open(`https://app.100ms.live/preview/${roomId}?token=${token}`, '_blank');
    } catch {
      setError('Failed to get join token. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const sessionExists = Boolean(session);
  const isActive = session && ['CREATED', 'WAITING', 'IN_PROGRESS'].includes(session.status);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Video Consultation</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Booking Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Appointment Details</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Patient</dt>
            <dd className="text-sm font-medium text-gray-900">{booking?.patient?.name || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Service</dt>
            <dd className="text-sm font-medium text-gray-900">{booking?.serviceCategory?.name || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Scheduled</dt>
            <dd className="text-sm font-medium text-gray-900">
              {booking?.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Fee</dt>
            <dd className="text-sm font-medium text-gray-900">
              {booking?.totalFee != null
                ? `₹${booking.totalFee.toLocaleString('en-IN')}`
                : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Booking Status</dt>
            <dd>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-navy border border-surface-border">
                {booking?.status?.replace('_', ' ') || '—'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Video Session */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🎥 Video Session</h2>

        {!session ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📹</div>
            <p className="text-gray-500 text-sm">
              No video room created yet. Use the button below to set up the 100ms room.
            </p>
          </div>
        ) : (
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    SESSION_STATUS_COLOR[session.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {SESSION_STATUS_LABEL[session.status] || session.status}
                </span>
              </dd>
            </div>
            {session.roomId && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Room ID</dt>
                <dd className="text-xs font-mono text-gray-600 truncate max-w-xs">{session.roomId}</dd>
              </div>
            )}
            {session.startedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(session.startedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {session.endedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ended</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {new Date(session.endedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {session.duration != null && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Duration</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDuration(session.duration)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!sessionExists && (
          <button
            onClick={handleCreate}
            disabled={actionLoading}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition disabled:opacity-60"
          >
            {actionLoading ? 'Creating…' : '▶️ Create Video Room'}
          </button>
        )}

        {isActive && (
          <button
            onClick={handleJoin}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition"
          >
            🎥 Join Video Call (100ms)
          </button>
        )}

        {isActive && (
          <button
            onClick={handleEnd}
            disabled={actionLoading}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition disabled:opacity-60"
          >
            {actionLoading ? 'Ending…' : '✅ End Consultation'}
          </button>
        )}
      </div>
    </div>
  );
}
