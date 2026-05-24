import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectManifest: {
        // Precacha só JS/CSS/HTML/ícones — exclui imagens grandes e vídeos
        globPatterns: ["**/*.{js,css,html,ico,woff2}"],
        globIgnores: [
          "**/*.{png,jpg,jpeg,webp,mp4,webm,svg}",
          "**/passos*",
          "**/pele-*",
          "**/prob-*",
          "**/ativo-*",
          "**/rotina-*",
        ],
        // Aumenta limite para 4MB (ícones SVG grandes)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: "FaceGlow",
        short_name: "FaceGlow",
        description: "Análise de pele com IA e rotina personalizada",
        theme_color: "#E8748A",
        background_color: "#FDF8F6",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
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
          // Supabase — 180KB, raramente atualizado
          if (id.includes("/@supabase/")) return "vendor-supabase";
          // Sentry — carregado em paralelo, não bloqueia hydration
          if (id.includes("/@sentry/")) return "vendor-sentry";
          // Recharts + D3 — usado só em ScoreChart
          if (id.includes("/recharts/") || id.includes("/d3-") || id.includes("/victory-")) return "vendor-charts";
          // Radix UI — muitos sub-pacotes, raramente atualizado
          if (id.includes("/@radix-ui/")) return "vendor-radix";
          // FontAwesome — ícones, só em UserProfileModal
          if (id.includes("/@fortawesome/")) return "vendor-icons";
          // Todo o restante de node_modules num único chunk estável
          return "vendor";
        },
      },
    },
  },
}));
