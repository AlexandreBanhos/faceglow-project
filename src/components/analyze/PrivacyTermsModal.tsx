import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield } from "lucide-react";

type PrivacyTermsModalProps = {
  onAccept: () => void;
};

const PrivacyTermsModal = ({ onAccept }: PrivacyTermsModalProps) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canProceed = termsAccepted && privacyAccepted;

  return (
    <AnimatePresence>
      {/* Backdrop claro */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: "rgba(200,180,190,0.25)", backdropFilter: "blur(12px)" }}
      >
        {/* Sheet liquiglass claro */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className="w-full max-w-lg"
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

          {/* Header */}
          <div className="px-6 pt-4 pb-5 border-b" style={{ borderColor: "#F0EDE8" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#F4A8C7 0%,#E8C4A0 100%)", boxShadow: "0 4px 16px rgba(244,168,199,0.4)" }}
              >
                <Shield size={20} color="#FFF" />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 18, color: "#1A1A1A", letterSpacing: "-0.3px" }}>
                  Antes de Começar
                </h2>
                <p style={{ fontSize: 12, color: "#6B6B6B", marginTop: 1 }}>Leia e aceite os termos abaixo</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            {/* Privacy card */}
            <div
              className="p-4 rounded-2xl"
              style={{ background: "rgba(244,168,199,0.08)", border: "1px solid rgba(244,168,199,0.22)" }}
            >
              <h3 style={{ fontSize: 11, fontWeight: 800, color: "#E8748A", letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" }}>
                Nosso Compromisso com a Privacidade
              </h3>
              <div className="space-y-1.5" style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.55 }}>
                <p>Mínimo <strong style={{ color: "#1A1A1A" }}>16 anos</strong>. Imagens usadas apenas para análise e <strong style={{ color: "#1A1A1A" }}>vinculadas somente ao seu perfil</strong>.</p>
                <p>Serviço da <strong style={{ color: "#1A1A1A" }}>Soora</strong>. Caráter informativo — não substitui profissional de saúde.</p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5">
              {[
                { checked: privacyAccepted, onChange: setPrivacyAccepted, label: <><strong>Política de Privacidade</strong></> },
                { checked: termsAccepted,   onChange: setTermsAccepted,   label: <><strong>Termos e Condições</strong></> },
              ].map(({ checked, onChange, label }, i) => (
                <motion.label
                  key={i}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer"
                  style={{
                    background: checked ? "rgba(244,168,199,0.1)" : "rgba(255,255,255,0.7)",
                    border: `1px solid ${checked ? "rgba(244,168,199,0.4)" : "#F0EDE8"}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: checked ? "linear-gradient(135deg,#E8748A,#F4A8C7)" : "transparent",
                      border: checked ? "none" : "2px solid #D0C8C0",
                      boxShadow: checked ? "0 2px 8px rgba(232,116,138,0.35)" : "none",
                    }}
                  >
                    {checked && <Check size={12} color="#FFF" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: "#1A1A1A" }}>
                    Concordo com a {label}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="hidden"
                  />
                </motion.label>
              ))}
            </div>

            {/* Info */}
            <p style={{ fontSize: 11, color: "#9B9B9B", lineHeight: 1.55, textAlign: "center" }}>
              Clicar em "Continuar" confirma que você tem 16+ anos e aceita os termos.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-8 pt-2">
            <motion.button
              whileTap={canProceed ? { scale: 0.97 } : undefined}
              onClick={canProceed ? onAccept : undefined}
              style={{
                width: "100%",
                height: 54,
                borderRadius: 14,
                background: canProceed
                  ? "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)"
                  : "#F0EDE8",
                color: canProceed ? "#FFF" : "#B0A8A0",
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: canProceed ? "pointer" : "not-allowed",
                boxShadow: canProceed ? "0 6px 20px rgba(232,116,138,0.35)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Continuar
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrivacyTermsModal;
