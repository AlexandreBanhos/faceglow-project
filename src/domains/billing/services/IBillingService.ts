import type { CreateCheckoutRequest, BillingCheckoutResponse, BillingStatus } from '../types/billing.types';
import type { Result } from '@/shared/types/common.types';

/**
 * Interface para o serviço de Billing
 * Abstração que permite múltiplas implementações
 */
export interface IBillingService {
  /**
   * Cria um checkout para pagamento
   * @param request Dados do checkout
   * @returns Resultado com dados de checkout
   */
  createCheckout(request: CreateCheckoutRequest): Promise<Result<BillingCheckoutResponse>>;

  /**
   * Obtém o status de um checkout
   * @param sessionId ID da sessão
   * @returns Status atual do checkout
   */
  getCheckoutStatus(sessionId: string): Promise<Result<BillingStatus>>;

  /**
   * Cancela um checkout em andamento
   * @param sessionId ID da sessão
   */
  cancelCheckout(sessionId: string): Promise<Result<void>>;
}
