/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: isSsrBuild ? {} : {
    rollupOptions: {
      // The item popup script is its own entry: every page loads it, only the calculator loads the app.
      input: { index: "index.html", tips: "src/tips/tips.ts" },
      output: { entryFileNames: (chunk) => (chunk.name === "tips" ? "assets/tips-[hash].js" : "assets/[name]-[hash].js") },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts"],
  },
}));
