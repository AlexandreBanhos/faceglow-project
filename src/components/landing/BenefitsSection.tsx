/**
 * Component: Benefits Section
 * Mostra as dores resolvidas e benefícios
 * Padrão: Dependency Injection via Hook (useLandingContent)
 * SOLID: Single Responsibility, Dependency Inversion
 */

import { motion } from "framer-motion";
import { useLandingContent } from "@/shared/providers/LandingContext";

export const BenefitsSection = () => {
  const service = useLandingContent();
  const benefits = service.getBenefits();

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
    <section id="why-section" className="relative z-1 py-20 px-4 md:px-8">
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
            <span className="text-sm font-semibold uppercase letter-spacing text-coral">Por que FaceGlow?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            A diferença entre{" "}
            <span className="bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent">
              gastar e investir na pele
            </span>
          </h2>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.id}
              className="p-6 rounded-2xl bg-white/75 backdrop-blur-sm border border-white/90 shadow-sm hover:shadow-md hover:translate-x-1 transition-all duration-300 cursor-default"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <div className="flex gap-4">
                <div className="text-3xl flex-shrink-0">{benefit.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{benefit.description}</p>
                  <div className="text-xs space-y-2">
                    <div className="text-gray-500">
                      <span className="font-semibold">❌ Antes:</span> {benefit.comparison.before}
                    </div>
                    <div className="text-coral font-semibold">
                      <span>✅ Depois:</span> {benefit.comparison.after}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
