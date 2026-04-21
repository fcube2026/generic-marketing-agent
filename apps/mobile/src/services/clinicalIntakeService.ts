import api from './api';

export interface ClinicalIntakePayload {
  consultationReason: string;
  symptoms: string;
  allergies?: string;
  currentMedications?: string;
  medicalHistory?: string;
  hasPets?: boolean;
  petType?: string;
  gateCode?: string;
  floorNumber?: number;
  patientAlone?: boolean;
  mobilityConstraint?: boolean;
  infectionRiskFlag?: boolean;
  specialInstructions?: string;
}

export const clinicalIntakeService = {
  submitIntake: async (bookingId: string, data: ClinicalIntakePayload) => {
    const r = await api.post(`/clinical-intake/${bookingId}`, data);
    return r.data;
  },

  getIntake: async (bookingId: string) => {
    const r = await api.get(`/clinical-intake/${bookingId}`);
    return r.data;
  },
};
