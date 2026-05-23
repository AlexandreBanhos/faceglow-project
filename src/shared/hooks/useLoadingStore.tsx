import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

interface LoadingState {
  isLoading: boolean;
  message: string;
  setLoading: (isLoading: boolean, message?: string) => void;
  clearLoading: () => void;
}

const LoadingContext = createContext<LoadingState | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Carregando...");

  const setLoading = useCallback((loading: boolean, newMessage?: string) => {
    setIsLoading(loading);
    if (newMessage) setMessage(newMessage);
  }, []);

  const clearLoading = useCallback(() => {
    setIsLoading(false);
    setMessage("Carregando...");
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, message, setLoading, clearLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingStore(): LoadingState {
  const context = useContext(LoadingContext);
  if (!context) throw new Error("useLoadingStore deve ser usado dentro de LoadingProvider");
  return context;
}
