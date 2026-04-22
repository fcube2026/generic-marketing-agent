import api from './api';
export const providerService = {
  getProfile: async () => { const r = await api.get('/providers/me'); return r.data; },
  onboard: async (data: any) => { const r = await api.post('/providers/onboard', data); return r.data; },
  updateProfile: async (data: any) => { const r = await api.put('/providers/me', data); return r.data; },
  updateAvailability: async (isAvailable: boolean, lat?: number, lng?: number, serviceRadius?: number) => {
    const r = await api.put('/providers/me/availability', {
      isAvailable,
      currentLat: lat,
      currentLng: lng,
      serviceRadius,
    });
    return r.data;
  },
  submitConsultation: async (bookingId: string, data: any) => {
    const r = await api.post(`/consultation/${bookingId}/summary`, data);
    return r.data;
  },
  uploadKycDocument: async (data: { type: string; documentUrl: string; expiresAt?: string }) => {
    const r = await api.post('/providers/me/kyc', data);
    return r.data;
  },
  getKycDocuments: async () => {
    const r = await api.get('/providers/me/kyc');
    return r.data;
  },
  deleteKycDocument: async (documentId: string) => {
    const r = await api.delete(`/providers/me/kyc/${documentId}`);
    return r.data;
  },
};

export const consultationService = {
  submitSummary: async (bookingId: string, data: any) => {
    const r = await api.post(`/consultation/${bookingId}/summary`, data);
    return r.data;
  },

  uploadPrescription: async (
    bookingId: string,
    file?: { uri: string; name?: string; mimeType?: string } | null,
    details?: string,
  ) => {
    const form = new FormData();
    if (file?.uri) {
      form.append('file', {
        uri: file.uri,
        name: file.name || `prescription_${Date.now()}`,
        type: file.mimeType || 'application/octet-stream',
      } as any);
    }
    if (details && details.trim()) form.append('details', details.trim());
    const r = await api.post(`/consultation/${bookingId}/prescription`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },
};

export const referralService = {
  createReferral: async (data: { bookingId: string; specialistType: string; notes?: string }) => {
    const r = await api.post('/referrals', data);
    return r.data;
  },
};
