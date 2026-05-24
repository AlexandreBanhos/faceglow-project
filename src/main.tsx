import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { captureReferralFromUrl } from "@/lib/affiliate";
import { reportWebVitals } from "@/lib/webVitals";

// Sentry: inicializa só se DSN estiver configurado (no-op em dev sem DSN)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

// Captura ?ref=CODIGO antes de qualquer render
captureReferralFromUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Web Vitals: reporta métricas de performance para Sentry (se ativo) ou console
reportWebVitals();
