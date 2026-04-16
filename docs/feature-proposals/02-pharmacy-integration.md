# Feature: Pharmacy Integration

## 1. Feature Overview

**Description:** Allow patients to order prescribed medicines directly from the app after a consultation, connecting with pharmacy partners for fulfillment and delivery.

### Key Use Cases & User Flows

1. **Post-consultation prescription fulfillment** → Doctor submits prescription → Patient sees "Order Medicines" button → Prescription sent to pharmacy partner → Patient confirms order & pays → Delivery tracking
2. **Direct medicine ordering** → Patient uploads prescription → Verified by pharmacist → Order placed → Delivery
3. **Refill reminders** → Based on prescription duration → Patient gets reminder → One-tap reorder
4. **Price comparison** → Show prices from multiple pharmacy partners → Patient chooses preferred option

---

## 2. Recommended Tools / Platforms / Partners

| Partner/Platform | Type | Pros | Cons | Integration Type | Indian Market |
|---|---|---|---|---|---|
| **PharmEasy** | Pharmacy Partner | Largest Indian e-pharmacy, wide drug catalog, delivery across 1000+ cities | API requires business partnership, revenue share model | REST API | ✅ Market leader |
| **1mg (Tata Health)** | Pharmacy Partner | Strong brand (Tata), lab tests + pharmacy, good API docs | Enterprise pricing, Tata ecosystem preference | REST API | ✅ Excellent |
| **Netmeds (Reliance)** | Pharmacy Partner | Wide coverage, competitive pricing, Reliance backing | Less developer-friendly API, slower integration | REST API / Affiliate | ✅ Good |
| **MedPlusCart** | Pharmacy Partner | Retail chain + online, South India strong | Limited API, regional focus | Custom API | ⚠️ Regional |
| **Dawa Dost / StoreHippo** | White-label | Build your own pharmacy, full control | Requires pharmacy license, inventory mgmt burden | Self-hosted | ⚠️ Complex |
| **Innovaccer / Eka Care** | Health Platform | Unified health platform with pharmacy module | Enterprise-grade, expensive | Platform API | ✅ Good for enterprise |

**🏆 Recommended:** **Aggregator model with PharmEasy + 1mg APIs**

- Start with one partner (PharmEasy) for MVP
- Add 1mg for price comparison in Phase 2
- Keep architecture open for local pharmacy onboarding

### Documentation / Partner Links

- PharmEasy Business: https://pharmeasy.in/business
- 1mg Partners: https://www.1mg.com/partners
- Netmeds: https://www.netmeds.com

---

## 3. Tech Stack & Architecture

### Backend (NestJS API)

- New `PharmacyModule` with controller, service, providers
- `PharmacyOrderService` for order lifecycle management
- `PharmacyPartnerProvider` interface (strategy pattern) with per-partner implementations
- Prescription verification service (pharmacist review queue in admin)
- BullMQ jobs for order status polling, delivery updates, refill reminders
- Webhook endpoints for partner order status callbacks

### Frontend (React Native)

- `MedicineSearchScreen` – search drug catalog
- `PrescriptionOrderScreen` – attach prescription, select medicines
- `PharmacyCheckoutScreen` – address, payment, pharmacy selection
- `OrderTrackingScreen` – delivery status tracking
- Integration with existing `ConsultationSummaryScreen` (add "Order Medicines" CTA)

### Database Changes

- New models: `PharmacyOrder`, `PharmacyOrderItem`, `PharmacyPartner`
- New enum: `PharmacyOrderStatus` (PLACED, CONFIRMED, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED)
- Link `PharmacyOrder` to `Booking` and `Prescription`

### Security

- Prescription image/PDF stored in encrypted S3 bucket
- Pharmacy partner API keys in environment variables
- PII (patient address) encrypted at rest
- Audit trail for all prescription-related actions

---

## 4. Implementation Plan

| Phase | Tasks | Effort | Priority |
|---|---|---|---|
| **Phase 1: MVP** | Schema, partner integration (1 partner), prescription upload, order placement, basic status tracking | 4–5 weeks | P0 |
| **Phase 2: Enhanced** | Multi-partner support, price comparison, refill reminders, order history | 3–4 weeks | P1 |
| **Phase 3: Advanced** | Local pharmacy onboarding, real-time delivery tracking, medicine substitution suggestions | 3–4 weeks | P2 |

### Step-by-step (Phase 1 – MVP)

1. Define `PharmacyOrder`, `PharmacyOrderItem`, `PharmacyPartner` Prisma models
2. Create `PharmacyModule` with strategy pattern for partner integrations
3. Implement PharmEasy API integration (catalog search, order placement, status tracking)
4. Build prescription upload & verification flow (admin pharmacist queue)
5. Create `PrescriptionOrderScreen` in mobile app
6. Integrate with existing `ConsultationSummaryScreen` → "Order Medicines" CTA
7. Implement order status webhook receiver
8. Add order tracking screen in mobile app
9. BullMQ job for refill reminders (based on prescription duration)
10. Testing & UAT

### Testing Approach

- **Unit tests:** Order service, partner provider mocks
- **Integration tests:** Full order lifecycle with sandbox APIs
- **E2E:** Place order → track → delivery confirmation
- **Pharmacist review flow** testing

---

## 5. Regulatory & Compliance

- **Drugs and Cosmetics Act, 1940 (India):** Schedule H/H1 drugs require valid prescription; the app must verify prescriptions before dispensing
- **Pharmacy Act, 1948:** Only licensed pharmacists can dispense; partner pharmacies must hold valid licenses
- **FSSAI compliance:** For health supplements/OTC products
- **E-pharmacy Rules (Draft 2018):** Registration with Central Licensing Authority, maintain records for 3 years
- **DPDP Act 2023:** Patient health data handling, consent management, data retention
- **GST compliance:** Medicine pricing display must include GST breakup

---

## 6. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Partner API downtime | High | Queue-based retry, fallback to secondary partner |
| Prescription fraud | High | AI + manual pharmacist verification, flag suspicious patterns |
| Drug interactions | High | Integrate drug interaction database (e.g., DrugBank API) |
| Delivery delays | Medium | SLA agreements with partners, proactive communication |
| Regulatory changes | Medium | Legal counsel on retainer, compliance monitoring |
| Inventory stock-outs | Medium | Multi-partner aggregation, real-time stock checks |

---

## 7. Timeline

- **MVP (Phase 1):** Weeks 1–5
- **Enhanced (Phase 2):** Weeks 6–9
- **Advanced (Phase 3):** Weeks 10–13
- **Total:** ~13 weeks for full feature
- **Can run in parallel** with Video Consultation after Week 3
