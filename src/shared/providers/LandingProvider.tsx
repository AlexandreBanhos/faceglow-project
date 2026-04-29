/**
 * Landing Provider — Dependency Injection Container
 * 
 * Padrão: Context API + DI
 * Princípios SOLID aplicados:
 * - Dependency Inversion: Componentes dependem de ILandingContentService, não da implementação
 * - Single Responsibility: Provider só injeta dependências
 * - Interface Segregation: Service expõe apenas métodos necessários
 */

import { ReactNode, useMemo } from "react";
import {
  ILandingContentService,
  LandingContentService,
} from "@/domains/landing/services/LandingContentService";
import { LandingContext } from "./LandingContext";

/**
 * Provider que encapsula toda a lógica de injeção de dependências
 * Pode ser facilmente substituído por mocks no teste
 */
interface LandingProviderProps {
  children: ReactNode;
  contentService?: ILandingContentService; // Permite injetar para testes
}

export function LandingProvider({
  children,
  contentService,
}: LandingProviderProps) {
  // Memoiza a service para evitar recriações desnecessárias
  const service = useMemo(
    () => contentService ?? new LandingContentService(),
    [contentService]
  );

  const value = {
    contentService: service,
  };

  return (
    <LandingContext.Provider value={value}>
      {children}
    </LandingContext.Provider>
  );
}


