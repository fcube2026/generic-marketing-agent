# API Documentation Hosting Plan

> How to host the Curex24 OpenAPI / Swagger documentation using free, open-source tools.

---

## Recommended Primary: Swagger UI + GitHub Pages

### Why Swagger UI?

| Feature | Detail |
|---|---|
| Interactive | "Try it out" sends real requests from the browser |
| Well-known | Industry standard; every developer recognises the UI |
| Open source | Apache-2.0 license, free forever |
| Static files | No server needed — just HTML, CSS, JS |
| Maintained | Actively maintained by SmartBear / Swagger team |

### How It Works

The `docs/openapi/swagger/` directory already contains an `index.html` that loads Swagger UI from a CDN and points at `../openapi.yaml`. To host it:

#### Option A — GitHub Pages (recommended)

1. Go to **Settings → Pages** in the GitHub repository.
2. Set the source branch (e.g. `main`) and folder to `/docs`.
3. GitHub serves the site at `https://<org>.github.io/<repo>/openapi/swagger/`.
4. The `openapi.yaml` is served from the same origin, so no CORS issues.

**Pros:** Zero cost, zero infrastructure, automatic deploys on push.

#### Option B — Cloudflare Pages

1. Connect the repo to Cloudflare Pages.
2. Set the build output directory to `docs/openapi`.
3. Deploy — available at `<project>.pages.dev`.

**Pros:** Global CDN, free tier generous (unlimited bandwidth).

#### Option C — Netlify

1. Connect the repo to Netlify.
2. Set publish directory to `docs/openapi`.
3. Deploy — available at `<project>.netlify.app`.

**Pros:** Free tier, deploy previews on PRs.

#### Option D — Vercel

1. Import the repo to Vercel.
2. Set output directory to `docs/openapi`.
3. Deploy — available at `<project>.vercel.app`.

**Pros:** Free for open-source / hobby projects.

---

## Secondary Option: Redoc

### Why Consider Redoc?

| Feature | Detail |
|---|---|
| Polished reading | Three-panel layout with navigation sidebar |
| Search built-in | Full-text search across endpoints and schemas |
| Open source | Community Edition is MIT-licensed |
| Single HTML | Redocly CLI can bundle everything into one HTML file |

### How to Generate Redoc HTML

```bash
# Install Redocly CLI
npm install -g @redocly/cli

# Lint the spec
redocly lint docs/openapi/openapi.yaml

# Generate a single self-contained HTML file
redocly build-docs docs/openapi/openapi.yaml --output docs/openapi/redoc/index.html
```

The output `index.html` is a zero-dependency static file that can be hosted anywhere.

### Recommended Approach

| Audience | Tool |
|---|---|
| Developers testing / exploring APIs | **Swagger UI** (interactive, "Try it out") |
| Stakeholders reading / reviewing APIs | **Redoc** (cleaner, more readable) |

Both can coexist in the repo under `docs/openapi/swagger/` and `docs/openapi/redoc/`.

---

## Folder Structure

```
docs/
  openapi/
    openapi.yaml           ← Single source of truth
    swagger/
      index.html           ← Swagger UI (interactive)
    redoc/
      index.html           ← Redoc (optional, generated)
  api-testing-strategy.md
  docs-hosting-plan.md
  review-checklist.md
```

---

## CI / Automation Ideas

| Idea | Tool | Detail |
|---|---|---|
| Validate spec on PR | `redocly lint` or `swagger-cli validate` | Fail CI if spec is invalid |
| Auto-deploy docs | GitHub Actions → GitHub Pages | Deploy on merge to `main` |
| Preview on PR | Netlify / Vercel deploy previews | Reviewers see rendered docs before merge |
| Bundle Redoc HTML | `redocly build-docs` | Commit or artifact the rendered file |

### Example GitHub Actions Workflow

```yaml
# .github/workflows/docs.yml
name: Deploy API Docs

on:
  push:
    branches: [main]
    paths: ['docs/openapi/**']

permissions:
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/openapi
      - uses: actions/deploy-pages@v4
```

---

## Summary

| Aspect | Recommendation |
|---|---|
| Primary tool | Swagger UI (already set up in `docs/openapi/swagger/`) |
| Primary host | GitHub Pages (free, zero-config) |
| Secondary tool | Redoc (optional, for polished reading) |
| Secondary host | Same GitHub Pages site or Netlify |
| Spec format | OpenAPI 3.0.3 YAML |
| Spec location | `docs/openapi/openapi.yaml` |
