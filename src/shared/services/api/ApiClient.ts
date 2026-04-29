/**
 * Cliente HTTP com autenticacao, retry e logging
 * Usado para todas as requisicoes de API
 */

import { getAccessToken } from "@/lib/auth";

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

/**
 * Aguarda token estar disponível
 */
async function waitForToken(maxWaitMs = 5000): Promise<string | null> {
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
}

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  statusText: string;
  data?: T;
  error?: string;
}

/**
 * Cliente HTTP centralizado
 */
export class ApiClient {
  private baseUrl: string;
  private retries = 1;
  private timeout = 10000;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fazer requisicao com autenticacao, retry e logging
   */
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const maxRetries = Math.max(1, config.retries ?? this.retries); // Garantir mínimo 1 tentativa

    console.log(`>> [API] ${config.method || "GET"} ${url}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Aguarda token estar disponivel (resolve race condition)
        const token = await waitForToken(5000);

        if (!token) {
          console.error("X [API] Sem token de autenticacao apos espera");
          throw new Error("Sessao expirada. Faca login novamente.");
        }

        console.log(`V [API] Token obtido (${token.substring(0, 20)}...)`);

        // Headers padrao
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...config.headers,
        };

        // Opcoes da requisicao
        const fetchOptions: RequestInit = {
          method: config.method || "GET",
          headers,
          timeout: config.timeout || this.timeout,
        };

        // Adicionar body se existir
        if (config.body) {
          fetchOptions.body = JSON.stringify(config.body);
        }

        console.log(`>> [API] Headers:`, {
          "Content-Type": headers["Content-Type"],
          "Authorization": headers["Authorization"].substring(0, 20) + "...",
        });

        // Fazer requisicao
        const response = await fetch(url, fetchOptions);

        console.log(`>> [API] Status ${response.status} ${response.statusText} (tentativa ${attempt}/${maxRetries})`);

        // Se 401, significa que o token expirou ou nao eh valido
        if (response.status === 401) {
          console.error("X [API] Nao autorizado (401) - Token invalido ou expirado");
        }

        // Parse response
        let responseData: any;
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }

        if (response.ok) {
          console.log(`V [API] Sucesso: ${endpoint}`);
          return {
            ok: true,
            status: response.status,
            statusText: response.statusText,
            data: responseData,
          };
        }

        // Erro na resposta
        const errorMessage =
          responseData?.error ||
          responseData?.detail ||
          responseData?.message ||
          `HTTP ${response.status}`;

        console.error(`X [API] Erro: ${errorMessage}`);

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Nao autorizado: ${errorMessage}`);
        }

        if (attempt < maxRetries) {
          console.log(`>> [API] Tentativa ${attempt}/${maxRetries} falhou, aguardando antes de retry...`);
          await this.delay(1000 * attempt); // Backoff exponencial
          continue;
        }

        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`X [API] Erro na tentativa ${attempt}/${maxRetries}:`, message);

        if (attempt === maxRetries) {
          return {
            ok: false,
            status: 0,
            statusText: "Network Error",
            error: message,
          };
        }

        await this.delay(1000 * attempt);
      }
    }

    // Nunca deveria chegar aqui, mas como fallback
    throw new Error("Falha apos todas as tentativas");
  }

  /**
   * GET com autenticacao
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  /**
   * POST com autenticacao
   */
  async post<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  /**
   * PUT com autenticacao
   */
  async put<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  /**
   * DELETE com autenticacao
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  /**
   * Delay para retry
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Criar instancia global
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5172"
);
