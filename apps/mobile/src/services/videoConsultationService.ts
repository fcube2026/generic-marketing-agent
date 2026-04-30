import api from './api';

export interface VideoToken {
  jitsiUrl: string;
  roomId: string;
  role: 'patient' | 'provider';
}

export const videoConsultationService = {
  /**
   * Fetches (and idempotently creates) the Jitsi room for a booking.
   * Returns { jitsiUrl, roomId, role }.
   */
  getToken: async (bookingId: string): Promise<VideoToken> => {
    const r = await api.get<VideoToken>(`/video-sessions/${bookingId}/token`);
    return r.data;
  },

  /**
   * Marks the video session as IN_PROGRESS (call started).
   */
  startSession: async (bookingId: string): Promise<void> => {
    await api.patch(`/video-sessions/${bookingId}/status`, { status: 'IN_PROGRESS' });
  },

  /**
   * Marks the video session as COMPLETED (call ended).
   */
  endSession: async (bookingId: string): Promise<void> => {
    await api.patch(`/video-sessions/${bookingId}/status`, { status: 'COMPLETED' });
  },
};
