# Pharmacy Partner Integration Plan (Curex24)

**Platform:** Curex24 | **Document Type:** Execution-Ready Outreach & Integration Plan | **Audience:** Non-technical + Technical Team | **Status:** Active | **Last Updated:** 2026-04-18

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

## 3. Deep Dive per Partner

---

### 3.1 PharmEasy

#### 3.1.1 Company Overview

PharmEasy (API Holdings Ltd.) is India's largest e-pharmacy platform by GMV. It operates pan-India across 1,000+ cities, offering prescription medicines, OTC products, and diagnostics. PharmEasy has a dedicated B2B vertical (`pharmeasy.in/business`) and has integrated with multiple healthtech platforms, making it the most accessible partner for a startup like Curex24.

**Market position:** #1 e-pharmacy by volume in India, backed by major investors, publicly known B2B partnerships.

#### 3.1.2 Integration Possibility

- **API available:** Yes — private/partner-only. Not publicly documented but confirmed to exist through B2B program.
- **Type:** REST API (post-partnership). Deep-link redirect available as a no-API fallback.
- **Evidence:** `pharmeasy.in/business` B2B portal; published healthtech partnerships in industry press.

#### 3.1.3 Business Model

- Commission or revenue share per fulfilled order (estimated 5–15% to Curex24 — to be negotiated)
- PharmEasy handles: inventory, prescription validation, packaging, delivery, customer service for orders
- Curex24 handles: patient UI, consultation, prescription generation, API integration layer
- Customer relationship: Curex24 retains the patient; PharmEasy fulfils in the background

#### 3.1.4 Expected Requirements

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

#### 3.1.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| 4–8 week sales cycle | Medium | Normal for B2B; start immediately |
| Volume commitment requirement | Medium | Negotiate pilot terms with no minimum |
| API documentation quality | Low | Request full docs before signing |
| Prescription data compliance | High | Prepare DPDP compliance overview before integration |

**Startup barrier:** PharmEasy's B2B team expects some form of registered business entity. A startup in early stage can still make contact — honesty about stage builds trust faster than inflating claims.

---

### 3.2 Tata 1mg

#### 3.2.1 Company Overview

Tata 1mg is part of the Tata Health ecosystem and is India's most trusted health platform combining e-pharmacy, lab tests, and teleconsultation. It has strong brand equity in urban markets and a large certified user base. As a Tata Group company, it follows enterprise procurement and compliance processes.

**Market position:** Premium health brand; #1 in consumer trust for online pharmacy in urban India.

#### 3.2.2 Integration Possibility

- **API available:** Yes — private/enterprise only. Affiliate redirect program (`affiliate.1mg.com`) is publicly accessible but does not provide order API access.
- **Type:** Enterprise REST API (post-partnership). Affiliate deep-link as an interim fallback.
- **Evidence:** `1mg.com/partners` partner inquiry form; affiliate program confirmed at `affiliate.1mg.com`.

#### 3.2.3 Business Model

- Commission per fulfilled order (estimated 5–12% — to be negotiated)
- Tata Group enterprise deals may include quarterly volume commitments
- Lab test referral model is an additional revenue opportunity
- Tata 1mg handles: inventory, pharmacist validation, delivery, post-sale support
- Curex24 handles: patient journey, consultation, prescription

#### 3.2.4 Expected Requirements

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

#### 3.2.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| 8–12 week enterprise sales cycle | High | Start outreach in parallel with PharmEasy |
| Volume threshold requirements | High | Negotiate pilot/trial terms |
| Tata legal & procurement complexity | High | Engage legal counsel early |
| Longer NDA process | Medium | Allow extra time; plan accordingly |

**Startup barrier:** Tata 1mg's enterprise process can be slow for early-stage startups. The best strategy is to start outreach early and be transparent about stage — their BD team deals with many healthtech startups and understands the landscape.

---

### 3.3 Netmeds (Reliance Retail Health)

#### 3.3.1 Company Overview

Netmeds was acquired by Reliance Retail in 2020. It has strong Tier-2 and Tier-3 city penetration powered by Reliance's distribution network. However, it is operationally embedded in Reliance Retail, meaning partnership and procurement processes are slow and less startup-friendly than PharmEasy.

**Market position:** Tier-2/3 coverage strength; backed by India's largest retailer.

#### 3.3.2 Integration Possibility

- **API available:** ⚠️ Unknown — to be confirmed via direct outreach.
- **Type:** Likely affiliate/redirect-based publicly; enterprise REST API may exist for Reliance Retail B2B partners.
- **Evidence:** `netmeds.com/partner-with-us` partner inquiry form exists; no public API documentation found.

> **Requires direct confirmation via outreach.**

#### 3.3.3 Business Model

- Affiliate commission (1–5% for affiliate/redirect model)
- Enterprise partnership terms for API access (negotiated; likely lower margin due to Reliance pricing control)
- Reliance handles: inventory, fulfilment, delivery
- Curex24 handles: patient UI, consultation, referral

#### 3.3.4 Expected Requirements

**Legal:**
- Reliance Retail vendor onboarding documentation
- NDA + standard affiliate/partner agreement

**Technical:**
- If affiliate model: only URL/tracking link integration required
- If API: full enterprise technical scoping required

**Business:**
- Reliance Retail B2B team review (slow — 2–4 week response time expected)

#### 3.3.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| Slow Reliance enterprise procurement | High | Use as secondary/backup partner |
| API may not exist at accessible tier | High | Affiliate link is the realistic starting point |
| Lower commission rates | Medium | Less profitable than PharmEasy/Apollo |
| Weaker developer documentation | Medium | Build robust error handling in integration layer |

**Startup barrier:** Reliance Retail's process is not startup-friendly. Treat Netmeds as a Tier-2/3 coverage backup after primary partner is live.

---

### 3.4 Apollo Pharmacy

#### 3.4.1 Company Overview

Apollo Pharmacy is operated by Apollo Health & Lifestyle Ltd. (AHLL), part of Apollo Hospitals Group — India's most recognised healthcare brand. Apollo Pharmacy has 5,500+ physical stores plus an online platform. It is the most healthcare-aligned brand among the four partners, which makes partnership conversations more natural and faster with a healthcare platform like Curex24.

**Market position:** Healthcare brand leader; pan-India presence including hybrid online + offline delivery.

#### 3.4.2 Integration Possibility

- **API available:** Yes — private/partner only. No public developer portal.
- **Type:** Enterprise REST API (post-partnership). Physical store pickup is an additional unique integration opportunity.
- **Evidence:** `apollopharmacy.in` enterprise BD contacts; Apollo Health & Lifestyle partner programs.

#### 3.4.3 Business Model

- Commission per fulfilled order (estimated 5–12% — to be negotiated)
- Potential co-branding: "Fulfilled by Apollo Pharmacy" within Curex24
- Reverse referral opportunity: Apollo patients referred to Curex24 for consultations
- Apollo handles: inventory (online + offline stores), prescription validation, home delivery + store pickup
- Curex24 handles: patient UI, consultation, prescription

#### 3.4.4 Expected Requirements

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

#### 3.4.5 Challenges

| Challenge | Severity | Note |
|---|---|---|
| Enterprise compliance requirements | Medium | Prepare compliance brief early |
| Exclusivity clauses possible | Medium | Negotiate non-exclusive terms upfront |
| Co-branding conditions | Low | Evaluate before signing |
| 6–10 week sales cycle | Medium | Faster than Tata 1mg due to healthcare alignment |

**Startup barrier:** Lower than Tata 1mg. Apollo's healthcare DNA makes the Curex24 value proposition immediately clear. A well-prepared intro deck can accelerate the first meeting.

---

## 4. Outreach Strategy

### 4.1 Step-by-Step Outreach Plan

#### Step 1 — Identify Contact Points

**Official website contacts:**

| Partner | Contact Page | Partnership/Business Email |
|---|---|---|
| PharmEasy | pharmeasy.in/contact-us | business@pharmeasy.in |
| Tata 1mg | 1mg.com/partners | partnerships@1mg.com |
| Netmeds | netmeds.com/partner-with-us | support@netmeds.com (ask to route to B2B) |
| Apollo Pharmacy | apollopharmacy.in/contact-us | pharmacy@apollohospitals.com |

**LinkedIn search queries (copy and use exactly):**

| Provider | Search Query |
|---|---|
| PharmEasy | `"Business Development" "PharmEasy"` |
| PharmEasy | `"Partnerships" "PharmEasy"` |
| PharmEasy | `"API" "PharmEasy" "B2B"` |
| Tata 1mg | `"Business Development" "Tata 1mg"` |
| Tata 1mg | `"Partnership Manager" "1mg"` |
| Netmeds | `"Partnerships" "Netmeds"` |
| Apollo Pharmacy | `"Business Development" "Apollo Pharmacy"` |
| Apollo Pharmacy | `"Partnerships" "Apollo Health"` |

Target roles: Business Development Manager, Sr. BD Manager, Partnerships Manager, VP Partnerships, Head of Integrations.

Send **5–8 connection requests per company** across different seniority levels.

#### Step 2 — Prepare Outreach Assets

Before sending any email or LinkedIn message, make sure Curex24 has the following ready:

| Asset | Status | Action Required |
|---|---|---|
| Landing page or product URL | ✅ Exists | Include link in every outreach |
| 2–3 sentence product description | Must prepare | Write once, reuse everywhere |
| Use case description | Must prepare | "Patient consults doctor → receives prescription → orders medicine" |
| Company name + founder name | ✅ Known | Use in email signature |
| Contact email | See Section 9 | Use professional Gmail if no domain email |

#### Step 3 — Email Outreach

Send initial email to partnership/business email address. Use Template 1 (short) for first contact. See Section 5 for full templates.

#### Step 4 — LinkedIn Outreach

Send connection request with a personalised message on the same day as the email. See Section 6 for LinkedIn templates.

#### Step 5 — Phone Follow-Up

If no response after Day 7, call the company's main customer service or business number and ask to be routed to the Business Development or Partnerships team. Use the call script in Section 7.

---

## 5. Email Templates

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

## 6. LinkedIn Outreach Templates

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

## 7. Call Script

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

## 8. What to Do After a Response

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

## 9. Startup Limitation Handling

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

## 10. Outreach Tracking System

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

## 11. Execution Timeline

### Day 1 — Prepare

- [ ] Set up professional Gmail: `curex24.health@gmail.com` (or similar)
- [ ] Write your 2-sentence Curex24 description (use consistently everywhere)
- [ ] Identify landing page URL to include in emails
- [ ] Find contact emails for all four partners (see Section 4.1 table)
- [ ] Find 3–5 LinkedIn contacts per partner (use search queries in Section 4.1)
- [ ] Send LinkedIn connection requests to all identified contacts

### Day 2 — Send Initial Emails

- [ ] Send Template 1 (short) to `business@pharmeasy.in`
- [ ] Send Template 1 (short) to `partnerships@1mg.com`
- [ ] Send Template 1 (short) to `pharmacy@apollohospitals.com`
- [ ] Send Template 1 (short) to `support@netmeds.com` (route to B2B request)
- [ ] Log all emails sent in the tracking table (Section 10)

### Day 3–5 — Monitor & First Follow-Up

- [ ] Check for replies twice per day
- [ ] On Day 3: Send first follow-up email to any non-responders ("Just checking in on my email from [date]")
- [ ] Respond to any LinkedIn connection acceptances with the follow-up message (Section 6)
- [ ] Update tracking table

### Day 5 — LinkedIn Message (Even If Not Connected)

- [ ] Send LinkedIn InMail or follow-up DM to all confirmed connections
- [ ] For any partner with no response yet: try the secondary email or LinkedIn DM as a new entry point

### Day 7 — Phone Outreach Attempt

- [ ] Call the main business number for PharmEasy (priority)
- [ ] Call Tata 1mg business line
- [ ] Use the call script in Section 7
- [ ] Log outcomes in tracking table

### Day 10–14 — Second Follow-Up Wave

- [ ] Send final follow-up email ("Last attempt before I explore other channels")
- [ ] Try connecting with VP/Director level contacts on LinkedIn
- [ ] If still no response from any partner: seek warm introductions through investors, advisors, or healthtech network

### Week 2 — Calls and Discovery

- [ ] Conduct discovery calls with any responding partners
- [ ] Use call script + technical question list
- [ ] Request API documentation and sandbox access
- [ ] Compare responses using Case 1/2/3 playbook (Section 8)
- [ ] Begin NDA review process with the most responsive partner

### Week 3 — Decision and Next Steps

- [ ] Select primary integration partner based on response quality and API capability
- [ ] Begin commercial terms discussion
- [ ] Technical integration scoping call
- [ ] Update `docs/pharmacy-partner-integration.md` tracker with live status
- [ ] Communicate partner selection decision to engineering team

---

## 12. Final Strategy Recommendation

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

*This document is maintained by the Curex24 founding team. Update the tracking table in Section 10 daily. Move all confirmed partner details to `docs/pharmacy-partner-integration.md` as outreach progresses.*
