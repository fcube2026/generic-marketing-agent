# Curex24 Marketing Agent

Next.js dashboard for Curex24 marketing operations.

## Getting Started

```bash
# Install dependencies (from repository root)
pnpm install

# Start the development server (port 3002)
pnpm --filter @curex24/marketing-agent dev
```

## Environment Variables

| Variable | Required (hosted) | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Full base URL of the Curex24 API, e.g. `https://api.curex24.com/api/v1` |
| `OPENAI_API_KEY` | **Yes (for live AI)** | Server-side OpenAI key. Powers `/api/ai/chat` and `/api/ai/image`. Without it the agent falls back to canned responses and the Visual Generator returns a friendly error. |
| `OPENAI_TEXT_MODEL` | No | Chat/completion model. Defaults to `gpt-4o-mini`. Use `gpt-4o` for higher quality. |
| `OPENAI_IMAGE_MODEL` | No | Image model. Defaults to `gpt-image-1` (DALL-E 3 successor). |
| `OPENAI_BASE_URL` | No | Override the OpenAI base URL (e.g. for Azure OpenAI or a self-hosted proxy). |
| `MARKETING_AGENT_SKIP_AUTH` | No | Set to `true` only in dev/test to skip the upstream JWT-validation hop on AI routes. **Never set this in production.** |

> ⚠️ **Do not** prefix the OpenAI variables with `NEXT_PUBLIC_`. They are read only from server-side route handlers; prefixing would leak the key to the browser bundle.

### AI provider switching

The default integration uses **OpenAI** for both text (`gpt-4o-mini`/`gpt-4o`) and images (`gpt-image-1`). To switch providers:

1. Replace the SDK import in `src/lib/ai/openai-client.ts` with the chosen vendor's SDK (e.g. `@anthropic-ai/sdk`, `@google/genai`, `@stability/sdk`, `replicate`).
2. Update the model/size handling in `src/app/api/ai/chat/route.ts` and `src/app/api/ai/image/route.ts` to match the new SDK's contract.
3. Keep the `{ reply }` / `{ dataUrl | url }` response shape so the client wrappers in `src/lib/services/aiService.ts` and the `<GeneratedImage />` component work unchanged.

> Note: **Midjourney has no public API** and was removed from the UI. Adobe Firefly and Canva AI are also not wired up — only providers actually called from the routes appear in the "Powered by" badges.

### API URL selection

The API client resolves the base URL in the following priority order:

1. `NEXT_PUBLIC_API_URL` environment variable — used whenever set (server-side and client-side).
2. `http://localhost:3000/api/v1` — used automatically when running in a browser on `localhost`, `127.0.0.1`, or `0.0.0.0` (local development only).
3. `https://api.curex24.com/api/v1` — default fallback for all other environments.

> **Important:** All hosted deployments (Vercel, staging, etc.) **must** set `NEXT_PUBLIC_API_URL` at build time. Without it the app will attempt to reach the production API URL, which may differ from your actual deployed API endpoint and cause login failures.

### Setting `NEXT_PUBLIC_API_URL` in Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**.
2. Add `NEXT_PUBLIC_API_URL` with the correct API base URL for each environment (Production / Preview).
3. Redeploy so the new variable is picked up at build time.

## Building

```bash
pnpm --filter @curex24/marketing-agent build
```

## Linting

```bash
pnpm --filter @curex24/marketing-agent lint
```
