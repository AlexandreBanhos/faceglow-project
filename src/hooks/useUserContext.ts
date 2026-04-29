import { useContext } from "react";
import { UserContext, UserContextType } from "@/contexts/UserContextTypes";

/**
 * Acesso direto ao contexto de usuário
 * Use apenas quando precisar de acesso completo (casos avançados)
 * Para verificar premium, prefira `useIsPremium()`
 */
export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext deve ser usado dentro de <UserProvider>");
  }
  return context;
};
