module.exports = {
  preset: 'jest-expo',
  rootDir: __dirname,
  // Limit parallelism so the Jest worker pool doesn't exhaust the ~2 GB
  // heap available on GitHub Actions (ubuntu-latest) runners.
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/.+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg))',
  ],
  moduleNameMapper: {
    // Pin react and react-native to a single resolved instance so that
    // @testing-library/react-native's detectHostComponentNames() and
    // react-test-renderer share the same React dispatcher, preventing
    // "Cannot read properties of null (reading 'useRef')" in tests.
    '^react$': require.resolve('react'),
    '^react-native$': require.resolve('react-native'),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
