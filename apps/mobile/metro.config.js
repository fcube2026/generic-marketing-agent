const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch the mobile app and the root node_modules (for hoisted deps).
config.watchFolders = [
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure node_modules resolve from both the app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Block unrelated workspace apps to speed up Metro on OneDrive
config.resolver.blockList = [
  /apps[\/\\]admin[\/\\].*/,
  /apps[\/\\]api[\/\\].*/,
  /apps[\/\\]patient-app[\/\\].*/,
  /apps[\/\\]provider-app[\/\\].*/,
  /packages[\/\\].*/,
  /docs[\/\\].*/,
];

// Native modules that crash when two copies register the same ViewManager.
// pnpm installs separate copies in nested node_modules — we force ONE copy
// by redirecting resolution to originate from the project root every time.
const SINGLETON_PACKAGES = [
  'react',
  'react-native',
  'react-native-safe-area-context',
  'react-native-screens',
];

config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
  'react-native-safe-area-context': path.resolve(projectRoot, 'node_modules/react-native-safe-area-context'),
  'react-native-screens': path.resolve(monorepoRoot, 'node_modules/react-native-screens'),
};

// Force singleton resolution: override originModulePath so the resolver
// starts walking from the project root instead of the requiring package's
// nested node_modules. This guarantees only ONE physical copy gets bundled.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLETON_PACKAGES.includes(moduleName)) {
    return context.resolveRequest(
      {
        ...context,
        resolveRequest: undefined,
        // Trick: pretend the import originates from the project root.
        // The resolver walks up from here and finds apps/mobile/node_modules/
        // first, skipping any nested copies inside @react-navigation etc.
        originModulePath: path.resolve(projectRoot, 'index.js'),
      },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
