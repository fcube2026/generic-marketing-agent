#!/usr/bin/env bash
# Creates GitHub issues for the Pharmacy Integration feature
# Based on: docs/feature-proposals/02-pharmacy-integration.md
#
# Usage:
#   gh auth login          # if not already authenticated
#   bash scripts/create-pharmacy-issues.sh
#
set -euo pipefail

REPO="fcube2026/curex24"

echo "Creating Pharmacy Integration issues in $REPO..."
echo ""

# ── Epic ──────────────────────────────────────────────────────────────────────

EPIC=$(gh issue create --repo "$REPO" \
  --title "[EPIC] Pharmacy Integration — Order Medicines from App" \
  --label "type: feature,priority: high" \
  --body "$(cat <<'EOF'
## Summary

Allow patients to order prescribed medicines directly from the app after a consultation, connecting with pharmacy partners for fulfillment and delivery.

**Feature Proposal:** [`docs/feature-proposals/02-pharmacy-integration.md`](https://github.com/fcube2026/curex24/blob/main/docs/feature-proposals/02-pharmacy-integration.md)

## Key Use Cases

1. **Post-consultation prescription fulfillment** — Doctor submits prescription → Patient sees "Order Medicines" → Pharmacy partner fulfills → Delivery tracking
2. **Direct medicine ordering** — Patient uploads prescription → Pharmacist verifies → Order placed → Delivery
3. **Refill reminders** — Based on prescription duration → Reminder → One-tap reorder
4. **Price comparison** — Show prices from multiple pharmacy partners

## Architecture

- **Aggregator model** — Start with PharmEasy API (MVP), add 1mg for price comparison (Phase 2), keep open for local pharmacies (Phase 3)
- **Backend:** New `PharmacyModule` (NestJS) with strategy pattern for partner integrations
- **Mobile:** Prescription order, checkout, and tracking screens
- **Database:** `PharmacyOrder`, `PharmacyOrderItem`, `PharmacyPartner` models

## Implementation Phases

| Phase | Scope | Effort | Priority |
|---|---|---|---|
| **Phase 1: MVP** | Schema, 1 partner integration, prescription upload, order placement, basic tracking | 4–5 weeks | P0 |
| **Phase 2: Enhanced** | Multi-partner, price comparison, refill reminders, order history | 3–4 weeks | P1 |
| **Phase 3: Advanced** | Local pharmacy onboarding, real-time delivery tracking, medicine substitution | 3–4 weeks | P2 |

**Total:** ~13 weeks for full feature

## Regulatory & Compliance

- Drugs and Cosmetics Act, 1940 — Schedule H/H1 drugs require valid prescription
- Pharmacy Act, 1948 — Only licensed pharmacists can dispense
- E-pharmacy Rules (Draft 2018) — Registration & record retention (3 years)
- DPDP Act 2023 — Patient health data handling, consent management
- GST compliance — Medicine pricing must include GST breakup

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Partner API downtime | High | Queue-based retry, fallback to secondary partner |
| Prescription fraud | High | AI + manual pharmacist verification |
| Drug interactions | High | Integrate drug interaction database |
| Delivery delays | Medium | SLA agreements, proactive communication |
| Regulatory changes | Medium | Legal counsel on retainer |

## Sub-Issues

_Sub-issues will be linked below as they are created._
EOF
)")

echo "✅ Created Epic: $EPIC"

# ── Phase 1: MVP (P0) ────────────────────────────────────────────────────────

echo ""
echo "Creating Phase 1 (MVP) issues..."

ISSUE_1=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Database schema — PharmacyOrder, PharmacyOrderItem, PharmacyPartner models" \
  --label "type: feature,priority: high,area: database,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Define Prisma models and enums for the pharmacy integration feature.

**Parent:** $EPIC

## Details

### New Models

1. **\`PharmacyPartner\`** — Represents a pharmacy partner (e.g., PharmEasy, 1mg)
   - \`id\`, \`name\`, \`code\` (unique slug), \`apiBaseUrl\`, \`isActive\`, \`priority\`
   - \`logoUrl\`, \`description\`
   - Relation: has many \`PharmacyOrder\`
   - \`createdAt\`, \`updatedAt\`

2. **\`PharmacyOrder\`** — Represents a medicine order
   - \`id\`, \`orderNumber\` (unique), \`status\` (enum)
   - \`patientProfileId\` → \`PatientProfile\`
   - \`bookingId\` → \`Booking\` (nullable, for post-consultation orders)
   - \`prescriptionId\` → \`Prescription\` (nullable)
   - \`pharmacyPartnerId\` → \`PharmacyPartner\`
   - \`partnerOrderId\` (external order ID from partner)
   - \`deliveryAddressId\` → \`Address\`
   - \`prescriptionImageUrl\` (encrypted S3 URL)
   - \`subtotal\`, \`deliveryFee\`, \`discount\`, \`totalAmount\`
   - \`estimatedDeliveryAt\`, \`deliveredAt\`
   - \`notes\`
   - \`createdAt\`, \`updatedAt\`

3. **\`PharmacyOrderItem\`** — Individual medicine in an order
   - \`id\`, \`pharmacyOrderId\` → \`PharmacyOrder\`
   - \`medicineName\`, \`medicineCode\` (partner SKU)
   - \`quantity\`, \`unitPrice\`, \`totalPrice\`
   - \`dosage\`, \`instructions\`
   - \`isSubstitute\` (generic alternative flag)

### New Enum

\`\`\`prisma
enum PharmacyOrderStatus {
  PENDING
  PRESCRIPTION_REVIEW
  CONFIRMED
  PACKED
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  RETURNED
  REFUNDED
}
\`\`\`

### Schema Changes

- Link \`PharmacyOrder\` to existing \`Booking\`, \`Prescription\`, \`PatientProfile\`, and \`Address\` models
- Add \`pharmacyOrders\` relation to \`PatientProfile\`
- Generate and test migration

## Acceptance Criteria

- [ ] Prisma models defined in \`packages/database/prisma/schema.prisma\`
- [ ] \`PharmacyOrderStatus\` enum created
- [ ] Migration generated and applies cleanly
- [ ] \`pnpm --filter @curex24/database db:generate\` succeeds
- [ ] Relations to existing models (\`Booking\`, \`Prescription\`, \`PatientProfile\`, \`Address\`) are correct
EOF
)")
echo "  ✅ $ISSUE_1"

ISSUE_2=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Backend — PharmacyModule with strategy pattern for partner integrations" \
  --label "type: feature,priority: high,area: api,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Create the core \`PharmacyModule\` in the NestJS API with a strategy/provider pattern that allows plugging in different pharmacy partner APIs.

**Parent:** $EPIC

## Details

### Module Structure

\`\`\`
apps/api/src/modules/pharmacy/
├── pharmacy.module.ts
├── pharmacy.controller.ts
├── pharmacy.service.ts
├── dto/
│   ├── create-pharmacy-order.dto.ts
│   ├── pharmacy-order-response.dto.ts
│   └── search-medicine.dto.ts
├── providers/
│   ├── pharmacy-partner.interface.ts    # Strategy interface
│   ├── pharmeasy.provider.ts            # PharmEasy implementation
│   └── mock-pharmacy.provider.ts        # Mock for dev/testing
└── pharmacy-order.service.ts
\`\`\`

### Strategy Interface

\`PharmacyPartnerProvider\` interface with methods:
- \`searchMedicines(query: string): Promise<Medicine[]>\`
- \`checkAvailability(medicineCode: string, pincode: string): Promise<Availability>\`
- \`createOrder(order: CreatePartnerOrder): Promise<PartnerOrderResponse>\`
- \`getOrderStatus(partnerOrderId: string): Promise<OrderStatus>\`
- \`cancelOrder(partnerOrderId: string): Promise<CancelResponse>\`

### API Endpoints

- \`GET /pharmacy/medicines/search?q=&pincode=\` — Search medicine catalog
- \`POST /pharmacy/orders\` — Place a pharmacy order
- \`GET /pharmacy/orders\` — List patient's pharmacy orders
- \`GET /pharmacy/orders/:id\` — Get order details
- \`POST /pharmacy/orders/:id/cancel\` — Cancel an order
- \`GET /pharmacy/partners\` — List active pharmacy partners

### Guards & Decorators

- All endpoints require \`JwtAuthGuard\`
- Order endpoints require patient role
- Use existing \`@CurrentUser()\` decorator

## Acceptance Criteria

- [ ] \`PharmacyModule\` created and registered in \`AppModule\`
- [ ] Strategy pattern interface defined for partner providers
- [ ] Mock provider implemented for development/testing
- [ ] DTOs with class-validator decorations
- [ ] Controller with all endpoints listed above
- [ ] Service layer with order lifecycle management
- [ ] Unit tests for service layer with mock provider
EOF
)")
echo "  ✅ $ISSUE_2"

ISSUE_3=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Backend — PharmEasy API integration (catalog, orders, status)" \
  --label "type: feature,priority: high,area: api,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Implement the PharmEasy partner provider using the strategy interface defined in the PharmacyModule.

**Parent:** $EPIC

## Details

### PharmEasy Provider

Implement \`PharmEasyProvider\` class that implements the \`PharmacyPartnerProvider\` interface:

1. **Medicine catalog search** — Search PharmEasy's drug catalog by name/composition
2. **Availability check** — Check stock availability by pincode
3. **Order placement** — Submit order with prescription + medicine list
4. **Order status** — Poll for order status updates
5. **Order cancellation** — Cancel pending/confirmed orders

### Configuration

- \`PHARMEASY_API_URL\` — Base URL for PharmEasy API
- \`PHARMEASY_API_KEY\` — API authentication key
- \`PHARMEASY_PARTNER_ID\` — Partner identification
- Environment variables via \`ConfigService\`

### Error Handling

- Retry logic with exponential backoff for transient failures
- Graceful degradation when API is unavailable
- Map partner-specific error codes to internal error types
- Circuit breaker pattern for partner API health

### Logging & Monitoring

- Log all API calls with request/response (redact sensitive data)
- Track API latency and error rates
- Alert on high error rates or latency

## Acceptance Criteria

- [ ] \`PharmEasyProvider\` implements \`PharmacyPartnerProvider\` interface
- [ ] All 5 methods (search, availability, create, status, cancel) implemented
- [ ] Environment variable configuration via \`ConfigService\`
- [ ] Retry logic with exponential backoff
- [ ] Error mapping from PharmEasy codes to internal errors
- [ ] Unit tests with mocked HTTP responses
- [ ] Integration test with PharmEasy sandbox API (if available)
EOF
)")
echo "  ✅ $ISSUE_3"

ISSUE_4=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Backend — Prescription upload & verification flow (admin pharmacist queue)" \
  --label "type: feature,priority: high,area: api,area: admin,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Implement prescription upload, storage, and pharmacist verification workflow. Prescriptions must be verified before medicines can be dispensed (Drugs and Cosmetics Act compliance).

**Parent:** $EPIC

## Details

### Upload Flow

1. Patient uploads prescription image/PDF (from consultation or camera)
2. File stored in encrypted S3 bucket with restricted access
3. Prescription record created with status \`PENDING_REVIEW\`
4. Entry added to pharmacist review queue

### Pharmacist Review Queue (Admin)

- New admin section: "Prescription Verification Queue"
- List all pending prescriptions with patient info
- View prescription image with zoom
- Actions: **Approve**, **Reject** (with reason), **Request Re-upload**
- Auto-assign to available pharmacist (round-robin or manual)
- SLA timer (e.g., 15-minute review target)

### API Endpoints

- \`POST /pharmacy/prescriptions/upload\` — Upload prescription image
- \`GET /admin/pharmacy/prescriptions/queue\` — Get verification queue
- \`POST /admin/pharmacy/prescriptions/:id/verify\` — Approve/reject prescription
- \`GET /admin/pharmacy/prescriptions/:id\` — View prescription details

### Security

- Prescription images encrypted at rest (S3 SSE or client-side encryption)
- Signed URLs for viewing (short-lived, 5-minute expiry)
- Audit trail for all verification actions
- Only users with pharmacist/admin role can access queue

## Acceptance Criteria

- [ ] Prescription upload endpoint with file validation (image/PDF, max 10MB)
- [ ] Encrypted storage in S3 with signed URL generation
- [ ] Pharmacist review queue API endpoints
- [ ] Admin panel UI for prescription verification queue
- [ ] Approve/Reject workflow with audit logging
- [ ] Notification to patient on verification result
- [ ] Unit tests for verification service
EOF
)")
echo "  ✅ $ISSUE_4"

ISSUE_5=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Backend — Order status webhook receiver" \
  --label "type: feature,priority: high,area: api,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Implement webhook endpoints to receive real-time order status updates from pharmacy partners.

**Parent:** $EPIC

## Details

### Webhook Endpoint

- \`POST /pharmacy/webhooks/:partnerCode/order-status\` — Receive order status callbacks

### Verification & Security

- Validate webhook signature/HMAC from each partner
- Verify partner code matches registered partner
- Idempotency handling (same webhook delivered multiple times)
- Rate limiting on webhook endpoints

### Processing

1. Parse partner-specific payload format
2. Map to internal \`PharmacyOrderStatus\` enum
3. Update \`PharmacyOrder\` status in database
4. Create status history entry
5. Trigger push notification to patient (via existing notification system)
6. Emit internal event for analytics/monitoring

### Status Mapping

Map partner-specific statuses to internal enum:
- Partner: "accepted" → Internal: \`CONFIRMED\`
- Partner: "packed" → Internal: \`PACKED\`
- Partner: "dispatched" → Internal: \`SHIPPED\`
- Partner: "out_for_delivery" → Internal: \`OUT_FOR_DELIVERY\`
- Partner: "delivered" → Internal: \`DELIVERED\`
- Partner: "cancelled" → Internal: \`CANCELLED\`

## Acceptance Criteria

- [ ] Webhook endpoint created with partner code routing
- [ ] HMAC signature verification for webhook payloads
- [ ] Status mapping from partner to internal enum
- [ ] Database update with status history
- [ ] Push notification sent to patient on status change
- [ ] Idempotency handling for duplicate webhooks
- [ ] Unit tests with sample webhook payloads
EOF
)")
echo "  ✅ $ISSUE_5"

ISSUE_6=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Backend — BullMQ jobs for order status polling & refill reminders" \
  --label "type: feature,priority: high,area: api,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Implement background jobs using BullMQ for polling order statuses (fallback for webhooks) and sending refill reminders based on prescription duration.

**Parent:** $EPIC

## Details

### Order Status Polling Job

- **Queue:** \`pharmacy-order-status\`
- **Schedule:** Every 5 minutes for active orders
- Poll partner API for latest order status
- Update database if status changed
- Remove job when order reaches terminal state (DELIVERED, CANCELLED, RETURNED)
- Acts as fallback in case webhook delivery fails

### Refill Reminder Job

- **Queue:** \`pharmacy-refill-reminder\`
- **Trigger:** When order is delivered, calculate refill date from prescription duration
- Send push notification X days before medicine runs out (configurable, default: 3 days)
- Include "Reorder" deep link in notification
- Schedule follow-up reminder if not reordered (1 day before)

### Job Configuration

- Configurable via environment variables:
  - \`PHARMACY_STATUS_POLL_INTERVAL_MS\` (default: 300000)
  - \`PHARMACY_REFILL_REMINDER_DAYS_BEFORE\` (default: 3)
- Job retry with exponential backoff on failure
- Dead letter queue for failed jobs

## Acceptance Criteria

- [ ] BullMQ queue and processor for order status polling
- [ ] BullMQ queue and processor for refill reminders
- [ ] Jobs registered in \`PharmacyModule\`
- [ ] Configurable polling interval and reminder window
- [ ] Retry logic with dead letter queue
- [ ] Integration with existing notification system
- [ ] Unit tests for job processors
EOF
)")
echo "  ✅ $ISSUE_6"

ISSUE_7=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Mobile — PrescriptionOrderScreen (attach prescription, select medicines)" \
  --label "type: feature,priority: high,area: mobile,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Create the main prescription ordering screen where patients can upload a prescription, view/select medicines, and proceed to checkout.

**Parent:** $EPIC

## Details

### Screen Flow

1. **Prescription source selection:**
   - "From recent consultation" — auto-attach prescription from booking
   - "Upload prescription" — camera capture or gallery upload
2. **Prescription preview** — Show uploaded image with re-upload option
3. **Medicine list** — Display medicines from prescription (if parseable) or manual entry
4. **Pharmacy selection** — Show available pharmacy partner(s) with pricing
5. **Proceed to checkout** — Navigate to \`PharmacyCheckoutScreen\`

### UI Components

- Prescription image picker (camera + gallery)
- Medicine list with quantity adjusters
- Pharmacy partner card (logo, name, estimated delivery, price)
- Loading states during prescription verification
- Error states (prescription rejected, medicine unavailable)

### Integration

- API calls: prescription upload, medicine search, availability check
- Link to existing consultation/booking data
- Zustand store for pharmacy order state

## Acceptance Criteria

- [ ] Screen created at \`apps/mobile/src/screens/pharmacy/PrescriptionOrderScreen.tsx\`
- [ ] Prescription upload via camera and gallery
- [ ] Medicine list display with quantity adjustment
- [ ] Pharmacy partner selection with pricing
- [ ] Navigation to checkout screen
- [ ] Loading and error states
- [ ] Screen registered in navigation
EOF
)")
echo "  ✅ $ISSUE_7"

ISSUE_8=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Mobile — Add \"Order Medicines\" CTA to ConsultationSummaryScreen" \
  --label "type: feature,priority: high,area: mobile,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Add an "Order Medicines" call-to-action button to the existing \`ConsultationSummaryScreen\` so patients can order prescribed medicines directly after a consultation.

**Parent:** $EPIC

## Details

### Changes

- Add "Order Medicines" button below the prescription section on \`ConsultationSummaryScreen\`
- Button appears only when a prescription exists for the booking
- Tapping navigates to \`PrescriptionOrderScreen\` with the booking ID and prescription pre-attached
- Show pill/medicine icon alongside the button
- If an order already exists for this prescription, show "View Order" instead

### Design

- Primary action button style (consistent with existing CTA patterns)
- Positioned prominently after prescription details
- Badge showing medicine count if available

## Acceptance Criteria

- [ ] "Order Medicines" CTA visible on consultation summary when prescription exists
- [ ] Navigation to \`PrescriptionOrderScreen\` with booking context
- [ ] "View Order" shown when order already exists for this prescription
- [ ] Button hidden when no prescription is attached
- [ ] Consistent styling with existing app design
EOF
)")
echo "  ✅ $ISSUE_8"

ISSUE_9=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Mobile — OrderTrackingScreen (delivery status tracking)" \
  --label "type: feature,priority: high,area: mobile,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Create a screen for patients to track the status of their pharmacy orders, including a timeline view of order progress and estimated delivery time.

**Parent:** $EPIC

## Details

### Screen Layout

1. **Order header** — Order number, pharmacy partner logo, placed date
2. **Status timeline** — Visual step indicator showing order progress:
   - Placed → Confirmed → Packed → Shipped → Out for Delivery → Delivered
3. **Estimated delivery** — Estimated delivery date/time
4. **Medicine list** — Items in the order with quantities
5. **Delivery address** — Delivery address display
6. **Order total** — Price breakdown (subtotal, delivery fee, discount, total)
7. **Actions** — Cancel order (if allowed based on status), Contact support

### Real-time Updates

- Poll for status updates every 30 seconds while screen is active
- Push notification updates reflected immediately
- Animate timeline transitions

### Navigation

- Accessible from:
  - "View Order" on ConsultationSummaryScreen
  - Order history list
  - Push notification deep link

## Acceptance Criteria

- [ ] Screen created at \`apps/mobile/src/screens/pharmacy/OrderTrackingScreen.tsx\`
- [ ] Status timeline with visual step indicator
- [ ] Order details display (items, address, pricing)
- [ ] Auto-refresh for status updates
- [ ] Cancel order action (when allowed)
- [ ] Deep link support from push notifications
- [ ] Screen registered in navigation
EOF
)")
echo "  ✅ $ISSUE_9"

ISSUE_10=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Security — Prescription storage encryption & PII protection" \
  --label "type: feature,priority: high,type: security,area: api,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Implement security measures for prescription storage and patient PII protection in the pharmacy integration feature.

**Parent:** $EPIC

## Details

### Prescription Storage

- Store prescription images/PDFs in a dedicated, encrypted S3 bucket
- Enable S3 Server-Side Encryption (SSE-S3 or SSE-KMS)
- Generate short-lived signed URLs (5-minute expiry) for viewing
- Separate bucket from general uploads with restricted IAM policies
- Enable S3 access logging for audit trail

### PII Protection

- Patient delivery addresses encrypted at rest in database
- Use application-level encryption for sensitive fields (via Prisma middleware or service layer)
- Encryption key managed via AWS KMS or environment variable
- Mask patient details in API logs (phone, address)

### Audit Trail

- Log all prescription-related actions:
  - Upload, view, verify (approve/reject), delete
  - Who performed the action, when, from what IP
- Use existing \`AuditLog\` model with pharmacy-specific action types
- Retention: minimum 3 years (per E-pharmacy Draft Rules)

### API Security

- Pharmacy partner API keys stored as environment variables (never in code/DB)
- Webhook signature verification (HMAC-SHA256)
- Rate limiting on pharmacy API endpoints
- Input validation on all pharmacy DTOs

## Acceptance Criteria

- [ ] Encrypted S3 bucket configuration for prescriptions
- [ ] Signed URL generation with short expiry
- [ ] PII encryption for delivery addresses
- [ ] Audit logging for all prescription actions
- [ ] Sensitive data masked in logs
- [ ] Webhook HMAC verification
- [ ] Security documentation updated
EOF
)")
echo "  ✅ $ISSUE_10"

ISSUE_11=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Testing — Unit & integration tests for pharmacy feature" \
  --label "type: chore,priority: high,area: api,phase: mvp" \
  --body "$(cat <<EOF
## Summary

Create comprehensive test coverage for the pharmacy integration feature.

**Parent:** $EPIC

## Details

### Unit Tests

- \`PharmacyService\` — Order creation, status updates, cancellation
- \`PharmacyOrderService\` — Order lifecycle, validation
- \`PharmEasyProvider\` — API call mocking, error handling
- \`MockPharmacyProvider\` — Verify mock behavior matches interface
- Prescription verification service — Approve/reject flows
- BullMQ job processors — Status polling, refill reminders

### Integration Tests

- Full order lifecycle: create → confirm → deliver
- Prescription upload → verification → order placement
- Webhook processing with sample payloads
- Error scenarios: partner API failure, invalid prescription, stock unavailable

### Mobile Tests

- \`PrescriptionOrderScreen\` — Render, interactions, API calls
- \`OrderTrackingScreen\` — Status display, timeline rendering
- Pharmacy store (Zustand) — State management

### Test Infrastructure

- Mock pharmacy provider for development and test environments
- Sample prescription images for upload testing
- Webhook payload fixtures

## Acceptance Criteria

- [ ] Unit tests for all pharmacy services and providers
- [ ] Integration tests for order lifecycle
- [ ] Mobile component tests for pharmacy screens
- [ ] Mock provider usable for development
- [ ] Tests pass in CI pipeline
- [ ] Minimum 80% code coverage for pharmacy module
EOF
)")
echo "  ✅ $ISSUE_11"

# ── Phase 2: Enhanced (P1) ──────────────────────────────────────────────────

echo ""
echo "Creating Phase 2 (Enhanced) issues..."

ISSUE_12=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Backend — Multi-partner support & price comparison API" \
  --label "type: feature,priority: medium,area: api,phase: v2" \
  --body "$(cat <<EOF
## Summary

Extend the pharmacy module to support multiple pharmacy partners simultaneously and provide price comparison across partners.

**Parent:** $EPIC

## Details

### Multi-Partner Architecture

- Register multiple \`PharmacyPartnerProvider\` implementations (PharmEasy, 1mg, etc.)
- Provider registry with dynamic selection based on partner code
- Partner-specific configuration via database (\`PharmacyPartner\` model)
- Enable/disable partners without code deployment

### Price Comparison

- Query all active partners for medicine availability and pricing
- Aggregate results: medicine name, partner, price, estimated delivery time
- Sort by: price (default), delivery time, rating
- Handle partial results (some partners unavailable)

### New API Endpoints

- \`GET /pharmacy/medicines/compare?q=&pincode=\` — Compare prices across partners
- \`GET /pharmacy/partners\` — List active partners with status

### 1mg Integration

- Implement \`OneMgProvider\` following the same strategy interface
- Catalog search, pricing, order placement
- Configuration: \`ONEMG_API_URL\`, \`ONEMG_API_KEY\`

## Acceptance Criteria

- [ ] Provider registry supports multiple active partners
- [ ] Price comparison endpoint aggregates results from all partners
- [ ] 1mg provider implemented and tested
- [ ] Graceful handling when some partners are unavailable
- [ ] Partner management via database (activate/deactivate)
- [ ] Unit tests for multi-partner scenarios
EOF
)")
echo "  ✅ $ISSUE_12"

ISSUE_13=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Mobile — MedicineSearchScreen (search drug catalog)" \
  --label "type: feature,priority: medium,area: mobile,phase: v2" \
  --body "$(cat <<EOF
## Summary

Create a medicine search screen that allows patients to search the drug catalog across pharmacy partners, compare prices, and add medicines to their order.

**Parent:** $EPIC

## Details

### Screen Features

1. **Search bar** — Debounced text input for medicine name/composition
2. **Search results** — List of medicines with:
   - Medicine name and composition
   - Available strengths/variants
   - Price comparison across partners
   - Availability status by pincode
3. **Medicine detail** — Tap to see full details:
   - Description, usage, side effects
   - Price breakdown by partner
   - Add to cart with quantity selector
4. **Pincode selector** — Set delivery pincode for availability check
5. **Recent searches** — Show recently searched medicines

### Integration

- API: \`GET /pharmacy/medicines/search\` and \`GET /pharmacy/medicines/compare\`
- Debounced search with 300ms delay
- Pagination for large result sets
- Skeleton loading states

## Acceptance Criteria

- [ ] Screen created at \`apps/mobile/src/screens/pharmacy/MedicineSearchScreen.tsx\`
- [ ] Debounced search with results display
- [ ] Price comparison across multiple partners
- [ ] Pincode-based availability check
- [ ] Add to cart functionality
- [ ] Loading, empty, and error states
- [ ] Screen registered in navigation
EOF
)")
echo "  ✅ $ISSUE_13"

ISSUE_14=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Mobile — Order history & refill reminders UI" \
  --label "type: feature,priority: medium,area: mobile,phase: v2" \
  --body "$(cat <<EOF
## Summary

Create order history screen and implement refill reminder UI in the mobile app.

**Parent:** $EPIC

## Details

### Order History Screen

1. **Order list** — Paginated list of past and active pharmacy orders
   - Order number, date, status badge, total amount
   - Pharmacy partner logo
   - Tap to navigate to \`OrderTrackingScreen\`
2. **Filters** — Filter by status (Active, Delivered, Cancelled)
3. **Empty state** — "No orders yet" with CTA to search medicines

### Refill Reminders

1. **Reminder banner** — Show on home screen when refill is due
   - "Time to reorder [medicine name] — [X days] until you run out"
   - "Reorder" button → pre-filled \`PrescriptionOrderScreen\`
2. **Push notification handling** — Deep link from refill reminder notification
3. **Reminder preferences** — Setting to enable/disable refill reminders

### Reorder Flow

- "Reorder" button on past delivered orders
- Pre-fill order with same medicines, quantities, and delivery address
- Allow modifications before placing

## Acceptance Criteria

- [ ] Order history screen with paginated list
- [ ] Status filters (Active, Delivered, Cancelled)
- [ ] Refill reminder banner on home screen
- [ ] Reorder flow from past orders
- [ ] Deep link handling for refill notifications
- [ ] Refill reminder toggle in settings
EOF
)")
echo "  ✅ $ISSUE_14"

# ── Phase 3: Advanced (P2) ──────────────────────────────────────────────────

echo ""
echo "Creating Phase 3 (Advanced) issues..."

ISSUE_15=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Local pharmacy onboarding portal" \
  --label "type: feature,priority: low,area: api,area: admin,phase: v2" \
  --body "$(cat <<EOF
## Summary

Build an onboarding portal for local/independent pharmacies to register as fulfillment partners on the platform.

**Parent:** $EPIC

## Details

### Pharmacy Registration

- Registration form: pharmacy name, license number, address, contact, operating hours
- License verification (Pharmacy Act compliance)
- Document upload: Drug License, GST certificate, pharmacist registration
- Admin review and approval workflow

### Admin Portal

- "Pharmacy Partners" section in admin dashboard
- List all registered pharmacies with status (Pending, Active, Suspended)
- Verify/approve/reject pharmacy applications
- View pharmacy performance metrics (orders, ratings, delivery time)

### Local Pharmacy Provider

- Implement \`LocalPharmacyProvider\` following strategy interface
- Manual inventory management (pharmacy uploads available medicines)
- Order notification to pharmacy (SMS/email/push)
- Pharmacy confirms/rejects orders

### API Endpoints

- \`POST /pharmacy/partners/register\` — Pharmacy registration
- \`GET /admin/pharmacy/partners\` — List all pharmacy partners
- \`POST /admin/pharmacy/partners/:id/approve\` — Approve registration
- \`PUT /pharmacy/partners/:id/inventory\` — Update inventory

## Acceptance Criteria

- [ ] Pharmacy registration API with document upload
- [ ] License verification workflow
- [ ] Admin portal for pharmacy management
- [ ] Local pharmacy provider implementation
- [ ] Order notification to local pharmacies
- [ ] Inventory management for local pharmacies
EOF
)")
echo "  ✅ $ISSUE_15"

ISSUE_16=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Real-time delivery tracking with map integration" \
  --label "type: feature,priority: low,area: mobile,phase: v2" \
  --body "$(cat <<EOF
## Summary

Add real-time delivery tracking with map visualization to the order tracking screen.

**Parent:** $EPIC

## Details

### Map Integration

- Integrate map view (Google Maps / Mapbox) into \`OrderTrackingScreen\`
- Show delivery agent location (when available from partner API)
- Display route from pharmacy to delivery address
- Live location updates via WebSocket or polling

### Tracking Features

- Delivery agent details (name, phone — when provided by partner)
- Estimated time of arrival (ETA) with live updates
- "Call delivery agent" button
- Delivery photo proof display (on delivery)

### Partner Integration

- Consume delivery tracking data from partner APIs/webhooks
- Fallback to status-based tracking when real-time location unavailable
- Partner-specific tracking URL deep link (as backup)

### Technical

- Reuse \`ProviderLocation\` patterns from existing provider tracking
- WebSocket integration for real-time updates
- Battery-efficient polling when app is backgrounded

## Acceptance Criteria

- [ ] Map view integrated into order tracking screen
- [ ] Live delivery agent location display (when available)
- [ ] ETA display with live updates
- [ ] Delivery agent contact information
- [ ] Graceful fallback to status-based tracking
- [ ] Battery-efficient background updates
EOF
)")
echo "  ✅ $ISSUE_16"

ISSUE_17=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Medicine substitution suggestions (generic alternatives)" \
  --label "type: feature,priority: low,area: api,area: mobile,phase: v2" \
  --body "$(cat <<EOF
## Summary

Suggest generic/alternative medicines when prescribed brands are unavailable or more affordable options exist.

**Parent:** $EPIC

## Details

### Backend

- Drug composition database mapping (brand name → composition → generic alternatives)
- Integration with drug database API (e.g., DrugBank, OpenFDA, or Indian drug database)
- Substitution rules:
  - Same composition and strength
  - Only suggest BIS/CDSCO-approved alternatives
  - Flag if prescription specifies "no substitution"
- Drug interaction checking for substituted medicines

### API Endpoint

- \`GET /pharmacy/medicines/:code/alternatives\` — Get generic alternatives
- Response: alternative name, composition match %, price, savings amount

### Mobile UI

- "Cheaper alternative available" badge on medicine items
- Substitution suggestion card: original vs alternative with price comparison
- Patient can accept/reject substitution per medicine
- Disclaimer: "Consult your doctor before switching medicines"

### Compliance

- Pharmacy Act requires pharmacist approval for substitution
- Route substitution requests through pharmacist verification
- Log all substitutions in audit trail

## Acceptance Criteria

- [ ] Drug composition mapping database/API integration
- [ ] Alternative medicine suggestion endpoint
- [ ] Mobile UI for substitution suggestions
- [ ] Price comparison display (original vs generic)
- [ ] "No substitution" flag respected from prescription
- [ ] Pharmacist approval for substitutions
- [ ] Drug interaction checking
- [ ] Compliance disclaimer displayed
EOF
)")
echo "  ✅ $ISSUE_17"

# ── Cross-cutting ────────────────────────────────────────────────────────────

echo ""
echo "Creating cross-cutting issues..."

ISSUE_18=$(gh issue create --repo "$REPO" \
  --title "[Pharmacy] Regulatory & compliance documentation" \
  --label "type: docs,priority: medium,area: docs" \
  --body "$(cat <<EOF
## Summary

Document regulatory requirements and compliance measures for the pharmacy integration feature.

**Parent:** $EPIC

## Details

### Regulations to Document

1. **Drugs and Cosmetics Act, 1940**
   - Schedule H/H1 drug handling — valid prescription required
   - Record keeping requirements
   - Drug labeling and packaging rules

2. **Pharmacy Act, 1948**
   - Licensed pharmacist requirement for dispensing
   - Partner pharmacy license verification process
   - State Pharmacy Council registration

3. **E-pharmacy Rules (Draft 2018)**
   - Registration with Central Licensing Authority
   - Record retention for 3 years minimum
   - Prohibited drug list compliance
   - Geographic dispensing restrictions

4. **DPDP Act 2023**
   - Patient health data consent management
   - Data retention and deletion policies
   - Cross-border data transfer restrictions
   - Data breach notification procedures

5. **FSSAI Compliance**
   - Health supplements and OTC product regulations
   - Labeling requirements

6. **GST Compliance**
   - Medicine pricing display with GST breakup
   - Invoice generation requirements

### Deliverables

- \`docs/compliance/pharmacy-regulations.md\` — Comprehensive regulatory guide
- Compliance checklist for pharmacy feature launch
- Data retention policy update
- Privacy policy update for pharmacy data handling

## Acceptance Criteria

- [ ] Regulatory documentation covering all 6 areas
- [ ] Compliance checklist created
- [ ] Data retention policy updated
- [ ] Privacy policy updated
- [ ] Legal review completed (external)
EOF
)")
echo "  ✅ $ISSUE_18"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ All pharmacy integration issues created successfully!"
echo ""
echo "Epic: $EPIC"
echo ""
echo "Phase 1 (MVP - P0):"
echo "  $ISSUE_1"
echo "  $ISSUE_2"
echo "  $ISSUE_3"
echo "  $ISSUE_4"
echo "  $ISSUE_5"
echo "  $ISSUE_6"
echo "  $ISSUE_7"
echo "  $ISSUE_8"
echo "  $ISSUE_9"
echo "  $ISSUE_10"
echo "  $ISSUE_11"
echo ""
echo "Phase 2 (Enhanced - P1):"
echo "  $ISSUE_12"
echo "  $ISSUE_13"
echo "  $ISSUE_14"
echo ""
echo "Phase 3 (Advanced - P2):"
echo "  $ISSUE_15"
echo "  $ISSUE_16"
echo "  $ISSUE_17"
echo ""
echo "Cross-cutting:"
echo "  $ISSUE_18"
echo "════════════════════════════════════════════════════════════════"
