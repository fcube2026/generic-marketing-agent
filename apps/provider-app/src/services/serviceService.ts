import api from './api';
import { ENDPOINTS } from '../constants/api';
import { ServiceCategory } from '../types';

export const serviceService = {
  getCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get(ENDPOINTS.SERVICES);
    return response.data;
  },
};
