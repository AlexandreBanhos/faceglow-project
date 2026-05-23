import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Shield, Zap } from "lucide-react";
import heroImg from "@/assets/imagem_tela_inicial.png";
import logoFaceglow from "@/assets/logos/logo-faceglow.svg";

const Onboarding = () => {
  const navigate = useNavigate();

  const features = [
    { icon: <Zap size={16} />, text: "Análise por IA em segundos" },
    { icon: <Shield size={16} />, text: "Rotina personalizada" },
    { icon: <Sparkles size={16} />, text: "Acompanhe sua evolução" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Hero Image */}
      <div className="relative h-[52vh]">
        <img
          src={heroImg}
          alt="FaceGlow"
          className="w-full h-full object-cover"
          width={768}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-12 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-2 flex items-center gap-2"
        >
          <Sparkles size={14} className="text-primary" />
          <img src={logoFaceglow} alt="FaceGlow AI" className="h-6 w-auto" />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 -mt-6 relative z-10 flex flex-col">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[32px] font-extrabold text-foreground leading-[1.15] mb-3"
        >
          Sua pele, <span className="gradient-text-animated">entendida</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground leading-relaxed text-[15px] mb-6"
        >
          Tire uma selfie e receba uma análise completa com rotina personalizada
          criada especialmente para você.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lavender-light text-secondary-foreground text-xs font-semibold"
            >
              <span className="text-primary">{f.icon}</span>
              {f.text}
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-auto pb-10 space-y-3"
        >
          <button
            onClick={() => navigate("/auth")}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-glow"
          >
            Começar Agora
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/auth?mode=login")}
            className="w-full py-4 rounded-2xl bg-card text-foreground font-semibold text-base border border-border active:scale-[0.97] transition-transform"
          >
            Já tenho uma conta
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
