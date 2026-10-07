import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests.
 *
 * Prerequisites (both must already be running):
 *   backend : uvicorn app.main:app --port 8000   (from backend/)
 *   frontend: npm run dev                        (from frontend/)
 *
 * Run with:  npx playwright test
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
