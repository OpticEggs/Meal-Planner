import { defineConfig } from "vitest/config";
import path from "node:path";

// The package's own suite. `@/` resolves to Table's src ONLY so parity tests can compare the frozen
// legacy copies with the live Table modules; package src never imports `@/`.
const here = import.meta.dirname;
export default defineConfig({
  root: here,
  resolve: { alias: { "@": path.resolve(here, "../../src") } },
  test: {
    include: ["tests/**/*.test.ts", "bench/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
