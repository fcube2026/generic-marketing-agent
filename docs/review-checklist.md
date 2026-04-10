# OpenAPI Spec Review Checklist

> Manual review items to verify the generated `openapi.yaml` against the actual codebase.

---

## 1. Endpoint Coverage

- [ ] Every controller method in `apps/api/src/modules/*/` has a matching path in `openapi.yaml`
- [ ] HTTP methods match the decorators (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`)
- [ ] Route paths match including global prefix `/api/v1` (omitted in spec since `servers.url` includes it)
- [ ] Path parameters (`:id`, `:bookingId`) match controller `@Param` decorators

### Module Checklist

| Module | Controller File | Endpoints | Verified |
|---|---|---|---|
| Auth | `auth.controller.ts` | send-otp, verify-otp, admin-login | [ ] |
| Admin | `admin.controller.ts` | dashboard, charts, providers (CRUD), bookings, diagnostics, referrals, payouts | [ ] |
| Patients | `patients.controller.ts` | profile (GET/POST/PUT), addresses (CRUD), bookings | [ ] |
| Providers | `providers.controller.ts` | onboard, profile, availability, bookings, incoming-requests, nearby, KYC | [ ] |
| Services | `services.controller.ts` | list | [ ] |
| Bookings | `bookings.controller.ts` | create, get, status, accept, decline, cancel | [ ] |
| Consultation | `consultation.controller.ts` | create/get summary, patient summaries | [ ] |
| Diagnostics | `diagnostics.controller.ts` | create, update status, upload result, patient list | [ ] |
| Referrals | `referrals.controller.ts` | create, update status, patient list | [ ] |
| Payments | `payments.controller.ts` | initiate, get status, update status | [ ] |
| Payouts | `payouts.controller.ts` | list, summary | [ ] |
| Notifications | `notifications.controller.ts` | list, unread count, mark read | [ ] |
| Tracking | `tracking.controller.ts` | update location, get location | [ ] |
| Recommendation | `recommendation.controller.ts` | get recommendation | [ ] |

---

## 2. Request Schemas

- [ ] Every `@Body()` DTO has a matching `requestBody` schema
- [ ] Field names match DTO property names exactly
- [ ] Required fields match `@IsNotEmpty()` / `@IsString()` / etc. decorators
- [ ] Optional fields are not listed in `required` array
- [ ] Validation constraints match (`@IsEmail`, `@Length`, `@Min`, `@Max`, `@IsEnum`, `@Matches`)
- [ ] Nested object schemas (e.g., `medicinesAdvised` array items) match DTO definitions
- [ ] `@IsOptional()` decorated fields are correctly optional in the spec

---

## 3. Response Schemas

- [ ] Success response status codes match actual controller returns (200, 201)
- [ ] Response body shapes match what the service methods return
- [ ] Nested relations are accurately represented (e.g., booking with provider, patient, payment)
- [ ] Paginated responses use consistent `{ data, total, page, limit }` shape
- [ ] Array vs. object returns are correctly typed

---

## 4. Authentication & Authorization

- [ ] `@Public()` decorated endpoints have no `security` requirement in the spec
- [ ] All other endpoints list `bearerAuth` in their `security` section
- [ ] `@Roles('ADMIN')` endpoints note the admin role requirement in description
- [ ] The `securitySchemes` component defines `bearerAuth` with type `http`, scheme `bearer`, format `JWT`

---

## 5. Enums & Constants

- [ ] `BookingStatus` enum values match Prisma schema exactly
- [ ] `PaymentStatus` enum values match
- [ ] `BookingMode` enum values match
- [ ] `Role` enum values match
- [ ] `DiagnosticStatus` enum values match
- [ ] `ReferralStatus` enum values match
- [ ] `PayoutStatus` enum values match
- [ ] `LicenseStatus` enum values match
- [ ] State machine transitions documented in `BookingStatus` description

---

## 6. Query Parameters

- [ ] `@Query()` parameters are defined as `in: query` parameters
- [ ] Default values documented (e.g., page=1, limit=20)
- [ ] `status` filter query params on admin endpoints use correct enum/string values
- [ ] Nearby search params (`lat`, `lng`, `serviceCategory`, `mode`) match DTO

---

## 7. Path Parameters

- [ ] All `:id` params are documented with correct names
- [ ] Parameter types are `string` (CUIDs)
- [ ] `bookingId` vs `id` naming is consistent with actual controller params

---

## 8. Error Responses

- [ ] Common error codes are defined: 400, 401, 403, 404, 409, 500
- [ ] `ErrorResponse` schema matches `HttpExceptionFilter` output shape
- [ ] Specific error scenarios noted in endpoint descriptions (e.g., "409 if booking conflict exists")

---

## 9. Component Reusability

- [ ] Shared schemas defined in `components/schemas` (not inlined everywhere)
- [ ] `$ref` used for recurring types (User, Booking, Payment, etc.)
- [ ] Input DTOs and output models are separate schemas where they differ
- [ ] Pagination query parameters extracted as reusable parameter components if applicable

---

## 10. General Quality

- [ ] Every endpoint has a meaningful `summary` (one line)
- [ ] Every endpoint has a `description` explaining business context
- [ ] Tags are assigned consistently per module
- [ ] `operationId` is unique for every endpoint (if used)
- [ ] Examples are provided for at least key endpoints (auth, booking, payment)
- [ ] YAML is syntactically valid — test with `redocly lint` or Swagger Editor
- [ ] Spec renders correctly in Swagger UI without errors

---

## Verification Commands

```bash
# Install validation tool
npm install -g @redocly/cli

# Lint the spec
redocly lint docs/openapi/openapi.yaml

# Preview locally
redocly preview-docs docs/openapi/openapi.yaml
# Opens browser at http://localhost:8080

# Or use Swagger Editor online
# Paste contents of openapi.yaml at https://editor.swagger.io/
```

---

## Sign-Off

| Reviewer | Date | Status |
|---|---|---|
| | | Pending |
| | | Pending |
