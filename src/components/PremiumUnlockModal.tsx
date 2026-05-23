import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faSun, faDroplet, faCalendarCheck, faChevronRight, faXmark } from "@fortawesome/free-solid-svg-icons";
import rotinaPreview from "@/assets/face-glow-rotina.webp";
import logoFaceglow from "@/assets/logos/logo-faceglow.svg";

interface PremiumUnlockModalProps {
  isVisible: boolean;
  onClose?: () => void;
}

export const PremiumUnlockModal = ({ isVisible, onClose }: PremiumUnlockModalProps) => {
  const navigate = useNavigate();

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 48 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden relative z-50"
      style={{
        background: "var(--glass-bg-strong)",
        backdropFilter: "blur(36px) saturate(2)",
        WebkitBackdropFilter: "blur(36px) saturate(2)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow-strong)",
      }}
    >
      {/* Gradient aurora — preenche topo */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "55%",
          background:
            "linear-gradient(180deg, rgba(239,143,184,0.28) 0%, rgba(221,182,147,0.12) 65%, transparent 100%)",
          borderRadius: "2rem 2rem 0 0",
        }}
      />

      {/* Drag handle */}
      <div className="flex justify-center pt-3 relative z-10">
        <div className="w-10 h-1.5 rounded-full" style={{ background: "rgba(60,30,50,0.18)" }} />
      </div>

      {/* ── Logo maior e clara ── */}
      <div className="relative flex items-center justify-center z-10" style={{ padding: "18px 20px 24px" }}>
        <img
          src={logoFaceglow}
          alt="FaceGlow"
          style={{
            height: "64px",
            width: "auto",
            display: "block",
            filter: "drop-shadow(0 2px 12px rgba(220,100,140,0.35)) brightness(1.08)",
          }}
        />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "var(--glass-bg-soft)",
              border: "1px solid var(--glass-border-soft)",
            }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ color: "var(--fg-ink-3)", fontSize: "13px" }} />
          </button>
        )}
      </div>

      {/* ── Imagem solta — sem card, sem container visual ── */}
      <div
        className="relative z-10"
        style={{ margin: "0 10px 20px" }}
      >
        {/* Glow coral atrás da imagem */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--grad-coral)",
            filter: "blur(56px)",
            opacity: 0.3,
            borderRadius: "32px",
            transform: "scale(0.82) translateY(12px)",
            pointerEvents: "none",
          }}
        />

        {/* Imagem livre — 3× maior, flui naturalmente */}
        <motion.img
          src={rotinaPreview}
          alt="Rotina personalizada FaceGlow"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ type: "spring", stiffness: 190, damping: 22, delay: 0.1 }}
          style={{
            display: "block",
            width: "100%",
            borderRadius: "28px",
            boxShadow:
              "0 32px 70px -14px rgba(220,100,140,0.52)," +
              "0 12px 28px -8px rgba(0,0,0,0.16)",
            position: "relative",
            zIndex: 2,
          }}
        />

        {/* Chips flutuantes sobre a imagem */}
        <MiniChip icon={faSun}           label="Manhã & Noite"    delay={0.26} top="7%"   left="-3%" />
        <MiniChip icon={faStar}          label="Personalizado"     delay={0.34} top="44%"  right="-4%" />
        <MiniChip icon={faCalendarCheck} label="Sempre atualizado" delay={0.42} bottom="7%" left="-3%" />
      </div>

      {/* ── Headline + subtítulo ── */}
      <div className="relative z-10 px-6 pb-4 text-center">
        <h2
          className="font-extrabold text-foreground leading-tight mb-1.5"
          style={{ fontSize: "19px" }}
        >
          Sua rotina personalizada<br />está esperando você
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Procuramos os produtos perfeitos para a sua realidade e montamos uma rotina completa para você usar todos os dias — manhã e noite.
        </p>
      </div>

      {/* ── CTAs ── */}
      <div className="relative z-10 px-5 pb-7 pt-1 space-y-2.5">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/premium")}
          className="coral-button w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-glow"
        >
          <FontAwesomeIcon icon={faStar} className="text-sm" />
          Desbloquear Premium
          <FontAwesomeIcon icon={faChevronRight} className="text-xs opacity-75" />
        </motion.button>
        <button
          onClick={onClose ?? (() => {})}
          className="liquiglass-button w-full py-3 rounded-xl text-foreground font-semibold text-sm"
        >
          Agora não
        </button>
      </div>
    </motion.div>
  );
};

/* ── Mini chip flutuante ── */
interface ChipPos {
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
}

const MiniChip = ({
  icon,
  label,
  delay,
  ...pos
}: { icon: Parameters<typeof FontAwesomeIcon>[0]["icon"]; label: string; delay: number } & ChipPos) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.55 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 22, delay }}
    style={{
      position: "absolute",
      zIndex: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "5px 10px 5px 5px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.95)",
      boxShadow:
        "0 6px 20px -4px rgba(60,30,50,0.24)," +
        "inset 0 1px 0 rgba(255,255,255,0.7)",
      whiteSpace: "nowrap",
      ...pos,
    }}
  >
    <div
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "var(--grad-coral)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 8px -1px rgba(220,100,140,0.45)",
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ color: "white", fontSize: "9px" }} />
    </div>
    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--fg-ink)", lineHeight: 1 }}>
      {label}
    </span>
  </motion.div>
);
