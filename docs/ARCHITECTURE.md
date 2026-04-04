# Curex24 — System Architecture

## 1. Architecture Overview

Curex24 follows a **modular monorepo** architecture with clearly separated frontend applications, a centralized backend API, and shared packages.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Patient App  │  │ Provider App │  │   Admin Panel         │  │
│  │ (Expo/RN)    │  │ (Expo/RN)    │  │   (Next.js)           │  │
│  │ Mobile       │  │ Mobile       │  │   Web                 │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│         └──────────────────┼──────────────────────┘              │
│                            │ REST API (HTTPS)                    │
├────────────────────────────┼─────────────────────────────────────┤
│                            ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  BACKEND API (NestJS)                      │  │
│  │                                                            │  │
│  │  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌───────────────┐    │  │
│  │  │ Auth │ │ Patients │ │Providers│ │   Services     │    │  │
│  │  └──────┘ └──────────┘ └─────────┘ └───────────────┘    │  │
│  │                                                            │  │
│  │  ┌──────────┐ ┌───────────────┐ ┌──────────────┐        │  │
│  │  │ Bookings │ │Recommendation │ │ Consultation │        │  │
│  │  └──────────┘ └───────────────┘ └──────────────┘        │  │
│  │                                                            │  │
│  │  ┌─────────────┐ ┌──────────┐ ┌──────┐                  │  │
│  │  │ Diagnostics │ │ Payments │ │Admin │                  │  │
│  │  └─────────────┘ └──────────┘ └──────┘                  │  │
│  │                                                            │  │
│  │              ┌──────────────────┐                         │  │
│  │              │ Prisma ORM Layer │                         │  │
│  │              └────────┬─────────┘                         │  │
│  └───────────────────────┼───────────────────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  PostgreSQL Database                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
curex24/
├── apps/
│   ├── api/              # NestJS REST backend
│   ├── patient-app/      # Expo React Native — patient mobile app
│   ├── provider-app/     # Expo React Native — provider mobile app
│   └── admin/            # Next.js — admin web panel
├── packages/
│   ├── database/         # Prisma schema + PrismaClient singleton
│   └── types/            # Shared TypeScript types & enums
├── docs/                 # Documentation
├── docker-compose.yml    # PostgreSQL for local dev
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml   # Workspace definition
└── package.json          # Root scripts
```

### Workspace Packages

| Package | Purpose |
|---------|---------|
| `@curex24/api` | NestJS backend API server |
| `@curex24/patient-app` | Expo patient mobile app |
| `@curex24/provider-app` | Expo provider mobile app |
| `@curex24/admin` | Next.js admin panel |
| `@curex24/database` | Prisma schema & client |
| `@curex24/types` | Shared TypeScript types |

---

## 3. Backend Architecture

### 3.1 Module Organization

The NestJS backend is organized into **domain modules**, each encapsulating controllers, services, and DTOs:

| Module | Responsibility |
|--------|---------------|
| **Auth** | OTP generation/verification, JWT issuing, guards |
| **Patients** | Patient profile CRUD, address management |
| **Providers** | Provider profile, onboarding, availability, nearby search |
| **Services** | Service category management |
| **Bookings** | Booking lifecycle, state machine transitions |
| **Recommendation** | Scoring algorithm, Home Visit vs Clinic recommendation |
| **Consultation** | Post-visit summary submission and retrieval |
| **Diagnostics** | Lab test requests, sample scheduling, result uploads |
| **Payments** | Payment initiation, status tracking |
| **Admin** | Provider verification, booking monitoring, dashboard stats |

### 3.2 Common Utilities

| Utility | Purpose |
|---------|---------|
| `PrismaService` | Database connection singleton |
| `HttpExceptionFilter` | Standardized error responses |
| `LoggingInterceptor` | Request/response logging |
| `ValidationPipe` | DTO validation via class-validator |
| `JwtAuthGuard` | Route protection |
| `RolesGuard` | Role-based access control |

---

## 4. Authentication Flow

```
Patient/Provider                    Backend
     │                                │
     │   POST /auth/send-otp          │
     │   { phone: "+91..." }          │
     │──────────────────────────────>  │
     │                                │ Generate 6-digit OTP
     │                                │ Store in DB (10 min expiry)
     │   { message: "OTP sent" }      │ (Dev: return OTP in response)
     │  <──────────────────────────── │
     │                                │
     │   POST /auth/verify-otp        │
     │   { phone, otp }               │
     │──────────────────────────────>  │
     │                                │ Verify OTP from DB
     │                                │ Create/find User
     │   { token: "jwt...", user }    │ Issue JWT token
     │  <──────────────────────────── │
     │                                │
     │   Subsequent API calls with    │
     │   Authorization: Bearer <jwt>  │
     │──────────────────────────────>  │
```

**JWT Payload:** `{ userId, phone, role }`

---

## 5. Recommendation Engine

### Scoring Algorithm

```
Score = (AvailabilityScore × 0.40) + (DistanceScore × 0.30) + (FeeScore × 0.20) + (UrgencyScore × 0.10)
```

| Component | Calculation | Weight |
|-----------|-------------|--------|
| Availability | 100 if available, 0 otherwise | 40% |
| Distance | `100 - (distance / maxDistance × 100)` | 30% |
| Fee | `100 - (fee / maxFee × 100)` | 20% |
| Urgency | HIGH=100, MEDIUM=60, LOW=30 | 10% |

### Provider Matching

1. Query all active, verified, available providers with matching service category
2. Filter by service radius (haversine distance)
3. Split into home visit and clinic candidates
4. Score each candidate
5. Return top recommendation per mode with reason text

### Distance Calculation

Uses **Haversine formula** for great-circle distance between patient and provider GPS coordinates.

### ETA Estimation

- Home Visit: `distance_km × 3 minutes`
- Doctor's Place: `distance_km × 2 minutes`

---

## 6. Booking State Machine

```
                    ┌──────────┐
                    │REQUESTED │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │ accept   │          │ cancel
              ▼          │          ▼
         ┌────────┐      │    ┌──────────┐
         │ACCEPTED│      │    │CANCELLED │
         └───┬────┘      │    └──────────┘
             │           │
             │ start     │ cancel
             ▼           │
      ┌───────────┐      │
      │ON_THE_WAY │      │
      └─────┬─────┘      │
            │             │
            │ arrive      │
            ▼             │
       ┌─────────┐       │
       │ ARRIVED │       │
       └────┬────┘       │
            │             │
            │ begin       │
            ▼             │
      ┌────────────┐     │
      │IN_PROGRESS │     │
      └─────┬──────┘     │
            │             │
            │ complete    │
            ▼             │
      ┌───────────┐      │
      │ COMPLETED │      │
      └─────┬─────┘      │
            │             │
            │ submit summary
            ▼             │
  ┌──────────────────┐   │
  │SUMMARY_SUBMITTED │   │
  └────────┬─────────┘   │
           │              │
           │ close        │
           ▼              │
      ┌────────┐          │
      │ CLOSED │          │
      └────────┘          │
```

### Valid Transitions

| From | Allowed To |
|------|-----------|
| REQUESTED | ACCEPTED, CANCELLED |
| ACCEPTED | ON_THE_WAY, CANCELLED |
| ON_THE_WAY | ARRIVED |
| ARRIVED | IN_PROGRESS |
| IN_PROGRESS | COMPLETED |
| COMPLETED | SUMMARY_SUBMITTED |
| SUMMARY_SUBMITTED | CLOSED |
| CLOSED | — |
| CANCELLED | — |

---

## 7. Frontend Architecture

### Mobile Apps (Patient & Provider)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Expo SDK 51 + React Native | Cross-platform mobile |
| Navigation | React Navigation (Stack + Tabs) | Screen routing |
| State (Auth) | Zustand + AsyncStorage | Persistent auth state |
| State (Server) | React Query | API data caching/fetching |
| HTTP Client | Axios | API communication |
| Location | expo-location | GPS coordinates |
| Maps | react-native-maps | Provider tracking |

### Admin Panel

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Server-side rendering |
| Styling | Tailwind CSS | Utility-first CSS |
| HTTP Client | Axios | API communication |
| Auth | localStorage-based JWT | Simple admin auth |

---

## 8. Database Design

- **PostgreSQL** as primary database
- **Prisma ORM** for type-safe queries and migrations
- **22+ models** covering the full domain
- Soft-delete not used in MVP (hard cascading deletes via foreign keys)
- Timestamps on all entities (`createdAt`, `updatedAt`)
- CUID for primary keys

See [DATA_MODEL.md](./DATA_MODEL.md) for full schema documentation.

---

## 9. Security Considerations

| Area | Approach |
|------|----------|
| Authentication | OTP + JWT (no passwords) |
| Authorization | Role-based guards (PATIENT, PROVIDER, ADMIN) |
| Data Encryption | HTTPS in transit, database-level encryption at rest |
| Phone Masking | Provider sees last 4 digits only |
| Document Storage | Signed URLs for license/report uploads |
| Input Validation | DTO validation via class-validator decorators |
| SQL Injection | Prisma parameterized queries |
| Audit Trail | AuditLog and AdminAction tables |

---

## 10. Scalability Considerations

| Concern | MVP Approach | Scale Approach |
|---------|-------------|----------------|
| Database | Single PostgreSQL | Read replicas, sharding |
| API | Single NestJS instance | Horizontal scaling, load balancer |
| Search | In-app Prisma queries | PostGIS, Elasticsearch |
| File Storage | Local/S3 | CDN + S3 |
| Notifications | Not in MVP | Push (FCM/APNS), SMS, Email |
| Real-time | Polling (10-15s) | WebSockets / SSE |
| Caching | None | Redis for session/search cache |

---

*Document Version: 1.0 (MVP)*
*Last Updated: April 2026*
