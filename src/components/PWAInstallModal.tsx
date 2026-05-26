import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMobileScreen, faXmark, faShareFromSquare, faChevronRight, faSquarePlus, faEllipsis } from "@fortawesome/free-solid-svg-icons";
import logoFaceglow from "@/assets/logos/logo-faceglow.svg";
import iosTutorialImg from "@/assets/pwa-tutorial.png";

interface PWAInstallModalProps {
  isVisible: boolean;
  isIOS: boolean;
  canPrompt: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PWAInstallModal({
  isVisible, isIOS, canPrompt, onInstall, onDismiss,
}: PWAInstallModalProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            key="pwa-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[998]"
            style={{ background: "rgba(15,10,30,0.55)", backdropFilter: "blur(4px)" }}
            onClick={onDismiss}
          />

          {/* Sheet */}
          <motion.div
            key="pwa-sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-[999] w-full max-w-sm mx-auto rounded-t-[2rem] overflow-hidden"
            style={{
              background: "var(--glass-bg-strong)",
              backdropFilter: "blur(36px) saturate(2)",
              WebkitBackdropFilter: "blur(36px) saturate(2)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow-strong)",
            }}
          >
            {/* Aurora gradient topo */}
            <div
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{
                height: "45%",
                background:
                  "linear-gradient(180deg,rgba(239,143,184,0.26) 0%,rgba(221,182,147,0.1) 65%,transparent 100%)",
                borderRadius: "2rem 2rem 0 0",
              }}
            />

            {/* Drag handle */}
            <div className="flex justify-center pt-3 relative z-10">
              <div className="w-10 h-1.5 rounded-full" style={{ background: "rgba(60,30,50,0.18)" }} />
            </div>

            {/* Logo + fechar */}
            <div className="relative flex items-center justify-center z-10 px-5 pt-4 pb-3">
              <img
                src={logoFaceglow}
                alt="FaceGlow"
                style={{
                  height: "52px",
                  width: "auto",
                  filter: "drop-shadow(0 2px 10px rgba(220,100,140,0.32)) brightness(1.06)",
                }}
              />
              <button
                onClick={onDismiss}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--glass-bg-soft)", border: "1px solid var(--glass-border-soft)" }}
              >
                <FontAwesomeIcon icon={faXmark} style={{ color: "var(--fg-ink-3)", fontSize: 13 }} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="relative z-10 px-6 pb-2">
              <h2 className="font-extrabold text-foreground text-center leading-tight mb-1.5" style={{ fontSize: 18 }}>
                {isIOS
                  ? "Adicione à tela inicial"
                  : "Instale FaceGlow na tela inicial"}
              </h2>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {isIOS
                  ? "Acesse sua rotina de pele como um app — sem abrir o navegador."
                  : "Acesse sua rotina e análises sem abrir o navegador. Rápido, grátis e sem ocupar espaço."}
              </p>
            </div>

            {/* Área de mídia / tutorial */}
            <div className="relative z-10 mx-5 my-4">
              {isIOS ? (
                <IOSTutorial />
              ) : (
                <AndroidGraphic />
              )}
            </div>

            {/* CTAs */}
            <div className="relative z-10 px-5 pb-7 pt-1 space-y-2.5">
              {isIOS ? (
                <button
                  onClick={onDismiss}
                  className="coral-button w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-glow"
                >
                  <FontAwesomeIcon icon={faShareFromSquare} style={{ fontSize: 15 }} />
                  Entendido!
                </button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onInstall}
                  disabled={!canPrompt}
                  className="coral-button w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-glow disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faMobileScreen} style={{ fontSize: 15 }} />
                  Instalar agora
                </motion.button>
              )}
              <button
                onClick={() => onDismiss()}
                className="liquiglass-button w-full py-3 rounded-xl text-foreground font-semibold text-sm"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Tutorial iOS ────────────────────────────────────────────────────────────────

function IOSTutorial() {
  const steps = [
    { icon: faShareFromSquare, label: "Compartilhar" },
    { icon: faEllipsis,        label: "Ver mais"     },
    { icon: faSquarePlus,      label: "Tela Inicial" },
  ];

  return (
    <div className="space-y-3">
      {/* Imagem */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
        <img
          src={iosTutorialImg}
          alt="Tutorial: como instalar FaceGlow no iOS"
          className="w-full block"
          style={{ borderRadius: "1rem" }}
        />
      </div>

      {/* Steps rápidos */}
      <div
        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.75)" }}
      >
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--grad-coral)", boxShadow: "0 1px 6px rgba(220,100,140,0.35)" }}
              >
                <FontAwesomeIcon icon={s.icon} style={{ color: "white", fontSize: 10 }} />
              </div>
              <span className="text-[11px] font-bold text-foreground whitespace-nowrap">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <FontAwesomeIcon icon={faChevronRight} style={{ color: "#c0507a", fontSize: 9, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gráfico Android ─────────────────────────────────────────────────────────────

function AndroidGraphic() {
  return (
    <div
      className="flex items-center justify-center gap-4 py-5 px-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--grad-coral)", boxShadow: "0 4px 18px rgba(220,100,140,0.4)" }}
      >
        <FontAwesomeIcon icon={faMobileScreen} style={{ color: "white", fontSize: 26 }} />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-snug">Acesso rápido</p>
        <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">
          Toque em <strong>Instalar agora</strong> e confirme.<br />
          FaceGlow aparecerá na sua tela inicial.
        </p>
      </div>
    </div>
  );
}
