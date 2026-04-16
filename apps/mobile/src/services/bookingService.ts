import api from './api';
import { ENDPOINTS } from '../constants/api';
import { BookingMode } from '../types';

// Unified booking service with methods for both patient and provider flows.
// Patient screens call getMyBookings() → patient bookings endpoint.
// Provider screens call getProviderBookings() → provider bookings endpoint.
export const bookingService = {
  // Patient: fetch bookings for the authenticated patient
  getMyBookings: async () => {
    const response = await api.get(ENDPOINTS.PATIENTS.BOOKINGS);
    return response.data;
  },

  // Provider: fetch bookings for the authenticated provider
  getProviderBookings: async () => {
    const r = await api.get('/providers/me/bookings');
    return r.data;
  },

  // Provider: fetch incoming (REQUESTED) booking requests
  getIncomingRequests: async () => {
    const r = await api.get('/providers/me/bookings?status=REQUESTED');
    return r.data;
  },

  createBooking: async (data: {
    providerId: string;
    serviceCategoryId: string;
    addressId?: string;
    mode: BookingMode;
    scheduledAt: string;
    symptoms?: string;
  }) => {
    const response = await api.post(ENDPOINTS.BOOKINGS, data);
    return response.data;
  },

  getBooking: async (id: string) => {
    const response = await api.get(`${ENDPOINTS.BOOKINGS}/${id}`);
    return response.data;
  },

  getBookingById: async (id: string) => {
    const r = await api.get(`/bookings/${id}`);
    return r.data;
  },

  cancelBooking: async (id: string) => {
    const response = await api.post(`${ENDPOINTS.BOOKINGS}/${id}/cancel`);
    return response.data;
  },

  acceptBooking: async (id: string) => {
    const r = await api.post(`/bookings/${id}/accept`);
    return r.data;
  },

  declineBooking: async (id: string) => {
    const r = await api.post(`/bookings/${id}/decline`);
    return r.data;
  },

  updateStatus: async (id: string, status: string) => {
    const r = await api.put(`/bookings/${id}/status`, { status });
    return r.data;
  },

  updateProviderLocation: async (bookingId: string, lat: number, lng: number) => {
    const r = await api.put('/tracking/location', { bookingId, lat, lng });
    return r.data;
  },

  getProviderLocation: async (bookingId: string) => {
    const r = await api.get(`/tracking/${bookingId}/location`);
    return r.data;
  },

  getVideoSession: async (bookingId: string) => {
    const r = await api.get(`/video-sessions/${bookingId}`);
    return r.data;
  },
};
