module.exports = {
  preset: 'jest-expo',
  rootDir: __dirname,
  // The real-timer Animated.loop callbacks from VideoLobbyScreen once caused
  // an OOM at maxWorkers:2. That root cause (unstable useCameraPermissions
  // mock references → infinite re-render loop) is now fixed in the test file,
  // so 2 workers is safe again for faster local and CI runs.
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
