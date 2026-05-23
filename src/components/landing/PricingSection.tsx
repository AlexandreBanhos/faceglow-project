/**
 * Component: Pricing Section
 * Planos de preço com lógica de domínio
 * Padrão: Dependency Injection via Hook (useLandingContent)
 * SOLID: Dependency Inversion, Single Responsibility
 */

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingContent } from "@/shared/providers/LandingContext";

const GRAD = "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)";

interface PricingSectionProps {
  onSelectPlan?: (planId: string) => void;
}

export const PricingSection = ({ onSelectPlan }: PricingSectionProps = {}) => {
  const service = useLandingContent();
  const plans = service.getPricingPlans();
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      navigate("/auth");
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section id="pricing" className="relative z-10 py-20 px-4 md:px-8 overflow-hidden">
      {/* Fundo gradiente */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(160deg, #fff8f5 0%, #fce8f0 30%, #fff4ec 60%, #fdf0f8 100%)" }}
      />
      <div className="absolute -z-10 pointer-events-none" style={{ top: "-10%", left: "-4%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,168,199,0.18) 0%, transparent 65%)" }} />
      <div className="absolute -z-10 pointer-events-none" style={{ bottom: "-8%", right: "-3%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(221,182,147,0.14) 0%, transparent 65%)" }} />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="fg-eyebrow mb-3">
            <span className="mr-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: GRAD }} />
            Planos
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4" style={{ color: "var(--fg-ink)" }}>
            Comece grátis.{" "}
            <span style={{
              background: GRAD,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Evolua quando quiser.
            </span>
          </h2>
          <p style={{ color: "var(--fg-ink-3)" }} className="max-w-xl mx-auto">
            Análise gratuita para começar. Sem cartão de crédito, sem compromisso.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              className={`relative rounded-[1.75rem] p-8 transition-all duration-300 ${
                plan.isHighlight
                  ? "lg-surface-strong border-2 border-coral/30"
                  : "lg-surface hover:shadow-glow"
              }`}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute -top-3 right-4 px-3 py-1 text-white text-xs font-bold rounded-full shadow-md"
                  style={{ background: GRAD }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Content */}
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--fg-ink-3)", letterSpacing: "0.08em" }}>
                  {plan.period}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold" style={{ color: "var(--fg-ink)" }}>
                    {plan.price === 0
                      ? "Grátis"
                      : `R$ ${plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm" style={{ color: "var(--fg-ink-3)" }}>/{plan.period}</span>
                  )}
                </div>
                <p className="text-sm mt-2" style={{ color: "var(--fg-ink-3)" }}>{plan.description}</p>
              </div>

              {/* Perks */}
              <div className="mb-8 space-y-2.5">
                {plan.perks.map((perk, idx) => {
                  const excluded = perk.startsWith("✗");
                  const label = perk.replace(/^[✓✗]\s*/, "");
                  return (
                    <div key={idx} className="flex items-start gap-2.5">
                      {excluded ? (
                        <X size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#D1C5C0" }} />
                      ) : (
                        <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#E8748A" }} />
                      )}
                      <span
                        className="text-sm"
                        style={{ color: excluded ? "#C4B8B3" : "var(--fg-ink-3)", textDecoration: excluded ? "line-through" : "none" }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-3 rounded-full font-semibold transition-all duration-200 ${
                  plan.isHighlight
                    ? "coral-button"
                    : "liquiglass-button text-[var(--fg-ink-2)] hover:text-coral"
                }`}
              >
                {plan.cta.label}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
