# Curex24 — Local Development Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18.x | [nodejs.org](https://nodejs.org/) |
| pnpm | ≥ 9.x | `npm install -g pnpm@9` |
| Docker | Latest | [docker.com](https://www.docker.com/) |
| Expo CLI | Latest | Installed via npx |

---

## 1. Clone & Install

```bash
git clone https://github.com/fcube2026/curex24.git
cd curex24
pnpm install
```

---

## 2. Start Database

```bash
docker-compose up -d
```

This starts a PostgreSQL instance:
- **Host:** localhost
- **Port:** 5432
- **Database:** curex24
- **Username:** curex24
- **Password:** curex24_pass

---

## 3. Configure Environment

Create `.env` in `apps/api/`:

```bash
cp apps/api/.env.example apps/api/.env
```

Default `.env` contents:

```env
DATABASE_URL="postgresql://curex24:curex24_pass@localhost:5432/curex24?schema=public"
JWT_SECRET="curex24-jwt-secret-change-in-production"
PORT=3000
NODE_ENV=development
```

---

## 4. Setup Database Schema

Generate Prisma client and run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Or directly:

```bash
cd packages/database
npx prisma generate
npx prisma db push
```

---

## 5. Run Applications

### Backend API

```bash
cd apps/api
pnpm dev
```

API will be available at `http://localhost:3000`

### Unified Mobile App (Primary)

```bash
cd apps/mobile
pnpm start
```

On first launch, users will see the **RoleSelect** screen and choose "I'm a Patient" or "I'm a Doctor". The selected role is passed through the OTP verification and stored in the user's account.

Scan QR code with Expo Go app on your phone, or press:
- `a` for Android emulator
- `i` for iOS simulator

### Patient Mobile App *(legacy)*

```bash
cd apps/patient-app
pnpm start
```

Scan QR code with Expo Go app on your phone, or press:
- `a` for Android emulator
- `i` for iOS simulator

### Provider Mobile App *(legacy)*

```bash
cd apps/provider-app
pnpm start
```

### Admin Panel

```bash
cd apps/admin
pnpm dev
```

Admin panel will be available at `http://localhost:3001`

**Default admin credentials:**
- Email: `admin@curex24.com`
- Password: `admin123`

---

## 6. Project Structure

```
curex24/
├── apps/
│   ├── api/              # NestJS backend (port 3000)
│   ├── mobile/           # Expo React Native — unified mobile app (primary)
│   ├── patient-app/      # Expo React Native — patient mobile (legacy)
│   ├── provider-app/     # Expo React Native — provider mobile (legacy)
│   └── admin/            # Next.js admin panel (port 3001)
├── packages/
│   ├── database/         # Prisma schema + client
│   └── types/            # Shared TypeScript types
├── docs/                 # Documentation
├── docker-compose.yml    # PostgreSQL
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml   # Workspace definition
└── package.json          # Root scripts
```

---

## 7. Available Scripts

### Root level

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps via Turborepo |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio (DB GUI) |

### Per-app

| App | Dev Command |
|-----|-------------|
| API | `cd apps/api && pnpm dev` |
| Mobile (unified) | `cd apps/mobile && pnpm start` |
| Patient App (legacy) | `cd apps/patient-app && pnpm start` |
| Provider App (legacy) | `cd apps/provider-app && pnpm start` |
| Admin | `cd apps/admin && pnpm dev` |

---

## 8. Database Management

### Prisma Studio (GUI)

```bash
pnpm db:studio
```

Opens a web-based database browser at `http://localhost:5555`

### Seed Data

Currently, service categories should be created manually via Prisma Studio or API. Default categories to create:

| Name | Slug |
|------|------|
| Doctor Consultation | doctor |
| Physiotherapy | physiotherapy |
| Nursing | nursing |
| Speech Therapy | speech-therapy |
| Elderly Care | elderly-care |
| Occupational Therapy | occupational-therapy |

---

## 9. API Testing

### Development OTP Flow

In development mode (`NODE_ENV=development`), the OTP is returned in the API response for easy testing:

```bash
# Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP as a Patient (use the OTP from response)
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456", "role": "PATIENT"}'

# Verify OTP as a Doctor/Provider
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456", "role": "PROVIDER"}'
```

---

## 10. Mobile App Configuration

### API URL

Update the API base URL in:
- `apps/mobile/src/constants/api.ts` *(primary app)*
- `apps/patient-app/src/constants/api.ts` *(legacy)*
- `apps/provider-app/src/constants/api.ts` *(legacy)*

For local development with a physical device, use your machine's local IP:

```typescript
export const API_URL = 'http://192.168.x.x:3000';
```

For emulators:
- **Android:** `http://10.0.2.2:3000`
- **iOS Simulator:** `http://localhost:3000`

---

## 11. Troubleshooting

| Issue | Solution |
|-------|----------|
| `pnpm install` fails | Delete `node_modules` and `pnpm-lock.yaml`, try again |
| Database connection error | Ensure Docker is running: `docker-compose up -d` |
| Prisma client not found | Run `pnpm db:generate` |
| Expo app can't reach API | Check API URL constant matches your network IP |
| Port already in use | Kill existing process or change port in config |
| Admin login fails | Use `admin@curex24.com` / `admin123` |

---

*Document Version: 1.0 (MVP)*
*Last Updated: April 2026*
