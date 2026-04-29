/**
 * Component: Landing Page Hero
 * Seção hero da landing page
 * Padrão: Dependency Injection via Hook (useLandingContent)
 * Princípios SOLID: Single Responsibility, Dependency Inversion
 */

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLandingContent } from "@/shared/providers/LandingContext";
import headerImage from "@/assets/header-landing-page.png";

interface HeroProps {
  onCTAPrimary?: () => void;
  onCTASecondary?: () => void;
}

export const LandingHero = ({
  onCTAPrimary,
  onCTASecondary,
}: HeroProps) => {
  const service = useLandingContent();
  const navigate = useNavigate();
  const config = service.getConfig();
  const socialProof = service.getSocialProof();

  const handlePrimaryAction = onCTAPrimary ?? (() => navigate("/analyze"));
  const handleSecondaryAction = onCTASecondary ?? (() => {
    document.getElementById("why-section")?.scrollIntoView({ behavior: "smooth" });
  });
  return (
    <motion.section
      className="relative z-1 py-20 px-4 md:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:gap-12">
        {/* Image — acima no mobile, à direita no desktop */}
        <motion.div
          className="w-full md:hidden mb-8"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <img
            src={headerImage}
            alt="FaceGlow — análise de pele com IA"
            className="w-full max-w-sm mx-auto"
          />
        </motion.div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-white/80 backdrop-blur-sm border border-white/90 shadow-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">IA de análise dermatológica em tempo real</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-4xl md:text-4xl lg:text-5xl font-bold mb-6 text-gray-900 leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {config.hero?.headline?.split("\n").map((line, i) => (
              <div key={i}>
                {i === 1 ? (
                  <span className="bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent">
                    {line}
                  </span>
                ) : (
                  line
                )}
              </div>
            )) || (
              <>
                Diagnóstico de pele
                <span className="bg-gradient-to-r from-coral via-pink to-lavender bg-clip-text text-transparent">
                  {" "}profissional em 60s
                </span>
              </>
            )}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl font-light leading-relaxed mx-auto md:mx-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {config.hero?.subheadline ??
              "Tire uma selfie. Nossa IA identifica seu tipo de pele, condições e monta sua rotina personalizada — sem filas, sem consulta cara."}
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex gap-4 justify-center md:justify-start mb-8 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={handlePrimaryAction}
              className="px-8 py-3 bg-gradient-to-r from-coral via-pink to-lavender text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              {config.hero?.cta ?? "Analisar minha pele grátis"}
            </button>
            <button
              onClick={handleSecondaryAction}
              className="px-8 py-3 bg-white/80 backdrop-blur-sm border border-coral/25 text-gray-700 rounded-full font-semibold hover:border-coral hover:text-coral transition-all duration-200"
            >
              {config.hero?.secondaryCta ?? "Ver como funciona"}
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            className="flex gap-4 justify-center md:justify-start items-center text-sm text-gray-600 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-coral/20 to-pink/20 flex items-center justify-center text-xs font-bold text-coral"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                +
              </div>
            </div>

            <div className="text-coral font-semibold tracking-tighter">★★★★★</div>
            <span>+{(socialProof?.totalAnalyses ?? 12400).toLocaleString()} análises realizadas</span>

            {socialProof?.isValidatedByDermatologists && (
              <div className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                Validado por dermatologistas
              </div>
            )}
          </motion.div>
        </div>

        {/* Image — lado direito no desktop, oculta no mobile */}
        <motion.div
          className="hidden md:flex flex-1 items-center justify-center"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <img
            src={headerImage}
            alt="FaceGlow — análise de pele com IA"
            className="w-full mix-blend-multiply"
          />
        </motion.div>
      </div>
    </motion.section>
  );
};

