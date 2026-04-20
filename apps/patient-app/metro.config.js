const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const mobileAppRoot = path.resolve(projectRoot, '../mobile');

const config = getDefaultConfig(projectRoot);
const upstreamResolveRequest = config.resolver.resolveRequest;

// Limit Metro's file crawling on Windows/OneDrive while still allowing the
// patient app to reuse the shared implementation from apps/mobile.
config.watchFolders = [projectRoot, mobileAppRoot];

if (process.platform === 'win32') {
  config.maxWorkers = 2;
}

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.blockList = [
  /apps[\/\\]admin[\/\\].*/,
  /apps[\/\\]api[\/\\].*/,
  /apps[\/\\]provider-app[\/\\].*/,
  /packages[\/\\].*/,
  /docs[\/\\].*/,
];

const SINGLETON_PACKAGES = [
  'react',
  'react-native',
  'react-native-safe-area-context',
  'react-native-screens',
];

config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
  'react-native-safe-area-context': path.resolve(
    projectRoot,
    'node_modules/react-native-safe-area-context',
  ),
  'react-native-screens': path.resolve(
    monorepoRoot,
    'node_modules/react-native-screens',
  ),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLETON_PACKAGES.includes(moduleName)) {
    return resolve(
      {
        ...context,
        resolveRequest: upstreamResolveRequest,
        originModulePath: path.resolve(projectRoot, 'index.js'),
      },
      moduleName,
      platform,
    );
  }

  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;