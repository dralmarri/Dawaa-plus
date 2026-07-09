import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/@capacitor/")) return "vendor-capacitor";
          if (id.includes("/recharts/") || id.includes("/d3-")) return "vendor-charts";
          if (
            id.includes("/@radix-ui/") ||
            id.includes("/lucide-react/") ||
            id.includes("/cmdk/") ||
            id.includes("/vaul/") ||
            id.includes("/sonner/")
          ) {
            return "vendor-ui";
          }
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
}));
