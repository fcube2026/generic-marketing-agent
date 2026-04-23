import api from './api';
import { ENDPOINTS } from '../constants/api';
import {
  MedicineResult,
  PharmacyPartner,
  PharmacyOrder,
  CreatePharmacyOrderPayload,
} from '../types';

export const pharmacyService = {
  searchMedicines: async (query: string, pincode?: string): Promise<MedicineResult[]> => {
    const params: Record<string, string> = { query };
    if (pincode) {
      params.pincode = pincode;
    }
    const response = await api.get(ENDPOINTS.PHARMACY.MEDICINES_SEARCH, { params });
    return response.data;
  },

  getPartners: async (): Promise<PharmacyPartner[]> => {
    const response = await api.get(ENDPOINTS.PHARMACY.PARTNERS);
    return response.data;
  },

  createOrder: async (payload: CreatePharmacyOrderPayload): Promise<PharmacyOrder> => {
    const response = await api.post(ENDPOINTS.PHARMACY.ORDERS, payload);
    return response.data;
  },

  getOrders: async (page = 1, limit = 10): Promise<PharmacyOrder[]> => {
    const response = await api.get(ENDPOINTS.PHARMACY.ORDERS, {
      params: { page, limit },
    });
    // API may return { data, total } or plain array
    const result = response.data;
    return Array.isArray(result) ? result : result.data ?? result.orders ?? [];
  },

  getOrderById: async (id: string): Promise<PharmacyOrder> => {
    const response = await api.get(`${ENDPOINTS.PHARMACY.ORDERS}/${id}`);
    return response.data;
  },

  cancelOrder: async (id: string): Promise<PharmacyOrder> => {
    const response = await api.post(`${ENDPOINTS.PHARMACY.ORDERS}/${id}/cancel`);
    return response.data;
  },
};
