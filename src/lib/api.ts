const isLocalHost = () => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
};

const PRODUCTION_API = "https://api.faceglow-soora.me";
const LOCAL_API      = "http://localhost:5172";

export const apiBaseUrl = (() => {
  const env = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  // Usa a env var apenas se ela aponta para produção — ignora valor de localhost em prod
  if (env && !env.includes("localhost") && !env.includes("127.0.0.1")) return env;
  return isLocalHost() ? LOCAL_API : PRODUCTION_API;
})();

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
  quizAnswers: `/quiz/answers`,
};
