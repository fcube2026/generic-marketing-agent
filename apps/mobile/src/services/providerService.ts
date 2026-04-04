import api from './api';
import { ENDPOINTS } from '../constants/api';

// Provider management service (used by provider screens)
export const providerService = {
  getProfile: async () => {
    const r = await api.get('/providers/me');
    return r.data;
  },
  onboard: async (data: any) => {
    const r = await api.post('/providers/onboard', data);
    return r.data;
  },
  updateProfile: async (data: any) => {
    const r = await api.put('/providers/me', data);
    return r.data;
  },
  updateAvailability: async (isAvailable: boolean, lat?: number, lng?: number) => {
    const r = await api.put('/providers/me/availability', { isAvailable, currentLat: lat, currentLng: lng });
    return r.data;
  },
  submitConsultation: async (bookingId: string, data: any) => {
    const r = await api.post(`/consultation/${bookingId}/summary`, data);
    return r.data;
  },

  // Patient-side: discover nearby providers
  getNearbyProviders: async (params: {
    lat: number;
    lng: number;
    serviceCategory?: string;
    mode?: string;
  }) => {
    const response = await api.get(ENDPOINTS.PROVIDERS.NEARBY, { params });
    return response.data;
  },

  // Patient-side: get smart care recommendation
  getRecommendation: async (data: {
    lat: number;
    lng: number;
    serviceCategory: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => {
    const response = await api.post(ENDPOINTS.RECOMMENDATION, data);
    return response.data;
  },
};

// Alias used by ConsultationFormScreen
export const consultationService = providerService;
