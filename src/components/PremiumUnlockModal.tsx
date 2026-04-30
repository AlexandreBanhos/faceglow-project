import { motion } from "framer-motion";
import { Lock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PremiumUnlockModalProps {
  isVisible: boolean;
}

export const PremiumUnlockModal = ({ isVisible }: PremiumUnlockModalProps) => {
  const navigate = useNavigate();

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="lg-surface-strong max-w-sm w-full rounded-[1.75rem] overflow-hidden relative z-50"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Lock Icon */}
      <div className="bg-white/45 p-5 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-12 h-12 rounded-full bg-[var(--grad-coral)] flex items-center justify-center shadow-glow mb-3"
        >
          <Lock size={24} className="text-white" />
        </motion.div>

        <h2 className="text-base font-bold text-foreground text-center leading-tight">
          Obtenha sua análise completa e rotina agora!
        </h2>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Assine Premium para ver todos os produtos, rotina personalizada e análise completa.
        </p>

        {/* Features List */}
        <div className="space-y-1.5 py-2">
          <FeatureItem text="✓ Todos os produtos recomendados" />
          <FeatureItem text="✓ Rotina personalizada (manhã e noite)" />
          <FeatureItem text="✓ Detalhes completos da análise" />
        </div>

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/premium")}
          className="coral-button w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          Desbloquear com Premium
          <ChevronRight size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
};

const FeatureItem = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
    className="text-xs text-foreground flex items-center gap-2"
  >
    <span className="text-primary font-bold">{text}</span>
  </motion.div>
);
