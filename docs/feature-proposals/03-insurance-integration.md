# Feature: Insurance Integration

## 1. Feature Overview

**Description:** Enable patients to link their health insurance policies, verify coverage, process cashless claims for consultations, and manage co-pay/reimbursement flows.

### Key Use Cases & User Flows

1. **Policy linking** → Patient enters policy number + insurer → System verifies via insurer API → Policy details stored & displayed
2. **Coverage check at booking** → Patient selects "Use Insurance" → System checks coverage for the service → Shows covered amount & co-pay
3. **Cashless claim flow** → Consultation completed → Pre-auth request sent to insurer → Claim processed → Patient pays only co-pay
4. **Reimbursement flow** → Patient pays full amount → Submits claim via app → Insurer processes reimbursement
5. **Claim tracking** → Patient views claim status → Gets notified on approval/rejection

---

## 2. Recommended Tools / Platforms / Partners

| Partner/Platform | Type | Pros | Cons | Integration Type | Indian Market |
|---|---|---|---|---|---|
| **ABHA (Ayushman Bharat Health Account)** | Govt Platform | National health ID, universal acceptance, free, ABDM integration | Slow adoption, complex API, frequent changes | REST API (ABDM Gateway) | ✅ Mandatory for govt schemes |
| **Medi Assist (Allianz Partners)** | TPA | Largest TPA in India, cashless network, robust API | Enterprise pricing, long onboarding | REST API | ✅ Excellent |
| **Vidal Health** | TPA | Good coverage, tech-forward, API-first | Smaller network than Medi Assist | REST API | ✅ Good |
| **Plum** | Insurtech | Modern API, self-serve, group health focus | B2B focus, not direct patient integration | REST API | ✅ Great for employer-tied policies |
| **Riskcovry** | Insurance Infrastructure | API-first, multi-insurer, embed insurance | Startup (growing), per-transaction pricing | REST API | ✅ Modern, developer-friendly |
| **Fedo.ai** | Health Underwriting | AI-based health risk assessment, pre-insurance screening | Niche use case | REST API | ✅ Indian company |
| **IRDAI Sandbox** | Regulatory | Official testing environment | Complex registration | REST API | ✅ Required for compliance testing |

**🏆 Recommended:** **Riskcovry (aggregation) + ABDM/ABHA (government) + Medi Assist (TPA)**

- Riskcovry for multi-insurer API aggregation
- ABDM integration for Ayushman Bharat compliance
- Medi Assist for cashless claim processing

### Documentation / Partner Links

- ABDM Developers: https://abdm.gov.in/abdm-developers
- Riskcovry Docs: https://docs.riskcovry.com
- Medi Assist: https://www.mediassist.in
- Plum: https://www.plumhq.com
- IRDAI Sandbox: https://www.irdai.gov.in

---

## 3. Tech Stack & Architecture

### Backend (NestJS API)

- New `InsuranceModule` with controller, service, providers
- `InsuranceVerificationService` for policy validation
- `ClaimsService` for claim lifecycle management
- `PreAuthService` for cashless pre-authorization
- Strategy pattern for multiple insurer/TPA integrations
- BullMQ jobs for claim status polling, policy renewal reminders
- Webhook endpoints for insurer claim status callbacks
- ABDM Gateway integration service

### Frontend (React Native)

- `InsurancePolicyScreen` – link/view policies
- `CoverageCheckScreen` – check coverage before booking
- `ClaimSubmissionScreen` – submit reimbursement claims
- `ClaimTrackingScreen` – track claim status
- Integration with `BookingConfirmScreen` (show insurance option, co-pay calculation)
- Integration with `PaymentScreen` (insurance-adjusted amounts)

### Database Changes

- New models: `InsurancePolicy`, `InsuranceClaim`, `InsuranceProvider`, `PreAuthRequest`
- New enum: `ClaimStatus` (INITIATED, PRE_AUTH_SENT, PRE_AUTH_APPROVED, PRE_AUTH_REJECTED, CLAIM_SUBMITTED, CLAIM_APPROVED, CLAIM_REJECTED, SETTLED, DISPUTED)
- Link `InsurancePolicy` to `PatientProfile`
- Link `InsuranceClaim` to `Booking` and `InsurancePolicy`

### Security

- Policy numbers and health data encrypted at rest (AES-256)
- ABDM consent framework for health data sharing
- Audit trail for all insurance-related actions
- Role-based access: only patient and admin can view insurance details

---

## 4. Implementation Plan

| Phase | Tasks | Effort | Priority |
|---|---|---|---|
| **Phase 1: MVP** | Schema, policy linking, basic coverage check, manual reimbursement flow | 4–5 weeks | P0 |
| **Phase 2: Cashless** | Pre-auth integration with TPA, cashless claim flow, co-pay calculation at booking | 4–5 weeks | P1 |
| **Phase 3: ABDM** | ABHA linking, ABDM gateway integration, health records sharing | 3–4 weeks | P1 |
| **Phase 4: Advanced** | Multi-insurer comparison, claim analytics, policy renewal reminders, dispute management | 3–4 weeks | P2 |

### Step-by-step (Phase 1 – MVP)

1. Define `InsurancePolicy`, `InsuranceClaim`, `InsuranceProvider`, `PreAuthRequest` Prisma models
2. Create `InsuranceModule` with strategy pattern in NestJS
3. Implement policy verification API (validate policy number with insurer)
4. Build policy linking flow in mobile app
5. Implement basic coverage check API (service type → covered/not covered)
6. Integrate coverage check into booking flow
7. Build reimbursement claim submission (patient uploads receipts)
8. Claim tracking screen with status updates
9. Admin dashboard: claim review queue, insurer management
10. Testing & UAT with insurer sandbox environments

### Testing Approach

- **Unit tests:** Policy verification, coverage calculation, claim state machine
- **Integration tests:** Full claim lifecycle with TPA sandbox
- **E2E:** Book with insurance → claim → settlement
- **Security testing:** Encryption verification, access control

---

## 5. Regulatory & Compliance

- **IRDAI Guidelines:** Insurance intermediary registration may be required; compliance with IRDAI regulations on digital insurance distribution
- **ABDM Compliance:** Mandatory for integration with government health schemes; ABHA ID linking
- **DPDP Act 2023:** Health insurance data is sensitive personal data; explicit consent required
- **IT Act 2000 (Section 43A):** Reasonable security practices for sensitive data
- **HIPAA (US expansion):** Insurance claim data is PHI; requires BAA with partners
- **Anti-fraud regulations:** KYC verification for claim submissions
- **Data retention:** Insurance records must be retained per IRDAI guidelines (minimum 8 years)

---

## 6. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Insurer API complexity/instability | High | Partner SLA agreements, retry queues, manual fallback |
| Claim rejection rates | High | Pre-check coverage before booking, clear eligibility display |
| Regulatory compliance burden | High | IRDAI-registered legal counsel, compliance officer |
| Fraud attempts | High | KYC verification, fraud detection ML model, manual audit |
| Long claim settlement cycles | Medium | Set clear expectations in UI, settlement tracking |
| ABDM integration complexity | Medium | Start with basic ABHA linking, iterate |

---

## 7. Timeline

- **MVP (Phase 1):** Weeks 1–5
- **Cashless (Phase 2):** Weeks 6–10
- **ABDM (Phase 3):** Weeks 11–14
- **Advanced (Phase 4):** Weeks 15–18
- **Total:** ~18 weeks for full feature
- **Phase 1 can start in parallel** with Pharmacy Phase 2

---

## Overall Roadmap (Cross-Feature)

```
Week:  1  2  3  4  5  6  7  8  9  10  11  12  13  14  15  16  17  18
Video: [====MVP=====][==Polish==][===Advanced===]
Pharm:    [======MVP=======][===Enhanced===][====Advanced====]
Insur:             [======MVP=======][====Cashless=====][===ABDM===][==Adv==]
```

### Summary Comparison

| Aspect | Video Consultation | Pharmacy Integration | Insurance Integration |
|---|---|---|---|
| **Complexity** | Medium | Medium-High | High |
| **Primary Partner** | 100ms | PharmEasy | Riskcovry + Medi Assist |
| **Key Risk** | Network quality | Prescription compliance | Regulatory complexity |
| **MVP Timeline** | 4 weeks | 5 weeks | 5 weeks |
| **Full Timeline** | 10 weeks | 13 weeks | 18 weeks |
| **Regulatory Burden** | Medium | High | Very High |
| **Revenue Impact** | High (new mode) | High (medicine revenue share) | Medium (reduces patient cost friction) |
