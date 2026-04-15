/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.curex24.com/api/v1';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;