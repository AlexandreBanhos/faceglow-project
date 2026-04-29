import type { Result } from '@/shared/types/common.types';

export type BillingPlanKey = 'monthly' | 'credits' | 'test';
export type BillingGatewayKey = 'mercadopago-pix' | 'mercadopago-card' | 'stripe-card';

export interface BillingPlan {
  key: BillingPlanKey;
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  badge: string | null;
}

export interface BillingGateway {
  key: BillingGatewayKey;
  title: string;
  description: string;
}

export interface CreateCheckoutRequest {
  planKey: BillingPlanKey;
  gateway: BillingGatewayKey;
}

export interface BillingCheckoutResponse {
  checkoutUrl?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

export interface BillingCheckoutResult {
  checkoutUrl?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixReceiptUrl?: string;
}

export interface BillingStatus {
  status: 'pending' | 'approved' | 'failed' | 'cancelled';
  message: string;
}

export type CheckoutState = 'idle' | 'loading' | 'pix_ready' | 'error';

export interface BillingService {
  createCheckout(request: CreateCheckoutRequest): Promise<Result<BillingCheckoutResponse>>;
  getCheckoutStatus(sessionId: string): Promise<Result<BillingStatus>>;
  cancelCheckout(sessionId: string): Promise<Result<void>>;
}
