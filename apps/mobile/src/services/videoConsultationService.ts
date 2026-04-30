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
};
