import api from './api';

export const visitOtpService = {
  sendOtp: async (bookingId: string) => {
    const r = await api.post('/visit-otp/send', { bookingId });
    return r.data;
  },

  verifyOtp: async (
    bookingId: string,
    otp: string,
    providerLat?: number,
    providerLng?: number,
  ) => {
    const r = await api.post('/visit-otp/verify', { bookingId, otp, providerLat, providerLng });
    return r.data;
  },
};
