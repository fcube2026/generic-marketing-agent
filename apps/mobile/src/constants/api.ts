import Constants from 'expo-constants';

const rawApiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:3000/api/v1';

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');

export const ENDPOINTS = {
  AUTH: {
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
  },
  PATIENTS: {
    ME: '/patients/me',
    ADDRESSES: '/patients/me/addresses',
    BOOKINGS: '/patients/me/bookings',
  },
  PROVIDERS: {
    NEARBY: '/providers/nearby',
  },
  VERIFICATION: {
    SUBMIT_NMC: '/providers/me/verification/nmc',
    LOGS: '/providers/me/verification/logs',
  },
  SERVICES: '/services',
  BOOKINGS: '/bookings',
  RECOMMENDATION: '/recommendation',
  CONSULTATION: '/consultation',
  PAYMENTS: '/payments',
  VERIFICATION: {
    SUBMIT_NMC: '/providers/me/verification/nmc',
    LOGS: '/providers/me/verification/logs',
  },
};