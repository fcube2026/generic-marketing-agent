# Curex24 — Patient Verification: Approach & Architecture

> **Document Type:** Engineering Design & Implementation Guide  
> **Applies To:** `apps/api` (NestJS), `apps/mobile` (Expo/RN), `apps/admin` (Next.js), `packages/database` (Prisma/PostgreSQL)  
> **Last Updated:** April 2026  
> **Status:** Implementation-Ready

---

## Table of Contents

1. [Product Architecture Overview](#1-product-architecture-overview)
2. [End-to-End Patient Verification Workflow](#2-end-to-end-patient-verification-workflow)
3. [Risk-Based Verification Rules Engine](#3-risk-based-verification-rules-engine)
4. [Clinical Triage and Escalation Logic](#4-clinical-triage-and-escalation-logic)
5. [Provider Safety Workflow](#5-provider-safety-workflow)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [Admin / Ops Dashboard Workflow](#8-admin--ops-dashboard-workflow)
9. [Provider App — Visit-Start OTP & Checks](#9-provider-app--visit-start-otp--checks)
10. [Security and Compliance Controls](#10-security-and-compliance-controls)
11. [Recommended Third-Party Providers (India)](#11-recommended-third-party-providers-india)
12. [Phased Implementation Plan](#12-phased-implementation-plan)
13. [Edge Cases and Failure Handling](#13-edge-cases-and-failure-handling)
14. [Trust / Risk Scoring Model](#14-trust--risk-scoring-model)
15. [Engineering Task Breakdown](#15-engineering-task-breakdown)
16. [Best Starting Architecture for Fast Launch](#16-best-starting-architecture-for-fast-launch)

---

## 1. Product Architecture Overview

Curex24 uses a **modular NestJS monorepo** backend. Patient verification is introduced as a dedicated `PatientVerificationModule` that integrates with the existing `Auth`, `Patients`, `Bookings`, and `Notifications` modules without breaking existing contracts.

### 1.1 High-Level Module Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                     │
│                                                                       │
│  ┌─────────────────────────────┐   ┌──────────────────────────────┐  │
│  │  Mobile App (Expo/RN)       │   │  Admin Panel (Next.js 14)    │  │
│  │  PatientNavigator           │   │  ManualReview / Ops Queue    │  │
│  │  BookingFlow + OTPScreen    │   │  AuditLog viewer             │  │
│  └─────────────┬───────────────┘   └──────────────┬───────────────┘  │
│                │                                   │                  │
│                └───────────── REST (HTTPS/JWT) ────┘                  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     NestJS API (apps/api)                             │
│                                                                       │
│  ┌───────┐  ┌───────────────────────┐  ┌────────────────────────┐   │
│  │ Auth  │  │  PatientVerification  │  │  ClinicalIntake/Triage │   │
│  │Module │  │  Module (NEW)         │  │  Module (NEW)          │   │
│  └───────┘  └───────────────────────┘  └────────────────────────┘   │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Patients │  │ Bookings │  │ Consent  │  │  Audit / Notifications│  │
│  │ Module   │  │ Module   │  │ Module   │  │  (existing)         │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘  │
│                                                                       │
│                        Prisma ORM                                     │
└────────────────────────────────┬─────────────────────────────────────┘
                                 ▼
                   ┌─────────────────────────┐
                   │  PostgreSQL (primary DB) │
                   └─────────────────────────┘
                   ┌─────────────────────────┐
                   │  Supabase Storage        │
                   │  (ID images, selfies,    │
                   │   consent artifacts)     │
                   └─────────────────────────┘
```

### 1.2 New Modules to Build

| Module | Path | Responsibility |
|--------|------|----------------|
| `PatientVerificationModule` | `apps/api/src/modules/patient-verification/` | OTP booking verification, ID upload, OCR, face match, risk scoring |
| `ClinicalIntakeModule` | `apps/api/src/modules/clinical-intake/` | Medical history, allergies, medications, triage rules |
| `ConsentModule` | `apps/api/src/modules/consent/` | Consent record, digital signature capture, versioning |
| `VisitOtpModule` | `apps/api/src/modules/visit-otp/` | Provider-side visit-start OTP, GPS capture, status marking |

### 1.3 Technology Alignment

| Concern | Technology Already in Use |
|---------|--------------------------|
| Backend framework | NestJS (TypeScript) |
| ORM | Prisma (`packages/database`) |
| Database | PostgreSQL |
| Mobile app | Expo SDK 51 + React Native |
| Admin panel | Next.js 14 (App Router) |
| Storage | Supabase (`StorageModule` — `apps/api/src/common/storage/`) |
| Auth | OTP + JWT via `AuthModule` |
| Push/SMS notifications | FCM, MSG91/Twilio via `NotificationsModule` |
| State (mobile) | Zustand + React Query |
| HTTP client | Axios |

---

## 2. End-to-End Patient Verification Workflow

### 2.1 Sequence Diagram — New Patient First Booking

```
Patient (Mobile App)               API                        External Services
        │                           │                               │
        │  (1) Enter phone number   │                               │
        │──POST /auth/send-otp─────>│                               │
        │                           │──MSG91/Twilio SMS ───────────>│
        │  (2) OTP code received    │                               │
        │──POST /auth/verify-otp───>│                               │
        │  ← JWT token              │                               │
        │                           │                               │
        │  (3) Complete profile     │                               │
        │──POST /patients/profile──>│ Save name/DOB/gender          │
        │                           │                               │
        │  (4) Create booking       │                               │
        │──POST /bookings──────────>│ Compute riskScore             │
        │                           │                               │
        │  [If riskScore < LOW]     │                               │
        │  ← bookingId, status=     │                               │
        │    VERIFICATION_PENDING   │                               │
        │                           │                               │
        │  (5) Clinical intake form │                               │
        │──POST /clinical-intake────>│ Save symptoms/history        │
        │                           │                               │
        │  (6) Address + map pin    │                               │
        │──POST /bookings/:id/address>│                             │
        │                           │                               │
        │  (7) Consent acceptance   │                               │
        │──POST /consent/accept─────>│ Record consent + timestamp   │
        │                           │                               │
        │  (8) Emergency contact    │                               │
        │──PATCH /patients/profile──>│                              │
        │                           │                               │
        │  [If risk triggers ID]    │                               │
        │  (9) ID upload (optional) │                               │
        │──POST /storage/upload-url─>│                              │
        │  upload to Supabase       │                               │
        │──POST /verification/id────>│──Surepass OCR ─────────────>│
        │                           │←── extracted fields           │
        │                           │                               │
        │  (10) Selfie (optional)   │                               │
        │──POST /verification/selfie>│──Surepass/AWS Rekognition──>│
        │                           │←── face match score           │
        │                           │                               │
        │  ← bookingId, status=     │                               │
        │    CONFIRMED              │                               │
```

### 2.2 Sequence Diagram — Visit-Start OTP

```
Provider (Mobile App)            API                       Patient (Mobile App)
        │                         │                               │
        │  Arrives at address     │                               │
        │──POST /visit-otp/send──>│──Send OTP via SMS ───────────>│
        │                         │                               │
        │                         │     Patient receives OTP      │
        │                         │     (6-digit, 10 min TTL)     │
        │                         │                               │
        │  Provider asks patient  │                               │
        │  for OTP verbally       │                               │
        │                         │                               │
        │──POST /visit-otp/verify>│ Verify OTP                    │
        │  { otp, bookingId,      │ Record provider GPS           │
        │    providerLat/Lng }    │ Transition booking →          │
        │                         │ IN_PROGRESS                   │
        │  ← { verified: true }   │                               │
```

### 2.3 Booking Verification Status Enum

```typescript
enum PatientVerificationStatus {
  PENDING_OTP          = 'PENDING_OTP',           // Phone not yet OTP-verified
  OTP_VERIFIED         = 'OTP_VERIFIED',           // Phone OTP done; profile incomplete
  PROFILE_COMPLETE     = 'PROFILE_COMPLETE',       // Name/DOB/gender saved
  INTAKE_COMPLETE      = 'INTAKE_COMPLETE',        // Clinical intake submitted
  CONSENT_GIVEN        = 'CONSENT_GIVEN',          // Consent accepted
  ID_UPLOAD_PENDING    = 'ID_UPLOAD_PENDING',      // Stronger ID required
  ID_UNDER_REVIEW      = 'ID_UNDER_REVIEW',        // Manual review queue
  ID_VERIFIED          = 'ID_VERIFIED',            // ID check passed
  CONFIRMED            = 'CONFIRMED',              // Booking fully verified, provider dispatched
  FLAGGED              = 'FLAGGED',                // Needs ops intervention
  EMERGENCY_OVERRIDE   = 'EMERGENCY_OVERRIDE',     // Care dispatched despite failed checks
}
```

---

## 3. Risk-Based Verification Rules Engine

### 3.1 Philosophy

> **Do not KYC every patient.** Most patients are genuine. Heavy verification causes booking drop-off. Apply strong verification only when the risk score crosses defined thresholds.

### 3.2 Risk Factor Scoring Table

| Risk Factor | Condition | Score Added |
|-------------|-----------|-------------|
| New patient | First booking on account | +20 |
| No profile photo | Profile photo absent | +5 |
| Minor patient | DOB indicates age < 18 | +25 |
| High-value service | totalFee > ₹2,000 | +15 |
| Suspicious activity | ≥3 bookings in 24 h | +30 |
| Late-night visit | scheduledAt between 22:00–06:00 | +20 |
| Address unserviceable | Geocode fails or outside provider radius | +25 |
| Provider request | Provider explicitly flags patient | +40 |
| Infection risk flag | Patient self-reports active COVID/TB/hepatitis | +20 |
| Emergency symptoms | Triage detects critical keywords | +40 |
| Repeat patient (good) | ≥2 completed bookings, no flags | -20 |
| Verified ID on file | Previous ID verified (stored token) | -15 |
| Returning within 30 days | Recent booking with same provider | -10 |

### 3.3 Risk Tiers and Actions

| Tier | Score Range | Action |
|------|-------------|--------|
| **LOW** | 0–29 | Phone OTP + profile + consent. Book immediately. |
| **MEDIUM** | 30–54 | Above + government ID optional (soft prompt). |
| **HIGH** | 55–79 | Above + government ID **required** + OCR extraction. Booking held for 15 min pending check. |
| **CRITICAL** | 80+ | Above + selfie/face-match **required** + manual ops review. Auto-notify admin. |

### 3.4 Rules Engine Implementation (NestJS Service Sketch)

```typescript
// apps/api/src/modules/patient-verification/risk-engine.service.ts

@Injectable()
export class RiskEngineService {
  async computeRiskScore(
    patientId: string,
    bookingInput: CreateBookingDto,
  ): Promise<{ score: number; tier: RiskTier; triggers: string[] }> {
    const triggers: string[] = [];
    let score = 0;

    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      include: { bookings: { where: { status: 'COMPLETED' } } },
    });

    // First booking
    if (profile.bookings.length === 0) { score += 20; triggers.push('FIRST_BOOKING'); }

    // Minor patient
    const age = differenceInYears(new Date(), profile.dateOfBirth);
    if (age < 18) { score += 25; triggers.push('MINOR_PATIENT'); }

    // High-value service
    if (bookingInput.totalFee > 2000) { score += 15; triggers.push('HIGH_VALUE'); }

    // Late-night
    const hour = getHours(bookingInput.scheduledAt);
    if (hour >= 22 || hour < 6) { score += 20; triggers.push('LATE_NIGHT'); }

    // Repeat good patient
    if (profile.bookings.length >= 2) { score -= 20; triggers.push('REPEAT_PATIENT'); }

    const tier = score >= 80 ? 'CRITICAL'
               : score >= 55 ? 'HIGH'
               : score >= 30 ? 'MEDIUM'
               : 'LOW';

    return { score, tier, triggers };
  }
}
```

---

## 4. Clinical Triage and Escalation Logic

### 4.1 Symptom Keyword Triage Rules

When a patient submits symptoms during booking (`POST /clinical-intake`), the backend applies a triage scan:

```typescript
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'unconscious', 'not breathing',
  'stroke', 'paralysis', 'severe bleeding', 'overdose',
  'seizure', 'fits', 'coughing blood', 'anaphylaxis',
  'severe allergic reaction', 'suicidal', 'self harm',
];

const URGENT_KEYWORDS = [
  'high fever', 'difficulty breathing', 'shortness of breath',
  'severe headache', 'sudden confusion', 'diabetic emergency',
  'blood sugar very low', 'can\'t walk',
];
```

### 4.2 Triage Escalation Flow

```
Patient submits symptoms
         │
         ▼
  containsEmergencyKeyword?
    Yes ──────────────────────────────────────────────────────────>
         │                                     Show RED banner:
         │                                     "⚠️ Your symptoms may
         │                                      require immediate care.
         │                                      Please call 108 or go to
         │                                      nearest emergency room."
         │                                     Allow patient to:
         │                                     (a) Call 108 directly
         │                                     (b) Continue booking (override)
         │                                     (c) Cancel
         │
    No   ▼
  containsUrgentKeyword?
    Yes ──────────────────────────────────────────────────────────>
         │                                     Show AMBER banner:
         │                                     "Your symptoms suggest you
         │                                      may need urgent attention.
         │                                      A doctor will be dispatched
         │                                      as soon as possible."
         │                                     Risk score += 20
         │
    No   ▼
  Standard booking flow continues
```

### 4.3 Guardian Verification for Minors

```
Patient DOB indicates age < 18
         │
         ▼
  Require guardian fields:
  - Guardian name
  - Guardian relationship
  - Guardian phone (separate from patient phone)
  - Guardian government ID (if riskScore ≥ HIGH)
         │
         ▼
  OTP sent to GUARDIAN phone (not patient)
         │
         ▼
  Consent acceptance recorded under guardian's name
```

### 4.4 Operational Safety Intake Questions

Displayed as a structured form during address confirmation:

| Field | Type | Purpose |
|-------|------|---------|
| `hasPets` | boolean | Alert provider |
| `petType` | string | "Dog", "Cat", etc. |
| `gateCode` | string | Apartment entry code |
| `floorNumber` | number | Flat access instructions |
| `patientAlone` | boolean | Safety flag — provider check-in protocol if alone |
| `mobilityConstraint` | boolean | Provider brings mobility equipment |
| `infectionRiskFlag` | boolean | COVID / active TB / hepatitis — PPE alert |
| `specialInstructions` | string | Free text |

---

## 5. Provider Safety Workflow

### 5.1 Provider Alert Banners (Mobile App)

Alert banners are shown to the provider on the booking detail screen before dispatch:

| Condition | Banner Type | Text |
|-----------|-------------|------|
| `patientAlone = true` | AMBER | "⚠️ Patient will be alone during visit. Check in via app on arrival." |
| `infectionRiskFlag = true` | RED | "🦠 Patient has reported an active infection risk. Use full PPE." |
| `hasPets = true` | INFO | "🐾 Patient has a pet ({petType}). Confirm it will be secured." |
| `mobilityConstraint = true` | INFO | "♿ Patient has mobility constraints. Bring assistance equipment." |
| `lateNightVisit = true` | AMBER | "🌙 This is a late-night visit. Share your live location with dispatch." |
| `patientFlagged = true` | RED | "🚨 This patient has been flagged by operations. Proceed with caution." |
| `verificationStatus = FLAGGED` | RED | "🔒 Patient verification is incomplete. Do not begin the visit until ops confirms." |

### 5.2 Visit-Start Safety Checklist (Provider App)

Before the provider can begin the visit (`IN_PROGRESS`), the app shows a pre-visit checklist:

```
[ ] I have confirmed the patient's identity visually
[ ] I have verified the address matches
[ ] I have checked the safety alerts above
[ ] I have entered the patient-provided OTP
```

All four must be checked. The OTP entry is the final gate that triggers the `IN_PROGRESS` transition.

### 5.3 Provider GPS Tracking During Visit

- On `ARRIVED` transition: capture `providerLat`, `providerLng`, `arrivedAt` timestamp
- Every 5 minutes during `IN_PROGRESS`: log to `ProviderLocation` table (already exists)
- On `COMPLETED`: capture final `completedLat`, `completedLng`, `completedAt`
- Dispatch can monitor live via Admin Panel

---

## 6. Database Schema

The following tables extend the existing Prisma schema in `packages/database/prisma/schema.prisma`.

### 6.1 Extended / New Tables

```prisma
// ─────────────────────────────────────────
// PATIENT VERIFICATION
// ─────────────────────────────────────────

model PatientVerification {
  id                   String                    @id @default(cuid())
  patientId            String                    @unique
  status               PatientVerificationStatus @default(PENDING_OTP)
  riskScore            Int                       @default(0)
  riskTier             RiskTier                  @default(LOW)
  riskTriggers         String[]
  // ID verification
  idType               String?                   // "AADHAAR" | "PAN" | "VOTER_ID" | "PASSPORT"
  idTokenRef           String?                   // masked reference token (never store full Aadhaar)
  idVerifiedAt         DateTime?
  idVerificationSource String?                   // "SUREPASS" | "MANUAL" | "DECENTRO"
  ocrConfidenceScore   Float?
  faceMatchScore       Float?
  // Flags
  isMinor              Boolean                   @default(false)
  guardianName         String?
  guardianRelationship String?
  guardianPhone        String?
  guardianIdTokenRef   String?
  // Override
  emergencyOverride    Boolean                   @default(false)
  overrideReason       String?
  overrideBy           String?                   // adminUserId
  overrideAt           DateTime?
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt

  patient              PatientProfile            @relation(fields: [patientId], references: [id], onDelete: Cascade)
  idDocuments          PatientIdDocument[]
  verificationAuditLogs VerificationAuditLog[]

  @@index([status])
  @@index([riskTier])
  @@map("patient_verifications")
}

model PatientIdDocument {
  id                   String    @id @default(cuid())
  verificationId       String
  documentType         String    // "AADHAAR_FRONT" | "AADHAAR_BACK" | "PAN" | "SELFIE"
  storagePath          String    // Supabase storage path (private bucket)
  extractedName        String?
  extractedDob         String?
  extractedIdNumber    String?   // masked: "XXXX XXXX 1234"
  ocrRawResult         Json?
  uploadedAt           DateTime  @default(now())

  verification         PatientVerification @relation(fields: [verificationId], references: [id], onDelete: Cascade)

  @@index([verificationId])
  @@map("patient_id_documents")
}

model VerificationAuditLog {
  id             String   @id @default(cuid())
  verificationId String
  action         String   // "ID_UPLOADED" | "OCR_PASSED" | "FACE_MATCH_FAILED" | "MANUAL_APPROVED" | ...
  performedBy    String?  // userId or "SYSTEM"
  meta           Json?
  createdAt      DateTime @default(now())

  verification   PatientVerification @relation(fields: [verificationId], references: [id])

  @@index([verificationId])
  @@index([createdAt])
  @@map("verification_audit_logs")
}

// ─────────────────────────────────────────
// CLINICAL INTAKE & TRIAGE
// ─────────────────────────────────────────

model ClinicalIntake {
  id                   String         @id @default(cuid())
  bookingId            String         @unique
  consultationReason   String
  symptoms             String
  allergies            String?
  currentMedications   String?
  medicalHistory       String?
  // Operational safety
  hasPets              Boolean        @default(false)
  petType              String?
  gateCode             String?
  floorNumber          Int?
  patientAlone         Boolean        @default(false)
  mobilityConstraint   Boolean        @default(false)
  infectionRiskFlag    Boolean        @default(false)
  specialInstructions  String?
  // Triage output
  triageLevel          TriageLevel    @default(STANDARD)
  triageFlags          String[]
  emergencyRedirected  Boolean        @default(false)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  booking              Booking        @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@map("clinical_intakes")
}

// ─────────────────────────────────────────
// CONSENT
// ─────────────────────────────────────────

model ConsentRecord {
  id               String   @id @default(cuid())
  patientId        String
  bookingId        String?  @unique
  consentVersion   String   // e.g. "v1.2"
  consentText      String   // full text snapshot at time of acceptance
  acceptedAt       DateTime @default(now())
  ipAddress        String?
  deviceId         String?
  signatureArtifact String? // Supabase path to signature image (optional)
  // Guardian consent (minors)
  isGuardianConsent Boolean @default(false)
  guardianName     String?
  guardianPhone    String?

  patient          PatientProfile @relation(fields: [patientId], references: [id])
  booking          Booking?       @relation(fields: [bookingId], references: [id])

  @@index([patientId])
  @@map("consent_records")
}

// ─────────────────────────────────────────
// VISIT OTP
// ─────────────────────────────────────────

model VisitOtp {
  id           String   @id @default(cuid())
  bookingId    String   @unique
  otp          String
  expiresAt    DateTime
  verified     Boolean  @default(false)
  verifiedAt   DateTime?
  providerLat  Float?
  providerLng  Float?
  createdAt    DateTime @default(now())

  booking      Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId])
  @@map("visit_otps")
}

// ─────────────────────────────────────────
// MANUAL REVIEW QUEUE
// ─────────────────────────────────────────

model ManualReviewQueue {
  id             String             @id @default(cuid())
  verificationId String
  reason         ManualReviewReason
  priority       ReviewPriority     @default(NORMAL)
  status         ReviewStatus       @default(OPEN)
  assignedTo     String?            // adminUserId
  notes          String?
  resolvedAt     DateTime?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  @@index([status])
  @@index([priority])
  @@index([createdAt])
  @@map("manual_review_queue")
}

// ─────────────────────────────────────────
// NEW ENUMS
// ─────────────────────────────────────────

enum PatientVerificationStatus {
  PENDING_OTP
  OTP_VERIFIED
  PROFILE_COMPLETE
  INTAKE_COMPLETE
  CONSENT_GIVEN
  ID_UPLOAD_PENDING
  ID_UNDER_REVIEW
  ID_VERIFIED
  CONFIRMED
  FLAGGED
  EMERGENCY_OVERRIDE
}

enum RiskTier {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TriageLevel {
  STANDARD
  URGENT
  EMERGENCY
}

enum ManualReviewReason {
  HIGH_RISK_SCORE
  OCR_MISMATCH
  FACE_MATCH_FAILED
  MINOR_PATIENT
  PROVIDER_FLAGGED
  SUSPICIOUS_ACTIVITY
  EMERGENCY_OVERRIDE_REQUESTED
  REPEAT_ADDRESS_MISMATCH
}

enum ReviewPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum ReviewStatus {
  OPEN
  IN_PROGRESS
  APPROVED
  REJECTED
  ESCALATED
}
```

### 6.2 Additions to Existing Tables

```prisma
// Add to model PatientProfile:
verificationStatus   PatientVerificationStatus @default(PENDING_OTP)
verificationId       String?                   // FK to PatientVerification
trustScore           Int                       @default(50)          // 0–100
totalBookings        Int                       @default(0)
flaggedBookings      Int                       @default(0)
isFlagged            Boolean                   @default(false)
flagReason           String?

// Add to model Booking:
verificationSnapshot Json?    // snapshot of riskScore/tier at booking time
clinicalIntakeId     String?  // FK to ClinicalIntake (via unique bookingId)
consentRecordId      String?  // FK to ConsentRecord (via unique bookingId)
visitOtpId           String?  // FK to VisitOtp (via unique bookingId)
```

### 6.3 Document Retention Policy

| Document Type | Retention Period | Action After |
|---------------|-----------------|--------------|
| ID images (Supabase) | 180 days after last booking | Auto-delete via scheduled job |
| Selfie/face-match images | 90 days | Auto-delete |
| Consent records (DB row) | 7 years (regulatory) | Archive to cold storage |
| OCR extracted text | 90 days | Hard delete |
| Aadhaar raw number | **Never stored** | Use masked token + reference ID only |
| Audit logs | 7 years | Archive |
| Visit GPS coordinates | 1 year | Anonymize (remove patientId link) |

---

## 7. API Design

All endpoints are under the existing NestJS API (`apps/api`). New endpoints follow the same conventions: `@ApiBearerAuth()`, `@ApiTags()`, class-validator DTOs, and `JwtAuthGuard` + `RolesGuard`.

### 7.1 Patient Verification Endpoints

#### POST `/verification/initiate`
Triggered automatically when a booking is created. Calculates risk score and returns the required verification tier.

**Request:**
```json
{
  "bookingId": "clx1abc..."
}
```

**Response:**
```json
{
  "verificationId": "clx2def...",
  "riskScore": 45,
  "riskTier": "MEDIUM",
  "riskTriggers": ["FIRST_BOOKING", "HIGH_VALUE"],
  "requiredSteps": ["CLINICAL_INTAKE", "CONSENT", "ID_OPTIONAL"]
}
```

---

#### POST `/verification/id-upload`
Patient uploads government ID. Returns signed URL from Supabase.

**Request:**
```json
{
  "verificationId": "clx2def...",
  "documentType": "AADHAAR_FRONT",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://supabase.../patient-ids/clx2def/aadhaar-front.jpg?token=...",
  "documentId": "clx3ghi...",
  "expiresIn": 600
}
```

---

#### POST `/verification/id-confirm`
Called after upload completes. Triggers OCR.

**Request:**
```json
{
  "documentId": "clx3ghi...",
  "verificationId": "clx2def..."
}
```

**Response:**
```json
{
  "ocrResult": {
    "extractedName": "Priya Sharma",
    "extractedDob": "1992-05-14",
    "maskedIdNumber": "XXXX XXXX 5678",
    "confidence": 0.94
  },
  "status": "OCR_PASSED",
  "nextStep": "SELFIE_OPTIONAL"
}
```

---

#### POST `/verification/selfie`
Upload selfie and trigger face match against ID document.

**Request:**
```json
{
  "verificationId": "clx2def...",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://supabase.../selfies/clx2def/selfie.jpg?token=...",
  "selfieDocumentId": "clx4jkl..."
}
```

---

#### POST `/verification/selfie-confirm`
Trigger face match after selfie upload.

**Request:**
```json
{
  "verificationId": "clx2def...",
  "selfieDocumentId": "clx4jkl..."
}
```

**Response:**
```json
{
  "faceMatchScore": 0.97,
  "passed": true,
  "status": "ID_VERIFIED"
}
```

---

#### GET `/verification/status/:bookingId`

**Response:**
```json
{
  "verificationId": "clx2def...",
  "status": "CONFIRMED",
  "riskTier": "MEDIUM",
  "completedSteps": ["OTP_VERIFIED", "PROFILE_COMPLETE", "INTAKE_COMPLETE", "CONSENT_GIVEN"],
  "pendingSteps": []
}
```

---

### 7.2 Clinical Intake Endpoints

#### POST `/clinical-intake/:bookingId`

**Request:**
```json
{
  "consultationReason": "High fever and body ache for 3 days",
  "symptoms": "Fever 103°F, headache, joint pain",
  "allergies": "Penicillin",
  "currentMedications": "Paracetamol 500mg",
  "medicalHistory": "Type 2 Diabetes (controlled)",
  "hasPets": true,
  "petType": "Dog",
  "gateCode": "1234",
  "floorNumber": 3,
  "patientAlone": false,
  "mobilityConstraint": false,
  "infectionRiskFlag": false,
  "specialInstructions": "Ring the bell twice"
}
```

**Response:**
```json
{
  "intakeId": "clx5mno...",
  "triageLevel": "URGENT",
  "triageFlags": ["HIGH_FEVER"],
  "emergencyRedirected": false,
  "bannerMessage": null
}
```

---

### 7.3 Consent Endpoints

#### POST `/consent/accept`

**Request:**
```json
{
  "bookingId": "clx1abc...",
  "consentVersion": "v1.2",
  "deviceId": "expo-device-id-xxx",
  "isGuardianConsent": false
}
```

**Response:**
```json
{
  "consentId": "clx6pqr...",
  "acceptedAt": "2026-04-20T10:30:00Z",
  "consentVersion": "v1.2"
}
```

---

### 7.4 Visit OTP Endpoints

#### POST `/visit-otp/send`
Called by provider app when they arrive at the address.

**Request (Provider JWT):**
```json
{
  "bookingId": "clx1abc..."
}
```

**Response:**
```json
{
  "message": "OTP sent to patient",
  "otpExpiresAt": "2026-04-20T11:40:00Z"
}
```

---

#### POST `/visit-otp/verify`
Called by provider after patient shares the OTP verbally.

**Request (Provider JWT):**
```json
{
  "bookingId": "clx1abc...",
  "otp": "847263",
  "providerLat": 17.4344,
  "providerLng": 78.4542
}
```

**Response:**
```json
{
  "verified": true,
  "bookingStatus": "IN_PROGRESS",
  "visitStartedAt": "2026-04-20T11:35:22Z"
}
```

---

### 7.5 Admin / Manual Review Endpoints

#### GET `/admin/verification/review-queue`
**Role:** ADMIN

**Response:**
```json
{
  "items": [
    {
      "reviewId": "clx7stu...",
      "patientName": "Rahul M.",
      "reason": "HIGH_RISK_SCORE",
      "priority": "HIGH",
      "riskScore": 75,
      "createdAt": "2026-04-20T09:12:00Z",
      "status": "OPEN"
    }
  ],
  "total": 12
}
```

---

#### POST `/admin/verification/:verificationId/approve`

**Request (Admin JWT):**
```json
{
  "notes": "ID verified manually. OCR confidence was low due to image quality."
}
```

---

#### POST `/admin/verification/:verificationId/reject`

**Request:**
```json
{
  "reason": "ID document appears tampered.",
  "notifyPatient": true
}
```

---

#### POST `/admin/verification/:verificationId/emergency-override`

**Request:**
```json
{
  "reason": "Patient called in, confirmed identity verbally. Medical emergency.",
  "authorizedBy": "admin-user-id"
}
```

---

## 8. Admin / Ops Dashboard Workflow

### 8.1 Manual Review Queue (Next.js Admin Panel)

The admin panel (`apps/admin`) gains a new **Verification** section:

```
/admin/verification
├── /queue          ← Open review items, filterable by priority/reason
├── /[id]           ← Detail view: documents, OCR result, risk score, history
└── /audit-logs     ← Full audit trail with filters
```

### 8.2 Manual Review Reasons (shown in queue)

| Code | Display Label |
|------|--------------|
| `HIGH_RISK_SCORE` | High risk score (≥55) |
| `OCR_MISMATCH` | OCR name/DOB doesn't match profile |
| `FACE_MATCH_FAILED` | Face match below 0.80 threshold |
| `MINOR_PATIENT` | Patient is under 18 |
| `PROVIDER_FLAGGED` | Provider flagged this patient |
| `SUSPICIOUS_ACTIVITY` | Multiple bookings in short window |
| `EMERGENCY_OVERRIDE_REQUESTED` | Care needed before verification completes |
| `REPEAT_ADDRESS_MISMATCH` | Address differs from previous bookings |

### 8.3 Admin Actions per Review Item

- **Approve** — Mark `ID_VERIFIED`, transition booking to `CONFIRMED`
- **Reject** — Mark `FLAGGED`, notify patient, optionally cancel booking
- **Request More Info** — Send in-app notification asking patient to re-upload
- **Emergency Override** — Force `EMERGENCY_OVERRIDE` status with required reason
- **Escalate** — Bump priority, assign to senior ops

### 8.4 Audit Log Viewer

Every admin action writes to `VerificationAuditLog` and the existing `AdminAction` table. The audit view shows:
- Who took the action (adminId, name)
- What action was taken
- When (timestamp)
- What meta/reason was provided
- Before/after status

---

## 9. Provider App — Visit-Start OTP & Verification Checks

### 9.1 Provider App Flow (apps/mobile → ProviderNavigator)

```
BookingDetail Screen
        │
        ▼
Provider taps "I Have Arrived"
        │
        ├── API: POST /bookings/:id/status { status: "ARRIVED" }
        │
        ▼
Show SafetyChecklist Screen:
  - Display all alert banners from ClinicalIntake flags
  - Show checklist (4 items, see §5.2)
        │
        ▼
Provider taps "Send OTP to Patient"
        │
        ├── API: POST /visit-otp/send { bookingId }
        │
        ▼
OTPEntry Screen:
  - 6-digit OTP input
  - 10-minute countdown timer
  - "Resend OTP" after 2 minutes
        │
        ▼
Provider enters OTP from patient
        │
        ├── API: POST /visit-otp/verify { bookingId, otp, providerLat, providerLng }
        │
        ▼
  Success ──> Booking transitions to IN_PROGRESS
              Show "Visit Started" confirmation
              Start GPS tracking interval (5 min)
        │
  Failure ──> Show error
              If expired: resend option
              If 3 failed attempts: show "Contact Dispatch" option
```

### 9.2 Sample OTP Screen Text

```
┌─────────────────────────────────┐
│  Visit Start Verification       │
│                                 │
│  An OTP has been sent to        │
│  the patient's registered       │
│  mobile number.                 │
│                                 │
│  Ask the patient for the OTP:   │
│                                 │
│  [ _ ] [ _ ] [ _ ] [ _ ] [ _ ] [ _ ]
│                                 │
│  ⏱ Expires in 09:42             │
│                                 │
│  [  Verify & Start Visit  ]     │
│                                 │
│  Didn't receive OTP?            │
│  Resend in 01:23                │
└─────────────────────────────────┘
```

---

## 10. Security and Compliance Controls

### 10.1 PII and Medical Data Protection

| Data Type | Control |
|-----------|---------|
| Aadhaar number | **Never stored in full.** Use masked token (last 4 digits) + reference ID from Surepass/Decentro |
| ID images | Private Supabase bucket (no public URLs). Access only via signed URLs with 10-min TTL |
| Selfie/face images | Same private bucket. Deleted after 90 days |
| Medical history, allergies | Encrypted column in PostgreSQL (AES-256 at rest via Supabase/RDS encryption) |
| Consent text snapshot | Immutable record, never editable after creation |
| Audit logs | Append-only; no DELETE permissions on `verification_audit_logs` |

### 10.2 Role-Based Access

| Role | Can Access |
|------|-----------|
| `PATIENT` | Own verification status, own consent records, own intake |
| `PROVIDER` | Verification status of assigned booking patients only (read-only, masked) |
| `ADMIN` | Full access to review queue, documents (via signed URL), audit logs |
| `SYSTEM` (service account) | OCR/face-match integration callbacks only |

### 10.3 Aadhaar Compliance (UIDAI Guidelines)

- Do **not** store full 12-digit Aadhaar number in any database field
- Store only masked version: `XXXX XXXX 1234`
- Use a third-party AUA/KUA (Authorized User Agency) like **Surepass** or **Decentro** that handle UIDAI-compliant verification and return a verification token
- Do not scan Aadhaar QR code directly without UIDAI authorization

### 10.4 DPDP Act 2023 (India) Compliance Notes

- Consent must be explicit, informed, and specific
- Consent version and full text must be stored at time of acceptance
- Patients must be able to withdraw consent and request data deletion
- Data minimization: collect only what is needed for the booking
- Retain personal data only as long as necessary (see §6.3 retention policy)

### 10.5 API Security

- All endpoints: `JwtAuthGuard` + `RolesGuard` (consistent with existing modules)
- ID upload URLs: time-limited signed URLs (Supabase, 10-min expiry)
- OTP: 6-digit, 10-minute TTL, maximum 3 attempts per booking, then locked
- Rate limiting: extend existing `ThrottlerModule` to cover verification endpoints
- Input validation: class-validator DTOs (consistent with existing pattern)

---

## 11. Recommended Third-Party Providers (India)

| Category | Recommended Provider | Why | Pricing |
|----------|---------------------|-----|---------|
| **OTP / SMS** | MSG91 | Already likely in use; deep India coverage | ₹0.18–0.25/SMS |
| **Government ID OCR** | **Surepass** | NMC, Aadhaar, PAN, Voter ID OCR + verification APIs; UIDAI compliant | ~₹3–8/call |
| **Face Match / Liveness** | **Surepass** (face match API) or **AWS Rekognition** | Surepass is India-first; AWS is more robust for liveness | Surepass: ~₹5/call; AWS: $0.001/image |
| **Alternative ID provider** | **Decentro** | Strong API wrapper for NMC + Aadhaar + PAN; good docs | Similar to Surepass |
| **Address / Geocoding** | **Google Maps Platform** (Geocoding API) | Already used in recommendation engine (`currentLat/Lng`) | $5/1000 calls |
| **Consent / e-Signature** | **Leegality** or **SignDesk** | India-specific, legally admissible e-signature | ₹10–25/document |
| **Document Storage** | **Supabase Storage** | Already integrated (`StorageModule`) | Free tier to $25/mo |
| **WhatsApp OTP** | **Gupshup** or **MSG91 WhatsApp** | Higher open rates than SMS for OTP; India-first | ₹0.50–1.00/session |
| **Emergency Services** | Direct 108 deeplink (`tel:108`) | No integration needed | Free |

### 11.1 Build vs. Buy Decision

| Component | Recommendation | Reason |
|-----------|---------------|--------|
| Phone OTP | **Build in-house** (extend existing `AuthModule`) | Already implemented; just extend for booking OTP |
| Visit-start OTP | **Build in-house** | Simple 6-digit OTP, same pattern as auth OTP |
| Risk scoring engine | **Build in-house** | Rule-based, not ML; full control over business logic |
| Triage keyword scanner | **Build in-house** | Simple string matching; no external dependency needed |
| OCR extraction | **Surepass / Decentro** | Too complex to build; regulatory compliance required |
| Face match | **Surepass / AWS Rekognition** | Accuracy + legal defensibility |
| Consent records | **Build in-house** | Simple DB record + Supabase signature artifact |
| Address geocoding | **Google Maps** | Already used in existing codebase |
| Audit logs | **Build in-house** | Already have `AuditLog` table; extend it |

---

## 12. Phased Implementation Plan

### Phase 1 — MVP (Weeks 1–6)

**Goal:** Launch home-visit booking with basic but functional patient verification. Prioritize conversion rate.

| # | Task | Module | Effort |
|---|------|--------|--------|
| 1 | Extend `PatientProfile` with verification status field | `packages/database` | 0.5d |
| 2 | Build `PatientVerificationModule` — risk scoring service | `apps/api` | 2d |
| 3 | Build `ClinicalIntakeModule` — intake form + triage keywords | `apps/api` | 2d |
| 4 | Build `ConsentModule` — accept consent, store record | `apps/api` | 1d |
| 5 | Build `VisitOtpModule` — send/verify OTP, GPS capture | `apps/api` | 1.5d |
| 6 | Add `PatientVerification`, `ClinicalIntake`, `ConsentRecord`, `VisitOtp`, `ManualReviewQueue` tables to Prisma schema | `packages/database` | 1d |
| 7 | Run Prisma migration | `packages/database` | 0.5d |
| 8 | Mobile: Booking flow → add clinical intake form screen | `apps/mobile` | 3d |
| 9 | Mobile: Consent acceptance screen | `apps/mobile` | 1d |
| 10 | Mobile: Provider SafetyChecklist + OTP entry screen | `apps/mobile` | 2d |
| 11 | Admin: Manual review queue list + detail page | `apps/admin` | 3d |
| 12 | Basic audit logging for all verification actions | `apps/api` | 1d |

**Phase 1 verification level:** Phone OTP (existing) + profile + clinical intake + consent + visit-start OTP. Risk scoring computed but ID verification only prompted (not required) for HIGH/CRITICAL tier.

---

### Phase 2 — Hardening (Weeks 7–12)

**Goal:** Enable ID verification and face match for high-risk bookings. Strengthen admin review.

| # | Task | Notes |
|---|------|-------|
| 1 | Integrate Surepass OCR API (`POST /verification/id-confirm`) | Use `StorageService` for document retrieval |
| 2 | Integrate Surepass face match API (`POST /verification/selfie-confirm`) | Use private Supabase bucket |
| 3 | Build ID upload flow in mobile app (camera + Supabase upload) | Reuse existing `storageService.ts` pattern |
| 4 | Build selfie capture screen in mobile app (expo-image-picker — already in KycScreen) | Consistent with doctor KYC pattern |
| 5 | Add Aadhaar masking/token-reference enforcement | Ensure no raw Aadhaar is persisted |
| 6 | Implement guardian verification flow for minors | New guardian fields in intake form |
| 7 | Admin: Document viewer with signed URL fetch | Supabase signed URL, 10-min TTL |
| 8 | Admin: Emergency override action with mandatory reason field | Audit log required |
| 9 | Extend admin audit log viewer | Filter by patient, date, action type |
| 10 | Automated document retention job (scheduled) | Delete expired ID images from Supabase |
| 11 | SMS/WhatsApp OTP fallback for visit-start OTP | Use existing notifications pipeline |

---

### Phase 3 — Scale & Compliance (Weeks 13–20)

**Goal:** Full DPDP Act compliance, automated fraud detection, scale to multi-city.

| # | Task | Notes |
|---|------|-------|
| 1 | Consent management portal (patient-facing) — view/withdraw consent | New screen in `apps/mobile` |
| 2 | Data deletion request flow | DPDP Act §11 |
| 3 | Automated risk scoring ML model (replace rule-based) | Retrain on historical booking data |
| 4 | Real-time fraud detection: velocity checks, device fingerprinting | Extend risk engine |
| 5 | Leegality/SignDesk integration for legally admissible e-signature on consent | For high-value or medico-legal cases |
| 6 | ABDM Sandbox integration for ABHA-linked patient identity | API Setu / NHA ABDM |
| 7 | Cold-storage archival for audit logs older than 1 year | AWS S3 Glacier / Supabase archive |
| 8 | Provider app: biometric confirmation option (instead of OTP) | React Native biometric library |
| 9 | Admin: SLA alerts for overdue review queue items | Notification to ops team |
| 10 | Multi-tenant support for expanding to additional states/cities | |

---

## 13. Edge Cases and Failure Handling

| Scenario | Handling |
|----------|----------|
| Patient does not receive OTP (booking start) | Resend after 60s; fallback to WhatsApp OTP; max 3 resends |
| Patient does not receive visit-start OTP | Provider can request resend; after 3 failures, provider contacts dispatch |
| OCR confidence < 0.70 | Auto-flag for manual review (`OCR_LOW_CONFIDENCE`); do not auto-reject |
| Face match score < 0.80 | Flag for manual review; patient cannot proceed without admin approval |
| ID image is blurry or unreadable | Prompt re-upload with "ensure good lighting" hint |
| Minor patient books without guardian | Block booking; show "Guardian verification required" modal |
| Network failure during ID upload | Resumable upload via Supabase signed URL; client retries |
| Provider arrives, patient doesn't answer OTP | Provider contacts dispatch; booking can be `CANCELLED` with reason `PATIENT_UNAVAILABLE` |
| Emergency symptoms detected at intake | Show 108 redirect banner; allow patient to override and book (logged) |
| Patient tries to book during ongoing FLAGGED status | Block new bookings; show "Your account requires verification. Contact support." |
| Admin queue has no available reviewers | Auto-escalate after 30 min; notify on-call admin via push notification |
| Aadhaar OCR returns full number | Strip and mask before persisting; never save raw number |
| Duplicate bookings from same device | Velocity check in risk engine; flag as `SUSPICIOUS_ACTIVITY` |
| Provider GPS unavailable on visit start | Log warning; allow visit to proceed; flag in audit log |

---

## 14. Trust / Risk Scoring Model

### 14.1 Patient Trust Score (0–100)

Separate from per-booking risk score. Persisted on `PatientProfile.trustScore`. Updated after each booking.

```
Trust Score Formula:
  base = 50
  + 10 per completed booking (max +30)
  + 15 if ID verified on file
  + 5 per positive provider review
  - 20 per cancelled booking (patient-side)
  - 30 per flagged incident
  - 50 if manual reject on ID verification
```

| Trust Score | Label | Effect |
|-------------|-------|--------|
| 80–100 | **Trusted** | Skip ID for all LOW/MEDIUM risk bookings |
| 50–79 | **Verified** | Normal flow |
| 30–49 | **New / Unverified** | Normal flow with soft ID prompt |
| 0–29 | **At Risk** | Mandatory ID + manual review for all bookings |

### 14.2 Per-Booking Risk Score

Computed fresh for every booking (see §3.2). Snapshot stored in `Booking.verificationSnapshot`.

### 14.3 Score Integration

```
effectiveRiskScore = perBookingRiskScore - (trustScoreBonus)

where trustScoreBonus:
  trustScore 80–100 → -15 bonus
  trustScore 50–79  → 0
  trustScore 30–49  → +5 penalty
  trustScore 0–29   → +20 penalty
```

---

## 15. Engineering Task Breakdown

### Backend (`apps/api`)

| Task | Estimated Effort |
|------|-----------------|
| `PatientVerificationModule` — scaffold, controller, service, DTOs | 2d |
| Risk engine service | 1.5d |
| `ClinicalIntakeModule` — triage logic included | 2d |
| `ConsentModule` | 1d |
| `VisitOtpModule` | 1.5d |
| Surepass OCR integration | 1.5d |
| Surepass face match integration | 1.5d |
| Manual review queue service + admin endpoints | 2d |
| Aadhaar masking enforcement | 0.5d |
| Audit logging for all verification events | 1d |
| Document retention scheduled job | 1d |
| Unit tests for risk engine + triage | 1.5d |
| **Total** | **~17.5 days** |

### Database (`packages/database`)

| Task | Estimated Effort |
|------|-----------------|
| Add 6 new tables to Prisma schema | 1d |
| Extend `PatientProfile` and `Booking` | 0.5d |
| Create and test Prisma migration | 0.5d |
| **Total** | **~2 days** |

### Mobile App (`apps/mobile`)

| Task | Estimated Effort |
|------|-----------------|
| Clinical intake form screen (patient booking flow) | 2d |
| Consent acceptance screen with text scroll + checkbox | 1d |
| Verification status screen (show pending steps) | 1d |
| ID upload screen (camera + upload) | 2d |
| Selfie capture screen | 1d |
| Guardian verification form (conditional for minors) | 1.5d |
| Provider SafetyChecklist screen | 1d |
| Visit-start OTP entry screen (provider) | 1d |
| Integration with verification API endpoints | 2d |
| **Total** | **~13.5 days** |

### Admin Dashboard (`apps/admin`)

| Task | Estimated Effort |
|------|-----------------|
| Manual review queue page (`/admin/verification/queue`) | 2d |
| Review detail page (docs, OCR, risk, history) | 2d |
| Approve / Reject / Override actions | 1d |
| Audit log viewer page | 1.5d |
| **Total** | **~6.5 days** |

### DevOps

| Task | Estimated Effort |
|------|-----------------|
| Supabase private bucket setup for patient ID images | 0.5d |
| Surepass/Decentro API credentials + env vars in CI/CD | 0.5d |
| Document retention cron job deployment | 0.5d |
| **Total** | **~1.5 days** |

### QA

| Task | Estimated Effort |
|------|-----------------|
| Test risk score calculation for all tiers | 1d |
| Test triage keyword detection | 0.5d |
| Test OCR integration (happy path + failure) | 1d |
| Test face match (pass + fail + low confidence) | 1d |
| Test visit-start OTP (happy path, expired, failed attempts) | 0.5d |
| Test minor patient guardian flow | 0.5d |
| Test emergency override (admin action) | 0.5d |
| Test document retention job | 0.5d |
| **Total** | **~5.5 days** |

---

## 16. Best Starting Architecture for Curex24

If you want to **launch fast** while remaining scalable, follow this prioritized approach:

### Start With (Phase 1 Core)

1. **Reuse existing `AuthModule` OTP** — Phone OTP for booking start is already built. No new OTP infrastructure needed.

2. **Add `ClinicalIntakeModule` first** — This gives immediate clinical value and is purely additive (no existing code changes). Build the triage keyword scanner in-house (2 days).

3. **Add `ConsentModule` next** — Simple DB record. Critical for DPDP Act compliance. 1 day.

4. **Build `VisitOtpModule` for visit-start** — Highest safety value per day of effort. Reuses OTP pattern from `AuthModule`. 1.5 days.

5. **Add `PatientVerificationModule` with risk engine** — Rule-based scoring (no ML). Store `riskScore` + `riskTier` on every booking. Display alerts to providers. 3.5 days.

6. **Skip ID verification in Phase 1** — Only prompt (don't require) ID for HIGH/CRITICAL tier. This keeps booking drop-off low while the ID integration is built in Phase 2.

### Defer to Phase 2

- OCR integration (Surepass)
- Face match
- Guardian flow for minors
- Manual review queue UI

### Key Tradeoffs Accepted

| Tradeoff | Accepted Risk | Mitigation |
|----------|--------------|------------|
| No mandatory ID in Phase 1 | Higher fraud risk | Risk score visible to ops; manual spot-checks |
| Rule-based risk engine (not ML) | Less accurate | Sufficient for MVP volume; retrain in Phase 3 |
| Surepass for OCR (third-party) | Vendor dependency | Adapter pattern allows switching to Decentro |
| No ABDM integration in Phase 1 | Not ABHA-linked | Add in Phase 3 when volume justifies cost |

### Recommended Architecture Summary

```
Phase 1 Tech Stack for Patient Verification:
─────────────────────────────────────────────
NestJS modules:
  PatientVerificationModule (risk engine, status machine)
  ClinicalIntakeModule (intake + triage keywords)
  ConsentModule (consent record)
  VisitOtpModule (visit-start OTP + GPS)

Database:
  5 new Prisma tables (patient_verifications,
  clinical_intakes, consent_records, visit_otps,
  manual_review_queue)
  Extensions to patient_profiles and bookings

Storage:
  Supabase private bucket "patient-ids"
  (Phase 2: used for ID images)

Third-party (Phase 1):
  MSG91 SMS (existing) — visit-start OTP delivery
  Google Maps (existing) — address geocoding

Third-party (Phase 2 additions):
  Surepass — OCR + face match
  Leegality — e-signature consent (optional)
```

---

*Document Version: 1.0*  
*Maintainer: Engineering Team, Curex24*  
*Last Updated: April 2026*  
*Related Docs:* [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA_MODEL.md](./DATA_MODEL.md) · [doctor-verification-india.md](./doctor-verification-india.md) · [PRIVACY.md](./PRIVACY.md)
