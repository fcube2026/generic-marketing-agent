# Landing Page Builder

Standalone Next.js app for generating and previewing full landing pages with Claude (Anthropic) or OpenAI.

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
| `ANTHROPIC_API_KEY` | Recommended | Server-side Claude key. When present, `/api/ai/chat` uses Claude for generation. |
| `CLAUDE_TEXT_MODEL` | No | Claude model. Defaults to `claude-3-5-sonnet-latest`. |
| `ANTHROPIC_BASE_URL` | No | Optional Anthropic-compatible base URL override. |
| `OPENAI_API_KEY` | Fallback | OpenAI key used only when `ANTHROPIC_API_KEY` is not set. |
| `OPENAI_TEXT_MODEL` | No | OpenAI chat model. Defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | No | Optional OpenAI-compatible base URL override. |

## Building

```bash
pnpm --filter @curex24/landing-page-builder build
```

## Linting

```bash
pnpm --filter @curex24/landing-page-builder lint
```
