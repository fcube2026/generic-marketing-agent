# Curex24 — Product Requirements Document (PRD)

> **Healthcare, anytime. Anywhere.**

---

## 1. Product Overview

**Curex24** is an on-demand healthcare platform that connects patients with nearby doctors and care providers in real time. Based on availability, distance, and convenience, the platform intelligently recommends the best care option at that moment.

### Primary Recommendation Modes (MVP)

| Mode | Description |
|------|-------------|
| **Home Visit** | Provider travels to the patient's location |
| **Doctor's Place Visit** | Patient visits the provider's available clinic/office |

### Supported Provider Types

- General doctors & specialists
- Physiotherapists
- Speech therapists
- Occupational therapists
- Nurses
- Elderly care providers
- Other home-care / therapy professionals

---

## 2. Business Goal

Build a **rural-first but scalable** healthcare marketplace that solves after-hours and distance-based healthcare access problems, while also creating additional income opportunities for providers.

---

## 3. Target Users

### 3.1 Patients
- Rural families with limited healthcare access
- Elderly or mobility-constrained users
- Parents seeking urgent non-critical consultation
- Users needing therapy or follow-up care

### 3.2 Providers
- General doctors and specialists
- Physiotherapists, speech therapists, nurses
- Caregivers and verified healthcare professionals

---

## 4. Core Value Proposition

### For Patients
| Value | Description |
|-------|-------------|
| Quick Access | Find nearby verified providers instantly |
| Smart Recommendation | AI-based Home Visit vs Clinic suggestion |
| Transparent Pricing | Clear fee display before booking |
| Digital Records | Consultation summary and follow-up tracking |
| Continuity of Care | Linked patient history and diagnostics |

### For Providers
| Value | Description |
|-------|-------------|
| Flexible Availability | Toggle on/off at any time |
| Additional Income | Earn during idle hours |
| Digital Workflow | Structured consultation and summary tools |
| Standard Records | Professional consultation summaries |

---

## 5. MVP User Flow

> **Note:** The unified `apps/mobile` app presents a **role selection screen** at first launch. Users choose "I'm a Patient" or "I'm a Doctor" before entering their phone number. This role is passed through OTP verification and stored in their account. After authentication, the app routes to the appropriate patient or provider experience.

```
[Launch] → Role Selection (Patient / Doctor)
  → Phone number entry → OTP verification → Role-based home screen

Patient selects service → Enters symptoms & location
  → System finds nearby providers
  → Smart recommendation (Home Visit vs Clinic)
  → Patient books preferred option
  → Payment → Service delivery
  → Consultation summary (mandatory)
  → Follow-up (diagnostics / referral if needed)
```

### Step-by-Step Breakdown

1. **Role Selection** — User identifies as Patient or Doctor on first launch
2. **Select Service** — Choose category (Doctor, Physio, Nursing, etc.), enter symptoms, location, timing
3. **Find Providers** — Match by service type, distance, availability, service radius, mode support
4. **Get Recommendation** — Score-based suggestion with ETA, distance, fee for both modes
5. **Book & Pay** — Confirm option, complete payment, receive booking confirmation
6. **Service Delivery** — Track provider (home visit) or navigate to clinic
7. **Consultation Summary** — Provider submits structured summary (mandatory before closure)
8. **Follow-up** — Diagnostics requests, lab results, specialist referrals

---

## 6. Functional Requirements

### 6.1 Patient Onboarding
- Mobile number sign-up with OTP verification
- Basic profile creation (name, DOB, gender)
- Address management with geolocation

### 6.2 Provider Onboarding
- Registration with phone + OTP
- Profile: name, specialization, bio
- KYC: license/certification upload, ID proof
- Service configuration: categories, home visit/clinic toggles, fees, radius
- Working hours and real-time availability toggle
- Admin approval workflow

### 6.3 Service Discovery
- Patient selects service category
- Nearby verified and available providers shown
- Results sorted by recommendation score, distance, ETA, fee
- Filter by: service type, distance, fee, availability mode

### 6.4 Recommendation Engine
**Scoring formula:**
```
Score = Availability(40%) + Distance(30%) + Fee(20%) + Urgency(10%)
```

**Inputs:** availability, mode support, distance, ETA, fee, patient urgency

**Outputs:** recommended option (Home Visit / Clinic), ranked provider list, explanatory reason text

### 6.5 Booking System
- Instant booking (MVP), scheduled booking placeholder
- Booking state machine:
  ```
  REQUESTED → ACCEPTED → ON_THE_WAY → ARRIVED → IN_PROGRESS
    → COMPLETED → SUMMARY_SUBMITTED → CLOSED
  ```
- CANCELLED possible from REQUESTED or ACCEPTED

### 6.6 Payments
- Fee calculated based on mode (home visit vs clinic)
- Payment before service (prepaid model)
- Payment status tracking (PENDING → PAID → REFUNDED)
- Payout-ready booking records (80% provider share)

### 6.7 Consultation Summary
- Structured form: symptoms, observations, diagnosis, medicines, next steps
- Follow-up recommendation toggle
- Diagnostic test request toggle
- Specialist referral toggle
- Saved to patient timeline

### 6.8 Diagnostics Follow-up
- Doctor marks "blood test required"
- Operations team coordinates sample collection
- Lab result upload
- Patient notified when results ready

### 6.9 Specialist Referral
- Doctor recommends specialist/surgeon
- Referral logged in patient profile
- Future: in-app specialist booking

### 6.10 Admin Panel
- Provider verification queue with approve/reject
- Provider activation/deactivation
- Booking monitoring with status filters
- Diagnostics coordination dashboard
- Support dashboard (Phase 2 full ticketing)

---

## 7. Non-Functional Requirements

| Requirement | Details |
|-------------|---------|
| UX | Mobile-first, clean, trust-building UI |
| Performance | Fast search and booking experience |
| Security | Secure health data storage, JWT auth |
| Access Control | Role-based (Patient, Provider, Admin) |
| Audit | Audit logging for all critical actions |
| Observability | Basic logging and error tracking |
| Extensibility | Modular domain model for future features |

---

## 8. UX Design Direction

**Feel:** Trustworthy, calm, modern, health + tech enabled

**Color Palette:**
| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Teal) | `#0D9488` | Buttons, headers, accents |
| Primary Light | `#CCFBF1` | Backgrounds, highlights |
| Secondary (Blue) | `#2563EB` | Links, secondary actions |
| Background | `#F8FAFC` | Page backgrounds |
| Text | `#1E293B` | Primary text |
| Muted | `#64748B` | Secondary text |
| Success | `#10B981` | Positive states |
| Warning | `#F59E0B` | Pending states |
| Error | `#EF4444` | Error states |

---

## 9. MVP Scope vs Future Scope

### In Scope (MVP)
- ✅ Patient mobile app (Expo React Native)
- ✅ Provider mobile app (Expo React Native)
- ✅ Admin web panel (Next.js)
- ✅ NestJS backend API
- ✅ OTP-based auth
- ✅ Provider onboarding + verification
- ✅ Search + matching + recommendation engine
- ✅ Booking with full state machine
- ✅ Payment flow (mock integration)
- ✅ Consultation summary (structured)
- ✅ Diagnostics follow-up logging
- ✅ Patient booking history
- ✅ Basic admin operations

### Out of Scope (Phase 2+)
- ❌ Video consultation
- ❌ Insurance integrations
- ❌ Full pharmacy delivery
- ❌ Ambulance dispatch
- ❌ AI symptom checker
- ❌ Recurring subscriptions
- ❌ Multilingual personalization
- ❌ Dynamic surge pricing
- ❌ Deep EMR integration
- ❌ Full ticketing/support system

---

## 10. User Stories

### Patient Stories
| ID | Story | Priority |
|----|-------|----------|
| P-1 | As a patient, I can sign up with my phone number and OTP | Must |
| P-2 | As a patient, I can select a service category (Doctor, Physio, etc.) | Must |
| P-3 | As a patient, I can see recommended providers sorted by relevance | Must |
| P-4 | As a patient, I can see Home Visit vs Clinic Visit comparison | Must |
| P-5 | As a patient, I can book and pay for a consultation | Must |
| P-6 | As a patient, I can track my provider during home visit | Must |
| P-7 | As a patient, I can view my consultation summary | Must |
| P-8 | As a patient, I can see follow-up diagnostic recommendations | Must |
| P-9 | As a patient, I can view my booking history | Must |
| P-10 | As a patient, I can manage my profile and addresses | Should |

### Provider Stories
| ID | Story | Priority |
|----|-------|----------|
| V-1 | As a provider, I can register and complete my profile | Must |
| V-2 | As a provider, I can upload KYC documents for verification | Must |
| V-3 | As a provider, I can toggle my availability on/off | Must |
| V-4 | As a provider, I can accept/decline booking requests | Must |
| V-5 | As a provider, I can update booking status through workflow | Must |
| V-6 | As a provider, I can submit a structured consultation summary | Must |
| V-7 | As a provider, I can request diagnostics for a patient | Should |
| V-8 | As a provider, I can view my earnings and booking history | Should |
| V-9 | As a provider, I can configure my fees and service radius | Must |

### Admin Stories
| ID | Story | Priority |
|----|-------|----------|
| A-1 | As an admin, I can review and approve pending providers | Must |
| A-2 | As an admin, I can view all bookings with filters | Must |
| A-3 | As an admin, I can coordinate diagnostic sample collections | Should |
| A-4 | As an admin, I can see platform statistics on a dashboard | Must |
| A-5 | As an admin, I can deactivate problematic providers | Must |

---

## 11. Edge Cases & Failure Scenarios

| Scenario | Handling |
|----------|----------|
| No providers available in area | Show "No providers available" with retry option |
| Provider cancels after accepting | Booking moves to CANCELLED, patient notified, refund triggered |
| Payment failure | Booking stays in REQUESTED, patient retries payment |
| Provider doesn't submit summary | Booking cannot transition to CLOSED |
| OTP expiry (10 min) | User re-requests OTP |
| Network failure during booking | Optimistic UI with retry mechanism |
| Provider goes offline during active booking | Status remains, operations team alerted |
| Duplicate booking attempt | Prevent duplicate within 5-minute window |

---

## 12. Key Risks & Assumptions

### Risks
1. Provider supply in rural areas may be limited initially
2. Payment integration reliability in tier-2/3 areas
3. Internet connectivity in rural regions
4. Provider trust and adoption

### Assumptions
1. Providers have smartphones with GPS capability
2. Basic internet connectivity is available
3. Patients are comfortable with OTP-based login
4. Providers are willing to toggle availability manually
5. 80/20 revenue share is acceptable to providers

---

## 13. Key Metrics (Success KPIs)

| Metric | Target (Quarter 1) |
|--------|-------------------|
| Provider sign-ups | 50+ |
| Patient sign-ups | 500+ |
| Bookings completed | 200+ |
| Average booking time (discovery → confirm) | < 3 minutes |
| Consultation summary completion rate | > 95% |
| Provider acceptance rate | > 80% |
| Patient satisfaction (NPS) | > 40 |

---

*Document Version: 1.0 (MVP)*
*Last Updated: April 2026*
