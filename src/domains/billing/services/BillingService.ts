import type { CreateCheckoutRequest, BillingCheckoutResponse, BillingStatus } from '../types/billing.types';
import type { Result, ApiError } from '@/shared/types/common.types';
import type { IBillingService } from './IBillingService';

/**
 * Implementação do serviço de Billing
 * Responsável por toda a lógica de pagamentos
 */
export class BillingService implements IBillingService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async createCheckout(request: CreateCheckoutRequest): Promise<Result<BillingCheckoutResponse>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            code: error.code || 'CHECKOUT_ERROR',
            message: error.message || 'Erro ao criar checkout',
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Erro de rede',
        status: 500,
      };

      return {
        success: false,
        error: apiError,
      };
    }
  }

  async getCheckoutStatus(sessionId: string): Promise<Result<BillingStatus>> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/billing/checkout/${sessionId}/status`
      );

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'STATUS_ERROR',
            message: 'Erro ao obter status',
            status: response.status,
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Erro de rede',
          status: 500,
        },
      };
    }
  }

  async cancelCheckout(sessionId: string): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/billing/checkout/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'CANCEL_ERROR',
            message: 'Erro ao cancelar checkout',
            status: response.status,
          },
        };
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Erro de rede',
          status: 500,
        },
      };
    }
  }
}
