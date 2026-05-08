# FCube finance domain pack

The `fcube-finance` domain pack is the finance / fintech vertical for the
marketing-agent. It re-skins the existing `apps/marketing-agent` Next.js
app for the FCube ecosystem — personal finance, family finance,
expense-sharing circles, and subscription-based financial products.

Brand: **FCube — "Your Life, Cubed"** (Family · Finance · Future).

Source: [`apps/marketing-agent/src/packs/fcube-finance/index.ts`](../apps/marketing-agent/src/packs/fcube-finance/index.ts).

## What ships in Phase 0

This is the first slice of a multi-phase roadmap (see [Roadmap](#roadmap)
below). Phase 0 is intentionally additive and does **not** change any
existing behavior:

- Brand, terminology overrides (`customer → member`, `provider → circle`,
  `funnel → subscription funnel`).
- Resource definitions for `profile`, `intake-responses`, `campaigns`,
  `experiments`, `content-items`, `seo-pages`, `keyword-clusters`,
  `lifecycle-flows`, `plan-items` — finance-flavoured enums (e.g.
  campaign objectives include `subscription`, `referral`, `upsell`;
  content pillars include `budgeting`, `family-finance`,
  `subscriptions`, `tax`, `wealth`).
- Read-only resource scaffolding for `members`, `circles`,
  `subscriptions`, `referrals` — these will be populated by the
  `FinanceDataSource` adapter in Phase 1.
- KPI catalog covering north-star, acquisition, activation,
  monetisation, retention, referral, and behavior metrics (MRR, ARR,
  subscription conversion, churn, referral conversion, avg monthly
  spend, circle spending trend, income vs expense ratio, …).
- Intake questions tuned for finance go-to-market.

The pack ships with **no seed data** — finance reads should come from
the FCube backend, not from mock content. Memory-mode dev workspaces
start empty and let you author your own campaigns / experiments / SEO
pages without leaking healthcare seed content into the finance UI.

## Activating the pack

The pack is auto-registered via a side-effect import in
[`agent.config.ts`](../apps/marketing-agent/src/agent.config.ts), but the
default tenant continues to use `healthcare-clinic` so existing
deployments are unaffected.

Opt in per-deployment via env vars:

```bash
DOMAIN_PACK=fcube-finance
AGENT_TENANT_NAME=FCube
AGENT_LOCALE=en-IN        # or your target locale
AGENT_CURRENCY=INR        # or your target currency
AGENT_TIMEZONE=Asia/Kolkata
```

No code changes required.

## Roadmap

The full FCube AI Marketing Agent vision is broken into phases. Phase 0
lands the pack; subsequent phases build on top of it:

| Phase | Scope                                                             |
| ----- | ----------------------------------------------------------------- |
| 0     | **(this PR)** Domain pack + brand + KPI/intake taxonomy           |
| 1     | Financial Analytics Engine — `FinanceDataSource` + KPI dashboards |
| 2     | CRM & Sales Automation — `Lead`/`Pipeline`/`Segment` Prisma models, lead-scoring & churn-risk skills |
| 3     | User Intelligence & Behavior Engine — event ingestion, engagement scoring |
| 4     | Financial Data Security — RBAC, circle-scoped RLS, field-level encryption, audit log |
| 5     | Skills Library — finance education skill prompts + recommendation engine |
| 6     | AI Landing Page Generator — block schema, AI copywriting, A/B testing, export |
| 7     | AI Content Generation Engine — channel-specific generators (blog/social/push/email/WhatsApp) |
| 8     | Executive Dashboard polish — premium fintech theme, investor-demo variant |

Each phase is gated behind a feature flag in `agent.config.ts` so
partial rollouts are safe.

## Extending the pack

To add a new resource, KPI, or intake question, edit
`apps/marketing-agent/src/packs/fcube-finance/index.ts`. The pack is
validated at registration time via `domainPackValidator`, so misconfigured
packs fail loudly at startup with useful error messages.

To add a new vertical alongside finance and healthcare:

1. Create `apps/marketing-agent/src/packs/<your-pack>/index.ts`.
2. Call `registerDomainPack(yourPack)` at the bottom.
3. Add a side-effect `import '@/packs/<your-pack>';` to `agent.config.ts`.
4. Activate with `DOMAIN_PACK=<your-pack>`.
