import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Lightbulb } from "lucide-react";
import limpezaFacial from "@/assets/instrucao/limpeza-facial.png";
import rostoVisivel from "@/assets/instrucao/rosto-visivel.png";
import posicione from "@/assets/instrucao/posicione.png";
import analise from "@/assets/instrucao/analise.png";

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

const STEPS = [
  {
    number: "1",
    title: "Rosto limpo, sem maquiagem",
    sub: "Remova maquiagem, base e protetor solar. Para resultados mais precisos, faça a análise 30 min após lavar o rosto",
    image: limpezaFacial,
  },
  {
    number: "2",
    title: "Remova os óculos",
    sub: "E encontre um ambiente bem iluminado",
    image: rostoVisivel,
  },
  {
    number: "3",
    title: "Posicione seu rosto",
    sub: "Centralize no enquadramento e mantenha a cabeça reta",
    image: posicione,
  },
  {
    number: "4",
    title: "Fique parado e analise",
    sub: "Aguarde a IA processar sua pele — leva menos de 5 segundos",
    image: analise,
  },
];

export const ScanInstructionsPage = ({ onContinue, onBack }: Props) => (
  <div className="flex flex-col min-h-screen" style={{ background: "#FAFAF8" }}>

    {/* Header */}
    <div className="flex items-center gap-3 px-5 pt-6 pb-4">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
        style={{ background: "#F0EDE8" }}
      >
        <ArrowLeft size={17} color="#6B6B6B" />
      </button>

      {/* Progress dots */}
      <div className="flex gap-1.5 flex-1 justify-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: i === 1 ? 24 : 8,
              height: 8,
              borderRadius: 99,
              background: i === 1 ? "#E8748A" : "#F0EDE8",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ width: 36 }} /> {/* spacer */}
    </div>

    {/* Body */}
    <div className="flex-1 px-5 pb-6 overflow-y-auto">
      <motion.h1
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="mb-2"
        style={{ fontWeight: 800, fontSize: 24, color: "#1A1A1A", lineHeight: 1.2, letterSpacing: "-0.4px" }}
      >
        Prepare-se para o escaneamento
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ color: "#6B6B6B", fontSize: 14, marginBottom: 28 }}
      >
        Siga os passos para garantir o melhor resultado
      </motion.p>

      {/* Steps */}
      <div className="space-y-4 mb-7">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 + i * 0.12, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: "#FFF", border: "1px solid #F0EDE8", boxShadow: "0 4px 20px rgba(244,168,199,0.08)" }}
          >
            {/* Step badge */}
            <div
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)", boxShadow: "0 4px 14px rgba(232,116,138,0.3)" }}
            >
              <span style={{ fontWeight: 800, fontSize: 16, color: "#FFF" }}>{step.number}</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A", marginBottom: 2 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.4 }}>{step.sub}</div>
            </div>

            {/* Image */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "linear-gradient(135deg,rgba(232,116,138,0.08) 0%,rgba(244,168,199,0.08) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1.5px solid rgba(232,116,138,0.15)",
                overflow: "hidden",
              }}
            >
              <img 
                src={step.image} 
                alt={step.title} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tip card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: "linear-gradient(135deg,rgba(244,168,199,0.12) 0%,rgba(232,196,160,0.12) 100%)", border: "1px solid rgba(244,168,199,0.25)" }}
      >
        <Lightbulb size={18} style={{ color: "#E8748A", flexShrink: 0, marginTop: 2 }} />
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#E8748A" }}>Dica: </span>
          <span style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.5 }}>
            Luz natural frontal dá os melhores resultados. Evite luz de fundo forte.
          </span>
        </div>
      </motion.div>
    </div>

    {/* Footer */}
    <div className="px-5 pb-8 pt-4" style={{ borderTop: "1px solid #F0EDE8", background: "#FAFAF8" }}>
      <motion.button
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 font-bold text-white"
        style={{ height: 54, borderRadius: 14, background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)", fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(232,116,138,0.3)" }}
      >
        Entendido, abrir câmera <ChevronRight size={18} />
      </motion.button>
    </div>
  </div>
);
