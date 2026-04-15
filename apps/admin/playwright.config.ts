/// <reference types="node" />

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.ADMIN_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const isCi = Boolean(process.env.CI);
const isLocalBaseUrl = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(baseURL);
const runAllBrowsers = isCi || process.env.PLAYWRIGHT_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : 1,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(isCi ? [['github'] as ['github']] : []),
  ],
  use: {
    baseURL,
    storageState: '.auth/admin.json',
    trace: isCi ? 'on-first-retry' : 'off',
    screenshot: 'only-on-failure',
    video: isCi ? 'on-first-retry' : 'off',
    navigationTimeout: 15_000,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(runAllBrowsers
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
            testMatch: /cross-cutting\.regression\.spec\.ts/,
          },
        ]
      : []),
  ],
  ...(isLocalBaseUrl && !isCi
    ? {
        webServer: {
          command: 'pnpm exec node scripts/start-playwright-server.mjs',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 240_000,
        },
      }
    : {}),
  outputDir: 'test-results/',
});
