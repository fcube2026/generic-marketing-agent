# Marketing Agent

Next.js dashboard for an AI-powered Marketing Agent. The agent is generic — it can be used for any brand, product, industry or topic, and will also answer general questions outside of marketing.

## Getting Started

```bash
# Install dependencies (from repository root)
pnpm install

# Start the development server (port 3002)
pnpm --filter @your brand/marketing-agent dev
```

## Environment Variables

| Variable | Required (hosted) | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | Full base URL of your API, e.g. `https://api.example.com/api/v1` |
| `OPENAI_API_KEY` | **Yes (for live AI)** | Server-side OpenAI key. Powers `/api/ai/chat` and `/api/ai/image`. Without it the agent falls back to canned responses and the Visual Generator returns a friendly error. |
| `OPENAI_TEXT_MODEL` | No | Chat/completion model. Defaults to `gpt-4o-mini`. Use `gpt-4o` for higher quality. |
| `OPENAI_IMAGE_MODEL` | No | Image model. Defaults to `gpt-image-1` (DALL-E 3 successor). |
| `OPENAI_BASE_URL` | No | Override the OpenAI base URL (e.g. for Azure OpenAI or a self-hosted proxy). |
| `GOOGLE_AI_API_KEY` | No (recommended for Nano Banana) | Server-side Google AI Studio key. Powers the "Google · Nano Banana" option in `/api/ai/image`. Get one at <https://aistudio.google.com/apikey>. Without it, "google" requests fall back to the free Pollinations provider. |
| `GOOGLE_AI_IMAGE_MODEL` | No | Google image model. Defaults to `gemini-2.5-flash-image` ("Nano Banana") which uses `:generateContent` and works on free AI Studio keys. Set to `imagen-3.0-generate-002` to use Imagen 3 instead (`:predict`, billing-enabled GCP project required). |
| `GOOGLE_AI_TEXT_MODEL` | No | Gemini model used by `getGoogleAIClient()` (reserved for future text routes). Defaults to `gemini-1.5-flash`. |
| `GOOGLE_AI_BASE_URL` | No | Override the Generative Language API base URL (e.g. proxy / regional endpoint). |
| `AI_IMAGE_PROVIDER` | No | Default image provider when the client does not specify one. `openai` (default) or `google`. The UI toggle always overrides this per request. |
| `MARKETING_AGENT_SKIP_AUTH` | No | Set to `true` only in dev/test to skip the upstream JWT-validation hop on AI routes. **Never set this in production.** |

> ⚠️ **Do not** prefix the OpenAI **or** Google variables with `NEXT_PUBLIC_`. They are read only from server-side route handlers; prefixing would leak the key to the browser bundle.

### Switching image providers

The Visual Generator (`/create`) and the agent chat (`/agent`) both expose an **Image model** toggle in the header with two options:

- **OpenAI · gpt-image-1** — uses `OPENAI_API_KEY` + `OPENAI_IMAGE_MODEL`.
- **Google · Nano Banana** — uses `GOOGLE_AI_API_KEY` + `GOOGLE_AI_IMAGE_MODEL` (default `gemini-2.5-flash-image`).

The selection is persisted in `localStorage` under the key `marketing_image_provider` and is sent to `/api/ai/image` as `{ provider: 'openai' | 'google' }`.

Provider resolution precedence on the server:

1. Explicit `provider` field in the request body (set by the UI toggle).
2. `AI_IMAGE_PROVIDER` env var.
3. Default: `openai`.

If the selected provider's key is missing, or the upstream returns 401/403, the route transparently falls back to the free Pollinations provider so the UI keeps working. The returned `model` field (echoed back to the client and shown under each generated image) tells you which provider actually served the request.

### Pasting your Google AI Studio key

Create `apps/marketing-agent/.env.local` (git-ignored) and add the key in plain `KEY=VALUE` form, no quotes:

```bash
GOOGLE_AI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GOOGLE_AI_IMAGE_MODEL=gemini-2.5-flash-image   # "Nano Banana" — free AI Studio tier
AI_IMAGE_PROVIDER=openai                       # default; users can flip in the UI
```

Restart the Next.js dev server after editing — env vars are only read at boot.

### Adding more AI providers

Images already support **OpenAI** and **Google** out of the box — see "Switching image providers" above. To add a third image provider or to wire a new text provider:

1. Add the vendor's SDK (e.g. `@anthropic-ai/sdk`, `@stability/sdk`, `replicate`) and create a thin lazy client wrapper in `src/lib/ai/<vendor>-client.ts`, mirroring `openai-client.ts` / `google-client.ts`.
2. Branch on the `provider` field in `src/app/api/ai/image/route.ts` (and/or `chat/route.ts`) to dispatch to the new client.
3. Keep the `{ reply }` / `{ dataUrl | url, model, size, ... }` response shape so the client wrappers in `src/lib/services/aiService.ts` and the `<GeneratedImage />` component work unchanged.
4. Extend the `ImageProvider` union in `src/lib/hooks/useImageProvider.ts` and add a label to `IMAGE_PROVIDER_LABELS` so the toggle exposes the new option.

> Note: **Midjourney has no public API** and was removed from the UI. Adobe Firefly and Canva AI are also not wired up — only providers actually called from the routes appear in the "Powered by" badges.

### API URL selection

The API client resolves the base URL in the following priority order:

1. `NEXT_PUBLIC_API_URL` environment variable — used whenever set (server-side and client-side).
2. `http://localhost:3000/api/v1` — used automatically when running in a browser on `localhost`, `127.0.0.1`, or `0.0.0.0` (local development only).
3. `https://api.example.com/api/v1` — default fallback for all other environments.

> **Important:** All hosted deployments (Vercel, staging, etc.) **must** set `NEXT_PUBLIC_API_URL` at build time. Without it the app will attempt to reach the production API URL, which may differ from your actual deployed API endpoint and cause login failures.

### Setting `NEXT_PUBLIC_API_URL` in Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**.
2. Add `NEXT_PUBLIC_API_URL` with the correct API base URL for each environment (Production / Preview).
3. Redeploy so the new variable is picked up at build time.

## Building

```bash
pnpm --filter @your brand/marketing-agent build
```

## Linting

```bash
pnpm --filter @your brand/marketing-agent lint
```
