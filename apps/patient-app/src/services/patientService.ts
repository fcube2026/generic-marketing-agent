import api from './api';
import { ENDPOINTS } from '../constants/api';
import { PatientProfile } from '../types';

export interface CreateProfilePayload {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
}

export const patientService = {
  /**
   * Fetches the current patient's profile.
   * The API returns `PatientProfile` (with a `userId` field) when it exists,
   * or `{ user, patientProfile: null }` when it does not.
   */
  getMyProfile: async (): Promise<PatientProfile | null> => {
    const response = await api.get(ENDPOINTS.PATIENTS.ME);
    const data = response.data;
    // PatientProfile shape has `userId`; the "no profile" response wraps the user differently
    if (data && typeof data.userId === 'string') {
      return data as PatientProfile;
    }
    return null;
  },

  createOrUpdateProfile: async (
    payload: CreateProfilePayload,
  ): Promise<PatientProfile> => {
    const response = await api.post(ENDPOINTS.PATIENTS.PROFILE_SETUP, payload);
    return response.data;
  },
};
