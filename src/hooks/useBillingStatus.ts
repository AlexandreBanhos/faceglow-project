import { useEffect, useState } from 'react';
import { fetchBillingStatus, type BillingStatusResponse } from '@/lib/billing';

/**
 * Hook para acessar status de billing (plano ativo)
 * Usado para determinar se usuario tem plano e alterar UI
 */
export const useBillingStatus = () => {
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadBillingStatus = async () => {
      try {
        const status = await fetchBillingStatus();
        if (mounted) {
          setBillingStatus(status);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar status de billing');
          setBillingStatus(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadBillingStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    billingStatus,
    isActive: billingStatus?.isActive ?? false,
    isLoading,
    error,
  };
};
