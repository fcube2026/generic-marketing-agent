import api from './api';

export interface AcceptConsentPayload {
  bookingId: string;
  consentVersion?: string;
  deviceId?: string;
  isGuardianConsent?: boolean;
  guardianName?: string;
  guardianPhone?: string;
}

export const consentService = {
  acceptConsent: async (data: AcceptConsentPayload) => {
    const r = await api.post('/consent/accept', data);
    return r.data;
  },

  getConsentText: async (version?: string) => {
    const r = await api.get('/consent/text', { params: version ? { version } : undefined });
    return r.data;
  },

  getConsentRecord: async (bookingId: string) => {
    const r = await api.get(`/consent/${bookingId}`);
    return r.data;
  },
};
