/**
 * Component: How It Works
 * Timeline dos 4 passos
 * Padrão: Dependency Injection via Hook (useLandingContent)
 * SOLID: Single Responsibility, Dependency Inversion
 */

import { motion } from "framer-motion";
import { useLandingContent } from "@/shared/providers/LandingContext";

export const HowItWorks = () => {
  const service = useLandingContent();
  const config = service.getConfig();
  const steps = config.howItWorks || [
    { order: 1, title: "Tire uma selfie", icon: "📸", description: "Com boa iluminação, a câmera captura os detalhes da sua pele." },
    { order: 2, title: "IA analisa em segundos", icon: "🤖", description: "Detecta tipo de pele, hidratação, poros, manchas e condições." },
    { order: 3, title: "Receba diagnóstico", icon: "📋", description: "Resultado detalhado com nome da sua condição e recomendações." },
    { order: 4, title: "Monta sua rotina", icon: "✨", description: "Passos específicos e produtos curados para sua pele." },
  ];
  return (
    <section id="how" className="relative z-1 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="fg-eyebrow mb-4">
            <div className="w-1 h-1 rounded-full bg-coral" />
            <span>Como funciona</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--fg-ink)]">
            Do zero ao diagnóstico{" "}
            <span className="bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent">
              em 4 passos simples
            </span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-coral/30 via-pink/30 to-lavender/30" />

          {/* Steps */}
          {steps.map((step, index) => (
            <motion.div
              key={step.order}
              className="lg-surface relative z-10 rounded-[1.75rem] p-5 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              {/* Number circle */}
              <motion.div
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center font-bold text-lg bg-[var(--grad-coral)] text-white shadow-glow transition-all duration-300"
                whileHover={{ scale: 1.1 }}
              >
                {step.order}
              </motion.div>

              {/* Content */}
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="font-bold text-[var(--fg-ink)] mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--fg-ink-3)] leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
