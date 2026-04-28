const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the local app and shared packages
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, 'packages/design-tokens'),
];

// 2. Resolve node_modules from both local and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force common singletons to resolve to the monorepo root
config.resolver.extraNodeModules = {
  'react': path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
};

// 4. Block other workspaces to save memory and avoid watch issues
config.resolver.blockList = [
  new RegExp(path.resolve(monorepoRoot, 'apps/admin').replace(/\\/g, '\\\\') + '/.*'),
  new RegExp(path.resolve(monorepoRoot, 'apps/api').replace(/\\/g, '\\\\') + '/.*'),
  new RegExp(path.resolve(monorepoRoot, 'apps/doctor-portal').replace(/\\/g, '\\\\') + '/.*'),
  new RegExp(path.resolve(monorepoRoot, 'apps/marketing-agent').replace(/\\/g, '\\\\') + '/.*'),
  new RegExp(path.resolve(monorepoRoot, 'packages').replace(/\\/g, '\\\\') + '/(?!design-tokens).*'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
