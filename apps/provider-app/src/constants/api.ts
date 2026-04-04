export const API_BASE_URL = 'http://localhost:3000/api/v1';
export const ENDPOINTS = {
  AUTH: { SEND_OTP: '/auth/send-otp', VERIFY_OTP: '/auth/verify-otp' },
  PROVIDERS: { ME: '/providers/me', ONBOARD: '/providers/onboard', AVAILABILITY: '/providers/me/availability', BOOKINGS: '/providers/me/bookings' },
  BOOKINGS: '/bookings',
  CONSULTATION: '/consultation',
  SERVICES: '/services',
};
