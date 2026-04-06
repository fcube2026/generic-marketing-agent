export type Role = 'PATIENT' | 'PROVIDER' | 'ADMIN';
export type BookingMode = 'HOME_VISIT' | 'DOCTOR_PLACE';
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
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

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
  consultationFeeHomeVisit: number;
  consultationFeeDoctorPlace: number;
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
}

export interface ProviderService {
  id: string;
  serviceCategory: ServiceCategory;
}

export interface ProviderWithDistance extends ProviderProfile {
  distance: number;
  providerServices?: ProviderService[];
}

export interface ConsultationSummary {
  id: string;
  bookingId: string;
  symptoms?: string;
  observations?: string;
  diagnosis?: string;
  medicinesAdvised?: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];
  nextSteps?: string;
  followUpRecommendation?: string;
  createdAt: string;
  updatedAt: string;
  prescriptions?: { id: string; details?: string; fileUrl?: string }[];
  booking?: Booking & {
    provider?: ProviderProfile;
    serviceCategory?: ServiceCategory;
  };
}

export interface ConsultationSummariesResponse {
  data: ConsultationSummary[];
  total: number;
  page: number;
  limit: number;
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
  recommended: BookingMode;
  reason: string;
}

export type ReferralStatus = 'RECOMMENDED' | 'BOOKED' | 'COMPLETED';

export interface Referral {
  id: string;
  bookingId: string;
  specialistType: string;
  notes?: string;
  status: ReferralStatus;
  createdAt: string;
  updatedAt: string;
  booking?: Booking & {
    provider?: ProviderProfile;
    serviceCategory?: ServiceCategory;
  };
}

export interface ReferralsResponse {
  data: Referral[];
  total: number;
  page: number;
  limit: number;
}
