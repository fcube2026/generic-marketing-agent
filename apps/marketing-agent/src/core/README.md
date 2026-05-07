# `src/core` — framework-free agent runtime

Everything in this directory is **pure TypeScript**:

- No `next/*` imports.
- No `react` imports.
- No top-level imports of optional native modules (`pg`, `mongodb`,
  `@prisma/client`, `ioredis`, …). Use **dynamic `import()` inside a
  try/catch** so the bundler never resolves them when they aren't installed.

That means `core/` could be lifted into a standalone npm package
(`@curex24/agent-core`) and re-used from:

- The Next.js app (`src/app/api/backend/[...path]/route.ts`).
- The Expo mobile app (over REST).
- A Node CLI, an Express/Fastify server, or a Cloudflare Worker.
- A Slack / Discord bot.

Each of those becomes a thin wrapper around `handleRequest()`.

## Three pluggable seams

| Axis | Seam | Where |
|---|---|---|
| **Domain** (vertical) | `DomainPack` — resources, KPIs, skills, intake, terminology, seed data | `core/domainPack/` + `src/packs/*` |
| **Database** | `DataSource` interface + dynamic-import factory | `core/dataSource/` |
| **Platform** | `handleRequest(method, path, body, ctx)` + `AiProvider` + `AuthAdapter` | `core/agent/`, `core/aiProvider/`, `core/auth/` |

## Tenant model

Every read & write takes a `TenantContext`. Single-tenant deploys use
`DEFAULT_TENANT` (id `"default"`). Multi-tenant deploys derive it from the
auth context. Adding tenants later is a no-op for callers.

## Why no static driver imports?

Webpack / Turbopack walk the entire import graph at build time. A single
`import { Pool } from 'pg'` anywhere reachable from a route handler causes
`Module not found: 'pg'` if the package isn't installed — even if the code
path is never executed. Dynamic `import()` is opaque to the static analyzer
and is safe.
