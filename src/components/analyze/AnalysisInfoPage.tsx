import { motion } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

interface Props {
  onStart: () => void;
  onClose: () => void;
  onExample?: () => void;
}

const CHIPS = [
  { emoji: "✨", label: "100% gratuito" },
  { emoji: "⚡", label: "Resultado em 30s" },
  { emoji: "🔒", label: "Privacidade garantida" },
];

const CARDS = [
  { emoji: "💧", title: "Tipo de pele",     desc: "Seca, oleosa, mista ou normal" },
  { emoji: "✨", title: "Manchas",          desc: "Pigmentação e uniformidade"    },
  { emoji: "🔬", title: "Textura e poros", desc: "Refinamento e porosidade"       },
  { emoji: "🌿", title: "Linhas",          desc: "Rugas e firmeza da pele"        },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate:  { opacity: 1, y: 0  },
  transition: { delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] },
});

export const AnalysisInfoPage = ({ onStart, onClose, onExample }: Props) => (
  <div className="flex flex-col min-h-screen" style={{ background: "#FAFAF8" }}>

    {/* Header */}
    <div className="flex items-center justify-between px-5 pt-6 pb-4">
      <span style={{ fontWeight: 800, fontSize: 20, color: "#1A1A1A", letterSpacing: "-0.5px" }}>
        Face<span style={{ color: "#E8748A" }}>Glow</span>
      </span>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
        style={{ background: "#F0EDE8" }}
      >
        <X size={17} color="#6B6B6B" />
      </button>
    </div>

    {/* Scrollable body */}
    <div className="flex-1 overflow-y-auto px-5 pb-6">

      {/* Pulsing icon */}
      <div className="flex justify-center mt-4 mb-7">
        <div className="relative">
          {/* Pulse rings */}
          {[1.4, 1.7].map((scale, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(244,168,199,0.18)" }}
              animate={{ scale: [1, scale], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.5, ease: "easeOut" }}
            />
          ))}
          <motion.div
            className="relative w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#F4A8C7 0%,#E8C4A0 100%)", boxShadow: "0 8px 32px rgba(244,168,199,0.4)" }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <span style={{ fontSize: 38 }}>🔬</span>
          </motion.div>
        </div>
      </div>

      {/* Title */}
      <motion.h1 {...fadeUp(0.05)}
        className="text-center mb-2"
        style={{ fontWeight: 800, fontSize: 26, color: "#1A1A1A", lineHeight: 1.2, letterSpacing: "-0.5px" }}
      >
        Análise de Pele com IA
      </motion.h1>
      <motion.p {...fadeUp(0.12)}
        className="text-center mb-6"
        style={{ color: "#6B6B6B", fontSize: 15, lineHeight: 1.5 }}
      >
        Descubra o estado real da sua pele em segundos
      </motion.p>

      {/* Info chips */}
      <motion.div {...fadeUp(0.18)} className="flex flex-wrap gap-2 justify-center mb-8">
        {CHIPS.map(c => (
          <span
            key={c.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "#FFF", border: "1px solid #F0EDE8", fontSize: 12, fontWeight: 600, color: "#1A1A1A", boxShadow: "0 2px 8px rgba(244,168,199,0.1)" }}
          >
            <span>{c.emoji}</span>{c.label}
          </span>
        ))}
      </motion.div>

      {/* What we analyze */}
      <motion.h2 {...fadeUp(0.22)}
        className="mb-3"
        style={{ fontWeight: 700, fontSize: 17, color: "#1A1A1A" }}
      >
        O que analisamos
      </motion.h2>

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 + i * 0.07, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "#FFF",
              borderRadius: 20,
              padding: "16px 14px",
              border: "1px solid #F0EDE8",
              boxShadow: "0 4px 24px rgba(244,168,199,0.1)",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>{card.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1A1A1A", marginBottom: 3 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: "#6B6B6B", lineHeight: 1.4 }}>{card.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Footer CTA — sticky */}
    <div className="px-5 pb-8 pt-4" style={{ borderTop: "1px solid #F0EDE8", background: "#FAFAF8" }}>
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="w-full flex items-center justify-center gap-2 font-bold text-white"
        style={{
          height: 54,
          borderRadius: 14,
          background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)",
          fontSize: 16,
          boxShadow: "0 8px 24px rgba(232,116,138,0.35)",
          border: "none",
          cursor: "pointer",
        }}
      >
        Iniciar análise <ChevronRight size={18} />
      </motion.button>
      {onExample && (
        <button
          onClick={onExample}
          className="block mx-auto mt-3"
          style={{ color: "#6B6B6B", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}
        >
          Ver exemplo de análise
        </button>
      )}
    </div>
  </div>
);
