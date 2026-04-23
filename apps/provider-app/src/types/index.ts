export type Role = 'PATIENT' | 'PROVIDER' | 'ADMIN';
export type BookingMode = 'HOME_VISIT' | 'DOCTOR_PLACE' | 'VIDEO_CONSULTATION';
export type BookingStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUMMARY_SUBMITTED' | 'CLOSED' | 'CANCELLED';

export interface User { id: string; phone: string; role: Role; }
export interface ProviderProfile {
  id: string; userId: string; name: string; bio?: string; specialization: string;
  contactInfo: string;
  isVerified: boolean; isActive: boolean; isAvailable: boolean;
  homeVisitEnabled: boolean; doctorPlaceVisitEnabled: boolean;
  consultationFeeHomeVisit: number; consultationFeeDoctorPlace: number;
  currentLat?: number; currentLng?: number; serviceRadius: number;
}
export interface PatientProfile { id: string; name: string; emergencyContact?: string; }
export interface ServiceCategory { id: string; name: string; slug: string; description?: string; iconUrl?: string; }
export interface Booking {
  id: string; patientId: string; providerId: string; serviceCategoryId: string;
  mode: BookingMode; status: BookingStatus; scheduledAt: string;
  symptoms?: string; totalFee: number; createdAt: string;
  patient?: PatientProfile; serviceCategory?: ServiceCategory;
}
export interface Medicine { name: string; dosage: string; frequency: string; duration: string; notes?: string; }
