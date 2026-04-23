# Doctor Portal (`@curex24/doctor-portal`)

The **Doctor Portal** is a Next.js 15 web application that allows healthcare providers (doctors) to manage their consultations, track earnings, and view their professional profile — all from a single dashboard.

---

## Quick Start

```bash
# From the monorepo root
pnpm install
pnpm --filter @curex24/doctor-portal dev
```

Open [http://localhost:3003](http://localhost:3003) in your browser.

---

## Directory Structure

```
apps/doctor-portal/
├── package.json              # @curex24/doctor-portal (port 3003)
├── next.config.js            # Next.js config (standalone output support)
├── vercel.json               # Vercel deployment config
├── tailwind.config.js        # Tailwind CSS with blue primary color
├── postcss.config.js         # PostCSS config
├── tsconfig.json             # TypeScript config
├── .eslintrc.json            # ESLint (next/core-web-vitals)
├── .env.example              # Local environment variables
├── .env.staging.example      # Staging environment variables
├── .env.production.example   # Production environment variables
└── src/
    ├── middleware.ts          # Route protection via provider_token cookie
    ├── lib/
    │   └── api.ts            # Axios client with auto env detection
    ├── app/
    │   ├── layout.tsx        # Root layout
    │   ├── page.tsx          # Redirects to /dashboard
    │   ├── globals.css       # Tailwind base styles
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx  # OTP-based login (send-otp → verify-otp)
    │   └── (dashboard)/
    │       ├── layout.tsx    # Sidebar + Header wrapper
    │       ├── dashboard/page.tsx
    │       ├── consultations/page.tsx
    │       ├── earnings/page.tsx
    │       └── profile/page.tsx
    └── components/
        ├── layout/
        │   ├── Sidebar.tsx   # Navigation sidebar
        │   └── Header.tsx    # Top bar with logout
        └── ui/               # Reusable UI components (extensible)
```

---

## Authentication

The portal uses **OTP-based authentication** via the existing API endpoints:

1. **Send OTP** — `POST /api/v1/auth/send-otp` with `{ phone }`
2. **Verify OTP** — `POST /api/v1/auth/verify-otp` with `{ phone, otp }`

On successful verification, the JWT token is stored in:
- `localStorage` as `provider_token` (for API requests via axios interceptor)
- A `provider_token` cookie (for Next.js middleware route protection)

### Route Protection

`src/middleware.ts` checks for a valid JWT structure in the `provider_token` cookie:
- If missing/invalid → redirect to `/login`
- If present on `/login` → redirect to `/dashboard`

---

## API Client

`src/lib/api.ts` creates an Axios instance with automatic environment detection:

| Hostname pattern | API base URL |
|---|---|
| Contains `staging` | `https://api.staging.curex24.com/api/v1` |
| `localhost` / `127.0.0.1` | `http://localhost:3000/api/v1` |
| Everything else | `https://api.curex24.com/api/v1` |

The `NEXT_PUBLIC_API_URL` environment variable overrides the auto-detection for local development.

---

## Pages

| Route | Description |
|---|---|
| `/login` | OTP-based doctor login |
| `/dashboard` | Overview: today's consultations, upcoming, completed, earnings |
| `/consultations` | List of all consultations with status badges |
| `/earnings` | Earnings summary: total, pending payout, last payout |
| `/profile` | Doctor profile: name, phone, specialization, license, verification status |

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL (baked at build time) | Yes |

---

## Deployment

### Vercel (CI/CD)

The portal deploys to Vercel via GitHub Actions:

- **Staging:** Triggered on push to `develop` branch (or manual `workflow_dispatch`)
- **Production:** Triggered on push to `main` branch

Required GitHub Secrets:
- `VERCEL_TOKEN` — Vercel authentication token
- `VERCEL_ORG_ID` — Vercel organization ID
- `VERCEL_DOCTOR_PORTAL_PROJECT_ID` — Vercel project ID for doctor-portal

### URLs

| Environment | URL |
|---|---|
| Local | http://localhost:3003 |
| Staging | https://doctor.staging.curex24.com |
| Production | https://doctor.curex24.com |

---

## Scripts

```bash
pnpm --filter @curex24/doctor-portal dev       # Start dev server on port 3003
pnpm --filter @curex24/doctor-portal build     # Production build
pnpm --filter @curex24/doctor-portal start     # Start production server
pnpm --filter @curex24/doctor-portal lint      # Run ESLint
```

---

## Design Decisions

- **Follows `apps/admin` patterns** — Same project structure, Tailwind setup, Vercel deploy config, and middleware approach.
- **Blue primary color** (`#2563EB`) to distinguish from admin's teal palette.
- **OTP login** (not email/password) because doctors authenticate via phone in the mobile app.
- **Provider token** namespace (`provider_token`) separate from admin's `admin_token` to avoid cookie conflicts.
- **Port 3003** to avoid collisions with API (3000), admin (3001), and landing (3002).
