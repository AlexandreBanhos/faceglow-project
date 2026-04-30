/**
 * Component: Features Section
 * Funcionalidades do FaceGlow
 * Padrão: Dependency Injection via Hook (useLandingContent)
 * SOLID: Single Responsibility, Dependency Inversion
 */

import { motion } from "framer-motion";
import { useLandingContent } from "@/shared/providers/LandingContext";

export const FeaturesSection = () => {
  const service = useLandingContent();
  const features = service.getFeatures();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section id="offers" className="relative z-1 py-20 px-4 md:px-8">
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
            <span>O que o FaceGlow oferece</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--fg-ink)] mb-4">
            Tudo que sua pele precisa,{" "}
            <span className="bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent">
              em um único app
            </span>
          </h2>
          <p className="text-[var(--fg-ink-3)] max-w-2xl mx-auto">
            Do diagnóstico ao produto certo, do lembrete diário ao rastreio de evolução. Uma plataforma completa.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.id}
              className="lg-surface p-6 rounded-[1.75rem] transition-all duration-300"
              variants={itemVariants}
              whileHover={{ y: -8 }}
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-bold text-[var(--fg-ink)] mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--fg-ink-3)] mb-4 leading-relaxed">{feature.description}</p>
              <div
                className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: feature.tag.bgColor,
                  color: feature.tag.textColor,
                }}
              >
                {feature.tag.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
