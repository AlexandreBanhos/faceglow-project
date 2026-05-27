import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { RefreshCw } from "lucide-react";
import brokenUrl from "@/assets/icones/produto-quebrado.svg";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Importing a module script failed") ||
      error.message.includes("Unable to preload CSS");

    if (isChunkError) {
      // Guard: recarrega só uma vez a cada 30s — evita loop infinito
      const last = parseInt(sessionStorage.getItem("_fg_chunk_reload") ?? "0", 10);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem("_fg_chunk_reload", String(Date.now()));
        // Limpa caches do SW para forçar download dos novos chunks
        if ("caches" in window) {
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .finally(() => window.location.reload());
        } else {
          window.location.reload();
        }
        return { hasError: false, error: null };
      }
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--grad-aurora)" }}>
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl max-w-sm w-full p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(221,182,147,0.15),rgba(239,143,184,0.18))" }}>
            <div style={{
              width: 36, height: 36,
              WebkitMaskImage: `url("${brokenUrl}")`, maskImage: `url("${brokenUrl}")`,
              WebkitMaskSize: "contain", maskSize: "contain",
              WebkitMaskPosition: "center", maskPosition: "center",
              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
              background: "linear-gradient(135deg,#ddb693 0%,#e8a9c2 55%,#ef8fb8 100%)",
            }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-2xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw size={16} />
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
