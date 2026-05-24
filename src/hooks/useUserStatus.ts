import { useEffect, useCallback } from "react";
import { useUserContext } from "./useUserContext";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/shared/services/api/ApiClient";
import { UserStatus } from "@/contexts/UserContextTypes";
import { writeUserStatusCache, readUserStatusCache, setStatusRefreshFn } from "@/contexts/UserContext";

interface BillingStatusResponse {
  isActive?: boolean;
  planKey?: string;
  status?: string;
  expiresAtUtc?: string;
}

interface CreditsResponse {
  creditsRemaining?: number;
}

export const useUserStatus = (enabled = true) => {
  const { setUserStatus, userStatus } = useUserContext();

  const fetchUserStatus = useCallback(async () => {
    try {
      setUserStatus((prev) => ({ ...prev, isLoading: true }));

      const token = await getAccessToken();
      if (!token) {
        setUserStatus((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const results = await Promise.race([
        Promise.allSettled([
          apiClient.get<BillingStatusResponse>("/billing/status", { timeout: 4000 }),
          apiClient.get<CreditsResponse>("/analysis/credits", { timeout: 4000 }),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao carregar status")), 6000)
        ),
      ]);

      let isPremium = false;
      let subscriptionType: UserStatus["subscriptionType"];
      let subscriptionStatus: UserStatus["subscriptionStatus"];
      let expiresAtUtc: string | undefined;

      const billingRes = (results as PromiseSettledResult<any>[])[0];
      if (billingRes.status === "fulfilled") {
        const response = billingRes.value;
        if (response?.status !== 404 && response?.data) {
          const billing = response.data;
          isPremium = billing.isActive === true;
          if (billing.planKey && ["credits", "monthly", "annual", "test"].includes(billing.planKey)) {
            subscriptionType = billing.planKey as UserStatus["subscriptionType"];
          }
          if (billing.status && ["active", "expired", "pending", "failed"].includes(billing.status)) {
            subscriptionStatus = billing.status as UserStatus["subscriptionStatus"];
          }
          expiresAtUtc = billing.expiresAtUtc;
        }
      }

      let creditsRemaining = 0;
      const creditsRes = (results as PromiseSettledResult<any>[])[1];
      if (creditsRes.status === "fulfilled" && creditsRes.value?.data?.creditsRemaining) {
        creditsRemaining = creditsRes.value.data.creditsRemaining;
      }

      const userId = (() => {
        try { return JSON.parse(atob(token.split(".")[1]))?.sub ?? ""; } catch { return ""; }
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
      writeUserStatusCache(newStatus);
    } catch (error) {
      console.warn("[useUserStatus] Erro ao carregar status:", error);
      setUserStatus((prev) => ({ ...prev, isLoading: false, statusUnknown: true }));
    }
  }, [setUserStatus]);

  // Registra o fetch real para que refreshPremiumStatus() do context funcione
  useEffect(() => {
    setStatusRefreshFn(fetchUserStatus);
    return () => setStatusRefreshFn(null);
  }, [fetchUserStatus]);

  useEffect(() => {
    if (!enabled) return;

    // Cache válido → não precisa buscar, garante isLoading: false
    const cached = readUserStatusCache();
    if (cached) {
      setUserStatus((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
      return;
    }

    // Cache expirado ou primeira sessão → busca do backend
    fetchUserStatus();
    // Sem setInterval — o TTL do cache controla quando o próximo fetch acontece
  }, [enabled, fetchUserStatus, setUserStatus]);

  return { ...userStatus, refetch: fetchUserStatus };
};
