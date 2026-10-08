import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    env: {
      TABLE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://table@127.0.0.1:54329/table_test",
      TABLE_FIXED_NOW: "2026-10-12T19:00:00Z",
      TABLE_RETAILER: "simulated",
    },
    fileParallelism: false, // one disposable database; integration files run one at a time
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
