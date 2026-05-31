import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration — Task 1.5
 *
 * E2E smoke tests run against the app at http://localhost:3000. The
 * `webServer` block lets Playwright boot the Next.js dev server on demand
 * when `npm run test:e2e` is invoked; it is NOT started by this config at
 * import time. `reuseExistingServer` avoids spawning a second server when one
 * is already running locally.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
