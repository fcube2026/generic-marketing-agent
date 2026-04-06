# Coding Agent Guide — curex24

## Project Overview

curex24 is a **pnpm monorepo** managed with [Turborepo](https://turbo.build/). Workspaces live in:

- `apps/*` — runnable applications
- `packages/*` — shared libraries

### Workspace names

| Directory | Package name |
|---|---|
| `apps/api` | `@curex24/api` |
| `apps/admin` | `@curex24/admin` |
| `apps/mobile` | `@curex24/mobile` |
| `packages/database` | `@curex24/database` |
| `packages/types` | `@curex24/types` |

---

## Environment Setup (run once, before anything else)

```bash
corepack enable
corepack prepare pnpm@9.4.0 --activate
```

Or use the provided helper script:

```bash
bash scripts/setup.sh
```

> **NEVER use npm or yarn.** The repo uses `workspace:*` protocol dependencies that npm cannot resolve — it will hang indefinitely.

---

## Installing Dependencies

Always install from the **monorepo root**:

```bash
pnpm install
```

Never run `npm install` or `yarn install`, and never run `pnpm install` from inside an individual app directory.

---

## Running Tests

### API

```bash
pnpm --filter @curex24/api test -- --passWithNoTests --forceExit
```

### Mobile

```bash
pnpm --filter @curex24/mobile test -- --passWithNoTests --forceExit
```

> **Never run `npx jest` directly.** The jest-expo preset is only resolvable through the workspace dependency tree, so you must use the `pnpm --filter` form above.

---

## Building

```bash
pnpm --filter <package-name> build
```

Example:

```bash
pnpm --filter @curex24/api build
```

> Before building the API, generate the Prisma client (see Database section below).

---

## Linting

```bash
pnpm --filter <package-name> lint
```

---

## Database

The `@curex24/database` package contains the Prisma schema. You must generate the Prisma client before building or testing the API:

```bash
pnpm --filter @curex24/database db:generate
```

This command requires the `DATABASE_URL` environment variable to be set (a valid PostgreSQL connection string).

---

## Common Pitfalls

| ❌ Don't do this | ✅ Do this instead |
|---|---|
| `npm install` | `pnpm install` (from repo root) |
| `cd apps/mobile && pnpm install` | `pnpm install` (from repo root) |
| `npx jest` | `pnpm --filter @curex24/mobile test -- --passWithNoTests --forceExit` |
| `pnpm install` without corepack enabled | Run `corepack enable && corepack prepare pnpm@9.4.0 --activate` first |
| Build API without generating Prisma client | Run `pnpm --filter @curex24/database db:generate` first |
