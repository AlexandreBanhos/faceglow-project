import { useEffect, useCallback } from "react";
import { useUserContext } from "./useUserContext";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/shared/services/api/ApiClient";
import { UserStatus } from "@/contexts/UserContextTypes";

interface BillingStatusResponse {
  isActive?: boolean;
  planKey?: string;
  status?: string;
  expiresAtUtc?: string;
}

interface CreditsResponse {
  creditsRemaining?: number;
}

/**
 * Hook que carrega status de premium e créditos do backend
 * Deve ser chamado uma vez após autenticação
 */
export const useUserStatus = (enabled = true) => {
  const { setUserStatus, userStatus } = useUserContext();

  const fetchUserStatus = useCallback(async () => {
    if (!enabled) {
      setUserStatus((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setUserStatus((prev) => ({ ...prev, isLoading: true }));

      // Aguarda token estar disponível
      const token = await getAccessToken();
      if (!token) {
        setUserStatus((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Timeout global para o carregamento todo (não deixar ficar mais de 12s)
      const promise = Promise.allSettled([
        apiClient.get<BillingStatusResponse>("/billing/status", {
          timeout: 5000, // Timeout individual de 5s
        }),
        apiClient.get<CreditsResponse>("/analysis/credits", {
          timeout: 5000, // Timeout individual de 5s
        }),
      ]);

      // Aguarda com timeout global de 12s
      const results = await Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao carregar status")), 12000)
        ),
      ]);

      let isPremium = false;
      let subscriptionType: UserStatus["subscriptionType"];
      let subscriptionStatus: UserStatus["subscriptionStatus"];
      let expiresAtUtc: string | undefined;

      // Parse billing status
      const billingRes = (results as PromiseSettledResult<any>[])[0];
      if (billingRes.status === "fulfilled") {
        const response = billingRes.value;
        // 404 significa sem assinatura (novo usuário) - não é erro, é esperado
        if (response?.status === 404) {
          isPremium = false;
          subscriptionType = "test";
          subscriptionStatus = "inactive";
        } else if (response?.data) {
          const billing = response.data;
          isPremium = billing.isActive === true;
          
          // Type-safe assignment
          if (billing.planKey && ["credits", "monthly", "quarterly", "annual"].includes(billing.planKey)) {
            subscriptionType = billing.planKey as UserStatus["subscriptionType"];
          }
          
          if (billing.status && ["active", "expired", "pending", "failed"].includes(billing.status)) {
            subscriptionStatus = billing.status as UserStatus["subscriptionStatus"];
          }
          
          expiresAtUtc = billing.expiresAtUtc;
        }
      }

      // Parse créditos
      let creditsRemaining = 0;
      const creditsRes = (results as PromiseSettledResult<any>[])[1];
      if (creditsRes.status === "fulfilled" && creditsRes.value?.data?.creditsRemaining) {
        creditsRemaining = creditsRes.value.data.creditsRemaining;
      }

      const userId = (() => {
        try {
          return JSON.parse(atob(token.split(".")[1]))?.sub ?? "";
        } catch {
          return "";
        }
      })();

      const newStatus: UserStatus = {
        userId,
        isPremium,
        isFullAccess: isPremium && subscriptionType === "monthly",
        subscriptionType,
        creditsRemaining,
        subscriptionStatus,
        expiresAtUtc,
        isLoading: false,
      };

      setUserStatus(newStatus);
    } catch (error) {
      console.warn("[useUserStatus] Erro ao carregar status (servidor indisponível?):", error);
      // Fallback gracioso: assume usuário não premium com créditos zerados
      // (mas continua permitindo que ele navegue)
      setUserStatus((prev) => ({
        ...prev,
        isLoading: false,
        isPremium: false,
        creditsRemaining: 0,
      }));
    }
  }, [enabled, setUserStatus]);

  useEffect(() => {
    if (!enabled) {
      setUserStatus((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Carregar status uma vez ao montar
    fetchUserStatus();

    // Recarregar a cada 5 minutos (billing pode mudar)
    const interval = setInterval(fetchUserStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [enabled, fetchUserStatus, setUserStatus]);

  return {
    ...userStatus,
    refetch: fetchUserStatus,
  };
};
