import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fg_pwa_dismiss";
const VISIT_KEY   = "fg_pwa_visits";
const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MIN_VISITS  = 2;                          // mostra a partir da 2ª visita

function isAlreadyInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Record<string, unknown>).standalone === true
  );
}

function isDismissed() {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISS_TTL;
}

function detectIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [shouldShow, setShouldShow]         = useState(false);
  const canInstallRef = useRef(false);

  const isIOS = detectIOS();

  useEffect(() => {
    if (isAlreadyInstalled() || isDismissed()) return;

    // Conta visitas (ignora StrictMode double-invoke via sessionStorage guard)
    const guard = sessionStorage.getItem("fg_pwa_visit_counted");
    if (!guard) {
      sessionStorage.setItem("fg_pwa_visit_counted", "1");
      const prev = Number(localStorage.getItem(VISIT_KEY) ?? 0);
      localStorage.setItem(VISIT_KEY, String(prev + 1));
    }

    if (isIOS) canInstallRef.current = true;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      canInstallRef.current = true;
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      const visits = Number(localStorage.getItem(VISIT_KEY) ?? 0);
      if (visits >= MIN_VISITS && !isDismissed() && canInstallRef.current) {
        setShouldShow(true);
      }
    }, 5_000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerPrompt = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
    setShouldShow(false);
  };

  const dismiss = (longTerm = false) => {
    setShouldShow(false);
    const until = longTerm ? Date.now() + DISMISS_TTL * 36 : Date.now();
    localStorage.setItem(DISMISS_KEY, String(until));
  };

  return {
    shouldShow: shouldShow && !isAlreadyInstalled(),
    isIOS,
    canPrompt: !!deferredPrompt,
    triggerPrompt,
    dismiss,
  };
}
