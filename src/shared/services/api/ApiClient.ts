import { getAccessToken } from "@/lib/auth";

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

async function waitForToken(maxWaitMs = 5000): Promise<string | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const token = await getAccessToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, 100));
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

export class ApiClient {
  private baseUrl: string;
  private retries = 1;
  private timeout = 10000;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const maxRetries = Math.max(1, config.retries ?? this.retries);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = await waitForToken(5000);
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...config.headers,
        };

        const fetchOptions: RequestInit = {
          method: config.method || "GET",
          headers,
        };

        if (config.body) fetchOptions.body = JSON.stringify(config.body);

        const response = await fetch(url, fetchOptions);

        let responseData: any;
        try { responseData = await response.json(); } catch { responseData = null; }

        if (response.ok) {
          return { ok: true, status: response.status, statusText: response.statusText, data: responseData };
        }

        const errorMessage = responseData?.error || responseData?.detail || responseData?.message || `HTTP ${response.status}`;

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Não autorizado: ${errorMessage}`);
        }

        if (attempt < maxRetries) {
          await this.delay(1000 * attempt);
          continue;
        }

        return { ok: false, status: response.status, statusText: response.statusText, error: errorMessage };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        if (attempt === maxRetries) {
          return { ok: false, status: 0, statusText: "Network Error", error: message };
        }
        await this.delay(1000 * attempt);
      }
    }

    throw new Error("Falha após todas as tentativas");
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  async put<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const apiClient = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5172"
);
