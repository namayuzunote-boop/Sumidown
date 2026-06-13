import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts (which is tuned for the Tauri dev server)
// so the test runner stays independent of the bundler/dev-server settings.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
