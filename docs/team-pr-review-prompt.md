# 🔍 Curex24 — Code Review & PR Safety Checklist Prompt

> **How to use:** Copy the section below and send it to the reviewer (or use it as a PR comment template / AI prompt). Fill in `[PR_LINK]` and `[BRANCH_NAME]` before sending.

---

## Team Prompt Template

---

Hey team 👋

Before merging `[BRANCH_NAME]` → `main`, please go through the checklist below. The goal is to make sure nothing breaks in our live infrastructure — Supabase, Railway, Vercel, the staging environment, or any of our apps. New changes are welcome, but they must **extend** what we have, not silently overwrite or conflict with it.

---

### 🗄️ 1. Supabase / Database

- [ ] Does this PR add or modify any **Prisma schema** (`prisma/schema.prisma`)?
  - If yes, is a corresponding **migration file** included under `supabase/migrations/`?
  - Does the migration use `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (non-destructive)?
  - Are any **existing columns, tables, or constraints removed or renamed**? If so, is that intentional and backward-compatible?
- [ ] Does the change touch **RLS policies**, **triggers**, or **database functions**? These must be tested on staging before merging to main.
- [ ] Is `pnpm db:generate` run after schema changes so the Prisma client is regenerated?

---

### 🚂 2. Railway (API Deployment)

- [ ] Are any **new environment variables** introduced? If yes:
  - Are they added to the Railway project dashboard (staging + production)?
  - Are they documented in `docs/SETUP.md` or `docs/staging-environment.md`?
- [ ] Does the change affect `apps/api/` startup logic, port configuration, or `Dockerfile`?
  - Verify `apps/api/Dockerfile` and `docker-entrypoint.sh` still work correctly.
- [ ] Does `railway.toml` need updating (build command, start command, healthcheck path)?
- [ ] Are **no hardcoded secrets, tokens, or URLs** introduced? All config must come from `process.env`.

---

### ▲ 3. Vercel (Admin Portal & Doctor Portal)

- [ ] Does the change affect `apps/admin/` or `apps/doctor-portal/`?
  - Check that `next.config.js`, `vercel.json`, and environment variables are consistent.
  - Any new `NEXT_PUBLIC_*` env vars must be added in the Vercel project settings.
- [ ] Are **API base URLs** still pointing to the correct backend (staging vs production)?  
  Do not hardcode `localhost` or staging URLs in production builds.
- [ ] Does the build pass locally?
  ```bash
  pnpm --filter @curex24/admin build
  pnpm --filter @curex24/doctor-portal build
  ```
- [ ] Are there any breaking changes to **shared packages** (`packages/types`, `packages/database`)?  
  These affect every app — admin, mobile, API, and doctor portal.

---

### 🧪 4. Staging Environment

- [ ] Has the change been **tested on staging** before requesting a merge to `main`?
- [ ] Does `docker-compose.staging.yml` need any updates?
- [ ] Are all staging-specific environment variables properly set (see `docs/staging-environment.md`)?
- [ ] If this involves payments, bookings, or doctor verification — test the **full flow end-to-end** on staging, not just unit tests.

---

### 📱 5. Mobile App (`apps/mobile`)

- [ ] Does the change affect shared API contracts (request/response shapes)?  
  If yes, update `packages/types` and verify the mobile app still builds:
  ```bash
  pnpm --filter @curex24/mobile build
  ```
- [ ] Are any **deep links, push notification payloads, or navigation routes** changed?  
  These must be backward-compatible for users on older app versions.

---

### 🤖 6. NestJS API (`apps/api`)

- [ ] Does the PR add a new module? Ensure it is **registered in `app.module.ts`**.
- [ ] Are new endpoints documented (Swagger decorators or `docs/API.md`)?
- [ ] Does the PR modify existing endpoints in a **backward-compatible** way?  
  Breaking changes to existing routes can crash the mobile app and admin panel.
- [ ] Are **guards, roles, and auth decorators** correctly applied?  
  No unauthenticated access to protected routes.
- [ ] Are **input DTOs validated** with `class-validator`? No raw `req.body` usage.

---

### 🔐 7. Security

- [ ] No secrets, API keys, or credentials committed to the repo.
- [ ] No `console.log` statements exposing sensitive user data.
- [ ] SQL/database queries go through Prisma — no raw query injection risk.
- [ ] JWT guards are not bypassed or weakened.
- [ ] Any new file upload or user input is properly validated and sanitized.

---

### ✅ 8. General PR Quality

- [ ] Branch name follows convention: `feat/`, `fix/`, `chore/`, `docs/`, etc.
- [ ] Commit messages follow `<type>: <short summary>` format.
- [ ] CI passes — linting, type-check, build, and tests all green.
- [ ] No commented-out code or debug artifacts left in.
- [ ] PR description clearly explains **what** changed and **why**.
- [ ] Related GitHub issue is linked (e.g., `Fixes #42`).
- [ ] If this is a breaking change, it is called out explicitly in the PR description.

---

### 🚦 Merge Decision

| Status | Meaning |
|--------|---------|
| ✅ All checks pass | Safe to merge |
| ⚠️ Minor issues | Merge after fixes, no re-review needed |
| ❌ Fails critical checks | Do not merge — request changes |

**Critical checks (must not fail):** database migrations, env variable safety, Railway/Vercel config, auth/security, shared package compatibility.

---

> _This checklist is maintained in `docs/team-pr-review-prompt.md`. If you find a check that's missing or outdated, update the file and open a `docs/` PR._
