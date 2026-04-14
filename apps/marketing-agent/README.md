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
