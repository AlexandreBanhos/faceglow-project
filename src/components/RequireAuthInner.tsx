import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { assertSupabaseConfigured } from "@/lib/supabase";
import { useTokenReady } from "@/hooks/useTokenReady";
import { useUserStatus } from "@/hooks/useUserStatus";
import { LoadingScreen } from "./LoadingScreen";

/**
 * Componente privado que carrega status de premium
 * Deve estar dentro de UserProvider
 */
const RequireAuthInner = () => {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const tokenReady = useTokenReady();

  const { isLoading: statusLoading } = useUserStatus(isAuthenticated && tokenReady);

  useEffect(() => {
    let mounted = true;
    const client = assertSupabaseConfigured();

    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(data.session));
      setReady(true);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(session));
      setReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const readyForChildren = ready && tokenReady && !statusLoading;

  if (!readyForChildren) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuthInner;
