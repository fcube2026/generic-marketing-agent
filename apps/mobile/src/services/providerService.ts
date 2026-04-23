import api from './api';
import { ENDPOINTS } from '../constants/api';

export interface NmcVerificationPayload {
  fullName: string;
  nmcRegistrationNumber: string;
  stateCouncil: string;
  yearOfAdmission: string;
  licenseId?: string;
}

export interface FaceVerificationPayload {
  liveFaceData: string;
  referenceImageData?: string;
}

export interface VerificationDocumentsPayload {
  aadhaarDocumentUrl: string;
  medicalCertificateUrl: string;
  licenseId?: string;
}

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
  updateAvailability: async (isAvailableOrObj: boolean | { isAvailable: boolean; currentLat?: number; currentLng?: number }, lat?: number, lng?: number) => {
    const payload = typeof isAvailableOrObj === 'object'
      ? isAvailableOrObj
      : { isAvailable: isAvailableOrObj, currentLat: lat, currentLng: lng };
    const r = await api.put('/providers/me/availability', payload);
    return r.data;
  },
  submitConsultation: async (bookingId: string, data: any) => {
    const r = await api.post(`/consultation/${bookingId}/summary`, data);
    return r.data;
  },
  submitSummary: async (bookingId: string, data: any) => {
    const r = await api.post(`/consultation/${bookingId}/summary`, data);
    return r.data;
  },
  addPrescription: async (
    bookingId: string,
    data: { details?: string; fileUrl?: string },
  ) => {
    const r = await api.post(`/consultation/${bookingId}/prescription`, data);
    return r.data;
  },
  addPrescriptionFile: async (
    bookingId: string,
    file: { uri: string; name: string; type: string },
    details?: string,
  ) => {
    const formData = new FormData();
    formData.append('file', file as any);
    if (details?.trim()) {
      formData.append('details', details.trim());
    }

    const r = await api.post(
      `/consultation/${bookingId}/prescription/upload`,
      formData,
    );
    return r.data;
  },

  /** Submit NMC registration for automated multi-step verification. */
  submitNmcVerification: async (data: NmcVerificationPayload) => {
    const r = await api.post(ENDPOINTS.VERIFICATION.SUBMIT_NMC, data);
    return r.data;
  },

  /** Submit face verification data (base64 live selfie). */
  submitFaceVerification: async (data: FaceVerificationPayload) => {
    const r = await api.post(ENDPOINTS.VERIFICATION.SUBMIT_FACE, data);
    return r.data;
  },

  /** Upload Aadhaar + medical certificate document URLs for OCR and admin review. */
  submitVerificationDocuments: async (data: VerificationDocumentsPayload) => {
    const r = await api.post(ENDPOINTS.VERIFICATION.SUBMIT_DOCUMENTS, data);
    return r.data;
  },

  /** Record the doctor's DigiLocker consent for secure document fetch. */
  recordDigilockerConsent: async (licenseId?: string) => {
    const r = await api.post(
      ENDPOINTS.VERIFICATION.DIGILOCKER_CONSENT,
      licenseId ? { licenseId } : {},
    );
    return r.data;
  },

  /** Fetch all past verification log entries for the current provider. */
  getVerificationLogs: async () => {
    const r = await api.get(ENDPOINTS.VERIFICATION.LOGS);
    return r.data;
  },

  /**
   * Upload a prescription file and/or text details under a booking.
   * Requires the consultation summary to already exist.
   * @param file Optional document picker / image picker asset {uri, name, mimeType}
   * @param details Optional prescription notes/text
   */
  uploadPrescription: async (
    bookingId: string,
    file?: { uri: string; name?: string; mimeType?: string } | null,
    details?: string,
  ) => {
    const form = new FormData();
    if (file?.uri) {
      // React Native FormData file shape
      form.append('file', {
        uri: file.uri,
        name: file.name || `prescription_${Date.now()}`,
        type: file.mimeType || 'application/octet-stream',
      } as any);
    }
    if (details && details.trim()) form.append('details', details.trim());
    const r = await api.post(`/consultation/${bookingId}/prescription`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },

  /** Submit NMC registration for automated multi-step verification. */
  submitNmcVerification: async (data: NmcVerificationPayload) => {
    const r = await api.post(ENDPOINTS.VERIFICATION.SUBMIT_NMC, data);
    return r.data;
  },

  /** Submit face verification data (base64 live selfie). */
  submitFaceVerification: async (data: FaceVerificationPayload) => {
    const r = await api.post(ENDPOINTS.VERIFICATION.SUBMIT_FACE, data);
    return r.data;
  },

  /** Upload Aadhaar + medical certificate document URLs for OCR and admin review. */
  submitVerificationDocuments: async (data: VerificationDocumentsPayload) => {
    const r = await api.post(ENDPOINTS.VERIFICATION.SUBMIT_DOCUMENTS, data);
    return r.data;
  },

  /** Record the doctor's DigiLocker consent for secure document fetch. */
  recordDigilockerConsent: async (licenseId?: string) => {
    const r = await api.post(
      ENDPOINTS.VERIFICATION.DIGILOCKER_CONSENT,
      licenseId ? { licenseId } : {},
    );
    return r.data;
  },

  /** Fetch all past verification log entries for the current provider. */
  getVerificationLogs: async () => {
    const r = await api.get(ENDPOINTS.VERIFICATION.LOGS);
    return r.data;
  },

  // Patient-side: discover nearby providers
  getNearbyProviders: async (params: {
    lat?: number;
    lng?: number;
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

export const referralService = {
  createReferral: async (data: {
    bookingId: string;
    specialistType: string;
    notes?: string;
  }) => {
    const r = await api.post('/referrals', data);
    return r.data;
  },
};

export const diagnosticsService = {
  createRequest: async (data: {
    bookingId: string;
    testType: string;
    notes?: string;
  }) => {
    const r = await api.post('/diagnostics', data);
    return r.data;
  },
};
