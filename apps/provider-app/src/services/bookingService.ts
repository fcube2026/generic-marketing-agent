import api from './api';
export const bookingService = {
  getProviderBookings: async () => {
    const r = await api.get('/providers/me/bookings');
    return r.data;
  },
  getMyBookings: async () => { const r = await api.get('/providers/me/bookings'); return r.data; },
  getIncomingRequests: async () => { const r = await api.get('/providers/me/incoming-requests'); return r.data; },
  getBookingById: async (id: string) => {
    const r = await api.get(`/bookings/${id}`);
    return r.data;
  },
  getBooking: async (id: string) => { const r = await api.get(`/bookings/${id}`); return r.data; },
  acceptBooking: async (id: string) => { const r = await api.post(`/bookings/${id}/accept`); return r.data; },
  declineBooking: async (id: string, reason?: string) => { const r = await api.post(`/bookings/${id}/decline`, { reason }); return r.data; },
  updateStatus: async (id: string, status: string) => { const r = await api.put(`/bookings/${id}/status`, { status }); return r.data; },
};
