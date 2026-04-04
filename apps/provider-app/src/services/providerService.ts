import api from './api';
export const providerService = {
  getProfile: async () => { const r = await api.get('/providers/me'); return r.data; },
  onboard: async (data: any) => { const r = await api.post('/providers/onboard', data); return r.data; },
  updateProfile: async (data: any) => { const r = await api.put('/providers/me', data); return r.data; },
  updateAvailability: async (isAvailable: boolean, lat?: number, lng?: number) => {
    const r = await api.put('/providers/me/availability', { isAvailable, currentLat: lat, currentLng: lng });
    return r.data;
  },
  submitConsultation: async (bookingId: string, data: any) => {
    const r = await api.post(`/consultation/${bookingId}/summary`, data);
    return r.data;
  },
};
