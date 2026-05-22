import { Navigate, Outlet } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { LoadingScreen } from "./LoadingScreen";

/**
 * Redireciona usuários free para /premium.
 * Enquanto o status premium está carregando, mostra a tela de loading.
 * Usuários premium ou com status desconhecido passam normalmente.
 */
const RequirePremium = () => {
  const { isPremium, isLoading, statusUnknown } = useIsPremium();

  if (isLoading) return <LoadingScreen />;

  // statusUnknown = erro de rede ao checar — deixa passar para não bloquear injustamente
  if (statusUnknown || isPremium) return <Outlet />;

  return <Navigate to="/premium" replace />;
};

export default RequirePremium;
