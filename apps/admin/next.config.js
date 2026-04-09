/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack(config) {
    // Force webpack to resolve a single copy of react and react-dom so that
    // Next.js's own bundled copy (node_modules/next/node_modules/react) does
    // not create a second React instance during static page generation, which
    // causes "Cannot read properties of null (reading 'useContext')".
    //
    // In this pnpm monorepo the root node_modules/react is pinned to 18.2.0
    // (pulled in by expo/mobile deps) while admin requires react@^18.3.1.
    // pnpm therefore installs react 18.3.1 locally in apps/admin/node_modules.
    // We must alias to THAT copy (18.3.1) so webpack-bundled client code and
    // the Next.js server runtime both share the same React instance.
    config.resolve.alias['react'] = path.resolve(__dirname, 'node_modules/react');
    config.resolve.alias['react-dom'] = path.resolve(__dirname, '../../node_modules/react-dom');
    return config;
  },
};
module.exports = nextConfig;
