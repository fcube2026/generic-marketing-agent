/** @type {import('next').NextConfig} */
const nextConfig = {
  // `pg` is an optional dependency used only when a SQL data source is
  // configured. Listing it here ensures Next.js treats it as an external
  // node module and does not attempt to bundle it (which would fail when
  // the package is not installed).
  serverExternalPackages: ['pg'],
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