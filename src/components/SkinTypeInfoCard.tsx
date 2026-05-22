import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb } from "lucide-react";
import { ImageInfoCard } from "@/components/ImageInfoCard";
import pelaNormalImg from "@/assets/pele-normal.png";
import pelaOleosaImg from "@/assets/pele-oleosa.png";
import pelaSensivelImg from "@/assets/pele-sensivel.png";
import pelaMistaImg from "@/assets/pele-mista.png";

interface SkinTypeInfo {
  type: string;
  title: string;
  description: string;
  focus: string;
  tips: string;
  imageUrl: string;
  emoji: string;
  gradientColor: string;
}

const skinTypeData: Record<string, SkinTypeInfo> = {
  normal: {
    type: "normal",
    title: "Pele Normal",
    emoji: "o",
    description: "Equilíbrio é o nome do jogo. Nem muito oleosa, nem ressecada. Tem textura suave, poros pouco visíveis e raramente apresenta irritações.",
    focus: "Mesmo sendo equilibrada, pode sofrer com clima, estresse e produtos agressivos.",
    tips: "Mantenha uma rotina simples: limpeza + hidratação + proteção solar já fazem mágica aqui.",
    imageUrl: pelaNormalImg,
    gradientColor: "#fce7f3",
  },
  seca: {
    type: "seca",
    title: "Pele Seca",
    emoji: "~",
    description: "Pede socorro por hidratação. Sensação de repuxamento, descamação e aspecto opaco são comuns. Pode parecer sem vida se não for bem cuidada.",
    focus: "Produtos muito agressivos ou banhos quentes só pioram a situação.",
    tips: "Invista em hidratantes mais densos e evite exagerar na limpeza. Menos agressão, mais nutrição.",
    imageUrl: pelaNormalImg,
    gradientColor: "#fed7aa",
  },
  oleosa: {
    type: "oleosa",
    title: "Pele Oleosa",
    emoji: "*",
    description: "Brilho em excesso e poros mais visíveis. Tendência a acne, cravos e aquele aspecto pegajoso ao longo do dia.",
    focus: "Lavar demais pode aumentar ainda mais a oleosidade (sim, o efeito rebote é real).",
    tips: "Use produtos leves, oil-free e controle — não elimine — a oleosidade.",
    imageUrl: pelaOleosaImg,
    gradientColor: "#fef3c7",
  },
  sensivel: {
    type: "sensivel",
    title: "Pele Sensível",
    emoji: "+",
    description: "Reage fácil — até ao que parece inofensivo. Vermelhidão, ardência ou coceira são sinais comuns. Pode ser causada por genética ou fatores externos.",
    focus: "Fragrâncias, álcool e mudanças bruscas de temperatura.",
    tips: "Escolha produtos suaves, com menos ingredientes e foco em acalmar a pele.",
    imageUrl: pelaSensivelImg,
    gradientColor: "#ffe4e6",
  },
  mista: {
    type: "mista",
    title: "Pele Mista",
    emoji: "±",
    description: "O famoso equilíbrio desequilibrado. Oleosa na zona T (testa, nariz e queixo) e mais seca nas bochechas.",
    focus: "Usar um único tipo de produto pra tudo pode não funcionar.",
    tips: "Trate cada região conforme a necessidade — sim, sua pele pede estratégia.",
    imageUrl: pelaMistaImg,
    gradientColor: "#f3e8ff",
  },
};

interface SkinTypeInfoCardProps {
  skinType?: string;
  delay?: number;
}

export default function SkinTypeInfoCard({ skinType = "normal", delay = 0 }: SkinTypeInfoCardProps) {
  const normalizedType = (skinType || "normal").toLowerCase().trim();
  const info = skinTypeData[normalizedType] ?? skinTypeData.normal;

  const [modalOpen, setModalOpen] = useState(false);

  // Imagem reutilizada no modal (com skeleton próprio)
  const [modalImgLoaded, setModalImgLoaded]   = useState(false);
  const [modalImgErrored, setModalImgErrored] = useState(false);

  return (
    <>
      {/* ── Card — delega a ImageInfoCard ─────────────────────────────────── */}
      <ImageInfoCard
        imageUrl={info.imageUrl}
        fallbackColor={info.gradientColor}
        title={info.title}
        description={info.description}
        onAction={() => setModalOpen(true)}
        delay={delay}
      />

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            />

            {/* Painel bottom-sheet — flex-column para botão fixo na base */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                maxHeight: "90vh",
                maxWidth: 480,
                margin: "0 auto",
                background: "#FAFAF8",
                borderRadius: "24px 24px 0 0",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Handle */}
              <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(0,0,0,0.12)" }} />
              </div>

              {/* Área scrollável */}
              <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                {/* Imagem no topo do modal */}
                <div style={{ position: "relative", margin: "8px 20px 0", borderRadius: 16, overflow: "hidden", height: 120, backgroundColor: info.gradientColor }}>
                  {!modalImgErrored && (
                    <img
                      src={info.imageUrl}
                      alt={info.title}
                      loading="lazy"
                      decoding="async"
                      style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "center",
                        opacity: modalImgLoaded ? 1 : 0,
                        transition: "opacity 300ms ease",
                      }}
                      onLoad={() => setModalImgLoaded(true)}
                      onError={() => setModalImgErrored(true)}
                    />
                  )}
                  {!modalImgLoaded && !modalImgErrored && (
                    <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />
                  )}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)",
                    pointerEvents: "none",
                  }} />
                  <h2 style={{
                    position: "absolute", bottom: 10, left: 14, margin: 0,
                    color: "white", fontSize: 18, fontWeight: 800,
                    textShadow: "0 1px 4px rgba(0,0,0,0.4)", lineHeight: 1.2,
                  }}>
                    {info.title}
                  </h2>
                </div>

                {/* Seções */}
                <div style={{ padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--fg-ink-2, #374151)", lineHeight: 1.65 }}>
                    {info.description}
                  </p>

                  <div style={{ borderRadius: 14, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)", padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <AlertTriangle size={14} style={{ color: "rgba(194,65,12,0.85)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(194,65,12,0.85)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Fique de olho
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--fg-ink-2, #374151)", lineHeight: 1.6 }}>{info.focus}</p>
                  </div>

                  <div style={{ borderRadius: 14, background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)", padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <Lightbulb size={14} style={{ color: "hsl(var(--primary) / 0.85)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--primary) / 0.85)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Dica prática
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--fg-ink-2, #374151)", lineHeight: 1.6 }}>{info.tips}</p>
                  </div>
                </div>
              </div>

              {/* Botão "Entendi" — fixo na base */}
              <div style={{
                flexShrink: 0,
                padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
                background: "linear-gradient(to top, #FAFAF8 70%, transparent)",
              }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    width: "100%",
                    height: 50,
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
                    border: "none",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(232,116,138,0.3)",
                  }}
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
