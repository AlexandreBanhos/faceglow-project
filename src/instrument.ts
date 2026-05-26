import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string ||
    "https://04d5da75baf0144d8b17bb9d45fa70d4@o4511447218192384.ingest.de.sentry.io/4511447225663568",
  environment: (import.meta.env.VITE_ENVIRONMENT as string) || import.meta.env.MODE,

  integrations: [
    // Rastreamento de performance + navegação com React Router v6
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    // Session Replay: grava sessão completa só em erros
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Amostragem de traces: 10% em prod, 100% em dev
  tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,

  // Session Replay: 5% das sessões, 100% nas sessões com erro
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,
});
