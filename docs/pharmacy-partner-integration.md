# E-Pharmacy Partner Integration — Research & Outreach Tracker

**Platform:** Curex24 | **Status:** Outreach in Progress | **Updated:** 2026-04-18

---

## Summary

Curex24's pharmacy module already has a production-ready `PharmacyPartnerProvider` interface
and a `PharmEasyProvider` stub (see `apps/api/src/modules/pharmacy/providers/`).
All four target providers use **private/partner-only APIs** — none offer public self-serve API keys.
The critical path is completing a partnership agreement before API credentials are issued.

---

## Provider Profiles

### 1. PharmEasy

| Field | Details |
|---|---|
| **API Availability** | Private / Partner-only |
| **Evidence Checked** | `pharmeasy.in/business`, GitHub search, Google: `site:pharmeasy.in developer api` |
| **Conclusion** | No public developer portal. API access requires a signed B2B partnership agreement. |
| **Contact Method** | Email: `business@pharmeasy.in` + LinkedIn BD/Partnerships contacts |
| **Response Summary** | _(pending — update when reply received)_ |
| **Integration Steps** | 1. Sign NDA → 2. Partnership Agreement → 3. API credentials issued → 4. Sandbox testing → 5. Go-live review → 6. Production |
| **Business Model** | Revenue share / commission per order (typically 8–15% gross margin shared). Customer belongs to Curex24 for consultation; pharmacy fulfillment handled by PharmEasy. |
| **Prescription Handling** | PharmEasy pharmacists validate Schedule H/H1 prescriptions on their side. Curex24 must transmit prescription image/PDF via API. |
| **Difficulty** | Medium — largest player, established B2B process, but sales cycle may be 4–8 weeks |
| **Code Status** | ✅ `PharmEasyProvider` stub exists at `apps/api/src/modules/pharmacy/providers/pharmeasy.provider.ts`. Set `PHARMEASY_API_URL` + `PHARMEASY_API_KEY` env vars to activate. |
| **Follow-up Date** | _(set when outreach is sent)_ |

---

### 2. Tata 1mg

| Field | Details |
|---|---|
| **API Availability** | Private / Partner-only |
| **Evidence Checked** | `1mg.com/partners`, `affiliate.1mg.com`, `developer.1mg.com` (no public docs), GitHub search |
| **Conclusion** | Affiliate program exists (URL redirects, not API). B2B API requires enterprise partnership. 1mg is part of Tata Health ecosystem — formal procurement process likely. |
| **Contact Method** | Email: `partnerships@1mg.com` + LinkedIn BD contacts at "Tata 1mg" |
| **Response Summary** | _(pending — update when reply received)_ |
| **Integration Steps** | 1. Submit partner request via 1mg.com/partners → 2. Discovery call → 3. NDA → 4. Technical scoping → 5. Integration agreement → 6. Sandbox → 7. Production |
| **Business Model** | Commission per fulfilled order. Tata Health tends toward enterprise SLAs with committed volume thresholds. |
| **Prescription Handling** | 1mg has in-house pharmacist review; prescription image required at order time. |
| **Difficulty** | Hard — Tata enterprise process, longer sales cycle (8–12 weeks), volume commitments likely required |
| **Code Status** | ⬜ Provider stub not yet created. Interface is ready — implement `Tata1mgProvider` when credentials confirmed. |
| **Follow-up Date** | _(set when outreach is sent)_ |

---

### 3. Netmeds (Reliance Retail)

| Field | Details |
|---|---|
| **API Availability** | Private / Affiliate-only |
| **Evidence Checked** | `netmeds.com/partner-with-us`, `netmeds.com/contact-us`, GitHub search |
| **Conclusion** | Primarily a retail affiliate/referral model (tracked URLs). REST API for order placement requires direct Reliance Retail B2B agreement. Less developer-friendly than PharmEasy/1mg. |
| **Contact Method** | Email: `support@netmeds.com` (ask to route to partnerships) + LinkedIn contacts at "Netmeds" / "Reliance Retail Health" |
| **Response Summary** | _(pending — update when reply received)_ |
| **Integration Steps** | 1. Submit affiliate/partner request → 2. Reliance Retail B2B team review → 3. Partnership terms → 4. API/affiliate link setup → 5. Testing → 6. Go-live |
| **Business Model** | Affiliate commission (1–5%) or negotiated B2B margin share. Reliance controls pricing. |
| **Prescription Handling** | Netmeds pharmacist review; prescription upload required. |
| **Difficulty** | Hard — Reliance procurement is slow; API quality lower than competitors; regional delivery gaps |
| **Code Status** | ⬜ Provider stub not yet created. Implement `NetmedsProvider` once API terms confirmed. |
| **Follow-up Date** | _(set when outreach is sent)_ |

---

### 4. Apollo Pharmacy

| Field | Details |
|---|---|
| **API Availability** | Private / Partner-only |
| **Evidence Checked** | `apollopharmacy.in/partner-with-us`, `apollolife.com/business`, GitHub search |
| **Conclusion** | Apollo has enterprise partnership programs via Apollo Health & Lifestyle Ltd. No public API docs. Strongest for Tier-1 city coverage; Apollo also has offline pharmacy network (advantage for hybrid delivery). |
| **Contact Method** | Email: `pharmacy@apollohospitals.com` or via corporate contact form + LinkedIn contacts at "Apollo Pharmacy" / "Apollo Health & Lifestyle" |
| **Response Summary** | _(pending — update when reply received)_ |
| **Integration Steps** | 1. Contact Apollo Business Development → 2. Presentation/demo of Curex24 → 3. NDA + commercial terms → 4. Technical integration scoping → 5. API onboarding → 6. Sandbox → 7. Go-live |
| **Business Model** | Commission per order or white-label integration. Apollo may also offer co-branding opportunities given their health brand strength. |
| **Prescription Handling** | Apollo licensed pharmacists validate; Curex24 must send prescription securely. Apollo has physical stores that can act as pickup points. |
| **Difficulty** | Medium — Apollo is healthcare-native, faster to understand the value proposition; however enterprise process still applies |
| **Code Status** | ⬜ Provider stub not yet created. Implement `ApolloPharmacyProvider` once API terms confirmed. |
| **Follow-up Date** | _(set when outreach is sent)_ |

---

## Outreach Tracker

| Provider | Email Sent | LinkedIn DMs Sent | First Reply | Call Scheduled | Status |
|---|---|---|---|---|---|
| PharmEasy | ⬜ | ⬜ 0/10 | — | — | Not started |
| Tata 1mg | ⬜ | ⬜ 0/10 | — | — | Not started |
| Netmeds | ⬜ | ⬜ 0/10 | — | — | Not started |
| Apollo Pharmacy | ⬜ | ⬜ 0/10 | — | — | Not started |

**Update this table daily** as outreach progresses.

---

## Questions to Ask on First Call

**Technical:**
1. Do you provide a REST API or SDK for medicine search, ordering, and status tracking?
2. Is a sandbox / test environment available before go-live?
3. What authentication method is used (API key, OAuth 2.0)?
4. What endpoints are available? (catalog search, availability check, order placement, order status, cancellation)
5. How is prescription validation handled — on your side or ours?
6. Do you support webhooks for real-time order status updates?

**Business:**
1. What is the commission / revenue share model per order?
2. Is there a minimum monthly transaction volume commitment?
3. Who owns the customer relationship and post-sale support?
4. What is the API uptime SLA?
5. What is the typical onboarding-to-go-live timeline?

---

## Phase 6 — Priority & Strategy

### Recommended First Integration Partner: **PharmEasy**

**Reasons:**
- Largest catalog coverage across India (1000+ cities)
- Most established B2B program among the four
- Curex24 already has a working `PharmEasyProvider` stub — go-live requires only real credentials
- Fastest path from agreement to live traffic

### Priority Ranking

| Rank | Provider | Reason |
|---|---|---|
| 1 | **PharmEasy** | Largest coverage, existing code stub, most accessible B2B team |
| 2 | **Apollo Pharmacy** | Healthcare-native, brand alignment, hybrid online/offline delivery |
| 3 | **Tata 1mg** | Strong brand + lab integration potential, but slower enterprise process |
| 4 | **Netmeds** | Reliance backing, but weakest API / developer experience |

### Fallback Strategy

If no response within **3 weeks** from primary outreach:

1. **Escalate via LinkedIn** — connect with C-level or VP-level contacts
2. **Use mutual connections** — ask investors, advisors, or other healthtech founders for warm introductions
3. **Attend industry events** — IndiaSAIF HealthTech Summit, iHEA conferences, Express Healthcare events — BD teams attend these
4. **Affiliate first, API later** — start with Netmeds/1mg affiliate link program to demonstrate patient intent and build negotiating leverage for an API partnership
5. **ABDM integration** — register on the Ayushman Bharat Digital Mission (`abdm.gov.in`) as a Health Application; some pharmacies expose APIs through the ABDM Health Records (PHR) gateway

---

## Technical Integration Checklist (Once API Credentials Received)

- [ ] Set `PHARMEASY_API_URL` and `PHARMEASY_API_KEY` (or equivalent) in environment config
- [ ] Run `PharmEasyProvider` (or new provider) against sandbox — test all 5 methods
- [ ] Implement prescription image upload to partner via API (currently not in provider interface)
- [ ] Add webhook receiver endpoint for order status push notifications
- [ ] Remove `MockPharmacyProvider` fallback before production go-live
- [ ] Add partner API credentials to Railway/production secrets vault
- [ ] Add monitoring/alerting for partner API errors (Sentry or similar)
- [ ] Legal: sign NDA + partnership agreement, keep copies in secure storage
- [ ] Compliance: ensure prescription data handling meets DPDP Act 2023 requirements
- [ ] Compliance: verify partner holds valid pharmacy license under Drugs & Cosmetics Act

---

## Related Files

| File | Purpose |
|---|---|
| `apps/api/src/modules/pharmacy/providers/pharmacy-partner.interface.ts` | Partner provider contract |
| `apps/api/src/modules/pharmacy/providers/pharmeasy.provider.ts` | PharmEasy integration stub (ready for credentials) |
| `apps/api/src/modules/pharmacy/providers/mock-pharmacy.provider.ts` | Dev/test mock |
| `apps/api/src/modules/pharmacy/pharmacy.service.ts` | Business logic layer |
| `docs/feature-proposals/02-pharmacy-integration.md` | Full feature proposal |
| `docs/pharmacy-legal-compliance-india.md` | Regulatory requirements |
