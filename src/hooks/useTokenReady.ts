import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

/**
 * Hook que aguarda até o token JWT estar de fato disponível
 * Diferente de apenas ter sessão validada - garante que getAccessToken() retorna um token válido
 * 
 * Resolve race condition: RequireAuth marca ready=true mas token ainda pode ser null
 */
export const useTokenReady = () => {
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 50; // ~5 segundos com 100ms interval

    const checkTokenReady = async () => {
      attempts++;
      const token = await getAccessToken();

      if (!mounted) return;

      if (token) {
        console.log('✓ [Auth] Token está pronto');
        setTokenReady(true);
      } else if (attempts < maxAttempts) {
        // Retry a cada 100ms até ter token
        console.log(`⏳ [Auth] Aguardando token... (${attempts}/${maxAttempts})`);
        setTimeout(checkTokenReady, 100);
      } else {
        // Timeout - considera pronto mesmo sem token
        // Deixa requisições falharem naturalmente
        console.warn('[Auth] Timeout aguardando token - considera pronto mesmo assim');
        setTokenReady(true);
      }
    };

    checkTokenReady();

    return () => {
      mounted = false;
    };
  }, []);

  return tokenReady;
};
