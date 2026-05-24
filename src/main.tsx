// instrument.ts DEVE ser o primeiro import — inicializa Sentry antes de qualquer render
import "./instrument";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureReferralFromUrl } from "@/lib/affiliate";
import { reportWebVitals } from "@/lib/webVitals";

captureReferralFromUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

reportWebVitals();
