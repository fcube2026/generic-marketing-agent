/**
 * Deduplicates React module instances in a pnpm monorepo.
 *
 * In a pnpm hoisted layout where the root node_modules/react is 18.2.0 (for
 * Expo/React Native) but Next.js requires react 18.3.x, pnpm installs
 * react 18.3.x in several sub-directories:
 *
 *   node_modules/next/node_modules/react@18.3.1
 *   node_modules/react-dom/node_modules/react@18.3.1
 *   apps/admin/node_modules/react@18.3.1
 *
 * Because these are separate physical directories they become separate Node.js
 * module-cache entries with separate hook dispatchers.  The Pages Router
 * pre-renderer (pages.runtime.prod.js) loads react from next/node_modules and
 * react-dom-server loads it from react-dom/node_modules; the two instances
 * never share a dispatcher, causing:
 *
 *   TypeError: Cannot read properties of null (reading 'useRef')
 *
 * Fix: replace the extra copies with symlinks that all point to one canonical
 * directory (next/node_modules/react).  Node.js resolves symlinks before
 * caching, so every require('react') ends up with the same cache entry and
 * therefore the same dispatcher object.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Canonical copy – this is the one Next.js's pages.runtime.prod.js uses.
const canonical = path.join(root, 'node_modules', 'next', 'node_modules', 'react');

// Paths that must become symlinks to the canonical copy.
const duplicates = [
  path.join(root, 'node_modules', 'react-dom', 'node_modules', 'react'),
  path.join(root, 'node_modules', 'styled-jsx', 'node_modules', 'react'),
  path.join(root, 'apps', 'admin', 'node_modules', 'react'),
];

if (!fs.existsSync(canonical)) {
  console.log('[fix-react-instances] canonical path not found, skipping:', canonical);
  process.exit(0);
}

for (const dup of duplicates) {
  if (!fs.existsSync(dup)) continue;

  const real = fs.realpathSync(dup);
  if (real === fs.realpathSync(canonical)) {
    console.log('[fix-react-instances] already deduplicated:', dup);
    continue;
  }

  // Replace with a relative symlink.
  const rel = path.relative(path.dirname(dup), canonical);
  fs.rmSync(dup, { recursive: true, force: true });
  fs.symlinkSync(rel, dup, 'junction');
  console.log('[fix-react-instances] symlinked', dup, '->', rel);
}
