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
    SUBMIT_FACE: '/providers/me/verification/face',
    SUBMIT_DOCUMENTS: '/providers/me/verification/documents',
    DIGILOCKER_CONSENT: '/providers/me/verification/digilocker-consent',
    LOGS: '/providers/me/verification/logs',
  },
  PATIENT_VERIFICATION: {
    INITIATE: '/verification/initiate',
    ID_UPLOAD: '/verification/id-upload',
    ID_CONFIRM: '/verification/id-confirm',
    STATUS: (bookingId: string) => `/verification/status/${bookingId}`,
  },
  CLINICAL_INTAKE: (bookingId: string) => `/clinical-intake/${bookingId}`,
  CONSENT: {
    ACCEPT: '/consent/accept',
    TEXT: '/consent/text',
    GET: (bookingId: string) => `/consent/${bookingId}`,
  },
  VISIT_OTP: {
    SEND: '/visit-otp/send',
    VERIFY: '/visit-otp/verify',
  },
  SERVICES: '/services',
  BOOKINGS: '/bookings',
  RECOMMENDATION: '/recommendation',
  CONSULTATION: '/consultation',
  PAYMENTS: '/payments',
  PHARMACY: {
    MEDICINES_SEARCH: '/pharmacy/medicines/search',
    PARTNERS: '/pharmacy/partners',
    ORDERS: '/pharmacy/orders',
    PRESCRIPTIONS_UPLOAD: '/pharmacy/prescriptions/upload',
  },
};