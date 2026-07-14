import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    passWithNoTests: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Unit coverage measures deterministic domain policy. Next/Supabase adapters,
      // Server Actions and repositories are exercised by browser/staging gates.
      include: [
        "src/lib/content/**/*.ts",
        "src/lib/enquiries/public-enquiry.ts",
        "src/lib/permissions.ts",
        "src/lib/prayer/**/*.ts",
        "src/lib/settings/site-settings.ts",
        "src/lib/site-url.ts",
      ],
      exclude: ["**/*.d.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
