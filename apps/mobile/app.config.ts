// apps/mobile/app.config.ts
// Dynamic Expo configuration supporting development, staging, and production variants.
// Environment is determined by APP_ENV or EAS build profile.

const IS_STAGING = process.env.APP_ENV === 'staging';
const IS_PRODUCTION = process.env.APP_ENV === 'production';

const getAppName = (): string => {
  if (IS_STAGING) return 'Curex24 Staging';
  if (IS_PRODUCTION) return 'Curex24';
  return 'Curex24 Dev';
};

const getBundleId = (): string => {
  if (IS_STAGING) return 'com.curex24.mobile.staging';
  if (IS_PRODUCTION) return 'com.curex24.mobile';
  return 'com.curex24.mobile.dev';
};

export default ({ config }: { config: Record<string, unknown> }) => ({
  ...config,
  name: getAppName(),
  slug: 'curex24',
  version: '1.0.0',
  sdkVersion: '51.0.0',
  runtimeVersion: '51.0.0',
  updates: {
    enabled: false,
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    backgroundColor: '#0D9488',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getBundleId(),
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    icon: './assets/icon.png',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#0D9488',
    },
    package: getBundleId(),
    useNextNotificationsApi: true,
  },
  web: {
    favicon: './assets/icon.png',
  },
  extra: {
    appEnv: process.env.APP_ENV || 'development',
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '',
    },
  },
  plugins: [
    './plugins/withStaticEntryFile',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0D9488',
        sounds: [],
        mode: 'production',
      },
    ],
  ],
});
