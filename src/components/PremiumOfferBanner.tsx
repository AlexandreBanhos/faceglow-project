import { useIsPremium } from "@/hooks/useIsPremium";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PremiumOfferBanner = () => {
  const navigate = useNavigate();
  const { isPremium, creditsRemaining, isLoading, subscriptionStatus } = useIsPremium();

  if (isLoading) {
    return <div className="h-16 rounded-2xl lg-surface animate-pulse" />;
  }

  if (isPremium && subscriptionStatus === "active") {
    return null;
  }

  if (creditsRemaining > 0 && !isPremium) {
    return (
      <div className="flex items-center gap-3 p-3 lg-surface rounded-2xl">
        <AlertCircle className="w-4 h-4 text-primary" />
        <div className="flex-1 text-sm text-[var(--fg-ink)]">
          <strong>{creditsRemaining} credito{creditsRemaining !== 1 ? "s" : ""} restante{creditsRemaining !== 1 ? "s" : ""}</strong>
          {creditsRemaining <= 2 && " - logo vai acabar!"}
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/billing")}>
          Renovar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg-surface-strong rounded-[1.75rem]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-[var(--fg-ink)]">
            Voce esgotou seus creditos de analise
          </h3>
          <p className="text-sm text-[var(--fg-ink-3)] mt-1">
            Escolha um plano para continuar usando FaceGlow e ter acesso a recursos premium.
          </p>
        </div>
        <Button size="lg" className="coral-button rounded-full" onClick={() => navigate("/billing")}>
          Ver Planos
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 bg-white/65 rounded-2xl border border-white/80">
          <div className="text-xs font-medium text-primary">Análise Avulsa</div>
          <div className="text-sm text-[var(--fg-ink-3)]">R$ 4,90/análise</div>
        </div>
        <div className="p-3 bg-white/65 rounded-2xl border border-white/80">
          <div className="text-xs font-medium text-primary">Premium Mensal</div>
          <div className="text-sm text-[var(--fg-ink-3)]">R$ 24,90/mês</div>
        </div>
      </div>
    </div>
  );
};
