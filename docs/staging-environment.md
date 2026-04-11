# Staging Environment — Setup & Operations Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Monorepo                              │
│  main branch ──────► Production Environment                        │
│  develop branch ───► Staging Environment                           │
│  feature/* ────────► Local Development                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────── STAGING ──────────┐    ┌─────────── PRODUCTION ─────────┐
│                              │    │                                │
│  ┌──────────────────────┐    │    │  ┌──────────────────────┐      │
│  │  API (Fastify/Nest)  │    │    │  │  API (Fastify/Nest)  │      │
│  │  api.staging.curex24  │    │    │  │  api.curex24.com     │      │
│  └──────────┬───────────┘    │    │  └──────────┬───────────┘      │
│             │                │    │             │                  │
│  ┌──────────▼───────────┐    │    │  ┌──────────▼───────────┐      │
│  │  Supabase (Staging)  │    │    │  │  Supabase (Prod)     │      │
│  │  Separate project    │    │    │  │  Separate project    │      │
│  │  • DB + Auth + Store │    │    │  │  • DB + Auth + Store │      │
│  └──────────────────────┘    │    │  └──────────────────────┘      │
│                              │    │                                │
│  ┌──────────────────────┐    │    │  ┌──────────────────────┐      │
│  │  Admin Dashboard     │    │    │  │  Admin Dashboard     │      │
│  │  admin.staging.curex24│    │    │  │  admin.curex24.com   │      │
│  └──────────────────────┘    │    │  └──────────────────────┘      │
│                              │    │                                │
│  ┌──────────────────────┐    │    │  ┌──────────────────────┐      │
│  │  Mobile Apps         │    │    │  │  Mobile Apps         │      │
│  │  .staging bundle IDs │    │    │  │  Production IDs      │      │
│  └──────────────────────┘    │    │  └──────────────────────┘      │
└──────────────────────────────┘    └────────────────────────────────┘
```

---

## Environments

| Environment   | Branch    | Trigger             | Purpose              |
|---------------|-----------|---------------------|----------------------|
| Development   | `feature/*` | Local               | Developer workstation|
| Staging       | `develop` | Push to `develop`   | QA, demos, UAT       |
| Production    | `main`    | Push to `main`      | Live users           |

---

## Git Branching Strategy

```
feature/xyz ──► develop (staging) ──► main (production)
                  ▲                      ▲
                  │                      │
            PR + Review            PR + Review
            CI passes              CI passes
            QA on staging          Final sign-off
```

### Rules

1. **Feature branches** (`feature/*`) are created from `develop`
2. **Pull requests** to `develop` trigger CI (lint, test, build)
3. **Merging to `develop`** triggers staging deployment
4. **Pull requests** from `develop` to `main` require QA sign-off
5. **Merging to `main`** triggers production deployment
6. **Never** push directly to `main` or `develop`

---

## Service URLs

| Service            | Staging URL                          | Production URL                |
|--------------------|--------------------------------------|-------------------------------|
| API                | `https://api.staging.curex24.com`    | `https://api.curex24.com`     |
| Admin Dashboard    | `https://admin.staging.curex24.com`  | `https://admin.curex24.com`   |
| Supabase Dashboard | Staging project console              | Production project console    |
| API Health         | `GET /`                              | `GET /`                       |
| API Version        | `GET /api/v1/version`                | `GET /api/v1/version`         |

---

## Environment Variables

### API Backend

| Variable                     | Development                     | Staging                               | Production                            |
|------------------------------|---------------------------------|---------------------------------------|---------------------------------------|
| `APP_ENV`                    | `development`                   | `staging`                             | `production`                          |
| `NODE_ENV`                   | `development`                   | `production`                          | `production`                          |
| `DATABASE_URL`               | Local PostgreSQL                | Staging Supabase (pooler)             | Production Supabase (pooler)          |
| `DIRECT_URL`                 | Local PostgreSQL                | Staging Supabase (direct)             | Production Supabase (direct)          |
| `JWT_SECRET`                 | Dev default                     | Unique staging secret                 | Unique production secret              |
| `CORS_ORIGINS`               | `*`                             | Staging domains only                  | Production domains only               |
| `SUPABASE_URL`               | —                               | Staging project URL                   | Production project URL                |
| `SUPABASE_SERVICE_ROLE_KEY`  | —                               | Staging service role key              | Production service role key           |

### Admin Dashboard (Next.js)

| Variable                          | Development                | Staging                              | Production                         |
|-----------------------------------|----------------------------|--------------------------------------|------------------------------------|
| `NEXT_PUBLIC_API_URL`             | `http://localhost:3000/api/v1` | `https://api.staging.curex24.com/api/v1` | `https://api.curex24.com/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL`        | —                          | Staging Supabase URL                 | Production Supabase URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | —                          | Staging anon key                     | Production anon key                |

### Mobile Apps (Expo)

| Variable                          | Development                | Staging                              | Production                         |
|-----------------------------------|----------------------------|--------------------------------------|------------------------------------|
| `APP_ENV`                         | `development`              | `staging`                            | `production`                       |
| `EXPO_PUBLIC_API_URL`             | `http://localhost:3000/api/v1` | `https://api.staging.curex24.com/api/v1` | `https://api.curex24.com/api/v1` |
| `EXPO_PUBLIC_SUPABASE_URL`        | —                          | Staging Supabase URL                 | Production Supabase URL            |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`   | —                          | Staging anon key                     | Production anon key                |

---

## Supabase Setup (Database + Auth + Storage)

### Isolation Strategy

Create **two separate Supabase projects**:

| Aspect              | Staging Project              | Production Project           |
|---------------------|------------------------------|------------------------------|
| Project name        | `curex24-staging`            | `curex24-production`         |
| API keys            | Separate                     | Separate                     |
| Auth users          | Test/demo only               | Real users                   |
| Storage buckets     | `staging-*` prefix           | Standard names               |
| Row-level security  | Enabled (same policies)      | Enabled (same policies)      |

### Auth Configuration

In your Supabase staging project dashboard:

1. Go to **Authentication → URL Configuration**
2. Add staging redirect URLs:
   - `https://admin.staging.curex24.com/**`
   - `com.curex24.mobile.staging://`
   - `com.curex24.patient.staging://`
   - `com.curex24.provider.staging://`

### Migration Flow

```
Local dev → prisma migrate dev     (creates migration files)
Staging   → prisma migrate deploy  (applies pending migrations)
Production→ prisma migrate deploy  (applies same migrations)
```

### Seeding Staging

```bash
# Run base seed (providers, patients, bookings)
pnpm --filter @curex24/database db:seed

# Run staging-specific seed (extra demo data)
pnpm --filter @curex24/database db:seed:staging

# Or run both together:
DATABASE_URL="staging-url" pnpm --filter @curex24/database db:seed:staging
```

---

## Deployment Steps

### 1. Supabase Setup (one-time)

```bash
# 1. Create a new Supabase project for staging at https://supabase.com
# 2. Note down:
#    - Project URL (SUPABASE_URL)
#    - Anon key (SUPABASE_ANON_KEY)
#    - Service role key (SUPABASE_SERVICE_ROLE_KEY)
#    - Database connection strings (DATABASE_URL, DIRECT_URL)

# 3. Apply schema to staging DB
DATABASE_URL="staging-direct-url" \
  DIRECT_URL="staging-direct-url" \
  cd packages/database && npx prisma migrate deploy

# 4. Seed staging data
DATABASE_URL="staging-direct-url" \
  pnpm --filter @curex24/database db:seed:staging
```

### 2. API Backend Deployment

#### Option A: Render

1. Create a new **Web Service** on Render
2. Connect to the GitHub repo
3. Set:
   - **Root directory**: (leave empty, uses monorepo root)
   - **Build command**: `pnpm install && pnpm --filter @curex24/database db:generate && pnpm --filter @curex24/api build`
   - **Start command**: `cd apps/api && node dist/main`
   - **Branch**: `develop`
4. Add all staging environment variables
5. Add a deploy hook to `.github/workflows/deploy-staging.yml`

#### Option B: Docker

```bash
# Build staging API image
docker build -f apps/api/Dockerfile -t curex24-api:staging .

# Run with staging env
docker run -p 3000:3000 --env-file apps/api/.env.staging curex24-api:staging
```

#### Option C: docker-compose

```bash
docker compose -f docker-compose.staging.yml up --build -d
```

### 3. Admin Dashboard Deployment

#### Vercel (recommended)

1. Import the repo on Vercel
2. Set **Root Directory** to `apps/admin`
3. Set **Framework Preset** to Next.js
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = staging API URL
   - `NEXT_PUBLIC_SUPABASE_URL` = staging Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging anon key
5. Set **Git Branch** to `develop`
6. Deploy

### 4. Mobile App (Expo)

```bash
# Build staging variant for internal distribution
cd apps/mobile
eas build --profile staging --platform all

# The staging build will have:
#   - App name: "Curex24 Staging"
#   - Bundle ID: com.curex24.mobile.staging
#   - All env vars pointing to staging services
```

---

## GitHub Secrets & Variables

Configure in **Settings → Environments** on GitHub:

### `staging` environment

**Secrets** (encrypted):
- `STAGING_DATABASE_URL` — Supabase pooler connection string
- `STAGING_DIRECT_URL` — Supabase direct connection string
- `STAGING_JWT_SECRET` — JWT signing secret
- `STAGING_SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key

**Variables** (visible):
- `STAGING_API_URL` — `https://api.staging.curex24.com`
- `STAGING_ADMIN_URL` — `https://admin.staging.curex24.com`

### `production` environment

**Secrets** (encrypted):
- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_DIRECT_URL`
- `PRODUCTION_JWT_SECRET`
- `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`

**Variables** (visible):
- `PRODUCTION_API_URL` — `https://api.curex24.com`
- `PRODUCTION_ADMIN_URL` — `https://admin.curex24.com`

---

## Staging Data Policy

| Rule | Details |
|------|---------|
| ✅ Use seed/demo data only | `pnpm --filter @curex24/database db:seed:staging` |
| ✅ Synthetic phone numbers | `+99xxxxx` prefix for staging users |
| ❌ Never copy production data | No `pg_dump` from production to staging |
| ❌ Never use real user data | All PII is fake/synthetic |
| ✅ Resettable | `prisma migrate reset` + re-seed at any time |

---

## Mobile App Variants

| Property       | Development           | Staging                    | Production           |
|----------------|-----------------------|----------------------------|----------------------|
| App name       | Curex24 Dev           | Curex24 Staging            | Curex24              |
| Bundle ID (iOS)| com.curex24.mobile.dev| com.curex24.mobile.staging | com.curex24.mobile   |
| Package (Android)| com.curex24.mobile.dev| com.curex24.mobile.staging| com.curex24.mobile   |
| API URL        | localhost:3000        | api.staging.curex24.com    | api.curex24.com      |
| Distribution   | Development client    | Internal                   | App Store / Play Store|

---

## Environment Validation

Run the validation script to check your configuration:

```bash
# Source your env file then validate
source apps/api/.env.staging
APP_ENV=staging bash scripts/validate-env.sh
```

---

## Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct approach |
|-----------|---------------------|
| Staging API pointing to production DB | Use separate Supabase project with separate connection strings |
| Using production API keys in staging | Generate fresh keys for staging Supabase project |
| Sharing storage buckets | Create separate buckets in staging Supabase project |
| Running migrations on production directly | Always test migrations on staging first, then deploy to production |
| Committing `.env` files with real keys | Use `.env.*.example` files, store real values in GitHub Secrets |
| Same JWT secret in staging and production | Use unique, strong secrets per environment |

---

## Rollback Steps

### API Rollback

```bash
# Revert to previous deployment on Render:
# Dashboard → Manual Deploy → select previous commit

# Or via Docker:
docker pull registry/curex24-api:previous-tag
docker stop curex24-api-staging
docker run -d --name curex24-api-staging registry/curex24-api:previous-tag
```

### Database Rollback

```bash
# ⚠️  Prisma does not natively support down migrations.
# Create a new migration that reverses the problematic changes.
cd packages/database
npx prisma migrate dev --name rollback_xyz
```

### Admin Dashboard Rollback

```bash
# On Vercel: Deployments → select previous → Promote to Production
# Or redeploy from a specific commit
```

---

## QA Checklist

Before declaring staging ready, verify:

- [ ] **API health check**: `curl https://api.staging.curex24.com/` returns `{"status":"ok"}`
- [ ] **API version**: `curl https://api.staging.curex24.com/api/v1/version` returns version info
- [ ] **Database isolation**: Staging DB has no production data
- [ ] **Seed data loaded**: Demo patients, providers, and bookings exist
- [ ] **Admin dashboard**: Accessible at staging URL, can log in
- [ ] **Admin → API**: Admin panel successfully calls staging API
- [ ] **Mobile staging build**: Installs with "Curex24 Staging" name
- [ ] **Mobile → API**: Mobile app connects to staging API
- [ ] **Auth flow**: Login/signup works on staging Supabase
- [ ] **CORS**: No CORS errors from staging frontend domains
- [ ] **No production keys**: Verified no production secrets in staging config
- [ ] **Environment validation**: `scripts/validate-env.sh` passes
- [ ] **CI pipeline**: `deploy-staging.yml` runs successfully on `develop` push
- [ ] **Team access**: All team members can access staging services

---

## File Structure Reference

```
curex24/
├── .github/workflows/
│   ├── ci.yml                        # CI for PRs (lint, build, test)
│   ├── deploy-staging.yml            # Staging deploy on develop push
│   └── deploy-production.yml         # Production deploy on main push
├── apps/
│   ├── api/
│   │   ├── .env.example              # Development env template
│   │   ├── .env.staging.example      # Staging env template
│   │   ├── .env.production.example   # Production env template
│   │   └── src/app.controller.ts     # /health and /version endpoints
│   ├── admin/
│   │   ├── .env.example              # Development env template
│   │   ├── .env.staging.example      # Staging env template
│   │   └── next.config.js            # Supports standalone output
│   ├── mobile/
│   │   ├── app.config.ts             # Dynamic config (dev/staging/prod)
│   │   └── eas.json                  # EAS build profiles
│   ├── patient-app/
│   │   └── eas.json                  # EAS build profiles
│   └── provider-app/
│       └── eas.json                  # EAS build profiles
├── packages/database/
│   ├── .env.example                  # DB connection templates
│   └── prisma/
│       ├── seed.ts                   # Base seed data
│       └── seed-staging.ts           # Additional staging demo data
├── docker-compose.yml                # Local development stack
├── docker-compose.staging.yml        # Staging deployment stack
├── docs/
│   └── staging-environment.md        # This document
└── scripts/
    └── validate-env.sh               # Environment validation script
```
