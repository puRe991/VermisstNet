import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" wirft außerhalb von React-Server-Umgebungen – in Tests neutralisieren
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup-env.ts"],
    // Integrationstests teilen sich eine Datenbank → sequenziell
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
