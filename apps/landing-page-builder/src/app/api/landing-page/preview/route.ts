import { NextRequest, NextResponse } from 'next/server';
import { LandingPageStoreError, publishLandingPage } from '@/lib/server/landingPageStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PublishBody {
  html?: unknown;
}

export async function POST(req: NextRequest) {
  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON', code: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.html !== 'string') {
    return NextResponse.json({ error: '`html` must be a string', code: 'invalid_html' }, { status: 400 });
  }

  try {
    const entry = publishLandingPage(body.html);
    const path = `/landing-preview/${entry.id}`;
    const origin = req.nextUrl.origin;
    return NextResponse.json({
      id: entry.id,
      path,
      url: `${origin}${path}`,
      title: entry.title,
      createdAt: entry.createdAt,
    });
  } catch (error) {
    if (error instanceof LandingPageStoreError) {
      return NextResponse.json({ error: error.message, code: 'invalid_html' }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to publish landing page', code: 'internal_error' }, { status: 500 });
  }
}
