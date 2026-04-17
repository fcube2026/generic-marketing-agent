export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

export const ENDPOINTS = {
  AUTH: {
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
  },
  PATIENTS: {
    ME: '/patients/me',
    PROFILE_SETUP: '/patients/me/profile',
    ADDRESSES: '/patients/me/addresses',
    BOOKINGS: '/patients/me/bookings',
  },
  PROVIDERS: {
    NEARBY: '/providers/nearby',
  },
  SERVICES: '/services',
  BOOKINGS: '/bookings',
  RECOMMENDATION: '/recommendation',
  CONSULTATION: '/consultation',
  CONSULTATION_PATIENT_SUMMARIES: '/consultation/patient/summaries',
  REFERRALS_PATIENT: '/referrals/patient/me',
  PAYMENTS: '/payments',
  PHARMACY: {
    MEDICINES_SEARCH: '/pharmacy/medicines/search',
    PROVIDERS: '/pharmacy/providers',
    ORDERS: '/pharmacy/orders',
    MY_ORDERS: '/pharmacy/orders/me',
  },
};
