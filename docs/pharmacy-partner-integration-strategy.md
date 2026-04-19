# Pharmacy Partner Integration Strategy (Curex24)

**Platform:** Curex24 | **Document Type:** Strategy & Execution Guide | **Status:** Active | **Last Updated:** 2026-04-18

---

## 1. Introduction

### Purpose of This Document

This document provides a structured, execution-ready strategy for Curex24 to evaluate, contact, and integrate with top Indian e-pharmacy providers. It covers API availability assessment, outreach methodology, onboarding expectations, and a recommended execution timeline.

### Why E-Pharmacy Integration Is Critical

Curex24 is a full-stack healthcare platform offering online consultations, diagnostics, and prescription-based medicine delivery. The pharmacy module is already implemented in the backend with a production-ready `PharmacyPartnerProvider` interface and a `PharmEasyProvider` stub. Without a live pharmacy partner:

- Patients who complete a consultation cannot fulfil prescriptions through the platform
- The end-to-end healthcare journey (consult → diagnose → medicate) remains incomplete
- Revenue from medicine orders — a core monetisation stream — cannot be captured
- Competitive differentiation is weakened against integrated platforms (Practo, 1mg, Apollo 247)

### Business Goal

Enable patients to search, order, and track prescription and OTC medicines directly within Curex24 by connecting to one or more e-pharmacy provider APIs, with real inventory, real delivery logistics, and real prescription validation handled by the partner.

---

## 2. Target Partners Overview

| Partner | Priority | Business Strength | Integration Difficulty | Notes |
|---|---|---|---|---|
| **PharmEasy** | 🔴 HIGH | Largest pan-India catalog (1,000+ cities), strong B2B program, established API infrastructure | Medium (4–8 week sales cycle) | Backend stub already exists. Fastest path to go-live. |
| **Tata 1mg** | 🔴 HIGH | Premium brand, extensive lab + pharmacy vertical, large urban user base | Hard (8–12 weeks, Tata enterprise process) | Lab integration is a secondary benefit. Volume commitments likely required. |
| **Netmeds** | 🟡 MEDIUM | Reliance Retail backing, growing Tier-2/3 coverage | Hard (slow Reliance procurement, weaker API) | Affiliate model available as fallback before full API integration. |
| **Apollo Pharmacy** | 🟡 MEDIUM | Healthcare-native brand, hybrid online + 5,500+ offline stores, brand alignment with healthcare | Medium (Apollo understands the value prop quickly) | Physical pickup network is a differentiator. Apollo has enterprise BD process. |

---

## 3. Partner-Wise Deep Analysis

---

### 3.1 PharmEasy

#### 1. Business Overview

PharmEasy (API Holdings Ltd.) is India's largest e-pharmacy platform by GMV, operating across 1,000+ cities. It offers prescription medicines, OTC products, health diagnostics, and lab tests. PharmEasy has an established B2B vertical (`pharmeasy.in/business`) serving hospitals, clinics, and healthtech platforms. This makes it the most commercially accessible partner for Curex24.

**Why we want them:** Broadest geographic coverage, largest SKU catalog, most developed B2B partnership infrastructure, and Curex24 already has a working provider stub awaiting real credentials.

#### 2. API Availability Check

| Field | Status |
|---|---|
| **API Available?** | ✅ Yes — Private/Partner-Only |
| **Public Developer Portal?** | ❌ None found (`site:pharmeasy.in developer api` returns no docs) |
| **GitHub presence?** | No public API repos found |
| **B2B Partner Program?** | ✅ Confirmed — `pharmeasy.in/business` exists |
| **Evidence** | PharmEasy B2B page, BD team LinkedIn profiles referencing API integration, healthtech blog posts confirming partner API access post-agreement |
| **Conclusion** | API exists but is gated behind a signed B2B partnership agreement. **Requires direct outreach to confirm and obtain access.** |

> ⚠️ API endpoint details, authentication method, and sandbox availability — **to be confirmed via outreach.**

#### 3. Integration Model

Primary model: **REST API integration** after partnership agreement is signed.

- Curex24 backend calls PharmEasy API endpoints for catalog search, availability, order placement, and tracking
- PharmEasy handles fulfillment, delivery, and returns
- Prescription image/PDF transmitted by Curex24 to PharmEasy at order time
- Order status updates via polling or webhooks (to be confirmed)

Fallback model (if API delayed): **Deep link / redirect** — patient is redirected to PharmEasy app/web with pre-filled prescription data.

#### 4. Responsibilities

| Responsibility | PharmEasy | Curex24 |
|---|---|---|
| Medicine inventory & catalog | ✅ | ❌ |
| Prescription validation (pharmacist) | ✅ | ❌ |
| Order fulfillment & logistics | ✅ | ❌ |
| Customer support for delivery | ✅ | ❌ |
| API infrastructure | ✅ | ❌ |
| Patient-facing UI/UX | ❌ | ✅ |
| Consultation & prescription generation | ❌ | ✅ |
| Patient account & data | ❌ | ✅ |
| Integration layer (API calls) | ❌ | ✅ |

#### 5. Expected Business Model

- **Commission model:** PharmEasy earns gross margin on medicine sales; Curex24 earns a referral fee or revenue share per fulfilled order
- **Typical range:** 5–15% of order value to Curex24 (to be negotiated)
- **Customer ownership:** Curex24 retains the patient relationship; PharmEasy fulfills the order
- **Volume threshold:** Minimum monthly order volume may be required (to be confirmed)
- **Exact terms:** ⚠️ To be confirmed via outreach

#### 6. Onboarding Process (Expected)

1. Send initial partnership inquiry email to `business@pharmeasy.in`
2. PharmEasy BD team responds with partner questionnaire / NDA
3. Sign NDA
4. Business review: Curex24 presents platform, user base, and integration plan
5. Commercial terms negotiation (commission, SLAs, volume)
6. Sign Partnership Agreement
7. API credentials + sandbox access issued
8. Curex24 activates `PharmEasyProvider` with real credentials, runs sandbox tests
9. Joint go-live review
10. Production launch

**Estimated timeline:** 4–8 weeks from first contact to sandbox access.

#### 7. Risks / Challenges

| Risk | Severity | Mitigation |
|---|---|---|
| Long sales cycle | Medium | Start outreach immediately; follow up weekly |
| Volume commitment requirement | Medium | Present pilot plan with projected growth |
| API quality / documentation gaps | Low | Request sandbox + docs before signing |
| API changes post go-live | Low | Build provider layer to abstract changes |
| Prescription data compliance | High | Ensure DPDP Act 2023 compliance before integration |

---

### 3.2 Tata 1mg

#### 1. Business Overview

Tata 1mg is part of the Tata Health ecosystem and is India's most trusted health platform combining e-pharmacy, lab tests, teleconsultation, and health content. It carries strong brand equity, particularly in urban markets. 1mg's association with Tata Group means enterprise procurement processes apply.

**Why we want them:** Brand trust, extensive lab integration potential, and high conversion rates on prescription orders.

#### 2. API Availability Check

| Field | Status |
|---|---|
| **API Available?** | ✅ Yes — Private/Enterprise-Only |
| **Public Developer Portal?** | ❌ `developer.1mg.com` — no public API docs found |
| **Affiliate Program?** | ✅ `affiliate.1mg.com` — URL/redirect-based, not REST API |
| **B2B Partner Program?** | ✅ `1mg.com/partners` — enterprise inquiry form exists |
| **Conclusion** | REST API available but requires enterprise partnership. Affiliate redirect model available as interim fallback. **Requires direct outreach for API access.** |

> ⚠️ API details — **to be confirmed via outreach.**

#### 3. Integration Model

Primary: **Enterprise REST API** after commercial agreement.
Interim fallback: **Affiliate deep-link redirect** via `affiliate.1mg.com` program — no inventory/order API, patient redirected to 1mg app.

#### 4. Responsibilities

| Responsibility | Tata 1mg | Curex24 |
|---|---|---|
| Medicine inventory & catalog | ✅ | ❌ |
| Lab test catalog | ✅ | ❌ |
| Prescription validation | ✅ | ❌ |
| Delivery logistics | ✅ | ❌ |
| UI/UX for pharmacy flow | ❌ | ✅ |
| Consultation & diagnosis | ❌ | ✅ |
| API integration development | ❌ | ✅ |
| Patient data | ❌ | ✅ |

#### 5. Expected Business Model

- Commission per fulfilled order (range: 5–12%, to be negotiated)
- Tata Group enterprise deals may include quarterly volume commitments
- Lab test referral model may also apply (separate revenue stream)
- **Exact terms:** ⚠️ To be confirmed via outreach

#### 6. Onboarding Process (Expected)

1. Submit B2B inquiry at `1mg.com/partners` + email `partnerships@1mg.com`
2. 1mg BD team reviews application
3. Discovery call to assess platform fit and projected volume
4. NDA execution
5. Technical scoping call (API capabilities, prescription handling)
6. Commercial agreement
7. API credentials + sandbox
8. Integration development and testing
9. Go-live approval
10. Production launch

**Estimated timeline:** 8–12 weeks.

#### 7. Risks / Challenges

| Risk | Severity | Mitigation |
|---|---|---|
| Tata enterprise procurement pace | High | Start in parallel with PharmEasy; use as secondary partner |
| Volume threshold requirements | High | Negotiate pilot terms without minimum commitment |
| Longer legal/NDA process | Medium | Engage legal counsel early |
| API complexity | Medium | Request full API documentation before technical scoping |

---

### 3.3 Netmeds (Reliance Retail Health)

#### 1. Business Overview

Netmeds was acquired by Reliance Retail in 2020 and operates under the Reliance Digital Health umbrella. It has strong Tier-2 and Tier-3 city penetration given Reliance's distribution network. However, as an enterprise within Reliance Retail, API access and partnership processes are slower and less developer-friendly compared to PharmEasy or 1mg.

**Why we want them:** Pan-India reach including Tier-2/3 cities where other players have gaps.

#### 2. API Availability Check

| Field | Status |
|---|---|
| **API Available?** | ⚠️ Unknown — likely private/enterprise |
| **Developer Portal?** | ❌ None found |
| **Affiliate/Partner Program?** | ✅ `netmeds.com/partner-with-us` — partner inquiry form |
| **Conclusion** | Primarily affiliate/redirect-based program publicly visible. REST API for order placement likely exists for enterprise partners but no evidence found publicly. **Requires direct outreach to determine API availability.** |

> ⚠️ API availability — **to be confirmed via outreach.**

#### 3. Integration Model

Primary (if API available): **REST API after Reliance Retail B2B agreement.**
Likely interim: **Affiliate redirect** — patient directed to Netmeds app/web; no real-time inventory or order API.

#### 4. Responsibilities

| Responsibility | Netmeds | Curex24 |
|---|---|---|
| Medicine inventory | ✅ | ❌ |
| Prescription validation | ✅ | ❌ |
| Delivery logistics (Reliance network) | ✅ | ❌ |
| UI/UX | ❌ | ✅ |
| Consultation & prescription | ❌ | ✅ |
| Integration layer | ❌ | ✅ |

#### 5. Expected Business Model

- Affiliate commission: 1–5% per order (affiliate program)
- Enterprise API: negotiated commission (likely lower than PharmEasy due to Reliance pricing control)
- **Exact terms:** ⚠️ To be confirmed via outreach

#### 6. Onboarding Process (Expected)

1. Submit inquiry via `netmeds.com/partner-with-us`
2. Email `support@netmeds.com` requesting routing to partnerships/B2B team
3. Reliance Retail health team review (slow — 2–4 week response time expected)
4. Discovery call + presentation
5. Partnership terms + NDA
6. API/affiliate link setup
7. Testing
8. Go-live

**Estimated timeline:** 10–16 weeks (Reliance procurement is slower).

#### 7. Risks / Challenges

| Risk | Severity | Mitigation |
|---|---|---|
| Slow Reliance enterprise process | High | Start outreach early; use as Tier-2/3 fallback |
| API may not exist at the right tier | High | Negotiate affiliate first; escalate to API |
| Weaker API developer experience | Medium | Build robust error handling in provider layer |
| Regional delivery gaps | Low | Use as supplementary provider, not primary |

---

### 3.4 Apollo Pharmacy

#### 1. Business Overview

Apollo Pharmacy is operated by Apollo Health & Lifestyle Ltd. (AHLL), part of Apollo Hospitals Group — India's largest healthcare brand. Apollo Pharmacy has 5,500+ physical stores plus an online platform (`apollopharmacy.in`). It is the most healthcare-aligned brand among the four partners, making the value proposition of integrating with Curex24 (a healthcare platform) immediately understandable to their BD team.

**Why we want them:** Brand alignment, hybrid online + offline delivery, healthcare domain credibility, and faster BD conversations due to shared health context.

#### 2. API Availability Check

| Field | Status |
|---|---|
| **API Available?** | ✅ Yes — Private/Partner-Only |
| **Public Developer Portal?** | ❌ None found on `apollopharmacy.in` or `apollolife.com` |
| **B2B Partner Program?** | ✅ Apollo Health & Lifestyle has enterprise BD team |
| **Conclusion** | API exists for enterprise partners. No public self-serve access. Apollo's healthcare DNA makes partnership conversation more natural. **Requires direct outreach.** |

> ⚠️ API details — **to be confirmed via outreach.**

#### 3. Integration Model

Primary: **REST API integration** after Apollo AHLL partnership agreement.
Additional opportunity: **Apollo offline store pickup** — Curex24 orders can be routed to nearest Apollo store for patient pickup (unique to Apollo among these four partners).

#### 4. Responsibilities

| Responsibility | Apollo Pharmacy | Curex24 |
|---|---|---|
| Medicine inventory (online + 5,500 stores) | ✅ | ❌ |
| Prescription validation (licensed pharmacist) | ✅ | ❌ |
| Home delivery + store pickup | ✅ | ❌ |
| Brand & trust | ✅ | ✅ (shared) |
| UI/UX for ordering flow | ❌ | ✅ |
| Consultation & diagnosis | ❌ | ✅ |
| API integration layer | ❌ | ✅ |

#### 5. Expected Business Model

- Commission per fulfilled order (range: 5–12%)
- Possible co-branding: "Powered by Apollo Pharmacy" within Curex24 app
- Potential white-label integration for Apollo to offer Curex24 consultations to Apollo patients (reverse referral opportunity)
- **Exact terms:** ⚠️ To be confirmed via outreach

#### 6. Onboarding Process (Expected)

1. Contact Apollo Business Development via `pharmacy@apollohospitals.com` or corporate contact form
2. Prepare Curex24 platform deck + integration brief
3. Discovery call with Apollo BD team
4. NDA
5. Commercial terms (commission, co-branding if applicable)
6. Technical integration scoping
7. API credentials + sandbox
8. Development and testing
9. Go-live review
10. Production launch

**Estimated timeline:** 6–10 weeks.

#### 7. Risks / Challenges

| Risk | Severity | Mitigation |
|---|---|---|
| Apollo may want exclusivity clauses | Medium | Negotiate non-exclusive integration terms upfront |
| Apollo enterprise compliance requirements | Medium | Prepare DPDP Act compliance documentation |
| Co-branding conditions | Low | Evaluate branding requirements before signing |
| Geographic coverage gaps (online) | Low | Offline network compensates; flag as strength |

---

## 4. Outreach Strategy

### 4.1 Contact Discovery Process

**Step 1 — Official website**

| Provider | Contact Page | Partnership Email |
|---|---|---|
| PharmEasy | `pharmeasy.in/contact-us` | `business@pharmeasy.in` |
| Tata 1mg | `1mg.com/partners` | `partnerships@1mg.com` |
| Netmeds | `netmeds.com/partner-with-us` | `support@netmeds.com` (route to B2B) |
| Apollo Pharmacy | `apollopharmacy.in/contact-us` | `pharmacy@apollohospitals.com` |

**Step 2 — LinkedIn search (exact queries)**

Use these search strings on LinkedIn People Search:

| Provider | LinkedIn Search Query |
|---|---|
| PharmEasy | `"Business Development" "PharmEasy"` |
| PharmEasy | `"Partnerships" "PharmEasy"` |
| PharmEasy | `"Product Manager" "PharmEasy" "B2B"` |
| Tata 1mg | `"Business Development" "Tata 1mg"` |
| Tata 1mg | `"Partnership Manager" "1mg"` |
| Netmeds | `"Partnerships" "Netmeds"` |
| Netmeds | `"Business Development" "Reliance Retail" "health"` |
| Apollo Pharmacy | `"Business Development" "Apollo Pharmacy"` |
| Apollo Pharmacy | `"Partnerships" "Apollo Health"` |

**Profiles to target per company:** BD Manager, Sr. BD Manager, Partnerships Manager, VP Partnerships, Product Manager (B2B), Head of Integrations.

**Messages to send per company:** 5–8 LinkedIn DMs (different seniority levels to maximise response probability).

**Step 3 — Email pattern validation**

Common enterprise email patterns for Indian healthcare companies:

- `firstname@pharmeasy.in`
- `firstname.lastname@pharmeasy.in`
- `firstname@1mg.com`
- Validate guessed patterns free at `https://hunter.io` or `https://emailhippo.com`

---

### 4.2 Email Outreach Template

Use the following template for all four providers. Replace `[PARTNER]` with the specific company name.

---

**Subject:** API Integration & Partnership Inquiry — Curex24 Healthcare Platform

**Body:**

> Dear [Partner] Business Development Team,
>
> My name is [Your Name], and I am reaching out on behalf of **Curex24** — a digital healthcare platform that enables patients to book doctor consultations, run diagnostics, and manage their health journey end-to-end.
>
> We have built a production-ready pharmacy integration module that is designed to connect with leading e-pharmacy providers via API. We are evaluating [Partner] as our preferred pharmacy partner due to your [catalog breadth / brand strength / geographic coverage], and we believe there is a strong mutual value proposition here.
>
> **About Curex24:**
> - Full-stack healthcare platform (consultation + diagnostics + pharmacy)
> - Live platform with active development and pilot users
> - Backend pharmacy module is built and ready for real API credentials
> - We are in active growth phase and expect to drive consistent order volume to our pharmacy partner
>
> **What We Are Asking:**
> 1. Do you offer an API for medicine search, order placement, and order tracking for platform partners?
> 2. What is your onboarding process for API partnerships?
> 3. Is a sandbox/test environment available?
> 4. Who is the right person on your team to discuss a commercial and technical partnership?
>
> We would welcome a 20-minute introductory call at your convenience to explore this partnership.
>
> Please feel free to reach me directly at [your email] or [phone number].
>
> Thank you for your time. We look forward to hearing from you.
>
> Best regards,
> [Your Name]
> [Title] — Curex24
> [Website] | [Phone]

---

### 4.3 Call Script

Use this script when calling the main business/support number and asking to be routed to the partnerships team.

---

**Introduction:**

> "Hi, my name is [Name] from Curex24. Curex24 is a digital healthcare platform — we offer doctor consultations, diagnostics, and pharmacy services. I'm reaching out to explore an API partnership with [Partner Name]. Could you help connect me with your Business Development or Partnerships team?"

**If connected to the right person:**

> "Thank you for taking my call. Curex24 has a live consultation and diagnostics platform. We've built a pharmacy module that's ready to connect with [Partner]'s API — we just need the commercial and technical partnership in place. I have two quick questions:
>
> 1. Does [Partner] provide a REST API for medicine search, order placement, and tracking to platform partners?
> 2. What's the process to start the partnership discussion?
>
> If you're not the right contact, could you share the email of the person who handles API or technology partnerships?"

**Closing:**

> "Could I send you a short email introduction about Curex24 so you have the context? What's the best email address for that?"

---

### 4.4 Follow-Up Strategy

| Day | Action |
|---|---|
| **Day 0** | Send initial email to official partnership/business email |
| **Day 0** | Send 3–5 LinkedIn connection requests to BD/Partnerships contacts |
| **Day 2** | Send first follow-up email: "Following up on my previous email — wanted to make sure it reached the right person." |
| **Day 3** | Send LinkedIn DM to any accepted connections |
| **Day 5** | Second follow-up email with one-line value prop |
| **Day 7** | Attempt phone call to main business line; ask to be routed to partnerships |
| **Day 10** | Final LinkedIn DM with call-to-action |
| **Day 14** | If no response — escalate to senior LinkedIn contacts (VP/Director level) |
| **Day 21** | Mark as "No response" in tracker; explore warm introduction via network |

---

## 5. API Verification Checklist

Once a provider responds and shares API documentation, verify the following before technical scoping:

**Authentication & Access**
- [ ] API documentation provided (PDF, portal, or Postman collection)
- [ ] Sandbox / test environment available
- [ ] Authentication method documented (API key / OAuth 2.0 / Bearer token)
- [ ] Rate limits documented

**Core Endpoints**
- [ ] Medicine search by name / SKU
- [ ] Medicine availability check by PIN code
- [ ] Prescription upload endpoint
- [ ] Order placement endpoint
- [ ] Order status / tracking endpoint
- [ ] Order cancellation endpoint

**Operational**
- [ ] Webhooks available for real-time order status updates
- [ ] Error codes and response formats documented
- [ ] SLA and uptime guarantees provided
- [ ] Data format confirmed (JSON / XML)

**Legal & Compliance**
- [ ] NDA template provided
- [ ] Partnership agreement template shared
- [ ] Data handling / prescription storage terms reviewed
- [ ] DPDP Act 2023 compliance confirmed

---

## 6. Comparison Summary (Business Decision)

| Factor | PharmEasy | Tata 1mg | Netmeds | Apollo Pharmacy |
|---|---|---|---|---|
| **API Availability** | ✅ Private/Partner | ✅ Private/Enterprise | ⚠️ Unknown/Affiliate | ✅ Private/Partner |
| **Sales Cycle** | 4–8 weeks | 8–12 weeks | 10–16 weeks | 6–10 weeks |
| **Ease of Integration** | ⭐⭐⭐⭐ (High) | ⭐⭐⭐ (Medium) | ⭐⭐ (Low) | ⭐⭐⭐⭐ (High) |
| **Geographic Coverage** | Pan-India | Urban-heavy | Tier-2/3 strong | Pan-India + offline |
| **Brand Alignment** | Good | Good | Moderate | Excellent |
| **Profitability** | ⭐⭐⭐⭐ (5–15%) | ⭐⭐⭐ (5–12%) | ⭐⭐ (1–5%) | ⭐⭐⭐⭐ (5–12%) |
| **Scalability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Code Stub Exists** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Lab Integration Potential** | ⚠️ Limited | ✅ Strong | ❌ None | ✅ Strong |
| **Overall Priority** | 🔴 #1 | 🔴 #2 | 🟡 #4 | 🟡 #3 |

> ⚠️ All commercial figures are estimates based on publicly known Indian healthtech industry norms. Exact terms **to be confirmed via outreach.**

---

## 7. Execution Plan

### Week 1 — Research & Outreach Launch

- [ ] Complete provider research using this document
- [ ] Set up outreach tracking sheet (see tracker in `docs/pharmacy-partner-integration.md`)
- [ ] Send partnership inquiry email to all four providers
- [ ] Send LinkedIn connection requests (5–8 per provider)
- [ ] Set up follow-up reminders in calendar

### Week 2 — Follow-Up & First Responses

- [ ] Send Day 2 follow-up emails
- [ ] Send LinkedIn DMs to accepted connections
- [ ] Attempt phone outreach (Day 7)
- [ ] Respond to any initial replies with detailed Curex24 intro + demo link
- [ ] Schedule introductory calls if invited

### Week 3 — Calls & Technical Discovery

- [ ] Conduct discovery calls with responding providers
- [ ] Use call script and question framework
- [ ] Request API documentation and sandbox access
- [ ] Evaluate API capability against verification checklist
- [ ] Begin NDA review if documentation received

### Week 4 — Decision & Next Steps

- [ ] Compare provider responses against comparison summary table
- [ ] Select primary integration partner (expected: PharmEasy or Apollo)
- [ ] Begin NDA + commercial terms negotiation
- [ ] Technical integration scoping call with chosen partner
- [ ] Update `docs/pharmacy-partner-integration.md` tracker with live status

### Post-Partnership (Once API Credentials Received)

- [ ] Activate `PharmEasyProvider` (or new provider) with real credentials
- [ ] Run all 5 provider interface methods against sandbox
- [ ] Implement prescription image upload to partner
- [ ] Add webhook receiver for order status updates
- [ ] Complete legal and compliance review
- [ ] Schedule joint go-live review with partner
- [ ] Remove `MockPharmacyProvider` fallback before production launch

---

## 8. Final Recommendation

### Recommended First Integration Partner: PharmEasy

**Business reasons:**
- Largest catalog and geographic coverage in India
- Most established B2B partnership program among the four providers
- Most accessible BD team (dedicated `pharmeasy.in/business` channel)
- Fastest expected onboarding timeline (4–8 weeks)

**Technical reasons:**
- `PharmEasyProvider` stub already exists at `apps/api/src/modules/pharmacy/providers/pharmeasy.provider.ts`
- All five provider interface methods are stubbed and ready — only real API credentials needed
- Activating PharmEasy requires setting `PHARMEASY_API_URL` + `PHARMEASY_API_KEY` environment variables; no structural code changes needed
- Fastest path from signed agreement to live orders

**Recommended Second Integration Partner: Apollo Pharmacy**

Apollo is the second-best option because:
- Healthcare-native brand — BD conversations are faster and more productive
- Hybrid online + offline delivery is a genuine differentiator for patients
- Co-branding potential strengthens Curex24's trust positioning
- Shorter sales cycle than Tata 1mg

**Summary Priority Order:**

| Rank | Provider | Reason |
|---|---|---|
| 1 | **PharmEasy** | Existing stub, fastest onboarding, largest coverage |
| 2 | **Apollo Pharmacy** | Healthcare brand alignment, hybrid delivery, faster BD |
| 3 | **Tata 1mg** | Strong brand + labs, but slower enterprise process |
| 4 | **Netmeds** | Tier-2/3 coverage, but weakest API and slowest process |

> **Immediate action:** Send the outreach email from Section 4.2 to `business@pharmeasy.in` today and begin LinkedIn outreach in parallel. The clock on the 4–8 week sales cycle starts from first contact.

---

## Related Documents

| File | Purpose |
|---|---|
| `docs/pharmacy-partner-integration.md` | Live outreach tracker — update daily |
| `docs/pharmacy-legal-compliance-india.md` | Regulatory and compliance requirements |
| `docs/feature-proposals/02-pharmacy-integration.md` | Full feature proposal |
| `apps/api/src/modules/pharmacy/providers/pharmacy-partner.interface.ts` | Provider contract |
| `apps/api/src/modules/pharmacy/providers/pharmeasy.provider.ts` | PharmEasy stub (ready for credentials) |
| `apps/api/src/modules/pharmacy/providers/mock-pharmacy.provider.ts` | Dev/test mock provider |

---

*This document is maintained by the Curex24 Business + Engineering team. Update Section 3 provider notes and the outreach tracker as real responses are received.*
