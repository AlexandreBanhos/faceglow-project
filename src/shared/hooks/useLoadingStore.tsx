import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface LoadingState {
  isLoading: boolean;
  message: string;
  setLoading: (isLoading: boolean, message?: string) => void;
  clearLoading: () => void;
}

const LoadingContext = createContext<LoadingState | undefined>(undefined);

/**
 * Provider de Loading Global
 * Deve envolver a aplica��o
 */
export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Carregando...");

  const handleSetLoading = useCallback((loading: boolean, newMessage?: string) => {
    setIsLoading(loading);
    if (newMessage) setMessage(newMessage);
  }, []);

  const clearLoading = useCallback(() => {
    setIsLoading(false);
    setMessage("Carregando...");
  }, []);

  const value: LoadingState = {
    isLoading,
    message,
    setLoading: handleSetLoading,
    clearLoading,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

/**
 * Hook para usar o loading global
 */
export const useLoadingStore = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoadingStore deve ser usado dentro de LoadingProvider");
  }
  return context;
};
