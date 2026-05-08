import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingAuth } from '@/lib/ai/auth';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/ai/rate-limit';
import {
  LandingPageStoreError,
  publishLandingPage,
} from '@/lib/server/landingPageStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PublishBody {
  html?: unknown;
}

/**
 * Publish the HTML emitted by the Landing Page Builder skill so it gets a
 * real, shareable URL. The URL the client renders is `/landing-preview/<id>`
 * which serves the document via `app/landing-preview/[id]/route.ts`.
 *
 * Auth + rate-limit are required (re-uses the same surface as `/api/ai/*`)
 * to make sure only signed-in marketing-agent users can publish previews.
 */
export async function POST(req: NextRequest) {
  const auth = await requireMarketingAuth(req);
  if (!auth.ok) return auth.response;

  const rl = checkRateLimit(`landing-publish:${getClientKey(req)}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json(
      { error: 'Body must be valid JSON', code: 'invalid_json' },
      { status: 400 },
    );
  }

  if (typeof body.html !== 'string') {
    return NextResponse.json(
      { error: '`html` must be a string', code: 'invalid_html' },
      { status: 400 },
    );
  }

  try {
    const entry = publishLandingPage(body.html);
    const path = `/landing-preview/${entry.id}`;
    // Build an absolute URL too so the client can copy/paste it directly.
    const origin = req.nextUrl.origin;
    return NextResponse.json({
      id: entry.id,
      path,
      url: `${origin}${path}`,
      title: entry.title,
      createdAt: entry.createdAt,
    });
  } catch (err) {
    if (err instanceof LandingPageStoreError) {
      return NextResponse.json(
        { error: err.message, code: 'invalid_html' },
        { status: err.status },
      );
    }
    // eslint-disable-next-line no-console
    console.error('[landing-page/preview] publish failed', err);
    return NextResponse.json(
      { error: 'Failed to publish landing page', code: 'internal_error' },
      { status: 500 },
    );
  }
}
