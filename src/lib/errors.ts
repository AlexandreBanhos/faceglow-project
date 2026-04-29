export type ErrorContext = {
  status?: number;
  detail?: string;
  raw?: string;
};

export const getFriendlyErrorMessage = (error: unknown, context?: ErrorContext): string => {
  const detail = context?.detail || (error instanceof Error ? error.message : String(error));
  const normalizedDetail = detail.toLowerCase();
  const status = context?.status;

  // Quota insufficient
  if (normalizedDetail.includes("insufficient_quota") || normalizedDetail.includes("you exceeded your current quota")) {
    return "Ops! Sua cota de análise foi atingida. Verifique seu plano do provedor de IA configurado ou entre em contato com suporte.";
  }

  // No credits / payment required
  if (status === 402 || normalizedDetail.includes("sem créditos") || normalizedDetail.includes("créditos disponíveis")) {
    return "Você não tem créditos de análise disponíveis. Adquira mais créditos para continuar.";
  }

  // Rate limit
  if ((status === 429) || normalizedDetail.includes("too many requests") || normalizedDetail.includes("rate limit")) {
    return "Muitas requisições enviadas. Aguarde alguns instantes e tente novamente.";
  }

  // Authentication errors
  if ((status === 401 || status === 403) || normalizedDetail.includes("unauthorized") || normalizedDetail.includes("forbidden")) {
    return "Erro de autenticação. Verifique as configurações de credenciais no servidor.";
  }

  if (
    normalizedDetail.includes("abort") ||
    normalizedDetail.includes("aborted") ||
    normalizedDetail.includes("signal is aborted") ||
    normalizedDetail.includes("analysis request timeout")
  ) {
    return "A analise levou tempo demais e foi interrompida. Tente novamente com uma foto mais leve.";
  }

  // Network/connection issues (client side)
  if (
    status === 408 ||
    normalizedDetail.includes("network") ||
    normalizedDetail.includes("failed to fetch") ||
    normalizedDetail.includes("load failed")
  ) {
    return "Conexão perdida ou expirou. Verifique sua internet e tente novamente.";
  }

  // Upstream/server timeout should not be shown as internet issue.
  if ((status && status >= 500) && normalizedDetail.includes("timeout")) {
    return "O servidor demorou para responder. Tente novamente em instantes.";
  }

  // Image validation issues
  if (
    normalizedDetail.includes("invalid image") ||
    normalizedDetail.includes("invalid image url") ||
    normalizedDetail.includes("invalid data url") ||
    normalizedDetail.includes("could not fetch image") ||
    normalizedDetail.includes("formato de imagem") ||
    normalizedDetail.includes("imagem invalida") ||
    normalizedDetail.includes("imagem inválida") ||
    normalizedDetail.includes("foto valida") ||
    normalizedDetail.includes("foto válida") ||
    normalizedDetail.includes("image is larger than")
  ) {
    return "Problema com a imagem. Certifique-se de que é uma foto válida e tente novamente.";
  }

  // Server errors
  if ((status && status >= 500) || normalizedDetail.includes("server error")) {
    return "Erro no servidor. Tente novamente mais tarde.";
  }

  // Generic fallback
  if (detail && detail.length > 10) {
    return detail;
  }

  return "Erro inesperado ao analisar imagem. Tente novamente.";
};
