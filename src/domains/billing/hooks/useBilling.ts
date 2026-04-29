import { useState, useCallback, useRef } from 'react';
import { BillingService } from '../services/BillingService';
import type { CreateCheckoutRequest, CheckoutState, BillingCheckoutResult } from '../types/billing.types';

const billingService = new BillingService();

/**
 * Hook customizado para gerenciar lógica de billing
 * Encapsula toda a comunicação com o serviço de billing
 */
export const useBilling = () => {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixImage, setPixImage] = useState('');
  const [pixReceiptUrl, setPixReceiptUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const checkoutResultRef = useRef<BillingCheckoutResult | null>(null);

  const resetCheckout = useCallback(() => {
    setCheckoutState('idle');
    setErrorMessage('');
    setPixCode('');
    setPixImage('');
    setPixReceiptUrl('');
    setCopied(false);
    checkoutResultRef.current = null;
  }, []);

  const handleCheckout = useCallback(async (request: CreateCheckoutRequest) => {
    setCheckoutState('loading');
    setErrorMessage('');
    setCopied(false);

    try {
      const result = await billingService.createCheckout(request);

      if (!result.success) {
        setErrorMessage(result.error.message);
        setCheckoutState('error');
        return;
      }

      const data = result.data;
      checkoutResultRef.current = data as BillingCheckoutResult;

      // Se é cartão, redireciona
      if (request.gateway === 'stripe-card' || request.gateway === 'mercadopago-card') {
        if (data.checkoutUrl) {
          window.location.assign(data.checkoutUrl);
        }
        return;
      }

      // Se é PIX, mostra os dados
      setPixCode(data.pixQrCode ?? '');
      setPixImage(data.pixQrCodeBase64 ? `data:image/png;base64,${data.pixQrCodeBase64}` : '');
      setPixReceiptUrl(data.checkoutUrl ?? '');
      setCheckoutState('pix_ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao processar pagamento';
      setErrorMessage(message);
      setCheckoutState('error');
    }
  }, []);

  const handleCopyPix = useCallback(async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMessage('Não foi possível copiar o código PIX.');
    }
  }, [pixCode]);

  return {
    // Estado
    checkoutState,
    errorMessage,
    pixCode,
    pixImage,
    pixReceiptUrl,
    copied,
    isLoading: checkoutState === 'loading',
    isPIXReady: checkoutState === 'pix_ready',
    isError: checkoutState === 'error',

    // Ações
    handleCheckout,
    handleCopyPix,
    resetCheckout,

    // Dados
    checkoutResult: checkoutResultRef.current,
  };
};
