import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { BillingPlan, BillingPlanKey } from '../types/billing.types';

interface PlanSelectorProps {
  plans: BillingPlan[];
  selectedPlan: BillingPlanKey;
  onPlanChange: (key: BillingPlanKey) => void;
}

/**
 * Componente para seleção de planos de pagamento
 * Responsabilidade única: apresentar e permitir seleção de planos
 */
export const PlanSelector = ({ plans, selectedPlan, onPlanChange }: PlanSelectorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <p className="text-sm font-bold text-foreground mb-3">Escolha seu plano</p>
      <div className="grid gap-3">
        {plans.map((plan) => {
          const active = plan.key === selectedPlan;
          return (
            <button
              key={plan.key}
              onClick={() => onPlanChange(plan.key)}
              className={`relative text-left rounded-[1.5rem] border p-4 transition-all active:scale-[0.98] ${
                active
                  ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
                  : 'border-border/70 bg-card'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-extrabold text-foreground">{plan.name}</p>
                {active && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={11} className="text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black text-foreground">{plan.price}</span>
                <span className="text-sm font-semibold text-muted-foreground">{plan.priceNote}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{plan.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground"
                  >
                    <Check size={10} className="text-primary" />
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
