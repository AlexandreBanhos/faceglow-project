import { useEffect, useState } from 'react';
import { assertSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook que aguarda o token JWT estar disponível.
 * Usa onAuthStateChange em vez de polling — resolve imediatamente
 * se a sessão já existe, sem múltiplos round-trips ao Supabase.
 */
export const useTokenReady = () => {
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const client = assertSupabaseConfigured();

    // Verificação imediata da sessão atual
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.access_token) {
        setTokenReady(true);
        return;
      }
      // Sem sessão imediata — aguarda evento de auth
      // (fallback para casos de cold start ou refresh em andamento)
    });

    // Escuta mudanças de auth: SIGNED_IN ou TOKEN_REFRESHED garantem token válido
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.access_token) {
        setTokenReady(true);
      }
    });

    // Timeout de segurança: se após 3s ainda sem token, libera de qualquer forma
    const safetyTimeout = setTimeout(() => {
      if (mounted && !tokenReady) {
        setTokenReady(true);
      }
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return tokenReady;
};
