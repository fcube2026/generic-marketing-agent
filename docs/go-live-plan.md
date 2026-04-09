# Curex24 — MVP to Go-Live: Complete Roadmap

> **Goal:** Take Curex24 from its current MVP state to a production-ready, publicly launched healthcare platform.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Phase 1 — Security & Infrastructure Hardening](#2-phase-1--security--infrastructure-hardening-weeks-1-3)
3. [Phase 2 — Critical Feature Completion](#3-phase-2--critical-feature-completion-weeks-4-7)
4. [Phase 3 — Quality Assurance & Testing](#4-phase-3--quality-assurance--testing-weeks-8-10)
5. [Phase 4 — Compliance & Legal](#5-phase-4--compliance--legal-weeks-8-11)
6. [Phase 5 — Deployment & DevOps](#6-phase-5--deployment--devops-weeks-10-12)
7. [Phase 6 — Beta Launch](#7-phase-6--beta-launch-weeks-12-14)
8. [Phase 7 — Production Go-Live](#8-phase-7--production-go-live-weeks-14-16)
9. [Post-Launch Operations](#9-post-launch-operations-ongoing)
10. [Risk Register](#10-risk-register)
11. [Go-Live Checklist](#11-go-live-checklist)

---

## 1. Current State Assessment

### What's Built (✅ Functional)

| Area | Status | Details |
|------|--------|---------|
| Backend API | ✅ 14 NestJS modules | Auth, patients, providers, bookings, recommendations, consultation, diagnostics, payments, payouts, notifications, admin, referrals, tracking, services |
| Mobile App | ✅ 25+ screens | Unified Expo/RN app with patient + provider flows, role selection, booking lifecycle |
| Admin Panel | ✅ 11 pages | Next.js dashboard with provider verification, booking management, payouts, referrals |
| Database | ✅ ~20 Prisma models | PostgreSQL 16, comprehensive schema with relations |
| CI/CD | ✅ GitHub Actions | Lint, build, test pipeline with parallel jobs |
| Documentation | ✅ 6 docs | PRD, Architecture, API, Data Model, Setup, Privacy |

### Critical Gaps (🔴 Production Blockers)

| Gap | Impact | Priority |
|-----|--------|----------|
| Payment gateway integration | Cannot collect real payments | P0 — Critical |
| Push notifications | Users won't receive booking alerts | P0 — Critical |
| Real-time tracking (WebSocket) | No live provider location for patients | P0 — Critical |
| File storage (S3/GCS) | KYC docs, lab results, prescriptions cannot be stored | P0 — Critical |
| Rate limiting | OTP brute-force vulnerability | P0 — Security |
| Secret management | JWT secret, DB passwords hardcoded | P0 — Security |
| SMS gateway | OTP delivery requires real SMS provider | P0 — Critical |

---

## 2. Phase 1 — Security & Infrastructure Hardening (Weeks 1–3)

### 2.1 Secret Management

- [ ] Remove all hardcoded secrets from source code
- [ ] Implement environment variable validation at startup (e.g., `@nestjs/config` with Joi schema)
- [ ] Set up a secrets manager (AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault)
- [ ] Rotate JWT_SECRET, database credentials, admin password
- [ ] Add `.env.production.example` with all required production vars documented

### 2.2 Rate Limiting & Brute-Force Protection

- [ ] Install and configure `@nestjs/throttler`
- [ ] Apply rate limits to auth endpoints: `POST /auth/send-otp` (5 req/min per IP), `POST /auth/verify-otp` (10 req/min per phone)
- [ ] Apply global rate limit (100 req/min per IP)
- [ ] Add OTP attempt tracking — lock account after 5 failed attempts for 15 minutes
- [ ] Add CAPTCHA or device fingerprinting for suspicious activity

### 2.3 CORS & API Security

- [ ] Configure CORS policy (whitelist mobile app origins, admin domain)
- [ ] Add Helmet.js middleware for HTTP security headers
- [ ] Enable HTTPS enforcement
- [ ] Implement request size limits
- [ ] Add API key versioning header (`X-API-Version`)

### 2.4 Data Security

- [ ] Enable PostgreSQL encryption at rest (TDE or disk-level)
- [ ] Encrypt sensitive fields (KYC document URLs, phone numbers) at application level
- [ ] Implement audit logging for sensitive data access (patient records, payment data)
- [ ] Add SQL injection prevention review and parameterized query verification
- [ ] Enable database connection SSL

### 2.5 Admin Authentication

- [ ] Replace hardcoded admin credentials with proper admin user management
- [ ] Implement admin password hashing (bcrypt)
- [ ] Add admin session timeout (30-minute inactivity)
- [ ] Add admin action MFA (for critical operations like provider verification)

---

## 3. Phase 2 — Critical Feature Completion (Weeks 4–7)

### 3.1 Payment Gateway Integration (Week 4–5)

**Recommended: Razorpay** (India-first, healthcare-friendly, UPI support)

- [ ] Create Razorpay merchant account and complete KYC
- [ ] Replace mock `TXN_${Date.now()}` with Razorpay Order API
- [ ] Implement payment flow:
  - Create Razorpay order on `POST /payments`
  - Handle payment callback/webhook for status updates
  - Verify payment signature on server side
- [ ] Implement refund flow via Razorpay Refunds API
- [ ] Add payment reconciliation job (daily settlement matching)
- [ ] Implement provider payout via Razorpay Route (split payments) or manual bank transfer
- [ ] Add GST/tax calculation support
- [ ] Create payment receipt generation (PDF)
- [ ] Test with Razorpay test mode end-to-end

### 3.2 SMS Gateway Integration (Week 4)

**Recommended: MSG91 or Twilio** (India SMS delivery)

- [ ] Set up SMS provider account
- [ ] Create OTP message templates (DLT-registered for India)
- [ ] Replace console.log OTP with actual SMS delivery
- [ ] Implement delivery status tracking
- [ ] Add fallback SMS provider for reliability
- [ ] Set up SMS template approval with TRAI/DLT

### 3.3 Push Notification System (Week 5–6)

**Recommended: Firebase Cloud Messaging (FCM)**

- [ ] Set up Firebase project and add FCM configuration
- [ ] Implement device token registration endpoint (`POST /notifications/register-device`)
- [ ] Store device tokens per user in database
- [ ] Create push notification service (`PushNotificationService`)
- [ ] Send push notifications for:
  - New booking request (to provider)
  - Booking accepted/declined (to patient)
  - Provider en route / arrived / in-progress (to patient)
  - Booking completed (to both)
  - Booking cancelled (to other party)
  - Payment received/refunded
- [ ] Handle notification tap deep-linking in mobile app
- [ ] Add notification preferences (opt-in/opt-out per type)

### 3.4 Real-Time Tracking via WebSocket (Week 6–7)

**Recommended: Socket.IO with NestJS Gateway**

- [ ] Install `@nestjs/websockets` and `@nestjs/platform-socket.io`
- [ ] Create `TrackingGateway` for WebSocket connections
- [ ] Implement provider location broadcasting:
  - Provider joins room `booking:{bookingId}`
  - Emits location every 10 seconds
  - Patient subscribes to same room
- [ ] Add authentication to WebSocket connections (JWT token handshake)
- [ ] Implement connection lifecycle management (disconnect, reconnect)
- [ ] Update mobile `TrackingScreen` to use WebSocket instead of polling
- [ ] Add ETA recalculation on location update

### 3.5 File Storage Integration (Week 5–6)

**Recommended: AWS S3** (or GCS/Azure Blob)

- [ ] Set up S3 bucket with appropriate IAM policies
- [ ] Create `FileUploadService` with presigned URL generation
- [ ] Implement file upload endpoints:
  - `POST /providers/kyc/upload` — KYC document upload
  - `POST /diagnostics/:id/result` — Lab result upload
  - `POST /consultation/:id/prescription` — Prescription file upload
- [ ] Add file type validation (PDF, JPEG, PNG only; max 10MB)
- [ ] Implement virus scanning on uploaded files (ClamAV or AWS Macie)
- [ ] Add file access control (only authorized users can download)
- [ ] Set up CDN (CloudFront) for static assets

---

## 4. Phase 3 — Quality Assurance & Testing (Weeks 8–10)

### 4.1 API Test Coverage Expansion

- [ ] Achieve 80%+ unit test coverage for all service files
- [ ] Add integration tests for all critical flows:
  - Full booking lifecycle (request → complete → close)
  - Payment flow (initiate → pay → refund)
  - Provider onboarding + KYC verification
  - OTP auth flow
- [ ] Add edge case tests:
  - Concurrent booking conflict
  - Payment timeout handling
  - Invalid state transitions
  - Expired OTP verification
- [ ] Set up test coverage reporting in CI (Jest `--coverage` with threshold)

### 4.2 Mobile App Test Coverage

- [ ] Add unit tests for all screens (currently only PaymentScreen has tests)
- [ ] Add navigation flow tests
- [ ] Add component tests for shared UI components
- [ ] Test offline behavior and error states
- [ ] Test location permission flows
- [ ] Add snapshot tests for critical screens

### 4.3 Admin Panel Testing

- [ ] Add component tests with React Testing Library
- [ ] Test authentication flow and session management
- [ ] Test provider verification workflow
- [ ] Add error boundary tests

### 4.4 End-to-End Testing

- [ ] Set up Detox (mobile) or Maestro for E2E mobile tests
- [ ] Set up Playwright or Cypress for admin panel E2E
- [ ] Create E2E test scenarios:
  - Patient: register → book → pay → track → review summary
  - Provider: onboard → KYC → accept booking → complete → earn
  - Admin: login → verify provider → view bookings → manage payouts

### 4.5 Performance Testing

- [ ] Load test API endpoints (k6 or Artillery):
  - 100 concurrent bookings
  - 500 concurrent location updates
  - 1000 concurrent notification deliveries
- [ ] Identify and optimize slow queries (Prisma query analysis)
- [ ] Add database indexes for frequent queries (location-based, status-based)
- [ ] Test mobile app performance (startup time, memory usage, battery impact)

---

## 5. Phase 4 — Compliance & Legal (Weeks 8–11)

> **See [approval.md](./approval.md) for detailed government approval requirements.**

### 5.1 Regulatory Compliance

- [ ] Complete DPDPA (Digital Personal Data Protection Act, 2023) compliance review
- [ ] Prepare DISHA compliance documentation (when enacted)
- [ ] Create and publish Terms of Service
- [ ] Create and publish Privacy Policy (user-facing)
- [ ] Create and publish Provider Agreement
- [ ] Create Consent Management system (data processing consent, health data consent)

### 5.2 Healthcare Compliance

- [ ] Verify provider license validation workflow with state medical councils
- [ ] Implement provider credential verification against NMC (National Medical Commission) database
- [ ] Ensure prescription data meets Indian medical record standards
- [ ] Add disclaimer for non-emergency medical advice

### 5.3 Financial Compliance

- [ ] Register for GST and integrate GST calculation
- [ ] Set up payment gateway compliance (PCI DSS via Razorpay)
- [ ] Implement TDS deduction for provider payouts (if applicable)
- [ ] Create invoicing system for patients and providers
- [ ] Set up accounting integration (Tally, Zoho Books)

### 5.4 Insurance & Legal

- [ ] Obtain professional liability insurance
- [ ] Obtain cyber liability insurance
- [ ] Draft and review indemnification clauses
- [ ] Set up dispute resolution mechanism
- [ ] Register trademarks (Curex24 name, logo)

---

## 6. Phase 5 — Deployment & DevOps (Weeks 10–12)

### 6.1 Cloud Infrastructure Setup

**Recommended: AWS** (or GCP)

- [ ] Set up VPC with public/private subnets
- [ ] Deploy PostgreSQL via RDS (Multi-AZ for production)
- [ ] Deploy Redis via ElastiCache
- [ ] Set up ECS/EKS for container orchestration (or App Runner for simplicity)
- [ ] Configure Application Load Balancer with SSL/TLS certificate (ACM)
- [ ] Set up auto-scaling policies (CPU/memory-based)
- [ ] Configure WAF (Web Application Firewall) rules

### 6.2 CI/CD Pipeline Enhancement

- [ ] Add staging environment with automated deployment
- [ ] Implement blue-green deployment strategy
- [ ] Add database migration automation (Prisma migrate in CI)
- [ ] Set up rollback procedures (1-click rollback via previous task definition)
- [ ] Add deployment approval gates for production
- [ ] Create deployment runbook

### 6.3 Monitoring & Observability

- [ ] Set up application monitoring (Datadog / New Relic / AWS CloudWatch)
- [ ] Configure log aggregation (CloudWatch Logs / ELK stack)
- [ ] Set up error tracking (Sentry) for API, mobile, and admin
- [ ] Create dashboards:
  - API health (response times, error rates, throughput)
  - Business metrics (bookings/day, revenue, active users)
  - Infrastructure (CPU, memory, disk, network)
- [ ] Set up alerting:
  - API error rate > 5% → PagerDuty/Slack
  - Database CPU > 80% → auto-scale alert
  - Payment failure rate > 2% → immediate alert
  - Deployment failure → Slack notification

### 6.4 Database Operations

- [ ] Set up automated daily backups (RDS snapshots, 30-day retention)
- [ ] Test backup restoration procedure
- [ ] Create read replica for analytics queries
- [ ] Set up database monitoring (slow query log, connection pool tracking)
- [ ] Document database recovery procedure (RTO < 1 hour, RPO < 15 minutes)

### 6.5 Mobile App Distribution

- [ ] Set up Apple Developer Account ($99/year)
- [ ] Set up Google Play Developer Account ($25 one-time)
- [ ] Configure EAS Build for production builds (Expo Application Services)
- [ ] Prepare App Store / Play Store listings:
  - App icon, screenshots, feature graphic
  - App description, keywords, categories
  - Privacy policy URL
  - Content rating questionnaire
- [ ] Set up OTA update capability (expo-updates)
- [ ] Configure crash reporting (Sentry / Firebase Crashlytics)

---

## 7. Phase 6 — Beta Launch (Weeks 12–14)

### 7.1 Beta User Recruitment

- [ ] Identify 2–3 pilot cities/towns (preferably semi-urban/rural in target geography)
- [ ] Recruit 20–30 beta patients (friends, family, community health workers)
- [ ] Recruit 5–10 beta providers (local doctors, physiotherapists)
- [ ] Create beta feedback form (Google Form / Typeform)
- [ ] Set up beta support channel (WhatsApp group / Telegram)

### 7.2 Beta Environment

- [ ] Deploy to staging with production-like configuration
- [ ] Enable feature flags for beta-specific features
- [ ] Set up analytics tracking (Mixpanel / Amplitude / PostHog)
- [ ] Configure beta-specific payment mode (Razorpay test → live with low limits)

### 7.3 Beta Testing Execution

- [ ] Run structured beta test scenarios:
  - Full patient booking journey (home visit + doctor place)
  - Provider onboarding and KYC approval
  - Payment completion and payout receipt
  - Real-time tracking accuracy
  - Push notification delivery reliability
- [ ] Collect and categorize feedback:
  - Bugs (P0–P3 severity)
  - UX improvements
  - Feature requests
  - Performance issues
- [ ] Fix all P0/P1 bugs before go-live
- [ ] Measure key metrics:
  - Booking completion rate (target: >70%)
  - App crash rate (target: <1%)
  - Payment success rate (target: >95%)
  - Average session duration
  - NPS score (target: >30)

---

## 8. Phase 7 — Production Go-Live (Weeks 14–16)

### 8.1 Pre-Launch Checklist

- [ ] All P0/P1 beta bugs resolved
- [ ] Security audit completed (internal or third-party)
- [ ] Load testing passed for expected launch traffic
- [ ] Legal documents published (ToS, Privacy Policy)
- [ ] Government approvals secured (see [approval.md](./approval.md))
- [ ] App Store / Play Store review submitted and approved
- [ ] Customer support system in place (email, phone, in-app)
- [ ] Incident response plan documented

### 8.2 Launch Sequence

1. **T-7 days:** Final production deployment, smoke testing
2. **T-3 days:** Marketing campaign activation (see [marketinglaunch.md](./marketinglaunch.md))
3. **T-1 day:** Team on-call roster confirmed, war room set up
4. **T-0 (Launch Day):**
   - Enable app store visibility
   - Activate marketing campaigns
   - Monitor all dashboards continuously
   - Respond to support queries within 30 minutes
5. **T+1 to T+7:** Daily standup to review metrics, bugs, user feedback
6. **T+14:** Post-launch retrospective

### 8.3 Launch Day Operations

- [ ] All team members on standby (engineering, product, support)
- [ ] Monitoring dashboards visible to all
- [ ] Rollback plan ready (pre-tested)
- [ ] Database backup taken immediately before launch
- [ ] SMS/notification providers verified active
- [ ] Payment gateway verified in live mode

---

## 9. Post-Launch Operations (Ongoing)

### 9.1 Customer Support

- [ ] Set up tiered support structure:
  - L1: In-app FAQ, chatbot (basic queries)
  - L2: Support team (booking issues, payment queries)
  - L3: Engineering escalation (bugs, outages)
- [ ] Define SLAs:
  - Critical (service down): 15-minute response, 1-hour resolution
  - High (payment issue): 1-hour response, 4-hour resolution
  - Medium (feature bug): 4-hour response, 24-hour resolution
  - Low (enhancement request): 24-hour response

### 9.2 Ongoing Monitoring

- [ ] Daily: Review error rates, payment success, new signups
- [ ] Weekly: Review user metrics, NPS, support ticket trends
- [ ] Monthly: Infrastructure cost review, feature prioritization
- [ ] Quarterly: Security audit, dependency updates, compliance review

### 9.3 Feature Roadmap (Post-Launch)

| Priority | Feature | Timeline |
|----------|---------|----------|
| P1 | In-app chat (patient ↔ provider) | Month 2 |
| P1 | Video consultation mode | Month 2–3 |
| P1 | Prescription PDF generation | Month 2 |
| P2 | Multi-language support (Hindi, regional) | Month 3 |
| P2 | Provider ratings & reviews | Month 3 |
| P2 | Recurring/scheduled bookings | Month 4 |
| P2 | Insurance integration | Month 4–5 |
| P3 | Health record export (FHIR format) | Month 5 |
| P3 | AI symptom triage | Month 6 |
| P3 | Pharmacy integration | Month 6 |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Payment gateway rejection (KYC) | Medium | Critical | Start Razorpay KYC early; have Cashfree as backup |
| App Store rejection | Medium | High | Follow guidelines strictly; have compliance docs ready |
| Provider supply shortage | High | Critical | Pre-recruit providers before launch; offer incentive bonuses |
| Low patient adoption | High | High | Focus on specific geography; partner with local health centers |
| SMS delivery failures | Low | High | Use multiple SMS providers; implement retry logic |
| Data breach | Low | Critical | Regular security audits; encrypt sensitive data; cyber insurance |
| Regulatory changes | Medium | High | Monitor DISHA/DPDPA updates; maintain compliance officer |
| Server outage | Low | Critical | Multi-AZ deployment; automated failover; tested DR plan |
| Provider no-show | Medium | High | Implement penalty system; maintain provider reliability score |
| Competitor launch | Medium | Medium | Focus on rural-first USP; build provider network moat |

---

## 11. Go-Live Checklist

### 🔒 Security

- [ ] All secrets rotated and stored in secrets manager
- [ ] Rate limiting active on all auth endpoints
- [ ] CORS configured for production domains only
- [ ] Helmet.js security headers enabled
- [ ] HTTPS enforced on all endpoints
- [ ] Database connections use SSL
- [ ] Admin credentials use bcrypt hashing
- [ ] Sensitive data encrypted at rest
- [ ] SQL injection prevention verified
- [ ] Security audit completed (internal or third-party)
- [ ] Penetration testing completed

### 💳 Payments

- [ ] Razorpay (or equivalent) live mode activated
- [ ] Payment webhook endpoint secured and verified
- [ ] Refund flow tested end-to-end
- [ ] Provider payout mechanism operational
- [ ] GST calculation integrated
- [ ] Payment receipt generation working
- [ ] PCI DSS compliance confirmed (via payment gateway)

### 📱 Mobile App

- [ ] Production build created via EAS Build
- [ ] App Store submission approved
- [ ] Play Store submission approved
- [ ] Push notifications working (FCM)
- [ ] Deep linking configured for notifications
- [ ] OTA update mechanism tested
- [ ] Crash reporting active (Sentry/Crashlytics)
- [ ] App performance benchmarked (startup < 3s)
- [ ] Offline graceful degradation verified

### 🖥️ Admin Panel

- [ ] Deployed to production domain with SSL
- [ ] Admin authentication hardened (no default credentials)
- [ ] Provider verification workflow tested
- [ ] Booking management functional
- [ ] Payout management functional

### 🏗️ Infrastructure

- [ ] Cloud infrastructure provisioned (AWS/GCP)
- [ ] Database Multi-AZ / high availability configured
- [ ] Auto-scaling configured and tested
- [ ] CDN configured for static assets
- [ ] WAF rules active
- [ ] DNS configured for all domains
- [ ] SSL certificates active and auto-renewing

### 📊 Monitoring & Operations

- [ ] Application monitoring active (Datadog/CloudWatch)
- [ ] Error tracking active (Sentry)
- [ ] Log aggregation configured
- [ ] Alerting configured (Slack/PagerDuty)
- [ ] Dashboards created (API health, business metrics)
- [ ] On-call rotation established
- [ ] Incident response plan documented
- [ ] Runbooks created for common incidents

### 🗄️ Database

- [ ] Automated backups configured (daily, 30-day retention)
- [ ] Backup restoration tested
- [ ] Read replica available for analytics
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Migration automation in CI/CD

### 🔔 Notifications

- [ ] SMS gateway live (OTP delivery verified)
- [ ] DLT template registration complete
- [ ] Push notifications working (iOS + Android)
- [ ] Email notification system operational (transactional emails)
- [ ] Notification preferences UI functional

### 📡 Real-Time Features

- [ ] WebSocket tracking operational
- [ ] Provider location streaming verified
- [ ] Connection resilience tested (reconnect on network change)
- [ ] ETA calculation accurate

### 📁 File Storage

- [ ] S3/GCS bucket configured with proper permissions
- [ ] KYC document upload working
- [ ] Lab result upload working
- [ ] File size and type validation active
- [ ] CDN serving static files

### ⚖️ Legal & Compliance

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Provider Agreement published
- [ ] DPDPA compliance documented
- [ ] Healthcare data handling procedures documented
- [ ] Required government approvals obtained (see [approval.md](./approval.md))
- [ ] Professional liability insurance active
- [ ] Cyber liability insurance active
- [ ] Trademark registration filed

### 🧪 Testing

- [ ] API unit test coverage ≥ 80%
- [ ] Mobile app critical paths tested
- [ ] E2E tests passing
- [ ] Load testing passed for launch traffic
- [ ] Beta testing completed with satisfactory results
- [ ] All P0/P1 bugs resolved

### 👥 Team & Operations

- [ ] Customer support system operational
- [ ] Support team trained
- [ ] Escalation paths defined
- [ ] Provider onboarding documentation ready
- [ ] Provider training materials prepared
- [ ] Launch day war room planned
- [ ] Rollback plan documented and tested

---

*Document created: April 2026*
*Last updated: April 2026*
*Owner: Curex24 Engineering & Product Team*
