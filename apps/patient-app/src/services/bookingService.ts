import api from './api';
import { ENDPOINTS } from '../constants/api';
import { BookingMode } from '../types';

export const bookingService = {
  getMyBookings: async () => {
    const response = await api.get(ENDPOINTS.PATIENTS.BOOKINGS);
    return response.data;
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

  cancelBooking: async (id: string) => {
    const response = await api.post(`${ENDPOINTS.BOOKINGS}/${id}/cancel`);
    return response.data;
  },
};
