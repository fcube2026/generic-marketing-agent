# generic-marketing-agent

A **generic, business-agnostic AI Marketing Agent** — the *CMO-Agent* — that owns marketing
**end-to-end**: discovery, strategy, planning, execution assets, lifecycle, analytics, and outreach.

It is the runnable implementation of [`MARKETING_AGENT_DESIGN.md`](./MARKETING_AGENT_DESIGN.md).

> Acts as a world-class CMO + hands-on operator. Turns a business profile into a complete
> strategy and a stack of *ready-to-ship* artifacts (campaign briefs, content calendars, ad copy,
> email sequences, landing-page copy, KPI tree, experiment backlog, partnership outreach…).

---

## Features

- **Pluggable LLM backend** — works with any OpenAI-compatible Chat Completions endpoint
  (OpenAI, Azure OpenAI, OpenRouter, Together, Groq, Ollama via `/v1`, vLLM, …).
- **DRY-RUN mode** — runs the full loop without an API key, returning templated stubs, so you
  can demo / test / wire it into CI immediately.
- **Compounding memory** — every run enriches a single living plan in `.cmo-agent/`, not
  one-shot dumps.
- **Modular** — seven independent modules you can run in isolation or as a single
  `run-all` pipeline.
- **Auditable** — every run is logged to `runs.jsonl`; every artifact carries `_meta.updatedAt`.
- **Human-in-the-loop ready** — strategy and plan outputs explicitly surface `human_review_points`
  and `needs_human_approval` flags.

---

## Requirements

- [Node.js](https://nodejs.org/) **>= 18** (uses the built-in `fetch`)
- npm (ships with Node.js)

---

## Install

```bash
git clone https://github.com/fcube2026/generic-marketing-agent.git
cd generic-marketing-agent
npm install
cp .env.example .env
```

Edit `.env` and set `LLM_API_KEY` (and optionally `LLM_BASE_URL` / `LLM_MODEL`) to enable
real AI output. **You can skip this step** — the agent will run in DRY-RUN mode and return
templated stubs so you can see the full pipeline.

---

## Quick start

```bash
# 1. Seed the agent with the bundled example business profile
npm run init -- --example

# 2. Run the full CMO loop end-to-end
npm run run-all

# 3. Inspect any artifact
node bin/cmo-agent.js show strategy
node bin/cmo-agent.js show plan

# 4. Export everything to a folder you can hand to the team
node bin/cmo-agent.js export --out ./cmo-export
```

That's it. With a real `LLM_API_KEY`, the same commands produce a complete, opinionated
marketing system tailored to your business.

---

## Use it for *your* business

Two options:

### Option A — Provide a JSON profile (recommended)

Copy `examples/business-profile.example.json`, fill in **your** business, and load it:

```bash
cp examples/business-profile.example.json my-business.json
# edit my-business.json
node bin/cmo-agent.js init --from my-business.json
npm run run-all
```

### Option B — Interactive intake

```bash
npm run init           # asks you a short set of questions
npm run run-all
```

You can re-run any single module any time after the profile and strategy exist:

```bash
npm run discover     # ICPs, positioning, competitor angles
npm run strategy     # brand, GTM, channel, content, lifecycle, partnership strategy
npm run plan         # 30/60/90 + monthly + weekly + RICE-scored backlog
npm run content      # calendar, briefs, ad/email/landing-page copy, SEO clusters
npm run lifecycle    # onboarding, retention, winback, referral, automation blueprint
npm run analytics    # KPI tree, attribution plan, tracking plan, experiment backlog
npm run outreach     # partnership, influencer, PR templates + community plan
```

---

## CLI reference

```text
cmo-agent <command>

  init [--from <file>] [--example]   Create / overwrite the business profile.
  discover                           Run discovery (ICPs, positioning, competitors).
  strategy                           Generate the full marketing strategy.
  plan                               Generate cascading 30/60/90 + weekly plans.
  content                            Generate calendars, briefs, ad/email/landing copy.
  lifecycle                          Generate onboarding, retention, referral flows.
  analytics                          Generate KPI tree, tracking plan, experiments.
  outreach                           Generate partnership / influencer / PR templates.
  run-all                            Run the full loop end-to-end.
  show <artifact>                    Print a stored artifact as JSON.
  export [--out <dir>]               Export all artifacts to a directory.
  status                             Show config + which artifacts exist.
```

The same commands are available as npm scripts (`npm run discover`, `npm run strategy`, …).

---

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable                  | Default                       | Purpose                                               |
| ------------------------- | ----------------------------- | ----------------------------------------------------- |
| `LLM_API_KEY`             | *(empty → dry-run)*           | API key for your LLM provider.                        |
| `LLM_BASE_URL`            | `https://api.openai.com/v1`   | Any OpenAI-compatible endpoint.                       |
| `LLM_MODEL`               | `gpt-4o-mini`                 | Model name to call.                                   |
| `LLM_TEMPERATURE`         | `0.4`                         | Sampling temperature.                                 |
| `LLM_MAX_TOKENS`          | `2000`                        | Max tokens per response.                              |
| `LLM_TIMEOUT_MS`          | `60000`                       | Per-request timeout.                                  |
| `CMO_AGENT_DATA_DIR`      | `.cmo-agent`                  | Where artifacts are persisted.                        |
| `CMO_AGENT_HUMAN_REVIEW`  | `false`                       | Reserved for upcoming approval-gate behavior.         |

---

## Project structure

```
.
├── bin/
│   └── cmo-agent.js              # CLI entrypoint
├── src/
│   ├── agent.js                  # Orchestrator (composes modules into the CMO loop)
│   ├── llm.js                    # OpenAI-compatible client + dry-run fallback
│   ├── memory.js                 # File-based artifact store + run log
│   ├── runner.js                 # Module helpers (LLM call → JSON parse → persist)
│   ├── prompts/
│   │   └── index.js              # System prompts per CMO function
│   └── modules/
│       ├── discovery.js          # ICPs, positioning, competitors
│       ├── strategy.js           # Brand, GTM, channel, content, lifecycle, partnership
│       ├── planning.js           # 30/60/90 + monthly + weekly + RICE backlog
│       ├── content.js            # Calendar, briefs, ad/email/landing copy, SEO
│       ├── lifecycle.js          # Onboarding, retention, winback, referral
│       ├── analytics.js          # KPI tree, attribution, tracking, experiments
│       └── outreach.js           # Partnership / influencer / PR templates
├── examples/
│   └── business-profile.example.json
├── test/
│   └── smoke.test.js             # Runs the full loop in dry-run mode
├── MARKETING_AGENT_DESIGN.md     # The design this implements
├── package.json
└── .env.example
```

---

## How the agent thinks

Every module is framed by a **shared CMO + operator persona** with these operating principles:

- Bias to action; every recommendation must be executable this week.
- Tie every output to a **goal, KPI, and hypothesis**.
- Prefer **compounding assets** (SEO, content, lifecycle, community) over rented attention alone.
- **MVP-first** marketing → scale what works → kill what doesn't.
- Brand-safe, on-message, explicit about risks and human-approval points.
- Never invent data — list assumptions explicitly when input is missing.

The CMO loop runs in this order:

```
init → discover → strategy → plan ──┬─→ content
                                    ├─→ lifecycle
                                    ├─→ analytics
                                    └─→ outreach
```

Each module reads the artifacts produced by upstream modules from the data directory, so the
agent's output gets sharper every run.

---

## Testing

```bash
npm test
```

Runs the full pipeline in dry-run mode against the example business profile and asserts that
every artifact is persisted with metadata.

---

## Roadmap

The design doc has the full roadmap. High-leverage next steps:

- Connectors for GA4 / GSC / HubSpot / Stripe to feed the analytics module real data.
- Approval-gate UX (`CMO_AGENT_HUMAN_REVIEW=true`) for high-risk artifacts (paid spend, PR pitches).
- Sub-agent loops for SEO topical authority and weekly performance reviews.
- Markdown export bundle (`export --format md`) suitable for handing to a marketing team.

---

## License

MIT
