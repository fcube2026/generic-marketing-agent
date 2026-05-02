# Curex Clinic — Multi-tenant Healthcare CRM (Product & Build Plan)

> **Status:** Proposal — Step 1 foundation already merged (see [CRM foundation memory](#references)).
> **Tagline:** *Every patient remembered. Every follow-up automated. Every partner clinic empowered.*

---

## 1. What is a CRM, in plain English?

A CRM (Customer Relationship Management) is a system that **remembers every person** your business touches and **what happened with them over time**, so your team can:

1. **See** the full picture of one person on one screen.
2. **Do** the next right thing for them (call, message, follow-up).
3. **Measure** how relationships are going (active / at-risk / lost).

A normal CRM (Salesforce, HubSpot, Zoho) is built for *salespeople closing deals*. Their "person" is a Lead. Their "stage" is the sales funnel.

A **healthcare CRM** is different. The "person" is a Patient. The "stage" is the care journey. The "next action" isn't *"send a quote"* — it's *"diabetes panel due in 5 days."* The data is sensitive (PHI). And the goal isn't selling more — it's **continuity of care**.

---

## 2. What is Curex Clinic?

> **Curex Clinic = the healthcare CRM, built once inside curex24, designed from day one to be sold to other clinics as a SaaS product.**

Two products, one codebase:

| Product | Who uses it | What they pay for |
|---|---|---|
| **curex24 internal CRM** | curex24's own ops, doctors, support team | (free — it's our own ops tool) |
| **Curex Clinic SaaS** | Other clinics & hospitals (Apollo Tier-2, NRI clinics, diagnostics chains) | ₹/month per clinic, isolated tenant |

The trick: **multi-tenant from day 1**. curex24 is just *tenant #1*. Tenant #2 is the first paying clinic. Same code, same database, different `organizationId`.

Step 1 of this is already shipped: `Organization` + 5 CrmX tables (Contact / Activity / Segment / Note / Task), all carrying `organizationId`, behind the `CRM_ENABLED` feature flag, with `OrgScope` enforced on every service method.

---

## 3. The 4 quadrants — decoded into actual features

The pitch deck has 4 quadrants. Here is what each one *is* as software.

### Quadrant 1 — Contact 360 (Unified Patient Profile)

**What it shows:** One screen per patient with everything.

- Demographics: name, phone, age, city, languages, family members
- Medical: chronic conditions, allergies, current medications, last vitals
- History: every consultation, every prescription, every lab, every home visit
- Engagement: last contact, preferred channel (WA/SMS/call), risk tier
- Linked accounts: NRI sponsor, insurance, family head

**Where the data comes from:** It is a **read-projection** over existing tables (`User`, `PatientProfile`, `Booking`, `Prescription`, `PatientVerification`, etc.) plus the new `CrmContact`. We do **not** duplicate clinical content — we link to it.

**Why doctors love it:** "2-second context" before opening the call.

### Quadrant 2 — Recurring Patient Alerts (the real engine)

This is the part that is actually hard and actually valuable.

**Concept:** A **CarePlan** attached to a contact. A care plan says:
> "This diabetic patient needs HbA1c every 90 days, BP check every 30 days, doctor follow-up every 60 days."

The system runs a **scheduler** that:

1. Computes "next due date" for each task.
2. When due-soon (e.g., T-3 days), creates a `CrmTask` and sends an outreach message via WhatsApp/SMS.
3. Patient replies "Yes" → auto-books a sample collection or appointment.
4. After completion, the activity is logged and the next cycle starts.
5. If the patient ignores 2 nudges → escalates to a human ops queue ("Mrs. Sharma not responding — call her").

**New entities:**

- `CarePlanTemplate` — reusable rules (Diabetes-Standard, Hypertension-Standard, Post-Surgery-30day).
- `CarePlanInstance` — one assigned to a specific patient.
- `CarePlanItem` — individual recurring task with cadence & `next_due_at`.
- `OutreachMessage` — message sent + delivery status + reply.

**Why it matters:** This *is* "every patient remembered." Without this, the CRM is just a fancy database.

### Quadrant 3 — Activity Timeline

**What it is:** Append-only chronological log per contact. Already exists as `CrmActivity`.

**What writes to it:**

- Bookings module → `BOOKING_CREATED`, `BOOKING_COMPLETED`, `NO_SHOW`
- Prescriptions module → `PRESCRIPTION_ISSUED`
- Pharmacy → `MEDICATION_DELIVERED`, `REFILL_DUE`
- Patient KYC → `KYC_APPROVED`
- Outreach → `MESSAGE_SENT`, `MESSAGE_REPLIED`
- Manual: ops notes, calls, home-visit reports

**Each event is mostly metadata + foreign key** to the source record. PHI stays in source tables (HIPAA/DPDPA discipline).

**Why it matters:** Compliance audit, doctor continuity, and "what happened last time?" answers in 1 click.

### Quadrant 4 — Segments

**What it is:** Saved questions over the contact base. Already scaffolded as `CrmSegment`.

**Examples:**

- NRI Families: `customFields.familyType = NRI`
- Elderly Care: `age >= 65`
- Recurring Diagnostics: `carePlans.includes(DIABETES) OR carePlans.includes(HYPERTENSION)`
- Premium Subscribers: `subscriptionTier = PREMIUM`
- At-Risk: `lastActivityAt < now-60d AND lifecycleStage = ACTIVE`

**What you can do with a segment:**

1. View it as a list (ops dashboard)
2. Send a campaign (broadcast WA template)
3. Schedule a recurring nudge
4. Export (only for the org's own data; never cross-tenant)

**Implementation:** Whitelisted JSON DSL → compiled to Prisma `where`. Materialised to a table for big segments (Phase 2).

---

## 4. Multi-tenancy — the *single* most important architectural concept

Everything else is just CRUD. **This is the part you cannot get wrong**, because if you do, no clinic will ever buy it (data leaks = company over).

### The 4 building blocks

#### 1. `Organization` — the tenant

Every row of CRM data carries `organizationId`. Already exists. Today there is one row: `slug='curex24'`. Tomorrow: `slug='apollo-koramangala'`, `slug='nri-care-dubai'`, etc.

#### 2. `OrgContext` — "who are you logged in as?"

A request-scoped object built from the JWT. Contains:

- `userId`
- `organizationId`
- `roles` within that org (`ORG_ADMIN`, `DOCTOR`, `OPS`, `RECEPTIONIST`)

Set by a NestJS interceptor. Today: hard-coded to curex24 org. Phase 2: read from JWT claim or subdomain (`apollo.curexclinic.com`).

#### 3. `OrgScopedPrismaService` — the security wall

A Prisma Client Extension that **automatically injects `organizationId` into every query**. Service code physically cannot leak across tenants because it cannot even *write* a query that returns another org's row.

```
crmContact.findMany({ where: { lifecycleStage: 'ACTIVE' } })
// becomes →
crmContact.findMany({ where: { lifecycleStage: 'ACTIVE', organizationId: <ctx.orgId> } })
```

#### 4. CI cross-tenant test (the audit guarantee)

A test that creates 2 orgs with data, hits every CRM endpoint as org-A, asserts org-B's data is **never** in the response. Runs on every CI build. The day someone writes an unsafe query, this test goes red.

This is the difference between "we built multi-tenancy" and "we have a feature we can sell to a hospital."

### Tenancy isolation strategy: shared DB, row-level

- One Postgres DB.
- All tables carry `organizationId`.
- Optional Phase 3: schema-per-tenant for enterprise clinics with regulator demands. Same code, swap inside `OrgScopedPrismaService`.

### Per-tenant configurability

- `Organization.settings` (Json) — branding, default care plan templates, working hours, languages, channel credentials (their own Twilio/WA numbers).
- `Organization.plan` — `STARTER` / `PRO` / `ENTERPRISE` → feature flags & quotas (segments count, monthly outreach messages, users).
- `Organization.region` — data residency (India, UAE for NRI clinic).

---

## 5. How curex24 (the patient-facing app) uses Curex Clinic

> **curex24 is just the first user of Curex Clinic.** When a patient books a consult on the curex24 mobile app, the booking module **emits a domain event** that the CRM listens to and writes to the curex24-tenant timeline.

**Concrete touchpoints:**

| curex24 event | CRM reaction |
|---|---|
| New patient signup | Create `CrmContact` (`lifecycleStage=LEAD`) under org=`curex24` |
| First booking | Activity `BOOKING_CREATED`, `lifecycleStage → ONBOARDING` |
| Consultation completed | Activity `CONSULT_COMPLETED`. If chronic dx detected → suggest CarePlan |
| Doctor assigns CarePlan | `CarePlanInstance` created; scheduler computes due dates |
| Care reminder due | Outreach via existing WA/SMS/Push (no new channel infra) |
| Patient replies "yes" | Auto-create booking via existing booking API; activity `REFILL_BOOKED` |
| Pharmacy delivers refill | Activity `MEDICATION_DELIVERED` |
| 60 days no activity | `lifecycleStage → AT_RISK`; appears in Ops Inbox for retention |

**Inside curex24:**

- Doctor mobile app gets a new "Patient 360" tab on the consultation screen → reads from `GET /crm/contacts/:id` (scoped to curex24 org).
- Admin panel gets the `/crm` section → segments, outreach, care plans, ops inbox.
- Patient app stays unchanged. Patient sees friendlier follow-ups, doesn't know "CRM" exists.

**No mobile changes for tenants:** other clinics get the **web admin panel only**. Mobile is curex24-specific. Tenants embed our APIs into their own systems if they want.

---

## 6. How we sell the *same* CRM to another clinic

> A clinic ("Apollo Koramangala") buys Curex Clinic. Concretely, what happens?

1. **Onboarding** (self-serve or sales-led):
   - Sales creates `Organization` row: `slug=apollo-kor`, `plan=PRO`, `region=IN`, `branding={logo, colors}`.
   - First admin user invited via email → sets password → logs into `apollo-kor.curexclinic.com`.

2. **Setup wizard** (in admin panel):
   - Add their staff (doctors, ops, receptionists) → `User` rows with `organizationId=apollo-kor` and roles.
   - Choose default CarePlanTemplates (Diabetes-Standard etc.) — clone-from-library.
   - Connect channels: their own Twilio/WhatsApp Business number (or use ours metered).
   - Import existing patients via CSV → bulk-create `CrmContact`.

3. **Daily use:**
   - Receptionist creates new patient → CrmContact created.
   - Doctor sees Patient 360 in their browser, writes consultation, assigns care plan.
   - Scheduler runs nightly → reminders go out.
   - Ops opens "Inbox" → 12 patients didn't respond → calls them.

4. **Billing:**
   - Plan-based pricing (₹X/user/month + ₹Y per 1000 outreach msgs).
   - Tracked per `organizationId` from activity & user counts.
   - Stripe/Razorpay subscription per Organization.

5. **Data isolation guarantees** (shown to clinic during sales):
   - Every API response filtered by `organizationId`.
   - CI test proves no cross-tenant leak.
   - DPA + BAA signed.
   - Optional: dedicated DB schema for enterprise tier.

**What clinic does *not* see:**

- curex24's doctors, patients, ops.
- Other clinics' data.
- Any branding from curex24 (white-label option in PRO+).

---

## 7. Pricing tiers (so the multi-tenant work is grounded in revenue)

| Tier | Target | Limits | Features |
|---|---|---|---|
| **Free** | Solo doctor | 100 patients, 100 msgs/mo | Contact 360 + Timeline only |
| **Starter** ₹4.9k/mo | Single clinic | 2k patients, 5k msgs | + Segments + Care Plans |
| **Pro** ₹19.9k/mo | Multi-doctor clinic | 20k patients, 50k msgs | + White-label, custom fields, API access |
| **Enterprise** Custom | Hospital chain | Unlimited | + Schema isolation, SSO, dedicated CSM, SLA |

This drives feature flags: `org.plan === 'PRO'` gates white-label etc.

---

## 8. The complete build plan

### Phase 0 — Foundation ✅ (already done in Step 1)

- `Organization` model + singleton `curex24` seed
- `CrmContact`, `CrmActivity`, `CrmSegment`, `CrmNote`, `CrmTask` tables, all org-scoped
- `CrmService` with mandatory `OrgScope` on every method
- `CRM_ENABLED` feature flag (default off)

### Phase 1 — Tenant safety harness (do this BEFORE adding more features)

**Goal:** Prove the multi-tenant guarantee in CI before the surface area grows.

1. `OrgContextInterceptor` (request-scoped, sets `OrgScope` from JWT; today returns curex24).
2. `OrgScopedPrismaService` (Prisma Client Extension auto-injecting `organizationId` on all CrmX models — and any future tenant-scoped tables).
3. `OrgGuard` (no-op today, enforce-mode flag for Phase 5).
4. **Cross-tenant CI test** — seeds 2 orgs, calls every CRM endpoint as A, asserts no row from B leaks. This test must exist before *any* clinic-facing feature is shipped.
5. ADR `docs/adr/0XX-multi-tenant-by-default.md` so no one "simplifies away" `Organization`.

### Phase 2 — Contact 360 (Quadrant 1)

6. CRM event listeners on existing modules (booking, payment, prescription, KYC, pharmacy) → emit minimal-payload activities. Listener errors must not break the source write.
7. Backfill job: insert `CrmContact` for every existing curex24 user; replay last 12 months of bookings/prescriptions into `CrmActivity`. Idempotent on `(contactId, type, occurredAt, source)`.
8. `GET /crm/contacts` (paged list) and `GET /crm/contacts/:id` (full 360 view: contact + last 50 activities + active care plans + open tasks).
9. Admin web: `/crm/contacts` list & detail page. Doctor mobile: "Patient 360" tab in consultation view.
10. Nightly reconciliation: flag contacts where projection drifted from source.

### Phase 3 — Activity Timeline (Quadrant 3)

11. Append-only enforcement (Postgres trigger forbidding UPDATE/DELETE on `CrmActivity`).
12. Monthly partitioning of `CrmActivity` by `(organizationId, month)` from day 1 — so a busy clinic doesn't slow others.
13. Timeline UI: filterable by activity type & date range; deep-link to source records.
14. Manual activity creation (notes, call logs, home-visit reports) with `actorUserId`.

### Phase 4 — Segments (Quadrant 4)

15. Segment DSL (whitelisted JSON → Prisma `where`). Operators: `eq` / `in` / `lt` / `gt` / `contains` / `exists` / `between`, fields on `CrmContact` + linked counts (`bookings.count > 5`).
16. `CrmSegment` CRUD + execute endpoint (paginated).
17. Admin web: visual segment builder (select field → operator → value, AND/OR groups).
18. Saved system segments: At-Risk, New This Week, Chronic Patients, Premium Subscribers.

### Phase 5 — Recurring Patient Alerts (Quadrant 2 — the engine)

19. New tables: `CarePlanTemplate`, `CarePlanInstance`, `CarePlanItem` (with cadence + `next_due_at`), `OutreachMessage`.
20. Care plan assignment API + UI (doctor picks template during consultation).
21. **Scheduler worker** (BullMQ job, runs hourly): queries `CarePlanItem` where `next_due_at <= now + lead_time`, creates `CrmTask` and queues outreach.
22. Outreach orchestrator: takes a target (segment or contact), template, channel preference; fans out to existing `whatsapp` / `sms` / `push-notifications` modules. Writes `OutreachMessage` rows + activities.
23. Inbound webhook: WA/SMS reply → match to `OutreachMessage` → if "yes" → auto-create booking via existing booking API → activity logged → care plan item marked complete → next cycle scheduled.
24. Escalation: 2 ignored nudges → task → "Ops Inbox" segment → human follows up.

### Phase 6 — Ops Inbox & Lifecycle FSM

25. Lifecycle stages enum + transition rules: `LEAD → ONBOARDING → ACTIVE → AT_RISK → CHURNED → REACTIVATED`. Compute via daily job from activity recency + care plan compliance.
26. Ops Inbox: prioritised list of system segments (KYC stuck, no-show yesterday, care plan non-compliant, payout failures for doctors).
27. Click an inbox item → contact detail with the right action pre-drafted.

### Phase 7 — Multi-tenant productisation (turn it into a SaaS)

28. Add `organizationId` to `User` (today implicitly curex24); add `OrgRole` enum (`ORG_ADMIN` / `DOCTOR` / `OPS` / `RECEPTIONIST`).
29. JWT carries `org_id`; `OrgContextInterceptor` reads it; `OrgGuard` enforce-mode flipped on.
30. Subdomain routing middleware (`<slug>.curexclinic.com` → org).
31. Org admin panel: invite users, manage roles, branding (logo/colors), channel credentials, default templates.
32. Plan + quota service: feature flags & limits per `Organization.plan`. Block writes when over quota; show upgrade prompt.
33. Onboarding wizard: signup → create Organization → invite first users → import CSV → connect channels → done.
34. Billing integration: Stripe/Razorpay subscription per Organization; metering for outreach messages & active patients.

### Phase 8 — Enterprise readiness

35. CSV/JSON export per org (their own data only).
36. Hard-delete by organization (GDPR/DPDPA Article 17 — "delete tenant"). Cascade FKs already in place.
37. Per-org audit log of admin actions.
38. SSO/SAML for Enterprise tier.
39. Optional: schema-per-tenant switch in `OrgScopedPrismaService`.
40. SOC2-lite controls + DPA/BAA templates.

### Cross-cutting throughout

- **PHI boundary** — never copy clinical content into `CrmActivity.payload`; only metadata + FK. Encoded as a code review check.
- **Listener resilience** — listener failures write a `LISTENER_ERROR` activity instead of crashing source writes. Surfaced in UI so gaps are visible.
- **Feature flag** — `CRM_ENABLED` per org (already there). Each phase rolls out behind flags so curex24 internal users can pilot before tenants see it.
- **Cross-tenant CI test** runs every PR — your single most important guardrail.

---

## 9. Decisions needed before Phase 1 PR

1. **Scope:** Build CRM natively inside curex24 (no external Zoho/HubSpot anywhere).
2. **Multi-tenant from day 1:** keep `Organization` even though curex24 is the only tenant for ~6–12 months.
3. **PHI rule:** clinical content stays in source tables; `CrmActivity` only holds metadata + FK.
4. **Sequence:** ship phases in order (1 → 2 → 3 → 4 → 5 …). The temptation will be to jump to Quadrant 2 because it is the demo magic — but without Phase 1 (tenant harness) you cannot safely sell this to anyone.
5. **First sellable milestone:** Phases 1+2+3+4 = "Curex Clinic Starter" (Contact 360 + Timeline + Segments). Phase 5 = "Pro." Phase 7 = "actually a SaaS you can charge for."

---

## 10. Out of scope (deferred)

White-label mobile app, marketplace-of-clinics, per-clinic native apps, AI scribe, any non-CRM module changes beyond the ~1-line emit per source.

---

## References

- **CRM foundation memory:** Step 1 added `Organization` + 5 CrmX tables (CrmContact / Activity / Segment / Note / Task), all carrying `organizationId`. Singleton primary org `slug='curex24'` seeded by `OrganizationsService.ensurePrimaryOrganization` on bootstrap. `CrmService` requires `OrgScope` on every method (`assertScope` throws `BadRequestException` if missing). Feature flag `CRM_ENABLED` (default false) added to `FeatureFlagService`.
  - `packages/database/prisma/schema.prisma` — `Organization` + `CrmContact` / `Activity` / `Segment` / `Note` / `Task` models
  - `apps/api/src/modules/organizations/organizations.service.ts`
  - `apps/api/src/modules/crm/crm.service.ts`
  - `apps/api/src/common/feature-flags/feature-flags.service.ts`
- **Sibling proposals:**
  - [`01-video-consultation.md`](./01-video-consultation.md)
  - [`02-pharmacy-integration.md`](./02-pharmacy-integration.md)
  - [`03-insurance-integration.md`](./03-insurance-integration.md)
