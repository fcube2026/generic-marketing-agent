import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts"],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});