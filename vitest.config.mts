import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    // Tests arrive in AD-06; until then an empty run is a pass, not a failure.
    passWithNoTests: true,
  },
});
