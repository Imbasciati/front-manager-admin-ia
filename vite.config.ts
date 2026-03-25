import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    minify: "esbuild",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react", "react-hot-toast", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-alert-dialog"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
});
