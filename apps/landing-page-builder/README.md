# Landing Page Builder

Standalone Next.js app for generating and previewing full landing pages with OpenAI.

## Getting Started

```bash
# Install dependencies (from repository root)
pnpm install

# Start the development server (port 3005)
pnpm --filter @curex24/landing-page-builder dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Server-side OpenAI key used by `/api/ai/chat`. |
| `OPENAI_TEXT_MODEL` | No | Chat model. Defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | No | Optional OpenAI-compatible base URL override. |

## Building

```bash
pnpm --filter @curex24/landing-page-builder build
```

## Linting

```bash
pnpm --filter @curex24/landing-page-builder lint
```
