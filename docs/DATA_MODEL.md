# Curex24 — Data Model

## Entity Relationship Overview

```
User ─────────── PatientProfile ──────── Booking ──── Payment
  │                                       │    │         │
  │                                       │    │       Payout
  ├── Address                             │    │
  │                                       │    ├── BookingStatusHistory
  ├── ProviderProfile ────────────────────┘    │
  │     │                                      ├── ConsultationSummary ── Prescription
  │     ├── ProviderLicense                    │
  │     ├── ProviderService ── ServiceCategory ├── DiagnosticRequest ── LabResult
  │     ├── AvailabilitySlot                   │
  │     ├── DoctorKit ── DoctorKitItem         └── Referral
  │     └── Payout
  │
  ├── AuditLog
  └── AdminAction
       OtpVerification
```

---

## Enums

| Enum | Values |
|------|--------|
| **Role** | `PATIENT`, `PROVIDER`, `ADMIN` |
| **BookingMode** | `HOME_VISIT`, `DOCTOR_PLACE` |
| **BookingStatus** | `REQUESTED`, `ACCEPTED`, `ON_THE_WAY`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `SUMMARY_SUBMITTED`, `CLOSED`, `CANCELLED` |
| **PaymentStatus** | `PENDING`, `PAID`, `REFUNDED` |
| **DiagnosticStatus** | `REQUESTED`, `SCHEDULED`, `COLLECTED`, `RESULTED` |
| **ReferralStatus** | `RECOMMENDED`, `BOOKED`, `COMPLETED` |
| **PayoutStatus** | `PENDING`, `PROCESSED` |

---

## Models

### User
Central authentication entity. Every person on the platform has exactly one User record.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| phone | String | Unique phone number |
| role | Role | PATIENT, PROVIDER, or ADMIN |
| createdAt | DateTime | Account creation time |
| updatedAt | DateTime | Last update time |

**Relations:** PatientProfile (1:1), ProviderProfile (1:1), Addresses (1:many), AuditLogs (1:many), AdminActions (1:many), OtpVerifications (1:many)

---

### PatientProfile
Extended patient information, created during onboarding.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| userId | String | FK → User (unique) |
| name | String | Full name |
| dateOfBirth | DateTime? | Optional DOB |
| gender | String? | Optional gender |
| emergencyContact | String? | Emergency phone number |

**Relations:** User (1:1), Bookings (1:many)

---

### ProviderProfile
Extended provider information with service configuration.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| userId | String | FK → User (unique) |
| name | String | Full name |
| bio | String? | Provider bio |
| specialization | String | Primary specialization |
| licenseNumber | String? | License/registration number |
| isVerified | Boolean | Admin-verified (default: false) |
| isActive | Boolean | Active on platform (default: true) |
| homeVisitEnabled | Boolean | Can do home visits |
| doctorPlaceVisitEnabled | Boolean | Has a clinic location |
| serviceRadius | Float | Max service radius in km (default: 10) |
| consultationFeeHomeVisit | Float | Fee for home visit |
| consultationFeeDoctorPlace | Float | Fee for clinic visit |
| currentLat | Float? | Current GPS latitude |
| currentLng | Float? | Current GPS longitude |
| isAvailable | Boolean | Currently accepting bookings |

**Relations:** User (1:1), Licenses (1:many), ProviderServices (1:many), AvailabilitySlots (1:many), Bookings (1:many), DoctorKits (1:many), Payouts (1:many)

---

### ProviderLicense
KYC documents uploaded by providers.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| providerId | String | FK → ProviderProfile |
| type | String | Document type (e.g., "Medical License", "Government ID") |
| documentUrl | String | URL to uploaded document |
| expiresAt | DateTime? | Expiration date |
| verifiedAt | DateTime? | When admin verified this document |

---

### ServiceCategory
Predefined healthcare service types.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Display name |
| slug | String | URL-safe identifier (unique) |
| description | String? | Category description |
| iconUrl | String? | Icon image URL |

**Seed data:** Doctor Consultation, Physiotherapy, Nursing, Speech Therapy, Elderly Care, Occupational Therapy

---

### ProviderService
Many-to-many join: which providers offer which services.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| providerId | String | FK → ProviderProfile |
| serviceCategoryId | String | FK → ServiceCategory |

**Unique constraint:** (providerId, serviceCategoryId)

---

### AvailabilitySlot
Recurring weekly working hours.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| providerId | String | FK → ProviderProfile |
| dayOfWeek | Int | 0 (Sunday) to 6 (Saturday) |
| startTime | String | HH:mm format |
| endTime | String | HH:mm format |
| isActive | Boolean | Slot is active |

---

### Address
User addresses with geolocation.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| userId | String | FK → User |
| label | String | "Home", "Office", etc. |
| addressLine | String | Full address text |
| city | String | City |
| state | String | State |
| pincode | String | PIN code |
| lat | Float? | Latitude |
| lng | Float? | Longitude |
| isDefault | Boolean | Default address flag |

---

### Booking
Core booking entity linking patient, provider, and service.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| patientId | String | FK → PatientProfile |
| providerId | String | FK → ProviderProfile |
| serviceCategoryId | String | FK → ServiceCategory |
| addressId | String? | FK → Address (for home visits) |
| mode | BookingMode | HOME_VISIT or DOCTOR_PLACE |
| status | BookingStatus | Current status |
| scheduledAt | DateTime | Scheduled consultation time |
| symptoms | String? | Patient-reported symptoms |
| totalFee | Float | Total consultation fee |
| paymentStatus | PaymentStatus | Payment state |

**Relations:** Patient, Provider, ServiceCategory, Address, StatusHistory, ConsultationSummary (1:1), DiagnosticRequests (1:many), Referrals (1:many), Payment (1:1), Payout (1:1)

---

### BookingStatusHistory
Audit trail of booking status changes.

| Field | Type | Description |
|-------|------|-------------|
| bookingId | String | FK → Booking |
| status | BookingStatus | Status at this point |
| changedAt | DateTime | When the change occurred |
| changedBy | String | User ID who made the change |

---

### ConsultationSummary
Structured post-visit summary (mandatory before booking closure).

| Field | Type | Description |
|-------|------|-------------|
| bookingId | String | FK → Booking (unique 1:1) |
| symptoms | String? | Documented symptoms |
| observations | String? | Clinical observations |
| diagnosis | String? | Diagnosis/assessment |
| medicinesAdvised | JSON? | Array of medicine objects |
| nextSteps | String? | Follow-up instructions |
| followUpRecommendation | String? | Follow-up notes |

---

### DiagnosticRequest
Lab test requests from consultations.

| Field | Type | Description |
|-------|------|-------------|
| bookingId | String | FK → Booking |
| testType | String | Type of test (e.g., "CBC", "Blood Sugar") |
| notes | String? | Additional notes |
| status | DiagnosticStatus | REQUESTED → SCHEDULED → COLLECTED → RESULTED |
| scheduledAt | DateTime? | Scheduled collection time |

**Relations:** LabResults (1:many)

---

### LabResult
Lab test results uploaded by admin/lab partner.

| Field | Type | Description |
|-------|------|-------------|
| diagnosticRequestId | String | FK → DiagnosticRequest |
| resultFileUrl | String? | URL to result document |
| notes | String? | Result summary notes |
| uploadedAt | DateTime | When result was uploaded |

---

### Referral
Specialist referrals from consultations.

| Field | Type | Description |
|-------|------|-------------|
| bookingId | String | FK → Booking |
| specialistType | String | Type of specialist |
| notes | String? | Referral notes |
| status | ReferralStatus | RECOMMENDED → BOOKED → COMPLETED |

---

### Payment
Payment tracking per booking.

| Field | Type | Description |
|-------|------|-------------|
| bookingId | String | FK → Booking (unique 1:1) |
| amount | Float | Payment amount |
| status | PaymentStatus | PENDING → PAID → REFUNDED |
| transactionId | String? | External payment reference |
| paidAt | DateTime? | When payment completed |

---

### Payout
Provider payout tracking.

| Field | Type | Description |
|-------|------|-------------|
| providerId | String | FK → ProviderProfile |
| bookingId | String | FK → Booking (unique 1:1) |
| amount | Float | Payout amount (80% of fee) |
| status | PayoutStatus | PENDING → PROCESSED |
| processedAt | DateTime? | When payout was processed |

---

### DoctorKit / DoctorKitItem
Extensible model for provider medical supplies.

| Field (DoctorKit) | Type | Description |
|-------------------|------|-------------|
| providerId | String | FK → ProviderProfile |
| name | String | Kit name |
| description | String? | Kit description |

| Field (DoctorKitItem) | Type | Description |
|-----------------------|------|-------------|
| doctorKitId | String | FK → DoctorKit |
| itemName | String | Medicine/supply name |
| quantity | Int | Current quantity |
| unit | String | Unit (tablets, ml, pieces) |

---

### AuditLog
System-wide audit trail.

| Field | Type | Description |
|-------|------|-------------|
| userId | String | FK → User |
| action | String | Action performed |
| entity | String | Entity type affected |
| entityId | String | Entity ID affected |
| meta | JSON? | Additional context |

---

### AdminAction
Admin-specific action log.

| Field | Type | Description |
|-------|------|-------------|
| adminId | String | FK → User (admin) |
| action | String | Action type (VERIFY_PROVIDER, DEACTIVATE_PROVIDER, etc.) |
| targetId | String | Target entity ID |
| targetType | String | Target entity type |
| notes | String? | Action notes |

---

### OtpVerification
OTP codes for phone authentication.

| Field | Type | Description |
|-------|------|-------------|
| phone | String | Phone number |
| otp | String | 6-digit OTP code |
| expiresAt | DateTime | Expiration time (10 min) |
| verified | Boolean | Whether OTP was verified |
| userId | String? | FK → User (optional) |

---

## Design Decisions

1. **CUID primary keys** — URL-safe, sortable, collision-resistant
2. **Soft references via IDs** — No cascading deletes on critical business data
3. **JSON for medicines** — Flexible schema for structured but variable data
4. **Separate Payment/Payout** — Clean separation of patient payment and provider payout
5. **Status history table** — Full audit trail of every booking transition
6. **Optional fields** — Many fields nullable to support progressive profile completion
7. **Unique constraints** — Prevent duplicate provider-service mappings and one-to-one booking relations

---

*Document Version: 1.0 (MVP)*
*Last Updated: April 2026*
