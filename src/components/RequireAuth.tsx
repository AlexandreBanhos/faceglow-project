import { UserProvider } from "@/contexts/UserContext";
import RequireAuthInner from "./RequireAuthInner";

/**
 * Componente wrapper que:
 * 1. Fornece UserContext (status premium + créditos)
 * 2. Valida autenticação
 * 3. Carrega status de premium ao autenticar
 * 4. Renderiza rotas protegidas apenas após tudo estar pronto
 */
const RequireAuth = () => {
  return (
    <UserProvider>
      <RequireAuthInner />
    </UserProvider>
  );
};

export default RequireAuth;
