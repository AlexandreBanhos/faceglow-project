import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureReferralFromUrl } from "@/lib/affiliate";

// Captura ?ref=CODIGO antes de qualquer render
captureReferralFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
