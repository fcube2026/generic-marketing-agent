// ============ ENUMS ============

export enum Role {
  PATIENT = 'PATIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum BookingMode {
  HOME_VISIT = 'HOME_VISIT',
  DOCTOR_PLACE = 'DOCTOR_PLACE',
}

export enum BookingStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  ON_THE_WAY = 'ON_THE_WAY',
  ARRIVED = 'ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SUMMARY_SUBMITTED = 'SUMMARY_SUBMITTED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum DiagnosticStatus {
  REQUESTED = 'REQUESTED',
  SCHEDULED = 'SCHEDULED',
  COLLECTED = 'COLLECTED',
  RESULTED = 'RESULTED',
}

export enum ReferralStatus {
  RECOMMENDED = 'RECOMMENDED',
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
}

// ============ AUTH TYPES ============

export interface AuthUser {
  id: string;
  phone: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthTokenResponse {
  token: string;
  user: AuthUser;
}

export interface SendOtpRequest {
  phone: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  otp?: string; // Only in development mode
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

// ============ USER TYPES ============

export interface User {
  id: string;
  phone: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

// ============ PATIENT TYPES ============

export interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  addresses?: Address[];
}

export interface CreatePatientProfileDto {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  emergencyContact?: string;
}

export interface UpdatePatientProfileDto extends Partial<CreatePatientProfileDto> {}

// ============ PROVIDER TYPES ============

export interface ProviderProfile {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  specialization: string;
  contactInfo?: string;
  clinicAddress?: string;
  licenseNumber?: string;
  isVerified: boolean;
  isActive: boolean;
  homeVisitEnabled: boolean;
  doctorPlaceVisitEnabled: boolean;
  serviceRadius: number;
  consultationFeeHomeVisit: number;
  consultationFeeDoctorPlace: number;
  currentLat?: number;
  currentLng?: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  providerServices?: ProviderService[];
  availabilitySlots?: AvailabilitySlot[];
}

export interface ProviderService {
  id: string;
  providerId: string;
  serviceCategoryId: string;
  serviceCategory?: ServiceCategory;
}

export interface AvailabilitySlot {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface CreateProviderProfileDto {
  name: string;
  bio?: string;
  specialization: string;
  licenseNumber?: string;
  homeVisitEnabled?: boolean;
  doctorPlaceVisitEnabled?: boolean;
  serviceRadius?: number;
  consultationFeeHomeVisit?: number;
  consultationFeeDoctorPlace?: number;
  clinicAddress?: string;
  serviceCategoryIds?: string[];
}

export interface UpdateProviderProfileDto extends Partial<CreateProviderProfileDto> {
  isAvailable?: boolean;
  currentLat?: number;
  currentLng?: number;
}

// ============ SERVICE TYPES ============

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
}

// ============ ADDRESS TYPES ============

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

export interface CreateAddressDto {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

// ============ BOOKING TYPES ============

export interface Booking {
  id: string;
  patientId: string;
  providerId: string;
  serviceCategoryId: string;
  addressId?: string;
  mode: BookingMode;
  status: BookingStatus;
  scheduledAt: string;
  symptoms?: string;
  totalFee: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  patient?: PatientProfile;
  provider?: ProviderProfile;
  serviceCategory?: ServiceCategory;
  address?: Address;
  statusHistory?: BookingStatusHistory[];
  consultationSummary?: ConsultationSummary;
  payment?: Payment;
}

export interface BookingStatusHistory {
  id: string;
  bookingId: string;
  status: BookingStatus;
  changedAt: string;
  changedBy: string;
}

export interface CreateBookingDto {
  providerId: string;
  serviceCategoryId: string;
  addressId?: string;
  mode: BookingMode;
  scheduledAt: string;
  symptoms?: string;
}

export interface UpdateBookingStatusDto {
  status: BookingStatus;
}

// ============ CONSULTATION TYPES ============

export interface ConsultationSummary {
  id: string;
  bookingId: string;
  symptoms?: string;
  observations?: string;
  diagnosis?: string;
  medicinesAdvised?: Medicine[];
  nextSteps?: string;
  followUpRecommendation?: string;
  createdAt: string;
  updatedAt: string;
  prescriptions?: Prescription[];
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface CreateConsultationSummaryDto {
  symptoms?: string;
  observations?: string;
  diagnosis?: string;
  medicinesAdvised?: Medicine[];
  nextSteps?: string;
  followUpRecommendation?: string;
}

export interface Prescription {
  id: string;
  consultationSummaryId: string;
  details?: string;
  fileUrl?: string;
  createdAt: string;
}

// ============ DIAGNOSTICS TYPES ============

export interface DiagnosticRequest {
  id: string;
  bookingId: string;
  testType: string;
  notes?: string;
  status: DiagnosticStatus;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  labResults?: LabResult[];
}

export interface LabResult {
  id: string;
  diagnosticRequestId: string;
  resultFileUrl?: string;
  notes?: string;
  uploadedAt: string;
}

export interface CreateDiagnosticRequestDto {
  bookingId: string;
  testType: string;
  notes?: string;
  scheduledAt?: string;
}

// ============ REFERRAL TYPES ============

export interface Referral {
  id: string;
  bookingId: string;
  specialistType: string;
  notes?: string;
  status: ReferralStatus;
  createdAt: string;
  updatedAt: string;
}

// ============ PAYMENT TYPES ============

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  bookingId: string;
  amount: number;
}

// ============ RECOMMENDATION TYPES ============

export interface GetRecommendationDto {
  lat: number;
  lng: number;
  serviceCategory: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProviderRecommendation {
  provider: ProviderProfile;
  distance: number;
  eta: number;
  fee: number;
  score: number;
}

export interface RecommendationResponse {
  homeVisit?: ProviderRecommendation;
  doctorPlace?: ProviderRecommendation;
  recommended: BookingMode;
  reason: string;
}

// ============ ADMIN TYPES ============

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetType: string;
  notes?: string;
  createdAt: string;
}

// ============ NOTIFICATION TYPES ============

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============ PAGINATION TYPES ============

export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
