# Curex24 — Local Development Setup

## Option A: Docker Setup (No Local Dependencies)

The fastest way to run the full stack without installing Node.js, pnpm, or databases locally. You only need **Docker** installed.

### 1. Start Everything

```bash
docker compose up --build
```

This single command will:
- Start PostgreSQL and Redis
- Build the NestJS API and Next.js admin panel
- Apply the database schema automatically
- Start all services

### 2. Access the Applications

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Admin Panel | http://localhost:3001 |
| PostgreSQL | localhost:5432 (user: `curex24`, password: `curex24password`) |
| Redis | localhost:6379 |

**Admin login:** `admin@curex24.com` / `admin123`

### 3. Useful Docker Commands

```bash
# Start in background (detached mode)
docker compose up --build -d

# View logs
docker compose logs -f api
docker compose logs -f admin

# Restart a single service
docker compose restart api

# Stop all services
docker compose down

# Stop and remove all data (reset database)
docker compose down -v

# Rebuild after code changes
docker compose up --build
```

### 4. Running Tests via Docker

```bash
# Run API tests
docker compose exec api sh -c "cd /app/apps/api && npx jest --no-coverage"

# If the container isn't running, use a one-off container
docker compose run --rm api sh -c "cd /app/apps/api && npx jest --no-coverage"
```

---

## Option B: Manual Setup

### Prerequisites

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
- **Password:** curex24password

---

## 3. Configure Environment

Create `.env` in `apps/api/`:

```bash
cp apps/api/.env.example apps/api/.env
```

Also create `.env` in `packages/database/` (required for Prisma CLI commands like `db:migrate`):

```bash
cp packages/database/.env.example packages/database/.env
```

Default `.env` contents (both files use the same local database values):

```env
DATABASE_URL="postgresql://curex24:curex24password@localhost:5432/curex24?schema=public"
DIRECT_URL="postgresql://curex24:curex24password@localhost:5432/curex24?schema=public"
```

> **Note:** `DIRECT_URL` is a non-pooled connection used by Prisma for migrations. For local development it is the same as `DATABASE_URL`. For cloud databases (e.g. Supabase) they may differ.

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
| `pnpm db:seed` | Seed the database with initial data |
| `pnpm db:reset` | Reset database (drops all data & re-migrates) |

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

To seed the database with initial data, run:

```bash
pnpm db:seed
```

This populates the database with default service categories and other initial records. Alternatively, you can create records manually via Prisma Studio or the API. Default categories:

| Name | Slug |
|------|------|
| Doctor Consultation | doctor |
| Physiotherapy | physiotherapy |
| Nursing | nursing |
| Speech Therapy | speech-therapy |
| Elderly Care | elderly-care |
| Occupational Therapy | occupational-therapy |

### Reset Database

```bash
pnpm db:reset
```

This drops all data, re-runs all migrations, and optionally re-seeds. Useful for starting fresh during development.

---

## 9. Accessing the Database in Code

### In the NestJS API (`apps/api/`)

The `PrismaService` extends `PrismaClient` and is registered globally via `PrismaModule`. Inject it into any NestJS service:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany();
  }
}
```

### In other packages (Admin panel, scripts, etc.)

Import the singleton Prisma client from the `@curex24/database` package:

```typescript
import { prisma } from '@curex24/database';

const users = await prisma.user.findMany();
```

---

## 10. API Testing

### Unit Tests

Run the existing unit tests (mocked dependencies, no database required):

```bash
# From apps/api
cd apps/api
npx jest --no-coverage

# Or from the repo root
pnpm --filter @curex24/api test
```

### Integration Tests

Integration tests hit actual API endpoints against a real PostgreSQL database.
They cover auth (OTP flow, admin login) and patient endpoints (profile CRUD, addresses).

**Prerequisites:** A running PostgreSQL instance and the schema pushed to the test database.

```bash
# 1. Start PostgreSQL (e.g., via docker compose)
docker compose up -d postgres

# 2. Set environment variables (adjust for your local setup)
export DATABASE_URL="postgresql://curex24:curex24password@localhost:5432/curex24"
export DIRECT_URL="postgresql://curex24:curex24password@localhost:5432/curex24"

# 3. Push schema to test DB
cd packages/database && npx prisma db push --skip-generate && cd ../..

# 4. Run integration tests
cd apps/api
npx jest --config jest.integration.config.js --forceExit --no-coverage

# Or from the repo root
pnpm --filter @curex24/api test:integration
```

Integration tests run automatically in CI (GitHub Actions) with a PostgreSQL service container.

### Adding New Integration Tests

1. Create a file named `*.integration.spec.ts` alongside your module
2. Import the helpers from `test/integration-setup.ts`:
   ```typescript
   import { createTestApp, cleanDatabase } from '../../../test/integration-setup';
   ```
3. Use `createTestApp()` in `beforeAll` to bootstrap the NestJS app
4. Use `cleanDatabase(prisma)` in `beforeEach` / `afterAll` for test isolation
5. Use `supertest` to make HTTP requests against `app.getHttpServer()`

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

## 11. Mobile App Configuration

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

## 12. Troubleshooting

| Issue | Solution |
|-------|----------|
| `pnpm install` fails | Delete `node_modules` and `pnpm-lock.yaml`, try again |
| Database connection error | Ensure Docker is running: `docker-compose up -d` |
| Prisma client not found | Run `pnpm db:generate` |
| `DIRECT_URL` env var not found | Create `packages/database/.env` from `packages/database/.env.example` |
| Expo app can't reach API | Check API URL constant matches your network IP |
| Port already in use | Kill existing process or change port in config |
| Admin login fails | Use `admin@curex24.com` / `admin123` |

---

*Document Version: 1.0 (MVP)*
*Last Updated: April 2026*
