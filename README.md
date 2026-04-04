# Curex24

**Healthcare, anytime. Anywhere.**

Curex24 is an on-demand healthcare platform connecting patients with nearby doctors and care providers in real time. Based on availability, distance, and convenience, it intelligently recommends the best care option — **Home Visit** or **Doctor's Place Visit**.

---

## 🏗 Architecture

```
curex24/
├── apps/
│   ├── api/              # NestJS REST backend
│   ├── patient-app/      # Expo React Native — patient mobile app
│   ├── provider-app/     # Expo React Native — provider mobile app
│   └── admin/            # Next.js — admin web panel
├── packages/
│   ├── database/         # Prisma schema + client (PostgreSQL)
│   └── types/            # Shared TypeScript types
├── docs/                 # PRD, Architecture, API, Data Model, Setup
└── docker-compose.yml    # PostgreSQL for local dev
```

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Setup database
pnpm db:generate && pnpm db:migrate

# Run backend API (port 3000)
cd apps/api && pnpm dev

# Run patient mobile app (Expo)
cd apps/patient-app && pnpm start

# Run provider mobile app (Expo)
cd apps/provider-app && pnpm start

# Run admin panel (port 3001)
cd apps/admin && pnpm dev
```

## 📱 Mobile Apps

| App | Description | Tech |
|-----|-------------|------|
| **Patient App** | Service discovery, smart recommendation, booking, payment, tracking, consultation history | Expo, React Native, Zustand, React Query |
| **Provider App** | Availability management, booking workflow, consultation summary, earnings | Expo, React Native, Zustand, React Query |

## 🖥 Admin Panel

Next.js web dashboard for platform operations: provider verification, booking monitoring, diagnostics coordination.

**Login:** `admin@curex24.com` / `admin123`

## 📖 Documentation

- [Product Requirements (PRD)](docs/PRD.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Data Model](docs/DATA_MODEL.md)
- [Setup Guide](docs/SETUP.md)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 51, React Native, TypeScript |
| Backend | NestJS, Prisma, PostgreSQL |
| Admin | Next.js 14, Tailwind CSS |
| Auth | OTP + JWT |
| Monorepo | Turborepo, pnpm workspaces |
