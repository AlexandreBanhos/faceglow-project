import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // Vendors legítimos podem ser maiores — threshold 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Framer Motion — 100KB, raramente atualizado — cache independente
          if (id.includes("/framer-motion/")) return "vendor-framer";
          // Supabase — 180KB, raramente atualizado — cache independente
          if (id.includes("/@supabase/")) return "vendor-supabase";
          // Todo o restante de node_modules num único chunk estável
          return "vendor";
        },
      },
    },
  },
}));
