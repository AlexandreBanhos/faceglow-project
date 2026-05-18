import { motion } from "framer-motion";
import { ChevronRight, Sparkles, CreditCard, Coins } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  monthly: "Premium Mensal",
  annual:  "Premium Anual",
  credits: "Análise Avulsa",
  test:    "Teste",
};

interface SubscriptionCardProps {
  isPremium: boolean;
  isFullAccess: boolean;
  subscriptionType?: string;
  subscriptionStatus?: string;
  expiresAtUtc?: string;
  creditsRemaining: number;
  onManage: () => void;
}

export function SubscriptionCard({
  isPremium, isFullAccess, subscriptionType, expiresAtUtc, creditsRemaining, onManage,
}: SubscriptionCardProps) {
  const planLabel = subscriptionType ? PLAN_LABELS[subscriptionType] ?? subscriptionType : null;

  const expiresFormatted = expiresAtUtc
    ? new Date(expiresAtUtc).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const isCreditsOnly = isPremium && !isFullAccess;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="lg-surface rounded-2xl overflow-hidden"
    >
      <button
        onClick={onManage}
        className="w-full flex items-center gap-4 px-5 py-4 active:bg-muted/50 transition-colors"
      >
        {/* Ícone */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isFullAccess ? "gradient-primary shadow-glow" : isCreditsOnly ? "bg-emerald-100" : "bg-muted"
        }`}>
          {isFullAccess
            ? <Sparkles size={18} className="text-white" />
            : isCreditsOnly
            ? <Coins size={18} className="text-emerald-600" />
            : <CreditCard size={18} className="text-muted-foreground" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">
              {isFullAccess
                ? `Premium${planLabel ? ` · ${planLabel}` : ""}`
                : isCreditsOnly
                ? "Créditos avulsos"
                : "Plano gratuito"}
            </p>
            {isFullAccess && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full gradient-primary text-white tracking-wide">
                ✦ ATIVO
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFullAccess && expiresFormatted
              ? `Renova em ${expiresFormatted}`
              : isCreditsOnly
              ? `${creditsRemaining} crédito${creditsRemaining !== 1 ? "s" : ""} restante${creditsRemaining !== 1 ? "s" : ""}`
              : `${creditsRemaining} crédito${creditsRemaining !== 1 ? "s" : ""} · Assine para análises ilimitadas`}
          </p>
        </div>

        <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
      </button>
    </motion.div>
  );
}
