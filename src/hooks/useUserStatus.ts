import { useEffect, useCallback } from "react";
import { useUserContext } from "./useUserContext";
import { getTokenOrWait } from "@/lib/auth";
import { apiClient } from "@/shared/services/api/ApiClient";
import { UserStatus } from "@/contexts/UserContextTypes";
import { writeUserStatusCache, readUserStatusCache, setStatusRefreshFn } from "@/contexts/UserContext";

interface BillingStatusResponse {
  isActive?: boolean;
  isPremium?: boolean;
  planKey?: string;
  status?: string;
  expiresAtUtc?: string;
}

interface CreditsResponse {
  creditsRemaining?: number;
}

export const useUserStatus = (enabled = true) => {
  const { setUserStatus, userStatus } = useUserContext();

  const fetchUserStatus = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setUserStatus((prev) => ({ ...prev, isLoading: true }));
      }

      const token = await getTokenOrWait(3000);
      if (!token) {
        setUserStatus((prev) => ({ ...prev, isLoading: false, statusUnknown: true }));
        return;
      }

      // 20s por request, 2 tentativas — cobre cold start do backend (~10s); ping em main.tsx adianta wake-up
      const [billingRes, creditsRes] = await Promise.allSettled([
        apiClient.get<BillingStatusResponse>("/billing/status", { timeout: 20000, retries: 2 }),
        apiClient.get<CreditsResponse>("/analysis/credits", { timeout: 20000, retries: 2 }),
      ]);

      const billingOk = billingRes.status === "fulfilled" && billingRes.value?.ok === true;
      const creditsOk = creditsRes.status === "fulfilled" && creditsRes.value?.ok === true;

      // Ambas falharam — preserva cache para não bloquear premium users
      if (!billingOk && !creditsOk) {
        const cached = readUserStatusCache();
        if (cached) {
          setUserStatus({ ...cached, isLoading: false, statusUnknown: true });
          return;
        }
      }

      let isPremium = false;
      let subscriptionType: UserStatus["subscriptionType"];
      let subscriptionStatus: UserStatus["subscriptionStatus"];
      let expiresAtUtc: string | undefined;

      if (billingOk) {
        const billing = (billingRes as PromiseFulfilledResult<{ ok: boolean; data?: BillingStatusResponse }>).value.data;
        if (billing) {
          isPremium = billing.isPremium === true;
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
      if (creditsOk) {
        const credits = (creditsRes as PromiseFulfilledResult<{ ok: boolean; data?: CreditsResponse }>).value.data;
        if (credits?.creditsRemaining) {
          creditsRemaining = credits.creditsRemaining;
        }
      }

      const userId = (() => {
        try { return JSON.parse(atob(token.split(".")[1]))?.sub ?? ""; } catch { return ""; }
      })();

      const newStatus: UserStatus = {
        userId,
        isPremium,
        isFullAccess: isPremium && subscriptionType !== "credits",
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
      // Fallback ao cache para não zerar isPremium/creditsRemaining
      const cached = readUserStatusCache();
      if (cached) {
        setUserStatus({ ...cached, isLoading: false, statusUnknown: true });
      } else {
        setUserStatus((prev) => ({ ...prev, isLoading: false, statusUnknown: true }));
      }
    }
  }, [setUserStatus]);

  useEffect(() => {
    setStatusRefreshFn(fetchUserStatus);
    return () => setStatusRefreshFn(null);
  }, [fetchUserStatus]);

  useEffect(() => {
    if (!enabled) return;

    const cached = readUserStatusCache();
    if (cached) {
      // Aplica cache imediatamente (sem loading) e revalida em background
      setUserStatus({ ...cached, isLoading: false });
      fetchUserStatus(false);
    } else {
      fetchUserStatus(true);
    }
  }, [enabled, fetchUserStatus, setUserStatus]);

  return { ...userStatus, refetch: fetchUserStatus };
};
