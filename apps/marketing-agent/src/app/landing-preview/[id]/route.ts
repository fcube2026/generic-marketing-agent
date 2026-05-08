import { NextRequest, NextResponse } from 'next/server';
import { getLandingPage } from '@/lib/server/landingPageStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Landing preview not found</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 2rem; }
    .card { max-width: 32rem; text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
    p { color: #94a3b8; line-height: 1.6; margin: 0; }
    code { background: rgba(255,255,255,.08); padding: .15em .4em; border-radius: .35em; }
  </style>
</head>
<body>
  <div class="card">
    <h1>This landing-page preview is no longer available.</h1>
    <p>Previews live in memory and are dropped when the server restarts. Re-run the <code>Landing Page Builder</code> skill to generate a fresh shareable URL.</p>
  </div>
</body>
</html>`;

/**
 * Serves a previously-published landing page HTML document at a real URL.
 *
 * Returned with a strict CSP so the document can only load Tailwind's CDN +
 * Google Fonts (the two scripts/stylesheets the skill is instructed to use)
 * and inline styles/scripts it generated itself. `X-Frame-Options: DENY`
 * prevents the preview being framed back into the marketing-agent UI.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = getLandingPage(id);
  if (!entry) {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
      },
    });
  }

  return new NextResponse(entry.html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'content-security-policy': [
        "default-src 'self' https: data:",
        // The skill is instructed to embed Tailwind via its CDN and define a
        // tailwind.config object inline. Both inline + the CDN host need to
        // be allowed for the page to render correctly.
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
        // Inline styles + Google Fonts stylesheet.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' https: data:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
      ].join('; '),
    },
  });
}
