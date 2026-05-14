import { apiClient } from "@/shared/services/api/ApiClient";
import { getAccessTokenWithWait } from "@/lib/auth";

export type BillingPlanKey = "test" | "credits" | "monthly" | "quarterly" | "annual";
export type BillingGatewayKey = "mercadopago-pix" | "mercadopago-card" | "stripe-card";

export type BillingCheckoutRequest = {
  planKey: BillingPlanKey;
  gateway: BillingGatewayKey;
};

export type BillingCheckoutResponse = {
  provider: string;
  gateway: BillingGatewayKey;
  planKey: BillingPlanKey;
  planName: string;
  status: string;
  amountCents: number;
  currency: string;
  checkoutUrl?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  externalReference?: string;
  externalId?: string;
  expiresAtUtc?: string;
};

export type BillingStatusResponse = {
  provider: string;
  gateway: BillingGatewayKey;
  planKey: BillingPlanKey;
  planName: string;
  status: string;
  isActive: boolean;
  amountCents: number;
  currency: string;
  activatedAtUtc?: string;
  expiresAtUtc?: string;
  externalReference?: string;
  externalId?: string;
};

export const createBillingCheckout = async (request: BillingCheckoutRequest): Promise<BillingCheckoutResponse> => {
  await getAccessTokenWithWait(5000);
  const response = await apiClient.post<BillingCheckoutResponse>("/billing/checkout", request);
  if (!response.ok || !response.data) {
    throw new Error(response.error || "Não foi possível iniciar o pagamento");
  }
  return response.data;
};

export const fetchAnalysisCredits = async (): Promise<number | null> => {
  try {
    // Aguarda token estar disponivel
    await getAccessTokenWithWait(5000);

    const response = await apiClient.get<{ creditsRemaining?: number }>("/analysis/credits");

    if (!response.ok) {
      return null;
    }

    return typeof response.data?.creditsRemaining === "number" ? response.data.creditsRemaining : null;
  } catch {
    return null;
  }
};

export const fetchBillingStatus = async (params?: {
  externalReference?: string;
  externalId?: string;
  forceRefresh?: boolean;
}): Promise<BillingStatusResponse> => {
  // Aguarda token estar disponivel
  await getAccessTokenWithWait(5000);

  const queryParams = new URLSearchParams();
  if (params?.externalReference) {
    queryParams.set("externalReference", params.externalReference);
  }
  if (params?.externalId) {
    queryParams.set("externalId", params.externalId);
  }
  if (params?.forceRefresh) {
    queryParams.set("forceRefresh", "true");
  }

  const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
  // Use retries: 1 (single attempt) instead of 0 to ensure the request is actually made
  const response = await apiClient.get<BillingStatusResponse>(`/billing/status${query}`, { retries: 1 });

  // 404 significa usuário sem assinatura (esperado para novos usuários)
  // Retornar status padrão em vez de lançar erro
  if (response.status === 404) {
    return {
      provider: "none",
      gateway: "stripe-card",
      planKey: "test",
      planName: "Nenhum",
      status: "inactive",
      isActive: false,
      amountCents: 0,
      currency: "BRL",
    };
  }

  if (!response.ok || !response.data) {
    throw new Error(response.error || "Não foi possível consultar o status do pagamento");
  }

  return response.data;
};
