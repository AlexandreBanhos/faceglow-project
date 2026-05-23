import { motion } from "framer-motion";
import { X, ChevronRight, AlertCircle, Sparkles, Shield, Star, Zap } from "lucide-react";
import logoFaceglow from "@/assets/logos/logo-faceglow.svg";

interface Props {
  onStart: () => void;
  onClose: () => void;
  onExample?: () => void;
  noCredits?: boolean;
  creditsRemaining?: number;
  onGetCredits?: () => void;
}

const CHIPS = [
  { icon: <Sparkles size={13} />, label: "Análise completa gratuita" },
  { icon: <Zap size={13} />,      label: "Resultado em 60 segundos" },
  { icon: <Shield size={13} />,   label: "Privacidade garantida"    },
];

const CARDS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4l3 3"/></svg>,
    gradient: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
    title: "Tipo de pele",
    desc: "Seca, oleosa, mista ou normal",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>,
    gradient: "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)",
    title: "Pontos fortes",
    desc: "O que há de melhor na sua pele",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
    title: "Pontos de melhoria",
    desc: "Manchas, poros, oleosidade e mais",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    gradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
    title: "Passo a passo",
    desc: "Rotina personalizada para seu perfil",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate:  { opacity: 1, y: 0  },
  transition: { delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export const AnalysisInfoPage = ({ onStart, onClose, noCredits, creditsRemaining = 0, onGetCredits }: Props) => (
  <div className="flex flex-col min-h-screen" style={{ background: "#FAFAF8" }}>

    {/* Header */}
    <div className="flex items-center justify-between px-5 pt-6 pb-4">
      <img src={logoFaceglow} alt="FaceGlow" style={{ height: 28 }} />
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

      {/* Pulsing orb icon */}
      <div className="flex justify-center mt-4 mb-7">
        <div className="relative">
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
            style={{ background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)", boxShadow: "0 8px 32px rgba(244,168,199,0.4)" }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Star size={38} color="white" fill="white" />
          </motion.div>
        </div>
      </div>

      {/* Title */}
      <motion.h1 {...fadeUp(0.05)}
        className="text-center mb-2"
        style={{ fontWeight: 800, fontSize: 26, color: "#1A1A1A", lineHeight: 1.2, letterSpacing: "-0.5px" }}
      >
        Análise de Pele com{" "}
        <span style={{
          background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>IA</span>
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
            style={{
              background: "#FFF",
              border: "1px solid #F0EDE8",
              fontSize: 12,
              fontWeight: 600,
              color: "#E8748A",
              boxShadow: "0 2px 8px rgba(244,168,199,0.1)",
            }}
          >
            {c.icon}{c.label}
          </span>
        ))}
      </motion.div>

      {/* What you get */}
      <motion.h2 {...fadeUp(0.22)}
        className="mb-3"
        style={{ fontWeight: 700, fontSize: 17, color: "#1A1A1A" }}
      >
        O que você recebe
      </motion.h2>

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 + i * 0.07, duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            style={{
              background: "#FFF",
              borderRadius: 20,
              padding: "16px 14px",
              border: "1px solid #F0EDE8",
              boxShadow: "0 4px 24px rgba(244,168,199,0.1)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: card.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                boxShadow: "0 4px 12px rgba(232,116,138,0.25)",
              }}
            >
              {card.icon}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1A1A1A", marginBottom: 3 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: "#6B6B6B", lineHeight: 1.4 }}>{card.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Footer CTA — sticky */}
    <div className="px-5 pb-8 pt-4" style={{ borderTop: "1px solid #F0EDE8", background: "#FAFAF8" }}>

      {noCredits ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div
            className="flex items-start gap-3 p-4 rounded-2xl mb-3"
            style={{ background: "rgba(232,116,138,0.08)", border: "1px solid rgba(232,116,138,0.25)" }}
          >
            <AlertCircle size={18} style={{ color: "#E8748A", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#E8748A", marginBottom: 2 }}>
                Sem créditos disponíveis
              </div>
              <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.5 }}>
                Você precisa de pelo menos 1 crédito para realizar uma análise.
                {creditsRemaining === 0 && " Seus créditos foram utilizados."}
              </div>
            </div>
          </div>
          <button
            onClick={onGetCredits}
            className="w-full flex items-center justify-center gap-2 font-bold text-white"
            style={{
              height: 54,
              borderRadius: 14,
              background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)",
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(232,116,138,0.35)",
            }}
          >
            <Sparkles size={18} /> Adquirir créditos
          </button>
        </motion.div>
      ) : (
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
          Iniciar análise gratuita <ChevronRight size={18} />
        </motion.button>
      )}
    </div>
  </div>
);
