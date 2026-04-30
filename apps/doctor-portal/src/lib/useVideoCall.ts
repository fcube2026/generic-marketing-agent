'use client';

import { useState, useCallback } from 'react';
import api from './api';

export function useVideoCall() {
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const joinCall = useCallback(async (bookingId: string): Promise<boolean> => {
    setJoiningId(bookingId);
    try {
      const { data } = await api.get<{ jitsiUrl: string; roomId: string; role: string }>(
        `/video-sessions/${bookingId}/token`,
      );
      await api.patch(`/video-sessions/${bookingId}/status`, { status: 'IN_PROGRESS' });
      window.open(data.jitsiUrl, '_blank', 'noopener,noreferrer');
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to join video call. Please try again.';
      alert(msg);
      return false;
    } finally {
      setJoiningId(null);
    }
  }, []);

  const endCall = useCallback(async (bookingId: string): Promise<boolean> => {
    if (!confirm('End this video consultation?')) return false;
    setJoiningId(bookingId);
    try {
      await api.patch(`/video-sessions/${bookingId}/status`, { status: 'COMPLETED' });
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to end consultation. Please try again.';
      alert(msg);
      return false;
    } finally {
      setJoiningId(null);
    }
  }, []);

  return { joiningId, joinCall, endCall };
}
