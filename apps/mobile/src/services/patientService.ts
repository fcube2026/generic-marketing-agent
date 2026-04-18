import api from './api';
import { ENDPOINTS } from '../constants/api';

export interface PatientProfilePayload {
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  emergencyContact?: string;
}

export interface AddressPayload {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export const patientService = {
  getProfile: async () => {
    const response = await api.get(ENDPOINTS.PATIENTS.ME);
    const data = response.data;

    if (data?.patientProfile === null) {
      return null;
    }

    return data?.patientProfile ?? data;
  },

  createProfile: async (payload: PatientProfilePayload) => {
    const response = await api.post('/patients/me/profile', payload);
    return response.data;
  },

  updateProfile: async (payload: PatientProfilePayload) => {
    const response = await api.put(ENDPOINTS.PATIENTS.ME, payload);
    return response.data;
  },

  getAddresses: async () => {
    const response = await api.get(ENDPOINTS.PATIENTS.ADDRESSES);
    return response.data;
  },

  addAddress: async (payload: AddressPayload) => {
    const response = await api.post(ENDPOINTS.PATIENTS.ADDRESSES, payload);
    return response.data;
  },

  updateAddress: async (addressId: string, payload: Partial<AddressPayload>) => {
    const response = await api.put(`${ENDPOINTS.PATIENTS.ADDRESSES}/${addressId}`, payload);
    return response.data;
  },
};