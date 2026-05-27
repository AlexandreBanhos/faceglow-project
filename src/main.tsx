// instrument.ts DEVE ser o primeiro import — inicializa Sentry antes de qualquer render
import "./instrument";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureReferralFromUrl } from "@/lib/affiliate";
import { reportWebVitals } from "@/lib/webVitals";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl } from "@/lib/api";

// Wake-up ping — acorda o backend antes do auth para reduzir cold start nas chamadas de status/credits
fetch(`${apiBaseUrl}/health`, { signal: AbortSignal.timeout(30_000) }).catch(() => {});

captureReferralFromUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

reportWebVitals();

// ── PWA update detection ──────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    // Checa update a cada 5 min — garante que o PWA vê deploys rapidamente
    setInterval(() => reg.update(), 5 * 60 * 1000);

    // Quando o SW novo ativa e envia SW_UPDATED, mostra toast de reload
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type !== "SW_UPDATED") return;
      // Não mostra na primeira instalação (sem SW anterior)
      if (!navigator.serviceWorker.controller) return;
      toast("Nova versão disponível", {
        description: "Recarregue para atualizar o app.",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => window.location.reload(),
        },
      });
    });
  });
}
