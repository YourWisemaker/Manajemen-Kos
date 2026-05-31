import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration — Task 1.5
 *
 * jsdom environment + globals so React Testing Library and the
 * `@testing-library/jest-dom` matchers work without per-file imports.
 * The `@/*` path alias is resolved to `./src` (mirrors tsconfig paths) via
 * both the tsconfig-paths plugin and an explicit alias for robustness.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // E2E specs live under tests/e2e and are run by Playwright, not Vitest.
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
});
