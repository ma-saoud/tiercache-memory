import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["**/*types.ts", "**/*.d.ts", "**/*.test.ts"],
    },
    include: ["src/**/*.test.ts"],
  },
});
