/**
 * Next.js shell over the framework-free `core.handleRequest()`.
 *
 * The whole route handler is ~25 lines because all logic lives in `core/`.
 * The same `handleRequest()` powers the future Express server, Cloudflare
 * Worker, Slack/Discord bot, and CLI — a new platform = a new ~25-line
 * shell, no business logic duplication.
 *
 * URL surface: see `core/agent/handleRequest.ts`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleRequest } from '@/core';
import { getAgentRuntime } from '@/lib/server/agentRuntime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path?: string[] }> };

async function route(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path = [] } = await ctx.params;
  const runtime = await getAgentRuntime();
  const auth = await runtime.auth.authorize({ headers: req.headers, url: req.url, method: req.method });

  let body: unknown = null;
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    body = await req.json().catch(() => null);
  }

  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);

  const result = await handleRequest({
    method: req.method,
    path: '/' + path.join('/'),
    query,
    body,
    ctx: auth.context,
    deps: { dataSource: runtime.dataSource, domainPack: runtime.domainPack },
  });

  return NextResponse.json(result.body, { status: result.status, headers: result.headers });
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;
