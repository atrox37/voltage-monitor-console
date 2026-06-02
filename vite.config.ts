// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const apiTarget = `http://${process.env.VITE_APP_URL || "192.168.30.10:9100"}`;

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    // sockjs-client 依赖 Node.js 的 global 变量
    define: {
      global: "globalThis",
    },
    server: {
      port: Number(process.env.VITE_APP_PORT) || 3000,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
  },
});
