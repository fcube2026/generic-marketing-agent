// apps/mobile/app.config.ts
// Dynamic Expo configuration supporting development, staging, and production variants.
// Environment is determined by APP_ENV or EAS build profile.

const IS_STAGING = process.env.APP_ENV === 'staging';
const IS_PRODUCTION = process.env.APP_ENV === 'production';
const EAS_PROJECT_ID = '32ba7225-63f2-4092-95e5-1e24cb77d6a2';

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
    url: 'https://u.expo.dev/32ba7225-63f2-4092-95e5-1e24cb77d6a2',
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
      NSCameraUsageDescription:
        'Camera access is required for face verification and document capture during KYC.',
      NSPhotoLibraryUsageDescription:
        'Photo library access is required to upload verification documents (Aadhaar and medical certificate).',
      NSPhotoLibraryAddUsageDescription:
        'Photo library write access is required to save captured document images.',
    },
  },
  android: {
    icon: './assets/icon.png',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#0D9488',
    },
    package: getBundleId(),
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
    ],
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
      projectId: process.env.EAS_PROJECT_ID || EAS_PROJECT_ID,
    },
  },
  plugins: [
    './plugins/withStaticEntryFile',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Curex24 to access your photos for document upload.',
        cameraPermission: 'Allow Curex24 to use the camera for face verification and document capture.',
      },
    ],
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
