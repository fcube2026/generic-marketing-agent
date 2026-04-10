# API Testing Strategy

> **Focus:** Happy-path, end-to-end orchestration of business flows using APIs only.
> Negative / edge-case testing is deliberately deferred.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Module-Wise Flows](#module-wise-flows)
   - [Flow 1 – Authentication](#flow-1--authentication)
   - [Flow 2 – Patient Onboarding](#flow-2--patient-onboarding)
   - [Flow 3 – Provider Onboarding & Verification](#flow-3--provider-onboarding--verification)
   - [Flow 4 – Service Discovery](#flow-4--service-discovery)
   - [Flow 5 – Appointment Booking](#flow-5--appointment-booking)
   - [Flow 6 – Payment](#flow-6--payment)
   - [Flow 7 – Consultation Summary](#flow-7--consultation-summary)
   - [Flow 8 – Diagnostics](#flow-8--diagnostics)
   - [Flow 9 – Referrals](#flow-9--referrals)
   - [Flow 10 – Cancellation & Reschedule](#flow-10--cancellation--reschedule)
   - [Flow 11 – Notifications](#flow-11--notifications)
   - [Flow 12 – Provider Tracking](#flow-12--provider-tracking)
4. [Composite End-to-End Scenarios](#composite-end-to-end-scenarios)
5. [Test Data Dependencies](#test-data-dependencies)
6. [Execution Guidelines](#execution-guidelines)

---

## Overview

The goal is to **mimic real app journeys** by orchestrating multiple API calls in sequence, verifying that each step produces the expected state before invoking the next. This is the same approach backend developers use in corporate environments to validate high-level use cases before front-end integration.

### Guiding Principles

| Principle | Detail |
|---|---|
| Happy-path only (for now) | Every request uses valid data and expects a success response |
| Sequential orchestration | Each flow is a chain of dependent calls; later calls use IDs / tokens from earlier ones |
| State verification | After mutations, perform a GET to confirm the resource is in the expected state |
| Modular & composable | Flows are broken into self-contained modules that can be assembled into larger scenarios |

---

## Prerequisites

| Item | Detail |
|---|---|
| API base URL | `http://localhost:3000/api/v1` |
| Database | PostgreSQL with schema applied (`pnpm --filter @curex24/database db:generate`) |
| Seed data | Service categories seeded (the Services module auto-seeds on first request) |
| Admin credentials | `admin@curex24.com` / `admin123` (or env overrides `ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| Patient phone | Any valid phone number (e.g. `+919876543210`) |
| Provider phone | A different valid phone number (e.g. `+919876543211`) |

---

## Module-Wise Flows

### Flow 1 – Authentication

**Purpose:** Obtain JWT tokens for patient, provider, and admin users.

| Step | Method | Endpoint | Body / Params | Expected Response | Save |
|---|---|---|---|---|---|
| 1 | POST | `/auth/send-otp` | `{ "phone": "+919876543210" }` | 201 – `{ success: true, otp: "..." }` | `patientOtp` |
| 2 | POST | `/auth/verify-otp` | `{ "phone": "+919876543210", "otp": "{{patientOtp}}", "role": "PATIENT" }` | 200 – `{ token, user }` | `patientToken`, `patientUserId` |
| 3 | POST | `/auth/send-otp` | `{ "phone": "+919876543211" }` | 201 | `providerOtp` |
| 4 | POST | `/auth/verify-otp` | `{ "phone": "+919876543211", "otp": "{{providerOtp}}", "role": "PROVIDER" }` | 200 | `providerToken`, `providerUserId` |
| 5 | POST | `/auth/admin-login` | `{ "email": "admin@curex24.com", "password": "admin123" }` | 200 | `adminToken` |

---

### Flow 2 – Patient Onboarding

**Depends on:** Flow 1 (patientToken)

| Step | Method | Endpoint | Body / Params | Expected | Save |
|---|---|---|---|---|---|
| 1 | POST | `/patients/me/profile` | `{ "name": "John Doe", "dateOfBirth": "1990-01-15T00:00:00.000Z", "gender": "MALE" }` | 201 – profile created | `patientProfileId` |
| 2 | GET | `/patients/me` | – | 200 – profile returned | verify name, gender |
| 3 | POST | `/patients/me/addresses` | `{ "label": "Home", "addressLine": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001", "lat": 19.076, "lng": 72.8777, "isDefault": true }` | 201 | `addressId` |
| 4 | GET | `/patients/me/addresses` | – | 200 – 1 address | verify isDefault = true |

---

### Flow 3 – Provider Onboarding & Verification

**Depends on:** Flow 1 (providerToken, adminToken)

| Step | Method | Endpoint | Auth | Body | Expected | Save |
|---|---|---|---|---|---|---|
| 1 | POST | `/providers/onboard` | providerToken | `{ "name": "Dr. Smith", "specialization": "General Medicine", "contactInfo": "+919876543211", "clinicAddress": "456 Clinic Road, Mumbai", "homeVisitEnabled": true, "doctorPlaceVisitEnabled": true, "consultationFeeHomeVisit": 500, "consultationFeeDoctorPlace": 300, "serviceCategoryIds": ["{{doctorCategoryId}}"] }` | 201 | `providerProfileId` |
| 2 | POST | `/providers/me/kyc` | providerToken | `{ "type": "MEDICAL_LICENSE", "documentUrl": "https://example.com/license.pdf" }` | 201 | `licenseId` |
| 3 | GET | `/admin/providers/pending` | adminToken | – | 200 – includes provider | verify pending |
| 4 | PUT | `/admin/providers/{{providerProfileId}}/verify` | adminToken | `{ "notes": "Verified" }` | 200 | – |
| 5 | GET | `/providers/me` | providerToken | – | 200 | verify isVerified = true |
| 6 | PUT | `/providers/me/availability` | providerToken | `{ "isAvailable": true, "currentLat": 19.076, "currentLng": 72.8777 }` | 200 | – |

---

### Flow 4 – Service Discovery

| Step | Method | Endpoint | Auth | Expected | Save |
|---|---|---|---|---|---|
| 1 | GET | `/services` | none (public) | 200 – array of categories | `doctorCategoryId` (slug: "doctor") |
| 2 | GET | `/providers/nearby?lat=19.076&lng=72.8777&serviceCategory=doctor` | none (public) | 200 – includes verified provider | verify Dr. Smith in list |
| 3 | POST | `/recommendation` | none (public) | `{ "lat": 19.076, "lng": 72.8777, "serviceCategory": "doctor", "urgency": "MEDIUM" }` → 201 | `recommendedProvider`, `recommendedMode` |

---

### Flow 5 – Appointment Booking

**Depends on:** Flows 1–4

| Step | Method | Endpoint | Auth | Body | Expected | Save |
|---|---|---|---|---|---|---|
| 1 | POST | `/bookings` | patientToken | `{ "providerId": "{{providerProfileId}}", "serviceCategoryId": "{{doctorCategoryId}}", "addressId": "{{addressId}}", "mode": "HOME_VISIT", "scheduledAt": "<future ISO datetime>", "symptoms": "Fever and cold" }` | 201 | `bookingId` |
| 2 | GET | `/bookings/{{bookingId}}` | patientToken | – | 200, status = REQUESTED | verify all fields |
| 3 | GET | `/providers/me/incoming-requests` | providerToken | – | 200 – includes booking | verify booking present |
| 4 | POST | `/bookings/{{bookingId}}/accept` | providerToken | – | 200, status = ACCEPTED | – |
| 5 | GET | `/bookings/{{bookingId}}` | patientToken | – | 200, status = ACCEPTED | – |

---

### Flow 6 – Payment

**Depends on:** Flow 5 (bookingId)

| Step | Method | Endpoint | Auth | Body | Expected | Save |
|---|---|---|---|---|---|---|
| 1 | POST | `/payments` | patientToken | `{ "bookingId": "{{bookingId}}", "amount": 500 }` | 201 | `paymentId` |
| 2 | GET | `/payments/{{bookingId}}` | patientToken | – | 200, status = PENDING | – |
| 3 | PUT | `/payments/{{paymentId}}/status` | patientToken | `{ "status": "PAID", "transactionId": "TXN_MANUAL_001" }` | 200, status = PAID | – |
| 4 | GET | `/bookings/{{bookingId}}` | patientToken | – | 200, paymentStatus = PAID | – |
| 5 | GET | `/payouts/me` | providerToken | – | 200 – includes payout at 80% | verify amount = 400 |
| 6 | GET | `/payouts/me/summary` | providerToken | – | 200, totalEarnings = 400 | – |

---

### Flow 7 – Consultation Summary

**Depends on:** Flow 5 (bookingId accepted)

| Step | Method | Endpoint | Auth | Body | Expected | Save |
|---|---|---|---|---|---|---|
| 1 | PUT | `/bookings/{{bookingId}}/status` | providerToken | `{ "status": "ON_THE_WAY" }` | 200 | – |
| 2 | PUT | `/bookings/{{bookingId}}/status` | providerToken | `{ "status": "ARRIVED" }` | 200 | – |
| 3 | PUT | `/bookings/{{bookingId}}/status` | providerToken | `{ "status": "IN_PROGRESS" }` | 200 | – |
| 4 | PUT | `/bookings/{{bookingId}}/status` | providerToken | `{ "status": "COMPLETED" }` | 200 | – |
| 5 | POST | `/consultation/{{bookingId}}/summary` | providerToken | `{ "symptoms": "Fever", "diagnosis": "Viral infection", "medicinesAdvised": [{"name":"Paracetamol","dosage":"500mg","frequency":"3x daily","duration":"5 days"}], "nextSteps": "Rest and hydration", "followUpRecommendation": "Revisit in 1 week" }` | 201 | `summaryId` |
| 6 | GET | `/consultation/{{bookingId}}/summary` | patientToken | – | 200 – summary with medicines | verify diagnosis |
| 7 | GET | `/bookings/{{bookingId}}` | patientToken | – | status = SUMMARY_SUBMITTED | – |
| 8 | PUT | `/bookings/{{bookingId}}/status` | providerToken | `{ "status": "CLOSED" }` | 200 | – |
| 9 | GET | `/consultation/patient/summaries` | patientToken | – | 200 – includes this summary | – |

---

### Flow 8 – Diagnostics

**Depends on:** Active booking (IN_PROGRESS or COMPLETED)

| Step | Method | Endpoint | Auth | Body | Expected | Save |
|---|---|---|---|---|---|---|
| 1 | POST | `/diagnostics` | providerToken | `{ "bookingId": "{{bookingId}}", "testType": "Blood Test", "notes": "Check CBC" }` | 201 | `diagnosticId` |
| 2 | PUT | `/diagnostics/{{diagnosticId}}` | providerToken | `{ "status": "SCHEDULED", "scheduledAt": "<future datetime>" }` | 200 | – |
| 3 | PUT | `/diagnostics/{{diagnosticId}}` | providerToken | `{ "status": "COLLECTED" }` | 200 | – |
| 4 | POST | `/diagnostics/{{diagnosticId}}/result` | providerToken | `{ "resultFileUrl": "https://example.com/cbc-result.pdf", "notes": "Normal ranges" }` | 201 | `labResultId` |
| 5 | GET | `/diagnostics/patient/me` | patientToken | – | 200 – includes diagnostic with result | – |

---

### Flow 9 – Referrals

**Depends on:** Active booking

| Step | Method | Endpoint | Auth | Body | Expected | Save |
|---|---|---|---|---|---|---|
| 1 | POST | `/referrals` | providerToken | `{ "bookingId": "{{bookingId}}", "specialistType": "Cardiologist", "notes": "Heart murmur detected" }` | 201 | `referralId` |
| 2 | PUT | `/referrals/{{referralId}}` | providerToken | `{ "status": "BOOKED" }` | 200 | – |
| 3 | GET | `/referrals/patient/me` | patientToken | – | 200 – includes referral | verify status = BOOKED |

---

### Flow 10 – Cancellation & Reschedule

**Scenario A — Patient cancels a booking**

| Step | Method | Endpoint | Auth | Body | Expected |
|---|---|---|---|---|---|
| 1 | POST | `/bookings` | patientToken | (valid booking body) | 201 – new booking |
| 2 | POST | `/bookings/{{newBookingId}}/cancel` | patientToken | – | 200, status = CANCELLED |
| 3 | GET | `/bookings/{{newBookingId}}` | patientToken | – | status = CANCELLED |

**Scenario B — Rebooking after cancellation**

| Step | Method | Endpoint | Auth | Body | Expected |
|---|---|---|---|---|---|
| 1 | POST | `/bookings` | patientToken | (new booking body with different time) | 201 |
| 2 | GET | `/patients/me/bookings` | patientToken | – | includes both old (CANCELLED) and new (REQUESTED) |

---

### Flow 11 – Notifications

**Verified as side-effects of Flows 5–7**

| Step | Method | Endpoint | Auth | Expected |
|---|---|---|---|---|
| 1 | GET | `/notifications/me` | providerToken | includes BOOKING_REQUEST notification |
| 2 | GET | `/notifications/me` | patientToken | includes BOOKING_ACCEPTED notification |
| 3 | GET | `/notifications/me/unread-count` | patientToken | count ≥ 1 |
| 4 | PUT | `/notifications/{{notificationId}}/read` | patientToken | isRead = true |
| 5 | GET | `/notifications/me/unread-count` | patientToken | count decremented |

---

### Flow 12 – Provider Tracking

**Depends on:** Booking in ACCEPTED / ON_THE_WAY status

| Step | Method | Endpoint | Auth | Body | Expected |
|---|---|---|---|---|---|
| 1 | PUT | `/tracking/location` | providerToken | `{ "bookingId": "{{bookingId}}", "lat": 19.080, "lng": 72.880 }` | 201 |
| 2 | GET | `/tracking/{{bookingId}}/location` | patientToken | – | 200, lat/lng present |
| 3 | PUT | `/tracking/location` | providerToken | `{ "bookingId": "{{bookingId}}", "lat": 19.077, "lng": 72.878 }` | 201 |
| 4 | GET | `/tracking/{{bookingId}}/location` | patientToken | – | 200, updated lat/lng |

---

## Composite End-to-End Scenarios

### Scenario 1: New Patient Books and Completes Appointment

```
Auth (patient + provider + admin)
  → Service Discovery (get categories)
  → Patient Onboarding (profile + address)
  → Provider Onboarding (profile + KYC + admin verify + set available)
  → Appointment Booking (create + accept)
  → Payment (initiate + pay)
  → Provider Tracking (update location)
  → Booking Lifecycle (ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED)
  → Consultation Summary (submit + verify)
  → Diagnostics (request + schedule + collect + result)
  → Referrals (create + update status)
  → Notifications (verify all side-effect notifications)
  → Booking Close (SUMMARY_SUBMITTED → CLOSED)
```

### Scenario 2: Patient Cancels Before Provider Accepts

```
Auth (patient + provider)
  → Booking (create)
  → Cancel (patient cancels)
  → Verify status = CANCELLED
  → Verify payment refund if payment was made
```

### Scenario 3: Admin Reviews Platform State

```
Auth (admin)
  → Dashboard (get stats)
  → Dashboard Charts (get 30-day data)
  → List Providers (pending, active)
  → List Bookings (paginated)
  → List Diagnostics
  → List Referrals
  → List Payouts + Summary
  → Process Payout
```

---

## Test Data Dependencies

| Data Item | Source | Used In |
|---|---|---|
| `patientToken` | Auth Flow | All patient requests |
| `providerToken` | Auth Flow | All provider requests |
| `adminToken` | Auth Flow | All admin requests |
| `patientProfileId` | Patient Onboarding | Booking creation |
| `addressId` | Patient Onboarding | HOME_VISIT bookings |
| `providerProfileId` | Provider Onboarding | Booking, Admin |
| `doctorCategoryId` | Service Discovery | Booking, Search |
| `bookingId` | Booking Flow | Payment, Consultation, Diagnostics, Referrals, Tracking |
| `paymentId` | Payment Flow | Payment status update |
| `diagnosticId` | Diagnostics Flow | Result upload |
| `referralId` | Referrals Flow | Status update |

---

## Execution Guidelines

1. **Run flows in order** – Authentication first, then onboarding, then business flows.
2. **Chain variables** – Use response values (IDs, tokens) as inputs to subsequent requests.
3. **Verify after mutation** – Always GET the resource after POST/PUT to confirm state.
4. **Use Postman/Bruno environment variables** – Store tokens and IDs as collection variables.
5. **Idempotency** – Some flows create resources; clean up or use unique data per run.
6. **CI integration** – Export collections to Newman (Postman) or Bruno CLI for automated smoke tests on deployment.
