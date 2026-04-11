/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build for containerized deployments
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};
module.exports = nextConfig;
