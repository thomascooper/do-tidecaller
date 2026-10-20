/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Wowhead's model files, relayed under /modelviewer the way vercel.json does in production.
// The viewer's requests carry an Origin header the CDN would refuse, so it is removed.
const modelRelay = {
  "/modelviewer": {
    target: "https://wow.zamimg.com",
    changeOrigin: true,
    configure: (proxy: { on: (event: "proxyReq", cb: (req: { removeHeader: (name: string) => void }) => void) => void }) =>
      proxy.on("proxyReq", (req) => req.removeHeader("origin")),
  },
};

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: isSsrBuild ? {} : {
    rollupOptions: {
      // The item popup script is its own entry: every page loads it, only the calculator loads the app.
      input: { index: "index.html", tips: "src/tips/tips.ts" },
      output: { entryFileNames: (chunk) => (chunk.name === "tips" ? "assets/tips-[hash].js" : "assets/[name]-[hash].js") },
    },
  },
  server: { proxy: modelRelay },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "test/**/*.test.ts"],
  },
}));
