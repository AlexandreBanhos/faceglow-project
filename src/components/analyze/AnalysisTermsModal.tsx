import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const GUARANTEES = [
  { emoji: "🔒", title: "Não armazenamos suas fotos", desc: "As imagens são processadas e descartadas imediatamente após a análise." },
  { emoji: "🚫", title: "Não compartilhamos dados",   desc: "Nenhuma informação é enviada a terceiros." },
  { emoji: "✅", title: "Análise anônima",            desc: "Sem identificação pessoal vinculada ao resultado." },
];

export const AnalysisTermsModal = ({ open, onAccept, onDecline }: Props) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop — blur suave, não escuro */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ background: "rgba(200,180,190,0.25)", backdropFilter: "blur(12px)" }}
          onClick={onDecline}
        />

        {/* Sheet — fundo sólido claro, sem backdrop-filter (evita absorver overlay escuro) */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: "linear-gradient(180deg,#FDF8F6 0%,#FAFAF8 100%)",
            borderRadius: "28px 28px 0 0",
            border: "1px solid rgba(255,255,255,0.95)",
            borderBottom: "none",
            boxShadow: "0 -8px 40px rgba(244,168,199,0.2), inset 0 1px 0 rgba(255,255,255,1)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(244,168,199,0.35)" }} />
          </div>

          <div className="px-6 pb-8 pt-4">
            {/* Icon + title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg,#F4A8C7 0%,#E8C4A0 100%)",
                  boxShadow: "0 6px 24px rgba(244,168,199,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                <Shield size={28} color="#FFF" />
              </div>
              <h2 style={{ fontWeight: 800, fontSize: 22, color: "#1A1A1A", marginBottom: 6, letterSpacing: "-0.4px" }}>
                Suas fotos, sua privacidade
              </h2>
              <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.5 }}>
                Veja como tratamos suas imagens
              </p>
            </div>

            {/* Guarantee cards — liquiglass leve */}
            <div className="space-y-2.5 mb-6">
              {GUARANTEES.map(g => (
                <div
                  key={g.title}
                  className="flex items-start gap-3 p-4 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.85)",
                    boxShadow: "0 2px 12px rgba(244,168,199,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{g.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 2 }}>{g.title}</div>
                    <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.4 }}>{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legal text */}
            <p style={{ fontSize: 11, color: "#9B9B9B", lineHeight: 1.6, marginBottom: 20, textAlign: "center" }}>
              Ao continuar, você concorda com nossos{" "}
              <a href="/termos" style={{ color: "#E8748A", textDecoration: "none", fontWeight: 600 }}>Termos de Uso</a>{" "}
              e{" "}
              <a href="/privacidade" style={{ color: "#E8748A", textDecoration: "none", fontWeight: 600 }}>Política de Privacidade</a>.
              {" "}As imagens são processadas pela IA e descartadas após a análise.
            </p>

            {/* CTAs */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onAccept}
              className="w-full font-bold text-white mb-3"
              style={{
                height: 54,
                borderRadius: 14,
                background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)",
                fontSize: 16,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(232,116,138,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              Aceitar e continuar
            </motion.button>
            <button
              onClick={onDecline}
              className="w-full font-semibold"
              style={{
                height: 46,
                borderRadius: 14,
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(244,168,199,0.3)",
                color: "#6B6B6B",
                fontSize: 15,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              Não autorizar
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
