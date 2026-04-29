import { useIsPremium } from "@/hooks/useIsPremium";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Banner que aparece para usuários que não são premium
 * Mostra ofertas e permite navegar para planos
 */
export const PremiumOfferBanner = () => {
  const navigate = useNavigate();
  const { isPremium, creditsRemaining, isLoading, subscriptionStatus } = useIsPremium();

  if (isLoading) {
    return (
      <div className="h-16 bg-blue-50 rounded-lg animate-pulse" />
    );
  }

  // Se é premium, não mostrar
  if (isPremium && subscriptionStatus === "active") {
    return null;
  }

  // Se tem créditos mas não é premium, mostrar warning discreto
  if (creditsRemaining > 0 && !isPremium) {
    return (
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <div className="flex-1 text-sm text-amber-900">
          <strong>{creditsRemaining} crédito{creditsRemaining !== 1 ? "s" : ""} restante{creditsRemaining !== 1 ? "s" : ""}</strong>
          {creditsRemaining <= 2 && " — logo vai acabar!"}
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => navigate("/billing")}
        >
          Renovar
        </Button>
      </div>
    );
  }

  // Se não tem créditos e não é premium, mostrar grande oferta
  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">
            Você esgotou seus créditos de análise
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Escolha um plano para continuar usando FaceGlow e ter acesso a recursos premium
          </p>
        </div>
        <Button 
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate("/billing")}
        >
          Ver Planos
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 bg-white rounded border border-blue-100">
          <div className="text-xs font-medium text-blue-600">5 Créditos</div>
          <div className="text-sm text-gray-600">R$ 5,00</div>
        </div>
        <div className="p-3 bg-white rounded border border-indigo-100">
          <div className="text-xs font-medium text-indigo-600">Plano Mensal</div>
          <div className="text-sm text-gray-600">R$ 29,90/mês</div>
        </div>
      </div>
    </div>
  );
};
