import { apiClient } from "@/shared/services/api/ApiClient";
import { getAccessToken } from "@/lib/auth";

export type BillingPlanKey = "test" | "credits" | "monthly" | "quarterly" | "annual";
export type BillingGatewayKey = "mercadopago-pix" | "mercadopago-card" | "stripe-card";

/**
 * Aguarda token estar disponivel com retry
 * Resolve race condition onde token pode nao estar pronto imediatamente apos autenticacao
 */
const getAccessTokenWithWait = async (maxWaitMs = 5000): Promise<string | null> => {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWaitMs) {
    const token = await getAccessToken();
    if (token) {
      return token;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return null;
};

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
  console.log("?? [Billing] Iniciando checkout:", request);

  // Aguarda token estar disponivel
  await getAccessTokenWithWait(5000);

  const response = await apiClient.post<BillingCheckoutResponse>("/billing/checkout", request);

  if (!response.ok || !response.data) {
    throw new Error(response.error || "N�o foi poss�vel iniciar o pagamento");
  }

  console.log("? [Billing] Checkout criado:", response.data);
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
    console.log("[fetchBillingStatus] Usuário sem assinatura (404 - esperado)");
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
