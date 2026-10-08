import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const TEST_ENV = {
  TABLE_ENV: "test",
  NODE_ENV: "production",
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://table@127.0.0.1:54329/table_test",
  TABLE_FIXED_NOW: "2026-10-12T19:00:00Z",
  TABLE_RETAILER: "simulated",
  BETTER_AUTH_URL: `http://127.0.0.1:${PORT}`,
  BETTER_AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789abcdef",
};
for (const [k, v] of Object.entries(TEST_ENV)) if (k !== "NODE_ENV") process.env[k] = v;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1, // one disposable database
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: TEST_ENV,
  },
});
