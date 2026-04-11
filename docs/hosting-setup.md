# Hosting Setup Guide — Curex24

> Complete step-by-step guide to deploy Curex24 across production, staging, and development environments using **Railway** (API), **Vercel** (admin dashboard), **Supabase** (database), **Cloudflare** (DNS/CDN/SSL), and **Expo EAS** (mobile apps).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [DNS Structure (Cloudflare)](#dns-structure-cloudflare)
3. [Platform Assignment](#platform-assignment)
4. [Step 1 — Cloudflare DNS Setup](#step-1--cloudflare-dns-setup)
5. [Step 2 — Supabase Projects](#step-2--supabase-projects)
6. [Step 3 — Railway API Deployment](#step-3--railway-api-deployment)
7. [Step 4 — Vercel Admin Dashboard](#step-4--vercel-admin-dashboard)
8. [Step 5 — Mobile Apps (Expo EAS)](#step-5--mobile-apps-expo-eas)
9. [Step 6 — GitHub Secrets & Variables](#step-6--github-secrets--variables)
10. [Step 7 — CI/CD Pipeline Flow](#step-7--cicd-pipeline-flow)
11. [Security Hardening](#security-hardening)
12. [Performance Optimization](#performance-optimization)
13. [Monitoring & Observability](#monitoring--observability)
14. [Cost-Conscious Architecture](#cost-conscious-architecture)
15. [Rollback Procedures](#rollback-procedures)
16. [QA Checklist](#qa-checklist)

---

## Architecture Overview

```
                         ┌─────────────────────────────────┐
                         │        Cloudflare (DNS/CDN)      │
                         │   curex24.com — SSL, WAF, cache  │
                         └────────┬──────────┬──────────────┘
                                  │          │
               ┌──────────────────┤          ├──────────────────┐
               │                  │          │                  │
     ┌─────────▼────────┐  ┌─────▼──────┐  ┌▼─────────────┐  ┌▼──────────┐
     │   Railway         │  │  Vercel     │  │  Supabase     │  │  Expo EAS  │
     │   api.curex24.com │  │  admin.*    │  │  PostgreSQL   │  │  Mobile    │
     │   NestJS/Fastify  │  │  Next.js    │  │  Auth         │  │  Builds    │
     │   Docker          │  │  Edge SSR   │  │  Storage      │  │  OTA       │
     └──────────────────┘  └────────────┘  └──────────────┘  └────────────┘
```

### Why this architecture?

| Decision | Reason |
|----------|--------|
| **Railway for API** | Docker-native, auto-deploy from GitHub, persistent processes, WebSocket support, internal PostgreSQL option |
| **Vercel for Admin** | Native Next.js host, edge rendering, instant rollbacks, preview deploys on every PR |
| **Cloudflare for DNS** | Free SSL, WAF, DDoS protection, CDN caching for static assets, proxy mode hides origin IPs |
| **Supabase for DB** | Managed PostgreSQL, built-in Auth, Row-Level Security, Storage, real-time subscriptions |
| **Expo EAS for Mobile** | Native cloud builds, OTA updates, internal distribution for staging |

---

## DNS Structure (Cloudflare)

### 🟢 Production

| Subdomain | Target | Purpose |
|-----------|--------|---------|
| `curex24.com` | Vercel / Landing page | Main website |
| `app.curex24.com` | Vercel / Patient PWA | Patient portal |
| `api.curex24.com` | Railway (production) | Production API |
| `admin.curex24.com` | Vercel (production) | Admin dashboard |
| `ws.curex24.com` | Railway (production) | WebSocket endpoint |
| `cdn.curex24.com` | Cloudflare R2 / Supabase Storage | Static assets & media |

### 🟡 Staging

| Subdomain | Target | Purpose |
|-----------|--------|---------|
| `staging.curex24.com` | Vercel (staging) | Staging web app |
| `api.staging.curex24.com` | Railway (staging) | Staging API |
| `admin.staging.curex24.com` | Vercel (staging) | Staging admin |

### 🔵 Development

| Subdomain | Target | Purpose |
|-----------|--------|---------|
| `dev.curex24.com` | Vercel (dev preview) | Dev web app |
| `api.dev.curex24.com` | Railway (dev) | Dev API |
| `admin.dev.curex24.com` | Vercel (dev) | Dev admin |

### 🟣 Internal / Ops

| Subdomain | Target | Purpose |
|-----------|--------|---------|
| `status.curex24.com` | Betterstack / UptimeRobot | Status page |
| `docs.curex24.com` | Vercel / GitBook | API documentation |
| `mail.curex24.com` | MX + SPF/DKIM records | Transactional email |

---

## Platform Assignment

| Service | Platform | Branch → Deploy |
|---------|----------|----------------|
| API (production) | Railway | `main` → auto-deploy |
| API (staging) | Railway | `develop` → auto-deploy |
| Admin (production) | Vercel | `main` → auto-deploy |
| Admin (staging) | Vercel | `develop` → preview / branch deploy |
| Database (production) | Supabase | Separate project |
| Database (staging) | Supabase | Separate project |
| Mobile apps | Expo EAS | Manual builds per profile |
| DNS + SSL + CDN | Cloudflare | Managed externally |

---

## Step 1 — Cloudflare DNS Setup

### 1.1 Enable Cloudflare Proxy (Orange Cloud)

For all web-facing services, enable Cloudflare proxy to get:
- Free SSL/TLS (Full Strict mode)
- DDoS protection
- WAF rules
- Caching for static assets

### 1.2 SSL/TLS Configuration

1. Go to **SSL/TLS** → **Overview** → Set to **Full (strict)**
2. Go to **Edge Certificates** → Enable:
   - Always Use HTTPS ✅
   - Automatic HTTPS Rewrites ✅
   - Minimum TLS Version: **TLS 1.2**
   - HSTS: Enable with `max-age=31536000, includeSubDomains`

### 1.3 DNS Records to Create

```
# ── Production ────────────────────────────────────────────
# API → Railway
CNAME  api             <railway-production-domain>.up.railway.app   (Proxied ☁️)

# Admin → Vercel
CNAME  admin           cname.vercel-dns.com                          (Proxied ☁️)

# App → Vercel (patient portal)
CNAME  app             cname.vercel-dns.com                          (Proxied ☁️)

# Root → Vercel (landing page)
CNAME  @               cname.vercel-dns.com                          (Proxied ☁️)
# OR if root CNAME not supported:
A      @               76.76.21.21                                   (Proxied ☁️)

# WebSocket → Railway (same service or dedicated)
CNAME  ws              <railway-production-domain>.up.railway.app   (Proxied ☁️)

# CDN → Cloudflare R2 or Supabase Storage
CNAME  cdn             <r2-bucket>.r2.dev                           (Proxied ☁️)

# ── Staging ───────────────────────────────────────────────
CNAME  staging         cname.vercel-dns.com                          (Proxied ☁️)
CNAME  api.staging     <railway-staging-domain>.up.railway.app      (Proxied ☁️)
CNAME  admin.staging   cname.vercel-dns.com                          (Proxied ☁️)

# ── Development ──────────────────────────────────────────
CNAME  dev             cname.vercel-dns.com                          (Proxied ☁️)
CNAME  api.dev         <railway-dev-domain>.up.railway.app          (Proxied ☁️)
CNAME  admin.dev       cname.vercel-dns.com                          (Proxied ☁️)

# ── Internal / Ops ───────────────────────────────────────
CNAME  status          statuspage.betterstack.com                    (Proxied ☁️)
CNAME  docs            cname.vercel-dns.com                          (Proxied ☁️)

# ── Email (MX + SPF + DKIM) ─────────────────────────────
MX     mail            10 mx.your-email-provider.com                 (DNS only)
TXT    @               "v=spf1 include:_spf.provider.com ~all"       (DNS only)
TXT    mail._domainkey  "v=DKIM1; k=rsa; p=..."                     (DNS only)
```

### 1.4 Cloudflare Security Rules

Create WAF rules:

```
# Rate-limit API endpoints
Rule: URI Path contains "/api/"
  → Rate Limit: 100 requests/min per IP

# Block direct IP access
Rule: Hostname is not "*.curex24.com"
  → Block

# Challenge suspicious bot traffic
Rule: Bot Score < 30 AND URI Path contains "/api/v1/auth"
  → Managed Challenge
```

### 1.5 Cloudflare Cache Rules

```
# Cache static assets aggressively
Rule: URI Path matches "/assets/*" OR "/_next/static/*"
  → Cache TTL: 1 year
  → Browser TTL: 1 year

# Never cache API responses
Rule: URI Path starts with "/api/"
  → Cache Level: Bypass
```

---

## Step 2 — Supabase Projects

### 2.1 Create Two Separate Projects

| Project | Name | Purpose |
|---------|------|---------|
| Production | `curex24-production` | Live users, real data |
| Staging | `curex24-staging` | QA, demos, test data |

### 2.2 Production Project Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `curex24-production`
3. Region: Closest to users (e.g., `ap-south-1` for India)
4. Note down:
   - **Project URL**: `https://PROD_REF.supabase.co`
   - **Anon key**: for frontend apps
   - **Service role key**: for API backend only
   - **Database URL (pooler)**: for `DATABASE_URL`
   - **Database URL (direct)**: for `DIRECT_URL` (migrations)

### 2.3 Staging Project Setup

Same as above with name: `curex24-staging`

### 2.4 Apply Schema & Seed

```bash
# Production — apply migrations
DATABASE_URL="<production-direct-url>" \
  cd packages/database && npx prisma migrate deploy

# Staging — apply migrations + seed
DATABASE_URL="<staging-direct-url>" \
  cd packages/database && npx prisma migrate deploy

DATABASE_URL="<staging-direct-url>" \
  pnpm --filter @curex24/database db:seed:staging
```

### 2.5 Auth Redirect URLs

In each Supabase project → **Authentication → URL Configuration**:

**Production:**
```
https://curex24.com/**
https://app.curex24.com/**
https://admin.curex24.com/**
com.curex24.mobile://
com.curex24.patient://
com.curex24.provider://
```

**Staging:**
```
https://staging.curex24.com/**
https://admin.staging.curex24.com/**
com.curex24.mobile.staging://
com.curex24.patient.staging://
com.curex24.provider.staging://
```

---

## Step 3 — Railway API Deployment

### 3.1 Create Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Name: `curex24`
3. Create **two environments**: `production` and `staging`

### 3.2 Create API Service

1. **New Service** → **GitHub Repo** → Select `fcube2026/curex24`
2. **Settings:**
   - Root Directory: `/` (monorepo root — Dockerfile handles paths)
   - Builder: **Dockerfile** (uses `apps/api/Dockerfile`)
   - Watch Paths: `apps/api/**`, `packages/database/**`, `packages/types/**`
3. **Deploy Triggers:**
   - Production environment: deploy on push to `main`
   - Staging environment: deploy on push to `develop`

### 3.3 Environment Variables (Railway Dashboard)

Set in each environment (`production` / `staging`):

| Variable | Production Value | Staging Value |
|----------|-----------------|---------------|
| `APP_ENV` | `production` | `staging` |
| `NODE_ENV` | `production` | `production` |
| `PORT` | `3000` | `3000` |
| `DATABASE_URL` | Supabase prod pooler URL | Supabase staging pooler URL |
| `DIRECT_URL` | Supabase prod direct URL | Supabase staging direct URL |
| `JWT_SECRET` | Random 64-char string | Different random 64-char string |
| `JWT_EXPIRES_IN` | `7d` | `7d` |
| `ADMIN_EMAIL` | `admin@curex24.com` | `admin@staging.curex24.com` |
| `ADMIN_PASSWORD` | Strong password | Different password |
| `CORS_ORIGINS` | `https://curex24.com,https://app.curex24.com,https://admin.curex24.com` | `https://staging.curex24.com,https://admin.staging.curex24.com` |
| `SUPABASE_URL` | Prod Supabase URL | Staging Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod service role key | Staging service role key |

### 3.4 Custom Domains (Railway)

1. Go to **Service Settings → Networking → Custom Domain**
2. Add:
   - Production: `api.curex24.com`
   - Staging: `api.staging.curex24.com`
3. Railway provides a CNAME target — add this to Cloudflare DNS

### 3.5 Railway Health Checks

Railway auto-detects the health check from `railway.toml`:
- **Path**: `/` (returns `{"status":"ok","service":"Curex24 API","environment":"production"}`)
- **Timeout**: 300 seconds

### 3.6 Railway Scaling (Production)

In Railway dashboard → Service Settings:
- **Replicas**: Start with 1, scale to 2+ for HA
- **Memory**: 512 MB (NestJS typical usage)
- **CPU**: 1 vCPU
- **Auto-sleep**: Disabled for production, enabled for staging to save costs

### 3.7 Generate Railway Token

1. Go to [railway.app/account/tokens](https://railway.app/account/tokens)
2. Create a project-scoped token for `curex24`
3. Save as `RAILWAY_TOKEN` in GitHub Secrets

---

## Step 4 — Vercel Admin Dashboard

### 4.1 Import Project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import from GitHub: `fcube2026/curex24`
3. **Framework Preset**: Next.js
4. **Root Directory**: `apps/admin`
5. **Build Command**: `pnpm --filter @curex24/admin build`
6. **Install Command**: `pnpm install --frozen-lockfile`
7. **Output Directory**: `apps/admin/.next`

### 4.2 Environment Variables (Vercel Dashboard)

| Variable | Production | Staging (Preview) |
|----------|-----------|-------------------|
| `NEXT_PUBLIC_API_URL` | `https://api.curex24.com/api/v1` | `https://api.staging.curex24.com/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Prod Supabase URL | Staging Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod anon key | Staging anon key |

**Important**: In Vercel, set staging values for the **Preview** environment scope.

### 4.3 Custom Domains (Vercel)

1. Go to **Project Settings → Domains**
2. Add:
   - `admin.curex24.com` (Production)
   - `admin.staging.curex24.com` (linked to `develop` branch)
3. Vercel provides DNS instructions — update Cloudflare CNAME records

### 4.4 Git Integration

Vercel auto-deploys:
- **Production**: on push to `main`
- **Preview**: on push to any other branch (including `develop`)

To link `admin.staging.curex24.com` specifically to `develop`:
1. In **Domains** → `admin.staging.curex24.com`
2. Set **Git Branch**: `develop`

### 4.5 Vercel Security Headers

Already configured in `apps/admin/vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Static asset caching: 1 year for `/_next/static/`

---

## Step 5 — Mobile Apps (Expo EAS)

### 5.1 Build Profiles

Each mobile app (`mobile`, `patient-app`, `provider-app`) has `eas.json` with:

| Profile | Distribution | APP_ENV | API URL |
|---------|-------------|---------|---------|
| `development` | Internal | `development` | `http://localhost:3000/api/v1` |
| `staging` | Internal | `staging` | `https://api.staging.curex24.com/api/v1` |
| `production` | Store | `production` | `https://api.curex24.com/api/v1` |

### 5.2 Build Commands

```bash
# Staging build (internal distribution)
cd apps/mobile
eas build --profile staging --platform all

cd apps/patient-app
eas build --profile staging --platform all

cd apps/provider-app
eas build --profile staging --platform all

# Production build (store submission)
cd apps/mobile
eas build --profile production --platform all
```

### 5.3 App Variants

| Property | Dev | Staging | Production |
|----------|-----|---------|-----------|
| App Name | Curex24 Dev | Curex24 Staging | Curex24 |
| Bundle ID (iOS) | `com.curex24.mobile.dev` | `com.curex24.mobile.staging` | `com.curex24.mobile` |
| Package (Android) | `com.curex24.mobile.dev` | `com.curex24.mobile.staging` | `com.curex24.mobile` |

---

## Step 6 — GitHub Secrets & Variables

### Repository Settings → Environments

Create two environments: **staging** and **production**.

### `staging` environment

**Secrets** (encrypted):
| Name | Value |
|------|-------|
| `STAGING_DATABASE_URL` | Supabase staging pooler URL |
| `STAGING_DIRECT_URL` | Supabase staging direct URL |
| `RAILWAY_TOKEN` | Railway project token |

**Variables** (visible):
| Name | Value |
|------|-------|
| `RAILWAY_STAGING_SERVICE_ID` | Railway staging service UUID |

### `production` environment

**Secrets** (encrypted):
| Name | Value |
|------|-------|
| `PRODUCTION_DATABASE_URL` | Supabase production pooler URL |
| `PRODUCTION_DIRECT_URL` | Supabase production direct URL |
| `RAILWAY_TOKEN` | Same Railway project token |

**Variables** (visible):
| Name | Value |
|------|-------|
| `RAILWAY_PRODUCTION_SERVICE_ID` | Railway production service UUID |

---

## Step 7 — CI/CD Pipeline Flow

### Branch Strategy

```
feature/* ─── PR ───► develop ─── PR ───► main
                        │                   │
                   CI + Deploy          CI + Deploy
                   to Staging          to Production
                        │                   │
                ┌───────┴───────┐   ┌───────┴───────┐
                │  Railway      │   │  Railway      │
                │  (staging)    │   │  (production) │
                │               │   │               │
                │  Vercel       │   │  Vercel       │
                │  (preview)    │   │  (production) │
                └───────────────┘   └───────────────┘
```

### Pipeline Steps

| Stage | Description | Trigger |
|-------|-------------|---------|
| **Lint & Typecheck** | ESLint, Prettier, TypeScript | Every push |
| **Build** | Compile API + Admin | Every push |
| **Test** | Jest (API unit + mobile) | Every push |
| **Migrate DB** | `prisma migrate deploy` | On deploy |
| **Deploy API** | Railway CLI push | `develop` → staging, `main` → production |
| **Deploy Admin** | Vercel auto-deploy | `develop` → preview, `main` → production |
| **Health Check** | `curl` API health endpoint | After deploy |

### What Happens on Each Push

| Push to | CI | Deploy API (Railway) | Deploy Admin (Vercel) |
|---------|-----|---------------------|----------------------|
| `feature/*` | ✅ PR checks | ❌ | Vercel preview URL |
| `develop` | ✅ | ✅ staging | ✅ admin.staging.curex24.com |
| `main` | ✅ | ✅ production | ✅ admin.curex24.com |

---

## Security Hardening

### SSL/TLS
- Cloudflare **Full (strict)** mode — origin ↔ Cloudflare encrypted
- HSTS enabled with `includeSubDomains`
- Minimum TLS 1.2

### API Security
- CORS restricted to specific domains per environment
- JWT auth on all endpoints (except `@Public()`)
- Request validation via `ValidationPipe` with `forbidNonWhitelisted`
- Rate limiting via Cloudflare WAF rules

### Secrets Management
- All secrets in GitHub Secrets / Railway / Vercel environment variables
- No secrets in code or `.env` files committed to git
- Separate JWT secrets per environment
- Supabase service role keys only in backend, never in frontend

### Network
- Cloudflare proxy hides Railway/Vercel origin IPs
- Railway internal networking for future microservices
- Supabase connection via SSL-encrypted pooler

### Headers (Admin Dashboard)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## Performance Optimization

### Cloudflare CDN
- Static assets cached at edge (1 year TTL)
- API responses bypassed from cache
- Brotli compression enabled

### Railway API
- Node.js `--max-old-space-size` tuned to container memory
- Prisma connection pooling via Supabase pgBouncer
- Health check endpoint for zero-downtime deploys

### Vercel Admin
- Next.js ISR/SSR at the edge
- Static assets immutably cached
- Automatic code splitting
- `ignoreCommand` skips rebuild when admin code hasn't changed

### Database
- Supabase connection pooler (pgBouncer) for API connections
- Direct connection only for migrations
- Indexes defined in Prisma schema

---

## Monitoring & Observability

### Recommended Stack

| Tool | Purpose | Cost |
|------|---------|------|
| **Railway Metrics** | API CPU, memory, request count | Free (included) |
| **Vercel Analytics** | Admin dashboard performance | Free tier |
| **Betterstack / UptimeRobot** | Uptime monitoring + status page | Free tier |
| **Sentry** | Error tracking (API + frontend) | Free tier (5K events/mo) |
| **Cloudflare Analytics** | Traffic, security events, cache hit rate | Free (included) |

### Health Check Endpoints

| URL | Expected Response |
|-----|-------------------|
| `https://api.curex24.com/` | `{"status":"ok","service":"Curex24 API","environment":"production"}` |
| `https://api.curex24.com/api/v1/version` | `{"version":"0.0.1","environment":"production","timestamp":"..."}` |
| `https://api.staging.curex24.com/` | `{"status":"ok","service":"Curex24 API","environment":"staging"}` |

### Uptime Monitors to Create

| Monitor | URL | Check Interval |
|---------|-----|---------------|
| API Production | `https://api.curex24.com/` | 1 min |
| API Staging | `https://api.staging.curex24.com/` | 5 min |
| Admin Production | `https://admin.curex24.com` | 5 min |
| Admin Staging | `https://admin.staging.curex24.com` | 15 min |

### Status Page

1. Create a Betterstack status page at `status.curex24.com`
2. Add monitors for all production services
3. Configure incident notifications to team Slack/email

---

## Cost-Conscious Architecture

### Monthly Cost Estimate

| Service | Plan | Estimated Cost |
|---------|------|---------------|
| Railway (API — production) | Pro | ~$5–20/mo (usage-based) |
| Railway (API — staging) | Pro (auto-sleep) | ~$2–5/mo |
| Vercel (admin) | Pro | $20/mo (team) |
| Supabase (production) | Free → Pro | $0–25/mo |
| Supabase (staging) | Free | $0/mo |
| Cloudflare (DNS + CDN) | Free | $0/mo |
| Expo EAS | Free tier | $0/mo (limited builds) |
| **Total** | | **~$27–70/mo** |

### Cost Optimization Tips

1. **Railway staging auto-sleep**: Enable for staging service to avoid idle charges
2. **Supabase staging on free tier**: Sufficient for QA/demos
3. **Vercel ignoreCommand**: Skip admin rebuilds when only API code changes
4. **Cloudflare caching**: Offload static assets to reduce origin bandwidth
5. **EAS build caching**: Use `eas build` only when mobile code changes

---

## Rollback Procedures

### API Rollback (Railway)

```bash
# Option 1: Redeploy previous commit via Railway dashboard
# Go to Deployments → select previous successful deploy → Redeploy

# Option 2: Via Railway CLI
railway up --service <service-id> --commit <previous-sha> --detach

# Option 3: Revert in git
git revert HEAD
git push origin main  # triggers production deploy
```

### Admin Rollback (Vercel)

```bash
# Vercel → Deployments → find previous deploy → Promote to Production
# This is instant — no rebuild required
```

### Database Rollback

```bash
# ⚠️ Prisma does not support down migrations natively.
# Create a corrective migration:
cd packages/database
npx prisma migrate dev --name rollback_xyz

# Then deploy:
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```

---

## QA Checklist

### Pre-Launch Verification

- [ ] **DNS**: All CNAME records created in Cloudflare
- [ ] **SSL**: Full (strict) mode enabled, HSTS active
- [ ] **Supabase**: Production and staging projects created with separate keys
- [ ] **Railway**: Production and staging environments configured
- [ ] **Vercel**: Admin deployed with correct `NEXT_PUBLIC_API_URL`
- [ ] **API health**: `curl https://api.curex24.com/` returns `{"status":"ok"}`
- [ ] **API version**: `curl https://api.curex24.com/api/v1/version` returns version info
- [ ] **Admin access**: `https://admin.curex24.com` loads and login works
- [ ] **Staging API**: `curl https://api.staging.curex24.com/` returns `{"status":"ok","environment":"staging"}`
- [ ] **Staging admin**: `https://admin.staging.curex24.com` loads
- [ ] **CORS**: No CORS errors when admin calls API
- [ ] **Mobile staging build**: Installs with "Curex24 Staging" name, connects to staging API
- [ ] **Environment isolation**: Staging DB has no production data
- [ ] **Seed data**: Staging has demo patients, providers, bookings
- [ ] **GitHub Secrets**: All secrets configured in staging + production environments
- [ ] **CI/CD**: Push to `develop` triggers staging deploy, push to `main` triggers production deploy
- [ ] **Monitoring**: Uptime monitors configured for production services
- [ ] **WAF**: Rate limiting rules active on Cloudflare
- [ ] **No production keys in staging**: Verified separation

### Environment Validation

Run the validation script:
```bash
source apps/api/.env.staging
APP_ENV=staging bash scripts/validate-env.sh
```

---

## File Reference

| File | Purpose |
|------|---------|
| `railway.toml` | Railway build + deploy configuration |
| `apps/admin/vercel.json` | Vercel config with security headers + caching |
| `.github/workflows/deploy-staging.yml` | CI/CD: develop → Railway + Vercel staging |
| `.github/workflows/deploy-production.yml` | CI/CD: main → Railway + Vercel production |
| `apps/api/.env.staging.example` | API staging environment template |
| `apps/api/.env.production.example` | API production environment template |
| `apps/admin/.env.staging.example` | Admin staging environment template |
| `apps/admin/.env.production.example` | Admin production environment template |
| `apps/mobile/eas.json` | Expo build profiles (dev/staging/prod) |
| `apps/mobile/app.config.ts` | Dynamic app config with variant support |
| `scripts/validate-env.sh` | Environment variable validation script |
| `docs/staging-environment.md` | Staging environment details |
