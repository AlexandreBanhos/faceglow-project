const getFallbackApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5172";
    }
  }

  return "https://api.faceglow-soora.me";
};

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || getFallbackApiBaseUrl();

export const apiRoutes = {
  analysis: `/analysis`,
  analysisDashboard: `/analysis/dashboard`,
  analysisCredits: `/analysis/credits`,
  billingCheckout: `/billing/checkout`,
  billingMercadoPagoPix: `/billing/mercadopago/pix`,
  billingMercadoPagoCheckout: `/billing/mercadopago/checkout`,
  billingStatus: `/billing/status`,
  testDb: `/test-db`,
  adminProducts: `/admin/products`,
  myProducts: `/products/my`,
  routineMarkComplete: `/routine/mark-complete`,
  billingCancel: `/billing/cancel`,
};
