import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { ImageInfoCard } from "@/components/ImageInfoCard";
import { useModalPortal } from "@/hooks/useModalPortal";
import type { LearnCard as LearnCardData } from "@/data/skincareLearn";

// ─── Gradiente do sistema ─────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)";
const CORAL = "#E8748A";

// ─── Layouts de modal por categoria ──────────────────────────────────────────

function ModalStandard({ card }: { card: LearnCardData }) {
  return (
    <>
      <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.65 }}>
        {card.fullDescription}
      </p>

      <div style={{ borderRadius: 14, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <AlertTriangle size={14} style={{ color: "rgba(194,65,12,0.85)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(194,65,12,0.85)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fique de olho</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{card.focus}</p>
      </div>

      <div style={{ borderRadius: 14, background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <Lightbulb size={14} style={{ color: "hsl(var(--primary) / 0.85)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--primary) / 0.85)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Dica prática</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{card.tip}</p>
      </div>
    </>
  );
}

function ModalTimeline({ card }: { card: LearnCardData }) {
  const steps = card.steps ?? [];
  return (
    <>
      <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
        {card.fullDescription}
      </p>

      {/* Timeline vertical */}
      <div style={{ position: "relative" }}>
        {/* Linha vertical */}
        <div style={{
          position: "absolute", left: 19, top: 0, bottom: 0,
          width: 2,
          background: "linear-gradient(to bottom, rgba(232,116,138,0.5) 0%, rgba(244,168,199,0.15) 100%)",
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: i < steps.length - 1 ? 20 : 0, position: "relative" }}>
              {/* Círculo numerado */}
              <div style={{
                flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
                background: GRAD,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "white",
                boxShadow: "0 4px 12px rgba(232,116,138,0.35)",
                zIndex: 1,
              }}>
                {i + 1}
              </div>

              {/* Texto do passo */}
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.8)",
                borderRadius: 14, padding: "10px 14px",
                border: "1px solid rgba(232,116,138,0.12)",
                marginTop: 4,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: 1.55, fontWeight: i === 0 ? 600 : 400 }}>
                  {step}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dica ao final */}
      <div style={{ borderRadius: 14, background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Lightbulb size={13} style={{ color: CORAL, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: CORAL, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dica prática</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{card.tip}</p>
      </div>
    </>
  );
}

function ModalMyths({ card }: { card: LearnCardData }) {
  const myths = card.myths ?? [];
  return (
    <>
      <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
        {card.fullDescription}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {myths.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Card do mito */}
            <div style={{
              background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
              borderBottom: "1px solid rgba(239,68,68,0.15)",
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <XCircle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 3 }}>Mito</span>
                  <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{item.myth}"
                  </p>
                </div>
              </div>
            </div>
            {/* Card da verdade */}
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 3 }}>Verdade</span>
                  <p style={{ margin: 0, fontSize: 13, color: "#14532d", lineHeight: 1.5 }}>
                    {item.truth}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dica ao final */}
      <div style={{ borderRadius: 14, background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Lightbulb size={13} style={{ color: CORAL, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: CORAL, textTransform: "uppercase", letterSpacing: "0.06em" }}>Lembre-se</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{card.tip}</p>
      </div>
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface LearnCardProps {
  card: LearnCardData;
  delay?: number;
}

export function LearnCard({ card, delay = 0 }: LearnCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImgLoaded, setModalImgLoaded]   = useState(false);
  const [modalImgErrored, setModalImgErrored] = useState(false);
  const portalContainer = useModalPortal();

  const categoryLabel =
    card.category === "rotina" ? "Passo a passo"
    : card.category === "mitos" ? "Mitos e Verdades"
    : card.category === "ingredientes" ? "Ingrediente ativo"
    : card.category === "problemas" ? "Condição"
    : "Tipo de pele";

  const modalContent = (
    <AnimatePresence>
      {modalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setModalOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          />

          {/* Painel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
              maxHeight: "92vh", maxWidth: 480, margin: "0 auto",
              background: "#F8F6F4",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Handle */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.12)" }} />
            </div>

            {/* Área scrollável */}
            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              {/* Header com imagem */}
              <div style={{ position: "relative", margin: "8px 20px 0", borderRadius: 18, overflow: "hidden", height: 130, backgroundColor: card.fallbackColor }}>
                {!modalImgErrored && (
                  <img src={card.imageUrl} alt={card.title} loading="lazy" decoding="async"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: modalImgLoaded ? 1 : 0, transition: "opacity 300ms ease" }}
                    onLoad={() => setModalImgLoaded(true)} onError={() => setModalImgErrored(true)}
                  />
                )}
                {!modalImgLoaded && !modalImgErrored && (
                  <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)", pointerEvents: "none" }} />
                {/* Badge categoria */}
                <div style={{
                  position: "absolute", top: 12, left: 12,
                  padding: "3px 10px", borderRadius: 99,
                  background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)",
                  fontSize: 10, fontWeight: 700, color: "white", letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>
                  {categoryLabel}
                </div>
                <h2 style={{ position: "absolute", bottom: 12, left: 14, margin: 0, color: "white", fontSize: 19, fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>
                  {card.title}
                </h2>
              </div>

              {/* Conteúdo — layout por categoria */}
              <div style={{ padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
                {card.category === "rotina" && <ModalTimeline card={card} />}
                {card.category === "mitos"  && <ModalMyths   card={card} />}
                {(card.category !== "rotina" && card.category !== "mitos") && <ModalStandard card={card} />}
              </div>
            </div>

            {/* Botão fixo na base */}
            <div style={{ flexShrink: 0, padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(to top, #F8F6F4 70%, transparent)" }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD, border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(232,116,138,0.3)" }}
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <ImageInfoCard
        imageUrl={card.imageUrl}
        fallbackColor={card.fallbackColor}
        title={card.title}
        description={card.description}
        onAction={() => setModalOpen(true)}
        delay={delay}
      />

      {createPortal(modalContent, portalContainer)}
    </>
  );
}
