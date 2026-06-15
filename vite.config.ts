import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = `http://${env.VITE_APP_URL || process.env.VITE_APP_URL || "192.168.30.10:9100"}`;

  return {
    plugins: [
      tanstackRouter({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
      }),
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
    define: {
      global: "globalThis",
    },
    server: {
      port: Number(env.VITE_APP_PORT || process.env.VITE_APP_PORT) || 3000,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              if (
                id.includes("/shared/lib/request") ||
                id.includes("/shared/lib/auth-session") ||
                id.includes("/shared/lib/menu-session")
              ) {
                return "app-core";
              }
              return undefined;
            }

            if (id.includes("echarts") || id.includes("zrender")) return "echarts";
            if (
              id.includes("/antd/") ||
              id.includes("@ant-design") ||
              id.includes("/@rc-component/") ||
              id.includes("/rc-")
            ) {
              return "antd";
            }
            if (id.includes("@tanstack")) return "tanstack";
            if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("scheduler")) {
              return "react";
            }
            if (
              id.includes("axios") ||
              id.includes("dayjs") ||
              id.includes("date-fns") ||
              id.includes("@stomp") ||
              id.includes("sockjs")
            ) {
              return "utils";
            }
            if (id.includes("crypto-js")) return "utils";
            return "vendor";
          },
        },
      },
    },
  };
});
