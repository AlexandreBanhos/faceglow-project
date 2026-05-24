import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { assertSupabaseConfigured } from "@/lib/supabase";
import { useUserStatus } from "@/hooks/useUserStatus";
import { LoadingScreen } from "./LoadingScreen";

const RequireAuthInner = () => {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useUserStatus(ready && isAuthenticated);

  // Exibe o LoadingScreen só após 200ms — evita flash para checks rápidos (sessão em memória)
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    const client = assertSupabaseConfigured();

    // Pré-carrega o bundle do Dashboard em paralelo com o check de auth
    void import("@/pages/Dashboard");

    const applySession = (session: { access_token?: string } | null) => {
      if (!mounted) return;
      setIsAuthenticated(Boolean(session?.access_token));
      setReady(true);
    };

    // Único getSession() — cobre sessão em memória e localStorage
    client.auth.getSession().then(({ data }) => applySession(data.session));

    // onAuthStateChange cobre token refresh, SIGNED_IN e SIGNED_OUT em tempo real
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return showLoader ? <LoadingScreen /> : null;
  if (!isAuthenticated) return <Navigate to="/auth?mode=login" replace state={{ from: location }} />;
  return <Outlet />;
};

export default RequireAuthInner;
