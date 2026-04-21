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
  /** URL of the prescription issued during this consultation (mock field) */
  prescriptionUrl?: string;
  /** Whether a pharmacy order has already been placed for this booking (mock field) */
  hasOrder?: boolean;
}

export interface VideoSession {
  id: string;
  bookingId?: string;
  roomId: string;
  sessionToken?: string;
  status: VideoSessionStatus;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  creatorUserId?: string;
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

export type PharmacyOrderStatus =
  | 'PENDING'
  | 'PRESCRIPTION_REVIEW'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

export interface AvailabilityResult {
  medicineCode: string;
  pincode: string;
  available: boolean;
  reason?: string;
}

export interface MedicineResult {
  id: string;
  name: string;
  manufacturer?: string;
  price: number;
  unit?: string;
  requiresPrescription?: boolean;
  availability?: AvailabilityResult;
}

export interface PharmacyPartner {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  priority: number;
  providerKey: string;
  registered: boolean;
}

export interface PharmacyOrderItem {
  id: string;
  medicineName: string;
  medicineCode?: string | null;
  dosage?: string | null;
  instructions?: string | null;
  isSubstitute: boolean;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PharmacyOrder {
  id: string;
  orderNumber: string;
  patientProfileId: string;
  bookingId?: string | null;
  prescriptionId?: string | null;
  pharmacyPartnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerOrderId?: string | null;
  status: string;
  deliveryAddressId: string;
  deliveryAddress: string;
  prescriptionImageUrl?: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PharmacyOrderItem[];
}

export interface CreatePharmacyOrderPayload {
  bookingId?: string;
  prescriptionId?: string;
  partnerId: string;
  deliveryAddressId?: string;
  deliveryAddress?: {
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  };
  notes?: string;
  items: {
    medicineCode: string;
    medicineName: string;
    quantity: number;
    unitPrice: number;
  }[];
}
