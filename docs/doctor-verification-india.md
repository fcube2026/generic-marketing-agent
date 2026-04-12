# India Doctor Registration Verification — Research & Integration Guide

> **Prepared for:** Curex24 Healthcare Platform  
> **Date:** April 2026  
> **Role:** Regulatory Research Analyst · Health-Tech Integration Architect · Compliance Expert

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [National-Level Systems (NMC / ABDM)](#2-national-level-systems-nmc--abdm)
3. [State-Wise Comparison Table](#3-state-wise-comparison-table)
4. [API Availability Summary](#4-api-availability-summary)
5. [Integration Strategy](#5-integration-strategy)
6. [Recommended Architecture for Doctor Verification](#6-recommended-architecture-for-doctor-verification)
7. [Compliance & Legal Considerations](#7-compliance--legal-considerations)
8. [Risks & Limitations](#8-risks--limitations)
9. [Suggested Next Steps](#9-suggested-next-steps)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Executive Summary

India lacks a single, open, public REST API for doctor verification across all state medical councils. However, a **layered, hybrid verification strategy** is achievable and recommended for Curex24:

| Layer | Source | Coverage | Reliability |
|-------|--------|----------|-------------|
| **Primary** | ABDM / NMR (National Medical Register) | All registered allopathic doctors | High (government-mandated) |
| **Secondary** | Third-party APIs (Surepass, Decentro, IDfy) | NMC-registered doctors | High (backed by NMC records) |
| **Tertiary** | State Medical Council web portals | State-specific verification | Medium (varies per state) |
| **Fallback** | Manual document upload + admin review | Unverified / edge cases | Manual effort required |

**Key Finding:** As of 2024–2025, the NMC's **National Medical Register (NMR)** portal — launched in August 2024 under the Ayushman Bharat Digital Mission (ABDM) — is the authoritative single source of truth. Official programmatic access requires ABDM integration approval, but reputable third-party APIs (Surepass, Decentro, IDfy) provide the fastest path to production-ready verification.

---

## 2. National-Level Systems (NMC / ABDM)

### 2.1 National Medical Commission (NMC)

| Attribute | Details |
|-----------|---------|
| **Authority** | National Medical Commission (NMC), India |
| **Legal Basis** | NMC Act, 2019 (replaces MCI) |
| **Public Search Portal** | https://www.nmc.org.in/information-desk/indian-medical-register/ |
| **IMR (legacy data up to 2021)** | Available via NMC portal — static, not real-time |
| **Public API** | ❌ No open public REST API |
| **Institutional API** | ✅ Available through ABDM for approved health-tech entities |

### 2.2 National Medical Register (NMR) — ABDM

Launched August 2024. The NMR is now the **primary, live, authoritative** database.

| Attribute | Details |
|-----------|---------|
| **Portal** | https://nmr-nmc.abdm.gov.in/nmr/v3/search-doctor |
| **Managed by** | National Health Authority (NHA) + NMC |
| **Authentication method** | Aadhaar OTP-based for doctor self-enrollment |
| **Public search** | ✅ Yes — free name/registration number lookup |
| **Public API** | ❌ Not openly available |
| **Authorized API (sandbox)** | ✅ Available via ABDM Sandbox |
| **Coverage** | All allopathic (MBBS) doctors; mandatory enrollment phased in |
| **Update frequency** | Near real-time (verified by state councils) |

#### ABDM HPR Sandbox Integration

```
POST https://dev.abdm.gov.in/gateway/v0.5/sessions
Content-Type: application/json

{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "grantType": "client_credentials"
}
```

```
POST https://doctorsbx.abdm.gov.in/apis/v1/doctors/fetch-professional-info
Authorization: Bearer <accessToken>

{
  "practitioner": {
    "id": "71-xxxx-xxxx-7516",
    "registrationNumber": "MH-12345",
    "stateCouncilName": "Maharashtra Medical Council"
  }
}
```

- **Sandbox:** https://sandbox.abdm.gov.in — free developer account
- **Production access:** Requires ABDM certification review by NHA
- **Documentation:** https://sandboxcms.abdm.gov.in (fetch professional details PDF)

### 2.3 Third-Party NMC Verification APIs

These providers wrap NMC/ABDM data and offer production-ready APIs:

#### Surepass
- **Endpoint (example):** `POST https://in.staging.decentro.tech/v2/kyc/professional-verification/nmc`
- **Input:** `member_id`, `state_council`, `year_of_admission`, `consent: true`, `purpose`
- **Output:** Registration status, name, degree, university, year of passing, address, validity
- **Auth:** API key (client secret)
- **Pricing:** Contact sales (volume-based)
- **Website:** https://surepass.io/nmc-verification-api/

#### Decentro
- **Endpoint:** `POST https://in.staging.decentro.tech/v2/kyc/professional-verification/nmc`
- **Input:** `reference_id`, `consent`, `purpose`, `member_id`, `state_council`, `year_of_admission`
- **Output:** Full registration profile, DigiLocker-verified documents
- **Auth:** Client ID + Module secret (Bearer token)
- **Pricing:** Contact sales
- **Docs:** https://docs.decentro.tech/reference/kyc-and-onboarding-api-reference-identities-verification-services-professional-verification-nmc

#### IDfy (via RapidAPI)
- **Endpoint:** Available on https://rapidapi.com/idfy-idfy-default/api/mci-nmc-doctor-verification
- **Input:** Registration number, council name, year of registration
- **Output:** Membership status, qualifications, registration/expiry dates
- **Auth:** RapidAPI key
- **Pricing:**
  - Free: 40 requests/month
  - Pro: $29/month (900 requests)
  - Ultra: $99/month (4,000 requests)
  - Mega: $199/month (10,000 requests)
- **Accuracy:** 99.97% claimed
- **Website:** https://home.idfywp.com/doctor-verification/

---

## 3. State-Wise Comparison Table

> **Legend:** ✅ Available | ⚠️ Partial/Unclear | ❌ Not Available | 🔍 Manual Only

| # | State | Medical Council | Website | Web Search | Bulk Download | API | Ease of Integration | Notes |
|---|-------|----------------|---------|-----------|---------------|-----|-------------------|-------|
| 1 | Andhra Pradesh | AP Medical Council (APMC) | https://apmc.ap.gov.in | ✅ | ❌ | ❌ | Medium | Search at /medicalregister/ |
| 2 | Arunachal Pradesh | Arunachal Pradesh Medical Council | — | 🔍 | ❌ | ❌ | Hard | No public portal found; use NMR |
| 3 | Assam | Assam Medical Council | http://assammedicalcouncil.org | ⚠️ | ❌ | ❌ | Hard | Portal intermittent; use NMR |
| 4 | Bihar | Bihar Medical Council | https://biharmedicalcouncil.co.in | ⚠️ | ❌ | ❌ | Hard | Basic website; limited online search |
| 5 | Chhattisgarh | Chhattisgarh Medical Council | http://cgmedicalcouncil.org | ⚠️ | ❌ | ❌ | Hard | Limited digital presence |
| 6 | Goa | Goa Medical Council | https://www.goa.gov.in/goa-medical-council/ | 🔍 | ❌ | ❌ | Hard | Manual/contact-only; use NMR |
| 7 | Gujarat | Gujarat Medical Council | https://www.gmcgujarat.org | ⚠️ | ❌ | ❌ | Medium | Some online lookup; inconsistent |
| 8 | Haryana | Haryana Medical Council | https://haryanamedicalcouncil.com | ⚠️ | ❌ | ❌ | Hard | Basic portal |
| 9 | Himachal Pradesh | HP Medical Council | https://hpmc.gov.in | ⚠️ | ❌ | ❌ | Hard | Gov portal; limited search |
| 10 | Jharkhand | Jharkhand Medical Council | http://www.jharkhandmedicalcouncil.in | ⚠️ | ❌ | ❌ | Hard | No confirmed online verification |
| 11 | Karnataka | Karnataka Medical Council (KMC) | https://www.kmcindia.org | ✅ | ❌ | ❌ | Medium | Web search available; data shared with NMR |
| 12 | Kerala | Kerala Medical Council | https://www.keralamedicalcouncil.com | ✅ | ❌ | ❌ | Medium | Active portal with doctor search |
| 13 | Madhya Pradesh | MP Medical Council | https://www.mpmedicalcouncil.org | ✅ | ❌ | ❌ | Medium | Search at /search; relatively active |
| 14 | Maharashtra | Maharashtra Medical Council (MMC) | https://www.maharashtramedicalcouncil.in | ✅ | ❌ | ❌ | Medium | Search at /frmRmpList.aspx; well-maintained |
| 15 | Manipur | Manipur Medical Council | — | 🔍 | ❌ | ❌ | Hard | No reliable online portal; use NMR |
| 16 | Meghalaya | Meghalaya Medical Council | — | 🔍 | ❌ | ❌ | Hard | No reliable online portal |
| 17 | Mizoram | Mizoram Medical Council | — | 🔍 | ❌ | ❌ | Hard | No reliable online portal |
| 18 | Nagaland | Nagaland Medical Council | — | 🔍 | ❌ | ❌ | Hard | No reliable online portal |
| 19 | Odisha | Odisha Council of Medical Registration | http://odishamedicalcouncil.in | ⚠️ | ❌ | ❌ | Hard | Website active but limited search |
| 20 | Punjab | Punjab Medical Council | https://www.pmcethics.in/VerifyDoctors | ✅ | ❌ | ❌ | Medium | Direct verification URL available |
| 21 | Rajasthan | Rajasthan Medical Council (RMC) | https://rmc.rajasthan.gov.in | ✅ | ❌ | ❌ | Medium | Active portal with doctor search |
| 22 | Sikkim | Sikkim Medical Council | — | 🔍 | ❌ | ❌ | Hard | No reliable online portal |
| 23 | Tamil Nadu | Tamil Nadu Medical Council (TNMC) | https://www.tamilnadumedicalcouncil.org | ✅ | ❌ | ❌ | Medium | Active portal |
| 24 | Telangana | Telangana State Medical Council (TSMC) | https://tsmc.telangana.gov.in | ✅ | ❌ | ❌ | Medium | Gov portal with search |
| 25 | Tripura | Tripura State Medical Council | — | 🔍 | ❌ | ❌ | Hard | No reliable online portal |
| 26 | Uttar Pradesh | UP Medical Council | https://www.upmedicalcouncil.org | ✅ | ❌ | ❌ | Medium | Active portal |
| 27 | Uttarakhand | Uttarakhand Medical Council | — | ⚠️ | ❌ | ❌ | Hard | Limited digital presence |
| 28 | West Bengal | West Bengal Medical Council | https://wbmc.in | ✅ | ❌ | ❌ | Medium | Doctor search portal |
| 29 | Delhi (UT) | Delhi Medical Council (DMC) | https://delhimedicalcouncil.org | ✅ | ❌ | ❌ | Easy | Clean search at /home/regi_search |
| 30 | Jammu & Kashmir | J&K Medical Council | — | ⚠️ | ❌ | ❌ | Hard | Transitional post-UT status |
| 31 | Chandigarh (UT) | Uses Punjab Medical Council | https://www.pmcethics.in/VerifyDoctors | ✅ | ❌ | ❌ | Medium | Shared with Punjab |
| 32 | Dental Practitioners | Dental Council of India (DCI) | https://dciindia.gov.in/DentistDetails.aspx | ✅ | ❌ | ❌ | Easy | National-level for dentists |

> **Note:** No Indian state medical council currently exposes a documented public REST API. All state-level APIs, if they exist, are internal government systems. The NMR/ABDM ecosystem is the closest to a unified national API.

---

## 4. API Availability Summary

### 4.1 API Options at a Glance

| Provider | Type | Coverage | Auth | Production Ready | Cost Model |
|----------|------|----------|------|-----------------|------------|
| **ABDM / NMR** | Official government API | All NMR-enrolled doctors (MBBS) | OAuth2 / client credentials | Requires NHA certification | Free (gov) |
| **Surepass** | Third-party (uses NMC data) | NMC/state council records | API key | ✅ Yes | Contact sales |
| **Decentro** | Third-party (uses NMC + DigiLocker) | NMC records + docs | Client ID + Module secret | ✅ Yes | Contact sales |
| **IDfy (RapidAPI)** | Third-party (NMC data) | NMC records | RapidAPI key | ✅ Yes | $0–$199/month |
| **State portals** | Web scraping (unofficial) | State-specific | None (no auth) | ⚠️ Fragile | Engineering effort |
| **Manual review** | Human admin process | All doctors | N/A | ✅ (fallback) | Human cost |

### 4.2 Request/Response Format (Third-Party Example — IDfy/Surepass)

**Request:**
```json
POST /v1/doctor-verification
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "reference_id": "curex24-verify-<uuid>",
  "consent": true,
  "purpose": "Doctor onboarding verification for Curex24 healthcare platform",
  "member_id": "MH-12345",
  "state_council": "Maharashtra Medical Council",
  "year_of_admission": "2010"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "registration_number": "MH-12345",
    "name": "Dr. Jane Doe",
    "qualification": "MBBS, MD (General Medicine)",
    "university": "University of Mumbai",
    "year_of_passing": "2016",
    "state_medical_council": "Maharashtra Medical Council",
    "registration_date": "2017-03-15",
    "validity": "Permanent",
    "registration_status": "ACTIVE",
    "address": "Mumbai, Maharashtra"
  },
  "error": null
}
```

---

## 5. Integration Strategy

### 5.1 Unified Validation Approach

Use a **3-tier waterfall model**:

```
Tier 1 (Primary):    Third-party API (Surepass / Decentro / IDfy)
                     ↓ (if not found or API error)
Tier 2 (Secondary):  ABDM NMR public search portal scrape / manual lookup
                     ↓ (if still unverified)
Tier 3 (Fallback):   Admin manual review with document upload
```

### 5.2 Recommended Approach by Doctor Category

| Doctor Type | Primary Verification | Fallback |
|-------------|---------------------|---------|
| MBBS (Allopathic) | Third-party NMC API → ABDM NMR | Manual admin review |
| BDS (Dental) | DCI portal (dciindia.gov.in) | Manual admin review |
| AYUSH (BAMS, BUMS, BHMS) | Central Council of Indian Medicine (CCIM) API/portal | Manual admin review |
| PG Specialists (MD/MS) | NMC API (same registration number) | Manual admin review |
| Foreign-trained doctors | NMC foreign registration query | Manual via NMC office |

### 5.3 Caching Strategy

```
┌────────────────────────────────────────────┐
│  Verification Request (doctor onboarding)  │
└───────────────────┬────────────────────────┘
                    ↓
         Check local DB cache
         (TTL: 30 days for active; 7 days for pending)
                    ↓
      Cache HIT? → Return cached result
      Cache MISS? → Call verification API
                    ↓
         Store result in DB with timestamp
         Set next_verification_due date
```

**Cache fields to store in `ProviderLicense` table:**
- `licenseNumber` — registration number
- `status` — PENDING / APPROVED / REJECTED
- `verificationSource` — "NMC_API" / "ABDM_NMR" / "MANUAL"
- `verifiedAt` — timestamp
- `nextReverificationDue` — timestamp (e.g., 90 days)
- `rawApiResponse` — JSON blob (for audit trail)

### 5.4 Scraping vs API vs Manual Hybrid Model

| Method | Use When | Notes |
|--------|----------|-------|
| **Third-party API** | Doctor with NMC registration number | Fastest; production-ready; costs per call |
| **ABDM NMR search** | ABDM-enrolled doctor with NMR ID | Official; free; requires ABDM approval |
| **Web portal scraping** | State-only registrations without NMC mapping | Fragile; legal grey area; maintenance overhead |
| **Manual admin review** | Northeast states; AYUSH; foreign-trained | Required for ~10-15% of edge cases |

### 5.5 Rate Limiting Considerations

- **IDfy (RapidAPI):** 40–10,000 req/month by tier; implement client-side throttle
- **Surepass / Decentro:** Volume SLAs defined in contract; add exponential backoff
- **Recommended internal limit:** Max 3 verification attempts per doctor; block after rejection
- **Webhook pattern:** For async verifications, use callback webhook instead of polling

### 5.6 Error Handling Strategy

```typescript
enum VerificationError {
  DOCTOR_NOT_FOUND    = "DOCTOR_NOT_FOUND",    // not in NMC records
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS", // wrong reg. no / council combo
  COUNCIL_MISMATCH    = "COUNCIL_MISMATCH",    // reg no exists but wrong state
  API_UNAVAILABLE     = "API_UNAVAILABLE",     // provider outage
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED", // quota hit
  CONSENT_MISSING     = "CONSENT_MISSING",     // consent flag not true
  MANUAL_REVIEW       = "MANUAL_REVIEW",       // inconclusive; needs admin
}
```

**Handling flow:**
1. `DOCTOR_NOT_FOUND` → try alternate API provider → else flag for manual review
2. `API_UNAVAILABLE` → retry with exponential backoff (3 attempts) → fallback provider
3. `RATE_LIMIT_EXCEEDED` → queue for next batch window; notify admin
4. All others → log, set status `PENDING`, notify admin queue

### 5.7 Data Normalization

All API responses must be normalized into a standard internal schema before storage:

```typescript
interface DoctorVerificationResult {
  registrationNumber: string;
  fullName: string;
  qualifications: string[];       // ["MBBS", "MD"]
  stateCouncil: string;           // "Maharashtra Medical Council"
  registrationDate: string;       // ISO 8601
  validityType: "PERMANENT" | "TEMPORARY" | "EXPIRED";
  registrationStatus: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "UNKNOWN";
  verificationSource: "NMC_API" | "ABDM_NMR" | "STATE_PORTAL" | "MANUAL";
  verifiedAt: string;             // ISO 8601
  rawResponse: Record<string, unknown>; // full API response for audit
}
```

---

## 6. Recommended Architecture for Doctor Verification

### 6.1 System Design Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Curex24 API                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           DoctorVerificationService                       │  │
│  │                                                           │  │
│  │  1. Check VerificationCache (Redis / DB)                  │  │
│  │  2. If miss → VerificationGateway                        │  │
│  │     ├── Tier 1: NMCApiProvider (Surepass/Decentro/IDfy)  │  │
│  │     ├── Tier 2: ABDMNMRProvider (official; needs OAuth)  │  │
│  │     └── Tier 3: ManualReviewQueue (admin notification)   │  │
│  │  3. Normalize response → DoctorVerificationResult        │  │
│  │  4. Store result → ProviderLicense table                  │  │
│  │  5. Emit event → NotificationService (admin + doctor)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                        │                    │
          ▼                        ▼                    ▼
  ┌──────────────┐      ┌──────────────────┐   ┌─────────────────┐
  │ Surepass /   │      │ ABDM NMR Portal  │   │  Admin Panel    │
  │ Decentro /   │      │ (nmr-nmc.abdm.   │   │  Manual Review  │
  │ IDfy API     │      │  gov.in)         │   │  Queue          │
  └──────────────┘      └──────────────────┘   └─────────────────┘
```

### 6.2 Database Schema Additions (Prisma)

```prisma
// Extension to existing ProviderLicense model
model ProviderLicense {
  // ... existing fields ...
  
  verificationSource    String?   // "NMC_API" | "ABDM_NMR" | "STATE_PORTAL" | "MANUAL"
  verifiedAt            DateTime?
  nextReverificationDue DateTime?
  rawApiResponse        Json?     // Full API response for audit trail
  verificationAttempts  Int       @default(0)
  lastAttemptAt         DateTime?
}

// New audit log table
model DoctorVerificationLog {
  id                  String   @id @default(cuid())
  providerId          String
  provider            Provider @relation(fields: [providerId], references: [id])
  registrationNumber  String
  stateCouncil        String
  verificationSource  String
  status              String   // SUCCESS | FAILED | PENDING
  rawRequest          Json
  rawResponse         Json?
  errorCode           String?
  createdAt           DateTime @default(now())
  
  @@map("doctor_verification_logs")
}
```

### 6.3 API Endpoint Design

```
POST   /api/v1/admin/providers/:id/verify-license
GET    /api/v1/admin/providers/:id/verification-status
POST   /api/v1/providers/onboarding/submit-license    (doctor self-submit)
GET    /api/v1/providers/onboarding/verification-status (doctor poll)
```

### 6.4 Onboarding Verification Flow (Doctor)

```
Doctor submits:
  - Registration number
  - State medical council (dropdown)
  - Year of admission
  - Document upload (certificate scan)
  - Consent checkbox ("I consent to credential verification")
          ↓
  Curex24 API calls Tier-1 NMC API (async)
          ↓
  Result in < 5 seconds typically
          ↓
  ┌─────────────┬──────────────────────┬────────────────────────┐
  │  VERIFIED   │     NOT FOUND        │    API ERROR           │
  │  ↓          │     ↓                │    ↓                   │
  │  Auto-      │  Escalate to         │  Retry → Manual queue  │
  │  approve    │  manual review       │                        │
  └─────────────┴──────────────────────┴────────────────────────┘
```

### 6.5 Re-verification Schedule

| Scenario | Re-verification Trigger |
|----------|------------------------|
| Initial onboarding | Immediate (blocking) |
| Routine re-check | Every 90 days (background job) |
| License nearing expiry | 30 days before `nextReverificationDue` |
| Admin manual trigger | On-demand via admin panel |
| Doctor updates registration | Immediate |

---

## 7. Compliance & Legal Considerations

### 7.1 Legality of Scraping Government Sites

| Aspect | Status | Recommendation |
|--------|--------|---------------|
| **IT Act, 2000 — Section 43** | Prohibits unauthorized computer access | Always use official APIs or explicit authorization |
| **DPDPA, 2023 — Section 3(c)(ii)** | Exempts publicly-available data from privacy rules | Government doctor registers = public data; scraping *may* be permissible |
| **Copyright Act** | May apply to wholesale copying of database content | Scrape only necessary fields; no bulk dumps |
| **Website Terms of Service** | Most gov portals prohibit automated access | Review robots.txt + ToS before scraping; prefer APIs |
| **Best practice** | Use third-party APIs (Surepass/Decentro/IDfy) who have legal agreements with NMC/ABDM | Avoid direct scraping entirely |

### 7.2 Data Privacy Obligations

Under the **Digital Personal Data Protection Act, 2023 (DPDPA)**:

1. **Consent is mandatory** before collecting or processing doctor's personal data
   - During onboarding, include an explicit consent checkbox
   - Consent purpose must be specific (e.g., "to verify your medical registration for Curex24")

2. **Purpose limitation** — data collected for verification cannot be used for marketing or other purposes

3. **Data minimization** — store only what is required; do not retain raw API responses indefinitely
   - Recommended retention: raw API response 1 year for audit; anonymize after

4. **Data security** — store verification results in encrypted fields; use HTTPS for all API calls

5. **Right to erasure** — if a doctor deletes their account, verification logs must be handled per retention policy

### 7.3 Consent Requirements (Implementation)

```typescript
// Required in doctor onboarding flow
interface VerificationConsent {
  consentText: "I authorize Curex24 to verify my medical registration details 
                with the National Medical Commission and relevant state medical 
                councils for the purpose of platform onboarding.";
  consentTimestamp: DateTime;
  consentVersion: "1.0";      // version your consent text
  ipAddress: string;           // for audit trail
  deviceId: string;
}
```

### 7.4 Audit & Logging Requirements

All verification events must be logged with:
- Timestamp (UTC)
- Doctor user ID
- Registration number queried
- API provider used
- Request/response hash (not full PII — hash sensitive fields)
- Outcome (SUCCESS / FAILED / MANUAL)
- Admin action (if manually reviewed — who approved, when)

Logs must be retained for a minimum of **5 years** (recommended per medical regulatory norms) and stored in a tamper-evident format.

### 7.5 Risks in Relying on Third-Party Data

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Third-party API downtime | High | Multi-provider fallback |
| Stale/cached NMC data in third-party system | Medium | Cross-check with NMR portal; flag mismatches |
| API provider shuts down | Medium | Always maintain 2+ providers; retain raw responses |
| NMC data entry errors | Low-Medium | Allow doctor to dispute; manual review process |
| False positive verification | High | Admin review for high-risk flags; document verification |

---

## 8. Risks & Limitations

### 8.1 Data Coverage Gaps

- **NMR enrollment not yet 100% complete** (phased mandatory rollout as of 2024–2025)
  - Older registered doctors (pre-2010) may not appear in NMR
  - Use legacy NMC Indian Medical Register for cross-check

- **AYUSH doctors** (Ayurveda, Unani, Siddha, Homeopathy) are **NOT** in NMC/NMR
  - Use Central Council of Indian Medicine (CCIM) register: https://www.ccimindia.org
  - Use Central Council of Homeopathy (CCH) register: https://cchomeopathy.gov.in

- **Northeast states** (Arunachal, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura)
  - Very limited or no online verification portals
  - Manual verification may be the only option
  - These states have small doctor populations; NMR may have coverage

### 8.2 Technical Risks

- State council portals frequently go offline or change their HTML structure (if scraping)
- NMR portal is new (Aug 2024) and may have data quality issues during transition
- Third-party APIs have dependency on NMC data refresh cycles (usually daily)

### 8.3 Regulatory Risks

- ABDM production API access requires NHA certification, which may take weeks/months
- DPDPA enforcement guidelines are still evolving (rules finalized in Jan 2025)
- State councils may introduce their own verification requirements

---

## 9. Suggested Next Steps

### Phase 1 — Immediate (Week 1–2)
- [ ] Sign up for IDfy on RapidAPI (free tier available — start testing immediately)
- [ ] Request demo accounts from Surepass and Decentro
- [ ] Register a developer account on ABDM Sandbox: https://sandbox.abdm.gov.in
- [ ] Review doctor consent text with a legal advisor (DPDPA compliance)

### Phase 2 — Integration (Week 3–6)
- [ ] Implement `DoctorVerificationService` in `apps/api` (NestJS module)
- [ ] Add `DoctorVerificationLog` model to Prisma schema
- [ ] Extend `ProviderLicense` model with verification metadata fields
- [ ] Build admin manual review queue in admin panel
- [ ] Add doctor consent UI step in mobile onboarding flow

### Phase 3 — Production Hardening (Week 7–10)
- [ ] Apply for ABDM production certification (official NMR API access)
- [ ] Implement multi-provider fallback logic
- [ ] Set up background re-verification cron job (every 90 days)
- [ ] Implement audit log retention + anonymization pipeline
- [ ] Load test verification API (target: handle onboarding of 1,000 doctors/day)

### Phase 4 — Expansion (Week 11+)
- [ ] Add AYUSH doctor verification (CCIM/CCH portals)
- [ ] Add DCI verification for dental practitioners
- [ ] Implement document OCR for certificate validation as secondary check
- [ ] Explore NMC official data partnership for bulk verification access

---

## 10. Implementation Checklist

### ✅ Implemented
*(None yet — this is the research/planning phase)*

### 🔲 To Be Implemented

#### Backend (apps/api)
- [ ] `DoctorVerificationModule` — NestJS module
- [ ] `DoctorVerificationService` — orchestration logic
- [ ] `NMCApiProvider` — Surepass/Decentro/IDfy adapter
- [ ] `ABDMNMRProvider` — official ABDM HPR adapter
- [ ] `ManualReviewService` — admin queue management
- [ ] `VerificationCacheService` — Redis/DB caching layer
- [ ] `DoctorVerificationLog` — Prisma model + migration
- [ ] Extended `ProviderLicense` model fields + migration
- [ ] Background cron job for re-verification
- [ ] Audit log pipeline

#### Admin Panel (apps/admin)
- [ ] Manual review queue UI
- [ ] Verification history per doctor
- [ ] Bulk re-verification trigger

#### Mobile App (apps/mobile)
- [ ] Consent step in doctor onboarding flow
- [ ] License submission screen (reg number + council + year)
- [ ] Verification status screen (pending/approved/rejected)

#### Compliance
- [ ] Legal review of consent text (DPDPA)
- [ ] Privacy policy update to include verification data processing
- [ ] Data retention policy documentation
- [ ] ABDM integration certification application

---

## References

| Resource | URL |
|----------|-----|
| NMC Official | https://www.nmc.org.in |
| NMR Portal (ABDM) | https://nmr-nmc.abdm.gov.in/nmr/v3/search-doctor |
| ABDM Sandbox | https://sandbox.abdm.gov.in |
| ABDM HPR Fetch API Docs | https://sandboxcms.abdm.gov.in/uploads/2_Fetchhealthcareprofessionaldetailapi_sbx_60746e22_d269762583.pdf |
| Surepass NMC API | https://surepass.io/nmc-verification-api/ |
| Decentro NMC API | https://docs.decentro.tech/docs/kyc-and-onboarding-identities-verification-services-professional-verification |
| IDfy NMC API (RapidAPI) | https://rapidapi.com/idfy-idfy-default/api/mci-nmc-doctor-verification |
| DPDPA, 2023 | https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf |
| IT Act, 2000 | https://www.indiacode.nic.in/handle/123456789/1999 |
| CCIM (AYUSH) | https://www.ccimindia.org |
| DCI (Dental) | https://dciindia.gov.in/DentistDetails.aspx |
| Maharashtra Medical Council | https://www.maharashtramedicalcouncil.in/frmRmpList.aspx |
| Delhi Medical Council | https://delhimedicalcouncil.org/home/regi_search |
| Tamil Nadu Medical Council | https://www.tamilnadumedicalcouncil.org |

---

*Document version: 1.0 — April 2026 | Maintained by: Curex24 Engineering & Compliance Team*
