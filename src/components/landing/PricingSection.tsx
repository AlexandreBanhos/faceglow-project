/**
 * Component: Pricing Section
 * Planos de preço com lógica de domínio
 * Padrão: Dependency Injection via Hook (useLandingContent)
 * SOLID: Dependency Inversion, Single Responsibility
 */

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingContent } from "@/shared/providers/LandingContext";

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
    <section id="pricing" className="relative z-1 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4 bg-coral/10 border border-coral/20">
            <div className="w-1 h-1 rounded-full bg-coral" />
            <span className="text-sm font-semibold uppercase tracking-wider text-coral">Planos</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Comece grátis.{" "}
            <span className="bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent">
              Evolua quando quiser.
            </span>
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Experimente com 5 análises gratuitas. Sem cartão de crédito, sem compromisso.
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
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.isHighlight
                  ? "bg-gradient-to-br from-coral/15 via-pink/10 to-lavender/10 border-2 border-coral/30 shadow-lg"
                  : "bg-white/75 backdrop-blur-sm border border-white/90 shadow-sm hover:shadow-md"
              }`}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-coral via-pink to-lavender text-white text-xs font-bold rounded-full shadow-md">
                  {plan.badge}
                </div>
              )}

              {/* Content */}
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {plan.period}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price === 0 ? "Grátis" : `R$${plan.price}`}
                  </span>
                  <span className="text-sm text-gray-600">/{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
              </div>

              {/* Perks */}
              <div className="mb-8 space-y-3">
                {plan.perks.map((perk, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{perk}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-3 rounded-full font-semibold transition-all duration-200 ${
                  plan.isHighlight
                    ? "bg-gradient-to-r from-coral via-pink to-lavender text-white shadow-lg hover:shadow-xl hover:-translate-y-1"
                    : "border-1.5 border-coral/25 text-gray-700 hover:text-coral hover:border-coral"
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
