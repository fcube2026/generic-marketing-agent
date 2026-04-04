import api from './api';
import { ENDPOINTS } from '../constants/api';

export const providerService = {
  getNearbyProviders: async (params: {
    lat: number;
    lng: number;
    serviceCategory?: string;
    mode?: string;
  }) => {
    const response = await api.get(ENDPOINTS.PROVIDERS.NEARBY, { params });
    return response.data;
  },

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
