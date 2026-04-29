import { useUserContext } from "./useUserContext";

/**
 * Hook simples para verificar se usuário é premium
 * Use nas páginas para renderizar ofertas ou telas premium
 *
 * @example
 * const { isPremium, creditsRemaining, isLoading } = useIsPremium();
 * if (isLoading) return <Skeleton />;
 * if (!isPremium) return <OfferPremiumBanner />;
 * return <PremiumFeatures />;
 */
export const useIsPremium = () => {
  const { userStatus } = useUserContext();
  
  return {
    isPremium: userStatus.isPremium,
    isFullAccess: userStatus.isFullAccess,
    creditsRemaining: userStatus.creditsRemaining,
    subscriptionType: userStatus.subscriptionType,
    subscriptionStatus: userStatus.subscriptionStatus,
    expiresAtUtc: userStatus.expiresAtUtc,
    isLoading: userStatus.isLoading,
    canAnalyze: userStatus.isPremium || userStatus.creditsRemaining > 0,
  };
};
