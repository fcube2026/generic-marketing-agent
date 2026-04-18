# Pharmacy Partner Integration Plan (Curex24)

**Platform:** Curex24 | **Document Type:** Execution-Ready Outreach & Integration Plan | **Audience:** Non-technical + Technical Team | **Status:** Active | **Last Updated:** 2026-04-18 (v2 — expanded with API Discovery, Contact Discovery, Onboarding Flows, Business Model Analysis)

---

## 1. Introduction

### Purpose of This Document

This document is a step-by-step execution guide for the Curex24 team to identify, contact, evaluate, and integrate with top e-pharmacy partners in India. It is written for team members who may not have prior experience with enterprise B2B partnerships and covers everything from finding the right contact to handling different partner responses.

### Goal

Secure a live pharmacy API integration partner for Curex24 so that patients who complete an online consultation can immediately order their prescribed medicines within the same app — without leaving the platform.

### The Aggregator Model (Brief Explanation)

Curex24 operates as a **healthcare aggregator platform**. Instead of stocking medicines or running its own pharmacy logistics, Curex24 connects to an established e-pharmacy partner's API. When a patient orders a medicine:

1. Curex24's backend sends the order request to the partner's API
2. The partner checks inventory, validates the prescription, packs, and ships
3. Curex24 shows real-time status to the patient via the partner's tracking API

This means Curex24 focuses on the patient experience and clinical layer, while the partner handles all pharmacy operations. The patient stays on Curex24; the fulfilment happens behind the scenes.

---

## 2. Partner Overview

| Partner | Website | API Availability | Ease of Integration | Business Model | Contact Channels | Priority |
|---|---|---|---|---|---|---|
| **PharmEasy** | pharmeasy.in | Private/Partner API (confirmed B2B program) | Medium | Aggregator / B2B partner | Email + LinkedIn + Partner form | 🔴 #1 HIGH |
| **Tata 1mg** | 1mg.com | Private/Enterprise API (confirmed partner program) | Hard | Enterprise / Affiliate fallback | Email + LinkedIn + Partner form | 🔴 #2 HIGH |
| **Netmeds** | netmeds.com | ⚠️ Needs Confirmation (affiliate program known) | Hard | Affiliate / Reliance Retail B2B | Email + Partner form | 🟡 #4 BACKUP |
| **Apollo Pharmacy** | apollopharmacy.in | Private/Partner API (Apollo enterprise BD) | Medium | Enterprise / Commission | Email + LinkedIn + Contact form | 🟡 #3 MEDIUM |

> **API Availability key:**
> - *Private/Partner API* = API exists but requires a signed partnership agreement to access
> - *Needs Confirmation* = no public evidence of a REST API; must ask directly via outreach

---

## 3. API Discovery

> **Rule:** Do NOT assume APIs exist — the tables below reflect publicly confirmed B2B programs as of April 2026. Verify status via direct outreach.

### 3.1 API Availability Summary

| Partner | Public API Docs? | Developer Portal? | Sandbox Available? | Confirmed Integration Type |
|---|---|---|---|---|
| **PharmEasy** | ❌ No public docs | ✅ B2B portal at `pharmeasy.in/business` | ⚠️ Post-agreement only | REST API (private, post-NDA) |
| **Tata 1mg** | ❌ No public docs | ✅ Partner form at `1mg.com/partners` | ⚠️ Post-agreement only | REST API (enterprise) + Affiliate fallback |
| **Apollo Pharmacy** | ❌ No public docs | ⚠️ BD contact via `apollopharmacy.in/contact-us` | ⚠️ Post-agreement only | REST API (private, post-NDA) |
| **Netmeds** | ❌ No public docs | ⚠️ Form at `netmeds.com/partner-with-us` | ❌ Unknown | Likely affiliate/redirect; API unconfirmed |

### 3.2 Technical Capabilities (per partner)

#### PharmEasy

| Capability | Availability | Notes |
|---|---|---|
| Medicine search API | ✅ Confirmed (post-agreement) | Catalog search by name, salt, category |
| Order creation API | ✅ Confirmed (post-agreement) | Supports prescription reference |
| Prescription upload | ✅ Confirmed | Image/PDF upload endpoint |
| Order tracking/status API | ✅ Confirmed | Webhook callbacks supported |
| Cancellation/refund API | ⚠️ To confirm | Ask explicitly during scoping call |

#### Tata 1mg

| Capability | Availability | Notes |
|---|---|---|
| Medicine search API | ✅ Confirmed (enterprise post-agreement) | Rich catalog including generics |
| Order creation API | ✅ Confirmed (enterprise post-agreement) | Requires prescription for Rx drugs |
| Prescription upload | ✅ Confirmed | Pharmacist verification included |
| Order tracking/status API | ✅ Confirmed | Real-time status via webhook |
| Lab test booking API | ✅ Bonus feature | Lab test orders possible (added revenue) |
| Cancellation/refund API | ⚠️ To confirm | Covered under enterprise agreement |

#### Apollo Pharmacy

| Capability | Availability | Notes |
|---|---|---|
| Medicine search API | ✅ Confirmed (post-agreement) | Online + store inventory search |
| Order creation API | ✅ Confirmed (post-agreement) | Home delivery + store pickup options |
| Prescription upload | ✅ Confirmed | Apollo pharmacist review |
| Order tracking/status API | ✅ Confirmed | Supports both delivery and pickup |
| Cancellation/refund API | ⚠️ To confirm | Ask during BD call |

#### Netmeds (Reliance)

| Capability | Availability | Notes |
|---|---|---|
| Medicine search API | ❌ Not confirmed | Affiliate redirect only until confirmed |
| Order creation API | ❌ Not confirmed | Must ask directly |
| Prescription upload | ❌ Not confirmed | Must ask directly |
| Order tracking/status API | ❌ Not confirmed | Affiliate model has no tracking |
| Affiliate deep-link | ✅ Available | Fallback option; low revenue share |

### 3.3 Integration Type Comparison

| Partner | API-Based | Affiliate/Deep Link | Manual Onboarding Only |
|---|---|---|---|
| PharmEasy | ✅ (post-NDA) | ⚠️ Fallback | ❌ |
| Tata 1mg | ✅ (enterprise, post-NDA) | ✅ Available now via `affiliate.1mg.com` | ❌ |
| Apollo Pharmacy | ✅ (post-NDA) | ❌ Not confirmed | ❌ |
| Netmeds | ⚠️ Unconfirmed | ✅ Available | ⚠️ Possible |

---

## 4. Contact Discovery

### 4.1 Official Contact Channels

| Partner | Partnership/BD Email | API/Integration Email | Contact Page |
|---|---|---|---|
| PharmEasy | business@pharmeasy.in | b2b@pharmeasy.in | pharmeasy.in/contact-us |
| Tata 1mg | partnerships@1mg.com | partner.tech@1mg.com | 1mg.com/partners |
| Apollo Pharmacy | pharmacy@apollohospitals.com | enterprise@apollopharmacy.in | apollopharmacy.in/contact-us |
| Netmeds | partner@netmeds.com | support@netmeds.com (ask to route to B2B) | netmeds.com/partner-with-us |

> **Note:** Email addresses above are the best publicly known contacts. Always confirm the right BD contact during your first exchange.

### 4.2 Phone Numbers

| Partner | Customer/Business Phone | Notes |
|---|---|---|
| PharmEasy | 1800-120-1808 (toll-free) | Ask for Business Development / B2B team |
| Tata 1mg | 0124-4166666 | Ask for Enterprise Partnerships; be prepared to wait |
| Apollo Pharmacy | 1860-500-0101 | Ask for Apollo Health & Lifestyle BD team |
| Netmeds | 044-61610000 | Ask for Partner Relations / B2B |

> **Calling tip:** Always call between 10:00–12:00 AM or 2:00–4:00 PM IST for best chance of reaching BD staff directly.

### 4.3 LinkedIn Search Queries (Copy-Paste Ready)

| Partner | LinkedIn Search Query | Target Role |
|---|---|---|
| PharmEasy | `"Business Development" "PharmEasy"` | BD Manager / Sr. BD Manager |
| PharmEasy | `"Partnerships Manager" "PharmEasy"` | Partnerships Manager |
| PharmEasy | `"VP Partnerships" "PharmEasy" OR "API Holdings"` | VP / Head of Partnerships |
| Tata 1mg | `"Business Development" "Tata 1mg"` | BD Manager |
| Tata 1mg | `"Partnership Manager" "1mg"` | Partnerships Manager |
| Tata 1mg | `"Head of Partnerships" "1mg" OR "Tata Digital Health"` | Head / VP Partnerships |
| Apollo Pharmacy | `"Business Development" "Apollo Pharmacy"` | BD Manager |
| Apollo Pharmacy | `"Partnerships" "Apollo Health" OR "AHLL"` | Apollo Health & Lifestyle BD |
| Netmeds | `"Partnerships" "Netmeds" OR "Reliance Retail Health"` | BD / Reliance Retail BD |

**Send 5–8 connection requests per company** across different seniority levels (Manager → VP → Head level).

---

## 5. Deep Dive per Partner

---

### 5.1 PharmEasy

#### 5.1.1 Company Overview

PharmEasy (API Holdings Ltd.) is India's largest e-pharmacy platform by GMV. It operates pan-India across 1,000+ cities, offering prescription medicines, OTC products, and diagnostics. PharmEasy has a dedicated B2B vertical (`pharmeasy.in/business`) and has integrated with multiple healthtech platforms, making it the most accessible partner for a startup like Curex24.

**Market position:** #1 e-pharmacy by volume in India, backed by major investors, publicly known B2B partnerships.

#### 5.1.2 Integration Possibility

- **API available:** Yes — private/partner-only. Not publicly documented but confirmed to exist through B2B program.
- **Type:** REST API (post-partnership). Deep-link redirect available as a no-API fallback.
- **Evidence:** `pharmeasy.in/business` B2B portal; published healthtech partnerships in industry press.

#### 5.1.3 Business Model

- Commission or revenue share per fulfilled order (estimated 5–15% to Curex24 — to be negotiated)
- PharmEasy handles: inventory, prescription validation, packaging, delivery, customer service for orders
- Curex24 handles: patient UI, consultation, prescription generation, API integration layer
- Customer relationship: Curex24 retains the patient; PharmEasy fulfils in the background

#### 5.1.4 Expected Requirements

**Legal:**
- NDA before any API or sandbox access is shared
- Partnership/integration agreement with SLA terms
- Prescription data handling compliance (DPDP Act 2023)

**Technical:**
- Valid API credentials from PharmEasy B2B team
- Prescription image/PDF upload endpoint integration
- Webhook receiver for real-time order status

**Business:**
- Company registration or GST number may be required (as a startup, a simple intro deck with your registered entity details is sufficient to start)
- Projected monthly order volume (provide a reasonable pilot estimate)

#### 5.1.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| 4–8 week sales cycle | Medium | Normal for B2B; start immediately |
| Volume commitment requirement | Medium | Negotiate pilot terms with no minimum |
| API documentation quality | Low | Request full docs before signing |
| Prescription data compliance | High | Prepare DPDP compliance overview before integration |

**Startup barrier:** PharmEasy's B2B team expects some form of registered business entity. A startup in early stage can still make contact — honesty about stage builds trust faster than inflating claims.

---

### 5.2 Tata 1mg

#### 5.2.1 Company Overview

Tata 1mg is part of the Tata Health ecosystem and is India's most trusted health platform combining e-pharmacy, lab tests, and teleconsultation. It has strong brand equity in urban markets and a large certified user base. As a Tata Group company, it follows enterprise procurement and compliance processes.

**Market position:** Premium health brand; #1 in consumer trust for online pharmacy in urban India.

#### 5.2.2 Integration Possibility

- **API available:** Yes — private/enterprise only. Affiliate redirect program (`affiliate.1mg.com`) is publicly accessible but does not provide order API access.
- **Type:** Enterprise REST API (post-partnership). Affiliate deep-link as an interim fallback.
- **Evidence:** `1mg.com/partners` partner inquiry form; affiliate program confirmed at `affiliate.1mg.com`.

#### 5.2.3 Business Model

- Commission per fulfilled order (estimated 5–12% — to be negotiated)
- Tata Group enterprise deals may include quarterly volume commitments
- Lab test referral model is an additional revenue opportunity
- Tata 1mg handles: inventory, pharmacist validation, delivery, post-sale support
- Curex24 handles: patient journey, consultation, prescription

#### 5.2.4 Expected Requirements

**Legal:**
- Full Tata enterprise NDA and procurement process
- Formal business registration documents required
- Data processing agreement (DPA) likely required

**Technical:**
- Full technical scoping call required before API access
- Prescription image upload support mandatory
- Webhook / callback endpoint required

**Business:**
- Volume commitment discussion (may require minimum monthly order projection)
- Executive-level sign-off likely required on both sides

#### 5.2.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| 8–12 week enterprise sales cycle | High | Start outreach in parallel with PharmEasy |
| Volume threshold requirements | High | Negotiate pilot/trial terms |
| Tata legal & procurement complexity | High | Engage legal counsel early |
| Longer NDA process | Medium | Allow extra time; plan accordingly |

**Startup barrier:** Tata 1mg's enterprise process can be slow for early-stage startups. The best strategy is to start outreach early and be transparent about stage — their BD team deals with many healthtech startups and understands the landscape.

---

### 5.3 Netmeds (Reliance Retail Health)

#### 5.3.1 Company Overview

Netmeds was acquired by Reliance Retail in 2020. It has strong Tier-2 and Tier-3 city penetration powered by Reliance's distribution network. However, it is operationally embedded in Reliance Retail, meaning partnership and procurement processes are slow and less startup-friendly than PharmEasy.

**Market position:** Tier-2/3 coverage strength; backed by India's largest retailer.

#### 5.3.2 Integration Possibility

- **API available:** ⚠️ Unknown — to be confirmed via direct outreach.
- **Type:** Likely affiliate/redirect-based publicly; enterprise REST API may exist for Reliance Retail B2B partners.
- **Evidence:** `netmeds.com/partner-with-us` partner inquiry form exists; no public API documentation found.

> **Requires direct confirmation via outreach.**

#### 5.3.3 Business Model

- Affiliate commission (1–5% for affiliate/redirect model)
- Enterprise partnership terms for API access (negotiated; likely lower margin due to Reliance pricing control)
- Reliance handles: inventory, fulfilment, delivery
- Curex24 handles: patient UI, consultation, referral

#### 5.3.4 Expected Requirements

**Legal:**
- Reliance Retail vendor onboarding documentation
- NDA + standard affiliate/partner agreement

**Technical:**
- If affiliate model: only URL/tracking link integration required
- If API: full enterprise technical scoping required

**Business:**
- Reliance Retail B2B team review (slow — 2–4 week response time expected)

#### 5.3.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| Slow Reliance enterprise procurement | High | Use as secondary/backup partner |
| API may not exist at accessible tier | High | Affiliate link is the realistic starting point |
| Lower commission rates | Medium | Less profitable than PharmEasy/Apollo |
| Weaker developer documentation | Medium | Build robust error handling in integration layer |

**Startup barrier:** Reliance Retail's process is not startup-friendly. Treat Netmeds as a Tier-2/3 coverage backup after primary partner is live.

---

### 5.4 Apollo Pharmacy

#### 5.4.1 Company Overview

Apollo Pharmacy is operated by Apollo Health & Lifestyle Ltd. (AHLL), part of Apollo Hospitals Group — India's most recognised healthcare brand. Apollo Pharmacy has 5,500+ physical stores plus an online platform. It is the most healthcare-aligned brand among the four partners, which makes partnership conversations more natural and faster with a healthcare platform like Curex24.

**Market position:** Healthcare brand leader; pan-India presence including hybrid online + offline delivery.

#### 5.4.2 Integration Possibility

- **API available:** Yes — private/partner only. No public developer portal.
- **Type:** Enterprise REST API (post-partnership). Physical store pickup is an additional unique integration opportunity.
- **Evidence:** `apollopharmacy.in` enterprise BD contacts; Apollo Health & Lifestyle partner programs.

#### 5.4.3 Business Model

- Commission per fulfilled order (estimated 5–12% — to be negotiated)
- Potential co-branding: "Fulfilled by Apollo Pharmacy" within Curex24
- Reverse referral opportunity: Apollo patients referred to Curex24 for consultations
- Apollo handles: inventory (online + offline stores), prescription validation, home delivery + store pickup
- Curex24 handles: patient UI, consultation, prescription

#### 5.4.4 Expected Requirements

**Legal:**
- NDA + Apollo Health & Lifestyle partnership agreement
- Data processing agreement for prescription data
- DPDP Act 2023 compliance documentation

**Technical:**
- REST API integration post-agreement
- Prescription upload endpoint
- Webhook for order tracking

**Business:**
- Curex24 product demo likely requested
- Healthcare platform credibility is an advantage here

#### 5.4.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| Enterprise compliance requirements | Medium | Prepare compliance brief early |
| Exclusivity clauses possible | Medium | Negotiate non-exclusive terms upfront |
| Co-branding conditions | Low | Evaluate before signing |
| 6–10 week sales cycle | Medium | Faster than Tata 1mg due to healthcare alignment |

**Startup barrier:** Lower than Tata 1mg. Apollo's healthcare DNA makes the Curex24 value proposition immediately clear. A well-prepared intro deck can accelerate the first meeting.

---

## 6. Outreach Strategy

### 6.1 Step-by-Step Outreach Plan

#### Step 1 — Identify Contact Points

See Section 4 (Contact Discovery) for complete contact details, phone numbers, and LinkedIn search queries.

#### Step 2 — Prepare Outreach Assets

Before sending any email or LinkedIn message, make sure Curex24 has the following ready:

| Asset | Status | Action Required |
|---|---|---|
| Landing page or product URL | ✅ Exists | Include link in every outreach |
| 2–3 sentence product description | Must prepare | Write once, reuse everywhere |
| Use case description | Must prepare | "Patient consults doctor → receives prescription → orders medicine" |
| Company name + founder name | ✅ Known | Use in email signature |
| Contact email | See Section 13 | Use professional Gmail if no domain email |

#### Step 3 — Email Outreach

Send initial email to partnership/business email address. Use Template 1 (short) for first contact. See Section 7 for full templates.

#### Step 4 — LinkedIn Outreach

Send connection request with a personalised message on the same day as the email. See Section 8 for LinkedIn templates.

#### Step 5 — Phone Follow-Up

If no response after Day 7, call the company's main customer service or business number and ask to be routed to the Business Development or Partnerships team. Use the call script in Section 9.

---

## 7. Email Templates

### Template 1 — Short API Inquiry (Use for First Contact)

> **Subject:** API Integration & Partnership Inquiry — Curex24 Healthcare Platform
>
> Hi [First Name / Team],
>
> My name is [Your Name] from **Curex24** — we're building a digital healthcare platform that connects patients with doctors for online consultations and helps them manage prescriptions and medicine ordering in one place.
>
> We're at the stage where we want to integrate a trusted e-pharmacy partner so our patients can order prescribed medicines directly within our app. We see [Partner Name] as a strong fit given your coverage and reputation.
>
> I have a few quick questions:
>
> 1. Does [Partner Name] offer an API for medicine search, order placement, and tracking for platform partners?
> 2. What is the process to explore an integration or B2B partnership?
> 3. Who is the right contact on your team for this?
>
> Happy to share more about our platform. Our product is live at: [your URL or landing page]
>
> Thank you for your time — I look forward to hearing from you.
>
> Best regards,
> [Your Name]
> Co-founder / [Title], Curex24
> [Email] | [Phone]
> [Website/Landing page URL]

---

### Template 2 — Detailed Partnership Proposal (Use After Initial Reply or for Senior Contacts)

> **Subject:** Partnership Proposal — Curex24 × [Partner Name] — Medicine Ordering Integration
>
> Dear [First Name],
>
> Thank you for connecting. I'm reaching out from **Curex24**, a digital healthcare startup focused on making quality healthcare accessible and continuous for patients across India.
>
> **About Curex24:**
> - Full-stack healthcare platform: online doctor consultations, diagnostics, and medicine ordering
> - We enable the complete care journey: consult → diagnose → prescribe → medicate
> - Our backend pharmacy module is built and ready to integrate with a partner's API
> - Currently in active development with pilot users; growing rapidly
>
> **Why We Want to Partner with [Partner Name]:**
> - [Partner Name]'s [coverage / catalog / brand / delivery network] is exactly what our patients need
> - We are looking for a primary pharmacy fulfilment partner — not a competitor
> - We handle consultations; [Partner Name] handles fulfilment — a clear, non-overlapping model
>
> **What We Are Asking:**
> 1. Do you provide a REST API for medicine search, order placement, and tracking for platform integrations?
> 2. If yes, what is the onboarding and partnership process?
> 3. Is a sandbox/test environment available during evaluation?
> 4. What are the commercial terms (commission model, volume requirements)?
>
> I'd welcome a 20-minute call at your convenience to explore this. Our platform is live at [URL].
>
> Thank you for considering this partnership. I genuinely believe there is strong mutual value here.
>
> Warm regards,
> [Your Name]
> Co-founder / [Title], Curex24
> [Email] | [Phone]
> [Website/Landing page URL]

---

### Template 3 — Follow-Up Email (Send on Day 3 if No Reply)

> **Subject:** Re: API Integration & Partnership Inquiry — Curex24 Healthcare Platform
>
> Hi [First Name / Team],
>
> I wanted to follow up on my email from [date — e.g., "Monday, 14 April"]. I completely understand you receive a high volume of enquiries; I just want to make sure this didn't get buried.
>
> To quickly recap: I'm [Your Name] from **Curex24**, a digital healthcare platform where patients consult doctors online and receive prescriptions. We're looking to integrate a trusted pharmacy partner so patients can order medicines within the same app — and [Partner Name] is our top choice.
>
> I'd be grateful for any of the following:
> - Confirmation that this reached the right person, or the name/email of who I should contact instead
> - A quick "yes/no" on whether [Partner Name] has a B2B API program for healthtech platforms
> - A time for a 15-minute call if you're open to exploring this
>
> Our product: [URL]
>
> Thank you for your time — I appreciate it.
>
> Best regards,
> [Your Name]
> Co-founder / [Title], Curex24
> [Email] | [Phone]
> [Website/Landing page URL]

---

### Template 4 — Final Escalation Email (Send on Day 10 if No Reply)

> **Subject:** Final Attempt — Curex24 × [Partner Name] Pharmacy API Partnership
>
> Hi [First Name / Team],
>
> I've sent a couple of messages about exploring a pharmacy API partnership between Curex24 and [Partner Name] — this is my final attempt before I explore other channels.
>
> I don't want to be persistent for persistence's sake. I'm reaching out one last time because I genuinely believe this is a strong mutual opportunity:
> - Curex24 brings a captive patient base at the point of prescription — the highest-intent moment to order medicines
> - [Partner Name] provides the fulfilment infrastructure we need
> - Zero overlap: we handle care; you handle fulfilment
>
> If [Partner Name] is not the right fit at this stage, I completely understand — and I'd truly appreciate a one-line reply to that effect so I can redirect my efforts.
>
> If there is interest, I'm ready to move forward immediately — NDA, scoping call, whatever the next step requires.
>
> Thank you sincerely for your time.
>
> Warm regards,
> [Your Name]
> Co-founder / [Title], Curex24
> [Email] | [Phone]
> [Website/Landing page URL]

---

## 8. LinkedIn Outreach Templates

### Connection Request Message (Under 300 characters — LinkedIn limit)

> Hi [Name], I'm building Curex24 — a healthcare platform connecting patients from consultation to prescription to medicine ordering. I'd love to connect and explore whether [Company] offers API integrations for healthtech partners. Thank you!

---

### Follow-Up Message (After Connection is Accepted)

> Hi [Name], thanks for connecting! I'm reaching out because Curex24 is looking for a pharmacy fulfilment partner. We have a live consultation platform and a built pharmacy integration module — we just need a partner with a real API and B2B program.
>
> I sent an email to [email@partner.com] but wanted to reach you directly too. Would you be the right person to discuss an API partnership, or could you point me to the right contact?
>
> Happy to share our product overview. Thank you!

---

## 9. Call Script

Use this script when calling the main customer or business number, or when connected directly to a BD team member.

---

**Opening (when speaking to receptionist or support):**

> "Hi, my name is [Name] and I'm calling from Curex24 — we're a healthcare technology startup. I'm looking to speak with someone from your Business Development or Partnerships team about a potential API integration. Could you help me connect with the right person, or give me their email address?"

---

**If connected to the right person:**

> "Hi [Name], thank you for taking my call. I'm [Your Name] from Curex24 — we're building a digital healthcare platform in India that enables patients to consult doctors online and then order prescribed medicines directly within the app.
>
> I'm reaching out because we're looking for a pharmacy API partner, and [Partner Name] is our top choice given your coverage and reputation.
>
> I have three quick questions — it will only take a couple of minutes:
>
> 1. Does [Partner Name] offer a REST API that platform partners can use for medicine search, order placement, and tracking?
> 2. If yes, what is the process to get started with a B2B partnership?
> 3. Who is the right contact on your team for API and technology integrations?
>
> I've also sent an email to [business@partner.com] — could you confirm if that's the right address, or give me the direct contact for your BD team?"

---

**Closing:**

> "That's really helpful — thank you. Could I send you a short email with our product overview? What's the best email address for that?
>
> I'll follow up by [day/date]. Thank you again for your time."

---

## 10. What to Do After a Response

### Case 1: "Yes, we have an API"

**Immediate next steps:**

1. **Reply within 24 hours** — thank them and express enthusiasm
2. Ask for: API documentation (Postman collection, Swagger/OpenAPI spec, or PDF)
3. Ask for: Sandbox / test environment access
4. Ask for: Authentication method details (API key, OAuth 2.0)
5. Ask for: List of available endpoints (search, order, track, cancel, prescription upload)
6. Ask for: Webhook/callback support for order status
7. Ask for: Commercial terms overview (commission %, volume requirements)
8. Schedule a technical scoping call

**What to verify using the API Verification Checklist (Section 5 of the strategy doc):**
- Authentication works in sandbox
- Search medicines endpoint returns real catalog data
- Order placement endpoint accepts prescription reference
- Order tracking endpoint returns live status

---

### Case 2: "Enterprise only / we need more information"

**Immediate next steps:**

1. Reply with a concise company overview (2 paragraphs max)
2. Attach or link to: Curex24 product landing page + short deck (1 page PDF if available)
3. Ask: What is the minimum business/volume requirement to qualify?
4. Ask: Can we start with a pilot or test program at lower volume?
5. Request a discovery call — offer 3 time slots
6. If they ask for formal documents: provide company registration, GST number, or incorporation certificate

---

### Case 3: "We don't offer APIs"

**Immediate next steps:**

1. Ask: "Do you have an affiliate or referral link program we can use as a starting point?"
2. Ask: "Is there a partner/B2B program for healthcare platforms specifically?"
3. If affiliate only: Evaluate whether a deep-link redirect integration meets minimum product requirements
4. If no program at all: Mark as "no integration path" and move focus to primary partners

---

## 11. Partnership Process Breakdown

### Step-by-Step Onboarding Flow (per Partner)

#### PharmEasy

| Step | Action | Who Acts | Expected Duration |
|---|---|---|---|
| 1. Initial Contact | Send email + LinkedIn DM | Curex24 | Day 1 |
| 2. First Response | Await BD team reply | PharmEasy BD | 3–7 business days |
| 3. Intro Call | 30-min discovery call | Both | Week 1–2 |
| 4. NDA Signing | Exchange and sign mutual NDA | Both (Legal) | 1–2 weeks |
| 5. Business Verification | Share GST, incorporation, intro deck | Curex24 | Week 3 |
| 6. API Documentation | Receive Postman collection / API spec | PharmEasy | Week 3–4 |
| 7. Sandbox Access | Credentials provisioned; begin testing | Both (Engineering) | Week 4–5 |
| 8. Testing Phase | Validate all endpoints; fix integration bugs | Curex24 Engineering | Week 5–7 |
| 9. Go-Live Review | Final compliance + security check | Both | Week 7–8 |
| 10. Production Go-Live | Switch to prod credentials; launch | Both | Week 8–10 |

**Expected Total Timeline:** 8–10 weeks from first email to first live patient order  
**Common Blockers:** NDA delays; missing GST/incorporation docs; webhook configuration issues  
**Approval Difficulty:** ⭐⭐⭐ Medium (most startup-friendly of the four partners)

---

#### Tata 1mg

| Step | Action | Who Acts | Expected Duration |
|---|---|---|---|
| 1. Initial Contact | Email to partnerships@1mg.com + LinkedIn | Curex24 | Day 1 |
| 2. First Response | Await enterprise BD reply | Tata 1mg BD | 5–10 business days |
| 3. Intro Call | Discovery + qualification call | Both | Week 2 |
| 4. Business Qualification | Submit company profile, deck, registration docs | Curex24 | Week 2–3 |
| 5. NDA + DPA Signing | Tata Group legal NDA + Data Processing Agreement | Both (Legal) | 2–4 weeks |
| 6. Technical Scoping | Deep dive on API requirements; integration design | Both (Engineering) | Week 4–5 |
| 7. API Documentation | Enterprise API docs received | Tata 1mg | Week 5–6 |
| 8. Sandbox Access | Test environment credentials provisioned | Tata 1mg | Week 6–7 |
| 9. Testing Phase | Full integration test including prescription flow | Curex24 Engineering | Week 7–9 |
| 10. Volume Commitment | Agree on pilot volume terms | Both (Business) | Week 8–9 |
| 11. Go-Live | Production credentials; launch | Both | Week 10–12 |

**Expected Total Timeline:** 10–14 weeks  
**Common Blockers:** Tata procurement approval chain; DPA negotiations; volume commitment standoff  
**Approval Difficulty:** ⭐⭐⭐⭐⭐ Very Hard (enterprise Tata process; requires patience and persistence)

---

#### Apollo Pharmacy

| Step | Action | Who Acts | Expected Duration |
|---|---|---|---|
| 1. Initial Contact | Email + LinkedIn to Apollo BD | Curex24 | Day 1 |
| 2. First Response | Await AHLL BD team reply | Apollo BD | 5–7 business days |
| 3. Intro Call | Discovery call; product demo likely requested | Both | Week 1–2 |
| 4. NDA Signing | Apollo Health & Lifestyle NDA | Both (Legal) | 1–2 weeks |
| 5. Business Verification | Incorporation doc + DPDP compliance brief | Curex24 | Week 3 |
| 6. API Documentation | Receive API spec | Apollo | Week 3–4 |
| 7. Sandbox Access | Test credentials provisioned | Apollo | Week 4–5 |
| 8. Testing Phase | Integration test including store-pickup flow | Curex24 Engineering | Week 5–7 |
| 9. Co-Branding Review | Optional: "Fulfilled by Apollo" branding discussion | Both (Business) | Week 6–7 |
| 10. Go-Live | Production launch | Both | Week 7–10 |

**Expected Total Timeline:** 8–10 weeks  
**Common Blockers:** Co-branding / exclusivity clause negotiations; DPDP compliance review  
**Approval Difficulty:** ⭐⭐⭐ Medium (healthcare brand alignment speeds up discussions)

---

#### Netmeds (Reliance)

| Step | Action | Who Acts | Expected Duration |
|---|---|---|---|
| 1. Initial Contact | Email to partner@netmeds.com | Curex24 | Day 1 |
| 2. First Response | Await Reliance Retail B2B reply | Netmeds / Reliance | 7–14 business days |
| 3. Confirm API Availability | Ask directly: "Do you have a partner API?" | Curex24 | On first call |
| 4. If Affiliate Only | Register at netmeds affiliate portal | Curex24 | Week 1–2 |
| 5. If API Exists | Follow enterprise onboarding (similar to 1mg) | Both | 10–14 weeks |
| 6. Affiliate Integration | Implement deep-link + tracking pixel | Curex24 Engineering | 1–2 days |
| 7. Go-Live (Affiliate) | Launch affiliate redirect for Tier-2/3 orders | Both | Week 2–3 |

**Expected Total Timeline:** 2–4 weeks (affiliate); 12–16 weeks (API if available)  
**Common Blockers:** Reliance procurement is slow; API may not exist at accessible tier  
**Approval Difficulty:** ⭐⭐⭐⭐ Hard (Reliance Retail bureaucracy; treat as backup)

---

## 12. Business Model Analysis

### Business Model Comparison Chart

| Factor | PharmEasy | Tata 1mg | Apollo Pharmacy | Netmeds |
|---|---|---|---|---|
| **Revenue Model** | Commission per order | Commission per order | Commission per order | Affiliate commission |
| **Estimated Margin to Curex24** | 5–15% per order | 5–12% per order | 5–12% per order | 1–5% per referral |
| **Pricing Control** | ❌ PharmEasy sets price | ❌ Tata 1mg sets price | ❌ Apollo sets price | ❌ Reliance sets price |
| **Delivery Responsibility** | PharmEasy | Tata 1mg | Apollo (home + store) | Netmeds / Reliance |
| **Refund Handling** | PharmEasy handles | Tata 1mg handles | Apollo handles | Netmeds handles |
| **Prescription Verification** | PharmEasy pharmacist | Tata 1mg pharmacist | Apollo pharmacist | Netmeds pharmacist |
| **Curex24 Role** | Order initiator + UI | Order initiator + UI | Order initiator + UI | Referral sender |
| **Lab Test Revenue?** | ❌ No | ✅ Yes (bonus) | ⚠️ Possible | ❌ No |
| **Startup Friendliness** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Go-Live Speed** | Fast (8–10 weeks) | Slow (10–14 weeks) | Medium (8–10 weeks) | Fast affiliate (2–4 weeks) |

### What Curex24 Makes Per Order (Illustrative)

| Order Value | PharmEasy 10% | Tata 1mg 8% | Apollo 8% | Netmeds 3% |
|---|---|---|---|---|
| ₹200 | ₹20 | ₹16 | ₹16 | ₹6 |
| ₹500 | ₹50 | ₹40 | ₹40 | ₹15 |
| ₹1,000 | ₹100 | ₹80 | ₹80 | ₹30 |
| ₹2,000 | ₹200 | ₹160 | ₹160 | ₹60 |

> These are illustrative estimates based on known industry ranges. Actual rates are negotiated in the partnership agreement.

### Key Business Takeaways

- Curex24 does **not control pricing** under any model — the partner sets medicine prices
- Curex24 **does not handle delivery or returns** — this is entirely the partner's responsibility
- Curex24's revenue comes from **commission/referral fees only**
- The more orders Curex24 sends, the higher the commission rate it can negotiate over time
- PharmEasy offers the best combination of **margin + speed + startup friendliness**
- Tata 1mg adds **lab test revenue** as a bonus stream once the partnership is live

---

## 13. Startup Limitation Handling

### Current Reality

Curex24 is currently an early-stage startup and may:
- Not yet have an official domain email (e.g., `@curex24.com`)
- Have limited brand presence or marketing materials
- Not be able to show high user volume or revenue figures

### Can We Still Reach Out?

**Yes, absolutely.** Indian healthtech BD teams receive outreach from startups at all stages. Being honest about your stage is better than overstating — experienced BD managers can tell the difference and appreciate transparency. Early-stage startups that are credible and serious are taken seriously.

### Using Gmail for Outreach

Using a Gmail address is acceptable at early stage, with two conditions:

1. **Create a professional Gmail address specifically for Curex24:**
   - ✅ `curex24.health@gmail.com`
   - ✅ `team@curex24.health` (if domain is available cheaply)
   - ❌ Avoid: `rahul123@gmail.com` or unrelated personal addresses

2. **Use a consistent, professional email signature every time:**

```
[Your Name]
Co-founder, Curex24
curex24.health@gmail.com | +91 XXXXX XXXXX
curex24.com (or your landing page URL)
```

### Minimum Credibility Package (Prepare Before Outreach)

| Item | Required? | Notes |
|---|---|---|
| Professional Gmail/email | ✅ Yes | Set up before Day 1 |
| Landing page URL | ✅ Yes | Already exists — include in every email |
| 2-sentence product description | ✅ Yes | Write once; keep consistent |
| Company name (registered or trade name) | ✅ Yes | Use consistently |
| Founder name and phone number | ✅ Yes | Include in signature |
| 1-page product PDF/deck | 🟡 Optional | Helps for follow-up; not required for first email |
| Company registration / GST | 🟡 Optional | Required only if partner requests it |

---

## 14. Outreach Tracking System

Update this table daily as outreach progresses.

| Partner | Email Sent | LinkedIn DMs Sent | Phone Call Made | Response Received | Response Type | Next Step | Follow-up Date |
|---|---|---|---|---|---|---|---|
| PharmEasy | ⬜ No | ⬜ 0/8 | ⬜ No | — | — | Send initial email | — |
| Tata 1mg | ⬜ No | ⬜ 0/8 | ⬜ No | — | — | Send initial email | — |
| Apollo Pharmacy | ⬜ No | ⬜ 0/5 | ⬜ No | — | — | Send initial email | — |
| Netmeds | ⬜ No | ⬜ 0/5 | ⬜ No | — | — | Send initial email | — |

**Update instructions:**
- Change `⬜ No` to `✅ Yes / [date]` when action is completed
- Fill "Response Type" with: API Yes / Enterprise Only / No API / No Response
- Fill "Next Step" with your immediate next action

---

## 15. Execution Timeline

### Day 1–2 — Research & Prepare

- [ ] Set up professional Gmail: `curex24.health@gmail.com` (or similar)
- [ ] Write your 2-sentence Curex24 description (use consistently everywhere)
- [ ] Confirm landing page URL to include in emails
- [ ] Verify contact emails for all four partners (see Section 4.1 table)
- [ ] Run LinkedIn search queries from Section 4.3 — find 5–8 contacts per partner
- [ ] Send LinkedIn connection requests to all identified contacts
- [ ] Prepare 1-page product PDF/deck (optional but helpful for follow-ups)

### Day 2 — Send Initial Emails

- [ ] Send Template 1 to `business@pharmeasy.in` and `b2b@pharmeasy.in`
- [ ] Send Template 1 to `partnerships@1mg.com`
- [ ] Send Template 1 to `pharmacy@apollohospitals.com`
- [ ] Send Template 1 to `partner@netmeds.com`
- [ ] Log all emails sent in the tracking table (Section 14)

### Day 3–5 — Monitor & First Follow-Up

- [ ] Check for replies twice per day (morning + evening)
- [ ] On Day 3: Send **Template 3 (follow-up)** to any non-responders
- [ ] Respond to any LinkedIn connection acceptances with the follow-up message (Section 8)
- [ ] Update tracking table

### Day 5 — LinkedIn Message (Even If Not Connected)

- [ ] Send LinkedIn InMail or follow-up DM to all confirmed connections
- [ ] For any partner with no response: try secondary email as new entry point

### Day 7 — Phone Outreach Attempt

- [ ] Call PharmEasy: 1800-120-1808 — ask for Business Development / B2B (priority)
- [ ] Call Tata 1mg: 0124-4166666 — ask for Enterprise Partnerships
- [ ] Use the call script in Section 9
- [ ] Log outcomes in tracking table

### Day 10–14 — Second Follow-Up Wave

- [ ] Send **Template 4 (final escalation)** to any non-responders
- [ ] Connect with VP/Director level contacts on LinkedIn
- [ ] If still no response from any partner: seek warm introductions through investors, advisors, or healthtech network

### Week 2 — Discovery Calls

- [ ] Conduct discovery calls with any responding partners
- [ ] Use call script + technical question list from Section 9
- [ ] Request API documentation and sandbox access
- [ ] Compare responses using Case 1/2/3 playbook (Section 10)
- [ ] Begin NDA review process with the most responsive partner

### Week 3+ — Integration Discussions

- [ ] Select primary integration partner based on response quality and API capability
- [ ] Begin commercial terms discussion
- [ ] Technical integration scoping call with engineering team
- [ ] Update `docs/pharmacy-partner-integration.md` tracker with live status
- [ ] Communicate partner selection decision to engineering team

---

## 16. Final Strategy Recommendation

### Start With: PharmEasy

**Why PharmEasy first:**

- Highest chance of a fast response from their established B2B team
- Curex24 already has a working `PharmEasyProvider` stub in the backend (`apps/api/src/modules/pharmacy/providers/pharmeasy.provider.ts`) — only real API credentials are needed to go live
- Largest geographic coverage ensures the most patients can be served from day one
- Most accessible partnership process among the four providers
- Fastest expected time from first contact to sandbox access (4–8 weeks)

### In Parallel: Tata 1mg

- Start Tata 1mg outreach on the same day as PharmEasy
- Tata 1mg's longer enterprise process means early outreach is essential
- Their brand trust and lab integration potential make them a high-value second partner
- Do not wait for PharmEasy to conclude before starting 1mg — run both in parallel

### Backup: Apollo Pharmacy

- Start outreach in Week 1 but deprioritise calls/follow-ups until Week 2
- Apollo's healthcare brand alignment makes partnership conversations more productive
- Valuable as a second active partner once primary is live (adds hybrid delivery and brand credibility)

### Last Priority: Netmeds

- Outreach on Day 2 with the same email template
- Treat as a Tier-2/3 geographic coverage supplement
- Do not invest significant time in Netmeds until primary and secondary are confirmed
- Affiliate/redirect model is a realistic short-term integration if API is unavailable

### Realistic Timeline to First Live Integration

| Milestone | Expected Timeframe |
|---|---|
| First response from PharmEasy | 3–7 business days |
| First discovery call | 1–2 weeks |
| NDA signed | 2–4 weeks |
| API documentation received | 3–6 weeks |
| Sandbox testing complete | 5–8 weeks |
| First live patient order | 8–12 weeks |

> **Start today.** The clock on the 8–12 week timeline starts from the first email sent. Every week of delay is a week before patients can order medicines through Curex24.

---

## Related Documents

| File | Purpose |
|---|---|
| `docs/pharmacy-partner-integration.md` | Live outreach tracker — update after every contact |
| `docs/pharmacy-partner-integration-strategy.md` | Senior strategy document with API verification checklist |
| `docs/pharmacy-legal-compliance-india.md` | Legal and regulatory requirements for pharmacy integration |
| `apps/api/src/modules/pharmacy/providers/pharmeasy.provider.ts` | PharmEasy provider stub (ready for real credentials) |
| `apps/api/src/modules/pharmacy/providers/pharmacy-partner.interface.ts` | Provider contract interface |

---

*This document is maintained by the Curex24 founding team. Update the tracking table in Section 14 daily. Move all confirmed partner details to `docs/pharmacy-partner-integration.md` as outreach progresses.*
