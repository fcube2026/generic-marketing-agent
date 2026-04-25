import api from './api';
import { ENDPOINTS } from '../constants/api';
import {
  MedicineResult,
  MedicinePriceComparison,
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

  createPrescriptionOrder: async (payload: {
    uploadedPrescriptionId?: string;
    deliveryAddressId?: string;
    prescriptionUrl?: string;
    notes?: string;
  }): Promise<PharmacyOrder> => {
    try {
      const response = await api.post(`${ENDPOINTS.PHARMACY.ORDERS}/prescription`, payload);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 404) {
        throw error;
      }

      try {
        const aliasResponse = await api.post('/orders/prescription', payload);
        return aliasResponse.data;
      } catch (aliasError: any) {
        const aliasStatus = aliasError?.response?.status;
        if (aliasStatus === 404) {
          const deploymentError = new Error(
            'Prescription-order API is not available on current backend. Please deploy latest API to staging or switch mobile app to local updated API.',
          );
          (deploymentError as any).response = {
            data: {
              message: deploymentError.message,
            },
          };
          throw deploymentError;
        }
        throw aliasError;
      }
    }
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

  payOrder: async (id: string): Promise<PharmacyOrder> => {
    const response = await api.post(`${ENDPOINTS.PHARMACY.ORDERS}/${id}/pay`);
    return response.data;
  },

  reuploadPrescriptionForOrder: async (
    id: string,
    payload: {
      uploadedPrescriptionId?: string;
      prescriptionUrl?: string;
      notes?: string;
    },
  ): Promise<PharmacyOrder> => {
    const response = await api.post(
      `${ENDPOINTS.PHARMACY.ORDERS}/${id}/reupload`,
      payload,
    );
    return response.data;
  },

  compareMedicinePrices: async (
    medicineId: string,
    pincode?: string,
  ): Promise<MedicinePriceComparison[]> => {
    const params: Record<string, string> = { medicineId };
    if (pincode) params.pincode = pincode;
    const response = await api.get(ENDPOINTS.PHARMACY.MEDICINE_COMPARE, { params });
    return Array.isArray(response.data) ? response.data : [];
  },
};
