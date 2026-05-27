import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ImageOff, Share2, UserCheck, X, ArrowLeft } from "lucide-react";

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const GUARANTEES = [
  {
    Icon: ImageOff,
    color: "#6366f1",
    bg: "#f0f0ff",
    title: "Fotos não armazenadas",
    desc: "Sua imagem é processada pela IA e descartada logo após a análise. Não mantemos cópias.",
  },
  {
    Icon: Share2,
    color: "#0ea5e9",
    bg: "#f0f9ff",
    title: "Sem compartilhamento de dados",
    desc: "Seus dados e imagem jamais são enviados a terceiros nem usados para treinar modelos.",
  },
  {
    Icon: UserCheck,
    color: "#2d6b52",
    bg: "rgba(129,193,167,0.12)",
    title: "Análise segura e privada",
    desc: "Os resultados são acessíveis apenas por você. Tudo protegido conforme a LGPD.",
  },
];

const TERMS_CONTENT = `
**1. Aceitação dos termos**
Ao utilizar o FaceGlow, você concorda com estes Termos de Uso. Se não concordar com qualquer parte, não utilize o serviço.

**2. Uso do serviço**
O FaceGlow oferece análise de pele com inteligência artificial para fins informativos e educacionais. Não substitui consulta médica ou dermatológica.

**3. Conta e segurança**
Você é responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades realizadas em sua conta.

**4. Conteúdo do usuário**
Ao enviar imagens para análise, você concede ao FaceGlow permissão para processar temporariamente essas imagens. As imagens são descartadas após a análise.

**5. Limitações de responsabilidade**
O FaceGlow não garante diagnósticos médicos. Os resultados são estimativas baseadas em inteligência artificial e devem ser usados apenas como referência.

**6. Propriedade intelectual**
Todo o conteúdo, interface e tecnologia do FaceGlow são protegidos por direitos de propriedade intelectual.

**7. Alterações nos termos**
Podemos atualizar estes termos periodicamente. Notificaremos usuários sobre mudanças significativas.
`;

const PRIVACY_CONTENT = `
**1. Dados coletados**
Coletamos: nome, e-mail, imagens faciais temporárias (descartadas após análise), e dados de uso do aplicativo.

**2. Uso dos dados**
Seus dados são utilizados para: fornecer e melhorar nossos serviços, personalizar sua experiência, e comunicações relacionadas ao serviço.

**3. Compartilhamento**
Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, exceto quando necessário para prestação do serviço (como processamento de pagamento).

**4. Imagens faciais**
As imagens são processadas pela IA (Google Gemini) e descartadas imediatamente após a análise. Não armazenamos suas fotos.

**5. Segurança**
Utilizamos criptografia e as melhores práticas de segurança para proteger seus dados.

**6. Seus direitos (LGPD)**
Você tem direito a: acessar, corrigir ou excluir seus dados pessoais a qualquer momento.

**7. Contato**
Para dúvidas sobre privacidade: contato@faceglow-soora.me
`;

function LegalModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        style={{
          width: "100%",
          maxHeight: "85vh",
          background: "#FAFAF8",
          borderRadius: "24px 24px 0 0",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px 12px",
          borderBottom: "1px solid #F0EDE8",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{ background: "#F0EDE8", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "#6B6B6B" }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A", margin: 0 }}>{title}</h3>
        </div>
        <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
          {content.split("\n\n").map((block, i) => {
            if (block.startsWith("**") && block.endsWith("**")) {
              return <h4 key={i} style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 6, marginTop: i > 0 ? 16 : 0 }}>{block.replace(/\*\*/g, "")}</h4>;
            }
            const parts = block.split("**");
            return (
              <p key={i} style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6, marginBottom: 8 }}>
                {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#1A1A1A" }}>{part}</strong> : part)}
              </p>
            );
          })}
          <div style={{ height: 40 }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export const AnalysisTermsModal = ({ open, onAccept, onDecline }: Props) => {
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(200,180,190,0.25)", backdropFilter: "blur(12px)" }}
            onClick={onDecline}
          />

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
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(244,168,199,0.35)" }} />
            </div>

            <div className="px-6 pb-8 pt-4">
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)",
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
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: g.bg }}
                    >
                      <g.Icon size={17} style={{ color: g.color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", marginBottom: 2 }}>{g.title}</div>
                      <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.4 }}>{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: "#9B9B9B", lineHeight: 1.6, marginBottom: 20, textAlign: "center" }}>
                Ao continuar, você concorda com nossos{" "}
                <button
                  onClick={() => setLegalModal("terms")}
                  style={{ color: "#E8748A", textDecoration: "underline", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}
                >
                  Termos de Uso
                </button>
                {" "}e{" "}
                <button
                  onClick={() => setLegalModal("privacy")}
                  style={{ color: "#E8748A", textDecoration: "underline", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}
                >
                  Política de Privacidade
                </button>.
                {" "}As imagens são processadas pela IA e descartadas após a análise.
              </p>

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

          <AnimatePresence>
            {legalModal === "terms" && (
              <LegalModal title="Termos de Uso" content={TERMS_CONTENT} onClose={() => setLegalModal(null)} />
            )}
            {legalModal === "privacy" && (
              <LegalModal title="Política de Privacidade" content={PRIVACY_CONTENT} onClose={() => setLegalModal(null)} />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
