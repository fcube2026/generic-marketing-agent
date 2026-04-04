import api from './api';
import { ENDPOINTS } from '../constants/api';

export const authService = {
  sendOtp: async (phone: string) => {
    const response = await api.post(ENDPOINTS.AUTH.SEND_OTP, { phone });
    return response.data;
  },

  verifyOtp: async (phone: string, otp: string) => {
    const response = await api.post(ENDPOINTS.AUTH.VERIFY_OTP, { phone, otp });
    return response.data;
  },
};
