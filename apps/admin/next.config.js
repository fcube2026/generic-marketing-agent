/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack(config) {
    // Force webpack to resolve a single copy of react and react-dom so that
    // Next.js's own bundled copy (node_modules/next/node_modules/react) does
    // not create a second React instance during static page generation, which
    // causes "Cannot read properties of null (reading 'useRef')".
    config.resolve.alias['react'] = path.resolve(__dirname, '../../node_modules/react');
    config.resolve.alias['react-dom'] = path.resolve(__dirname, '../../node_modules/react-dom');
    return config;
  },
};
module.exports = nextConfig;
