import api from './api';
export const authService = {
  sendOtp: async (phone: string) => { const r = await api.post('/auth/send-otp', { phone }); return r.data; },
  verifyOtp: async (phone: string, otp: string) => { const r = await api.post('/auth/verify-otp', { phone, otp, role: 'PROVIDER' }); return r.data; },
};
