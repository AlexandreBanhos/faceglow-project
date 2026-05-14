import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

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
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--grad-aurora)" }}>
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl max-w-sm w-full p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle size={26} className="text-destructive" />
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
