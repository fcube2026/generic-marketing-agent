# Curex24

**Healthcare, anytime. Anywhere.**

Curex24 is an on-demand healthcare platform connecting patients with nearby doctors and care providers in real time. Based on availability, distance, and convenience, it intelligently recommends the best care option — **Home Visit** or **Doctor's Place Visit**.

---

## 🏗 Architecture

```
curex24/
├── apps/
│   ├── api/              # NestJS REST backend
│   ├── mobile/           # Expo React Native — unified mobile app (patient + provider)
│   ├── patient-app/      # Expo React Native — patient mobile app (legacy, to be deprecated)
│   ├── provider-app/     # Expo React Native — provider mobile app (legacy, to be deprecated)
│   └── admin/            # Next.js — admin web panel
├── packages/
│   ├── database/         # Prisma schema + client (PostgreSQL)
│   └── types/            # Shared TypeScript types
├── docs/                 # PRD, Architecture, API, Data Model, Setup
└── docker-compose.yml    # PostgreSQL for local dev
```

## 🚀 Quick Start

### Option 1: Docker (Recommended — No Local Setup Required)

Run the entire stack with a single command:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, the API (port 3000), and the admin panel (port 3001). The database schema is applied automatically on startup.

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Admin Panel | http://localhost:3001 |

To stop all services:

```bash
docker compose down
```

To reset the database:

```bash
docker compose down -v
docker compose up --build
```

### Option 2: Manual Local Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d postgres redis

# Setup database
pnpm db:generate && pnpm db:migrate

# Run backend API (port 3000)
cd apps/api && pnpm dev

# Run unified mobile app (Expo)
cd apps/mobile && pnpm start

# Run admin panel (port 3001)
cd apps/admin && pnpm dev
```

## 📱 Mobile Apps

| App | Description | Tech |
|-----|-------------|------|
| **Mobile** *(primary)* | Unified app with role selection at launch — patients book care, providers manage availability and bookings | Expo, React Native, Zustand, React Query |
| **Patient App** *(legacy)* | Service discovery, smart recommendation, booking, payment, tracking, consultation history | Expo, React Native, Zustand, React Query |
| **Provider App** *(legacy)* | Availability management, booking workflow, consultation summary, earnings | Expo, React Native, Zustand, React Query |

## 🖥 Admin Panel

Next.js web dashboard for platform operations: provider verification, booking monitoring, diagnostics coordination.

**Login:** `admin@curex24.com` / `admin123`

## 📖 Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Data Model](docs/DATA_MODEL.md)
- [Setup Guide](docs/SETUP.md)

## 🧪 Testing

```bash
# Run all tests from the root
pnpm test

# Run API tests only
cd apps/api && pnpm test

# Run API tests with coverage report
cd apps/api && npx jest --coverage

# Run a specific test file
cd apps/api && npx jest --no-coverage src/modules/auth/auth.service.spec.ts
```

Tests use [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/) and are colocated with their modules as `*.spec.ts` files under `apps/api/src/modules/`.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 51, React Native, TypeScript |
| Backend | NestJS, Prisma, PostgreSQL |
| Admin | Next.js 14, Tailwind CSS |
| Auth | OTP + JWT |
| Monorepo | Turborepo, pnpm workspaces |
