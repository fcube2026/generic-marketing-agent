const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const { resolve } = require('metro-resolver');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const upstreamResolveRequest = config.resolver.resolveRequest;

const escapePathForRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const blockPath = (targetPath) =>
  new RegExp(`^${escapePathForRegex(targetPath)}[\\/\\\\].*`);

// Keep Metro watching the app itself only. Watching the monorepo-level
// node_modules tree on Windows/OneDrive causes transform worker OOM.
config.watchFolders = [
  projectRoot,
];

// Windows + OneDrive tends to fail spawning many Metro transform workers.
// Keep the worker pool at 1 to prevent OOM in transform worker child processes.
if (process.platform === 'win32') {
  config.maxWorkers = 1;
}

// Ensure node_modules resolve from both the app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Prevent Metro from walking up parent directories looking for additional
// node_modules folders. We provide the only allowed locations explicitly above.
config.resolver.disableHierarchicalLookup = true;

// Block unrelated workspace apps to speed up Metro on OneDrive
config.resolver.blockList = exclusionList([
  blockPath(path.resolve(monorepoRoot, 'apps/admin')),
  blockPath(path.resolve(monorepoRoot, 'apps/api')),
  blockPath(path.resolve(monorepoRoot, 'apps/doctor-portal')),
  blockPath(path.resolve(monorepoRoot, 'apps/marketing-agent')),
  blockPath(path.resolve(monorepoRoot, 'apps/patient-app')),
  blockPath(path.resolve(monorepoRoot, 'apps/provider-app')),
  blockPath(path.resolve(monorepoRoot, 'docs')),
  blockPath(path.resolve(monorepoRoot, 'labels')),
  blockPath(path.resolve(monorepoRoot, 'packages')),
  blockPath(path.resolve(monorepoRoot, 'prisma')),
  blockPath(path.resolve(monorepoRoot, 'scripts')),
  blockPath(path.resolve(monorepoRoot, 'supabase')),
]);

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
    return resolve(
      {
        ...context,
        resolveRequest: upstreamResolveRequest,
        // Trick: pretend the import originates from the project root.
        // The resolver walks up from here and finds apps/mobile/node_modules/
        // first, skipping any nested copies inside @react-navigation etc.
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
