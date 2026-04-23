/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // VERCEL_ENV is automatically set by Vercel ('production' | 'preview' | 'development')
    // and cannot be overridden by user-configured env vars, making it a reliable
    // signal for which API to proxy to.  For local development we fall back to
    // NEXT_PUBLIC_API_URL (if set) or localhost.
    let apiUrl;
    if (process.env.VERCEL_ENV === 'production') {
      apiUrl = 'https://api.curex24.com/api/v1';
    } else if (process.env.VERCEL_ENV === 'preview') {
      apiUrl = 'https://api.staging.curex24.com/api/v1';
    } else {
      apiUrl =
        (process.env.NEXT_PUBLIC_API_URL || '').trim() ||
        'http://localhost:3000/api/v1';
    }

    return [
      {
        source: '/api/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;