import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api/mcp-registry": {
        target: "https://registry.modelcontextprotocol.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp-registry/, ""),
      },
      "/api": {
        target: "http://localhost:54321",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:54321",
        ws: true,
      },
    },
  },
});
