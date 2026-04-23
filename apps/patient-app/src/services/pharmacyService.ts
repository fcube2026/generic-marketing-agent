import api from './api';
import { ENDPOINTS } from '../constants/api';
import {
  MedicineResult,
  PharmacyOrder,
  PharmacyOrdersResponse,
  PharmacyPartner,
  CreatePharmacyOrderPayload,
} from '../types';

export const pharmacyService = {
  searchMedicines: async (query: string): Promise<MedicineResult[]> => {
    const response = await api.get(ENDPOINTS.PHARMACY.MEDICINES_SEARCH, {
      params: { query },
    });
    return response.data;
  },

  // Backend returns an array of partner objects, not plain strings
  getProviders: async (): Promise<PharmacyPartner[]> => {
    const response = await api.get(ENDPOINTS.PHARMACY.PROVIDERS);
    return response.data;
  },

  createOrder: async (payload: CreatePharmacyOrderPayload): Promise<PharmacyOrder> => {
    const response = await api.post(ENDPOINTS.PHARMACY.ORDERS, payload);
    return response.data;
  },

  getOrders: async (page = 1, limit = 10): Promise<PharmacyOrdersResponse> => {
    const response = await api.get(ENDPOINTS.PHARMACY.MY_ORDERS, {
      params: { page, limit },
    });
    return response.data;
  },

  getOrderById: async (id: string): Promise<PharmacyOrder> => {
    const response = await api.get(`${ENDPOINTS.PHARMACY.ORDERS}/${id}`);
    return response.data;
  },

  refreshOrderStatus: async (id: string): Promise<PharmacyOrder> => {
    const response = await api.patch(`${ENDPOINTS.PHARMACY.ORDERS}/${id}/status`);
    return response.data;
  },

  // Cancel order — backend: POST /pharmacy/orders/:id/cancel
  cancelOrder: async (id: string): Promise<PharmacyOrder> => {
    const response = await api.post(`${ENDPOINTS.PHARMACY.ORDERS}/${id}/cancel`);
    return response.data;
  },
};
