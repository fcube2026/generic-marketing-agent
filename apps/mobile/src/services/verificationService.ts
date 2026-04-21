import api from './api';

export const verificationService = {
  initiateVerification: async (bookingId: string) => {
    const r = await api.post('/verification/initiate', { bookingId });
    return r.data;
  },

  getIdUploadUrl: async (verificationId: string, documentType: string, mimeType: string) => {
    const r = await api.post('/verification/id-upload', { verificationId, documentType, mimeType });
    return r.data;
  },

  confirmIdUpload: async (documentId: string, verificationId: string) => {
    const r = await api.post('/verification/id-confirm', { documentId, verificationId });
    return r.data;
  },

  getVerificationStatus: async (bookingId: string) => {
    const r = await api.get(`/verification/status/${bookingId}`);
    return r.data;
  },
};
