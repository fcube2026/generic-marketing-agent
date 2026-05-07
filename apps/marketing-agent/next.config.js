/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Phase 1: stabilize the data-source seam ────────────────────────────
  // Database / queue / vector drivers must NEVER be statically imported by
  // any module that ends up in a client bundle (that's what caused the
  // recurring `Module not found: 'pg'` errors). The canonical pattern is:
  //
  //   const mod = await import('pg').catch(() => null);
  //   if (!mod) throw new Error('Install `pg` to use the postgres adapter');
  //
  // For the rare cases where a server-only module needs a static `import`
  // (e.g. a `*.server.ts` file referenced only from route handlers), list
  // the package below so Next.js leaves it as an external `require()` call
  // and never tries to bundle it for the edge / browser. Adding a package
  // here is a runtime-only no-op when the package isn't installed.
  serverExternalPackages: [
    'pg',
    'mysql2',
    'better-sqlite3',
    'mongodb',
    'ioredis',
    'redis',
    '@prisma/client',
    'prisma',
    'bullmq',
  ],

  async rewrites() {
    // The marketing-agent ships with built-in Next.js route handlers under
    // /api/backend/* that serve generic seed data from in-memory storage,
    // so the app is fully self-contained out of the box.
    //
    // To proxy /api/backend/* to a real external API instead, set
    // NEXT_PUBLIC_API_URL (e.g. https://api.your-domain.com/api/v1).
    // When unset, the local route handlers serve every request and there
    // is no rewrite — this is what powers the dashboard, campaigns, etc.
    // without any external backend.
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (!apiUrl) return [];

    return [
      {
        source: '/api/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;