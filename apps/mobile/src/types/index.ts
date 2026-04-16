export type Role = 'PATIENT' | 'PROVIDER' | 'ADMIN';
export type BookingMode = 'HOME_VISIT' | 'DOCTOR_PLACE' | 'VIDEO_CONSULTATION';
export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SUMMARY_SUBMITTED'
  | 'CLOSED'
  | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
export type VideoSessionStatus = 'CREATED' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface User {
  id: string;
  phone: string;
  role: Role;
}

export interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  specialization: string;
  isVerified: boolean;
  isAvailable: boolean;
  homeVisitEnabled: boolean;
  doctorPlaceVisitEnabled: boolean;
  videoConsultationEnabled: boolean;
  consultationFeeHomeVisit: number;
  consultationFeeDoctorPlace: number;
  consultationFeeVideoConsultation: number;
  currentLat?: number;
  currentLng?: number;
  serviceRadius: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface Booking {
  id: string;
  patientId: string;
  providerId: string;
  serviceCategoryId: string;
  mode: BookingMode;
  status: BookingStatus;
  scheduledAt: string;
  symptoms?: string;
  totalFee: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  provider?: ProviderProfile;
  serviceCategory?: ServiceCategory;
  address?: Address;
  videoSession?: VideoSession;
}

export interface VideoSession {
  id: string;
  bookingId: string;
  roomId: string;
  sessionToken?: string;
  status: VideoSessionStatus;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderWithDistance extends ProviderProfile {
  distance: number;
}

export interface RecommendationOption {
  provider: ProviderProfile;
  distance: number;
  eta: number;
  fee: number;
  score: number;
}

export interface RecommendationResponse {
  homeVisit?: RecommendationOption;
  doctorPlace?: RecommendationOption;
  videoConsultation?: RecommendationOption;
  recommended: BookingMode;
  reason: string;
}
