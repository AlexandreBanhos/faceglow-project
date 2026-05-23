import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import type { AnalysisPoints } from "@/lib/analysis";

type LandmarkPoint = { x: number; y: number };

interface FloatingAnalysisCardProps {
  imageUrl: string;
  onClose: () => void;
  isOpen: boolean;
  landmarkPoints?: LandmarkPoint[];
  metricCards: Array<{ label: string; value: number }>;
  facialPoints?: AnalysisPoints;
  skinAge?: number;
  confidence?: number;
  skinType?: string;
}

const METRIC_LABELS_PT: Record<string, string> = {
  acne: "Acne",
  moisture: "Umidade",
  umidade: "Umidade",
  wrinkles: "Rugas",
  rugas: "Rugas",
  oiliness: "Oleosidade",
  oleosidade: "Oleosidade",
  darkspots: "Manchas",
  dark_spots: "Manchas",
  manchas: "Manchas",
  hydration: "Hidratação",
  hidratacao: "Hidratação",
  sensibilidade: "Sensibilidade",
  sensitivity: "Sensibilidade",
  poros: "Poros",
  olheiras: "Olheiras",
  linhasfinas: "Linhas finas",
  linhas_finas: "Linhas finas",
  vermelhidao: "Vermelhidão",
  espinhasativas: "Espinhas",
  espinhas_ativas: "Espinhas",
  cravos: "Cravos",
  ressecamento: "Ressec.",
};

const normalizeMetricLabel = (label: string) => {
  const key = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
  return METRIC_LABELS_PT[key] ?? label;
};

// ─── Slider ──────────────────────────────────────────────────────────────────

function SlideToView({ onAction }: { onAction: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [handleX, setHandleX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const HANDLE_W = 48;
  const PAD = 4;

  const getProgress = useCallback((rawX: number) => {
    const w = containerRef.current?.offsetWidth ?? 300;
    const max = w - HANDLE_W - PAD * 2;
    return Math.max(0, Math.min(1, rawX / max));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || triggered) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = e.clientX - rect.left - HANDLE_W / 2 - PAD;
    const max = rect.width - HANDLE_W - PAD * 2;
    const clamped = Math.max(0, Math.min(max, rawX));
    setHandleX(clamped);
    if (getProgress(clamped) >= 0.85) {
      setTriggered(true);
      onAction();
      setTimeout(() => { setHandleX(0); setTriggered(false); setIsDragging(false); }, 500);
    }
  };

  const onPointerUp = () => {
    if (triggered) return;
    setIsDragging(false);
    setHandleX(0);
  };

  const textOpacity = Math.max(0, 1 - getProgress(handleX) * 2);

  return (
    <div
      ref={containerRef}
      onClick={onAction}
      style={{
        position: "relative", width: "100%", height: 56, borderRadius: 999,
        background: "var(--grad-coral)",
        overflow: "hidden", cursor: "pointer", userSelect: "none",
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 600, color: "white",
        opacity: textOpacity, pointerEvents: "none", letterSpacing: "-0.01em",
      }}>
        Ver análise completa →
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "absolute",
          left: handleX + PAD, top: PAD, bottom: PAD,
          width: HANDLE_W, borderRadius: 999,
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          transition: isDragging ? "none" : "left 300ms ease",
          zIndex: 1,
        }}
      >
        <ChevronRight size={20} color="#ef8fb8" strokeWidth={2.5} />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const FloatingAnalysisCard = ({
  imageUrl,
  onClose,
  isOpen,
  metricCards,
  skinAge,
  confidence,
}: FloatingAnalysisCardProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isOpen) return null;

  const allMetrics = metricCards
    .filter(m => m.value > 0)
    .sort((a, b) => b.value - a.value)
    .map(m => ({ ...m, label: normalizeMetricLabel(m.label) }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[999]"
      onClick={onClose}
    >
      <div
        className="relative h-[100svh] w-full overflow-hidden pointer-events-auto"
        style={{ background: "#fbf6f1" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Foto de fundo */}
        <img
          src={imageUrl}
          alt="Foto analisada"
          className="absolute inset-0 h-full w-full object-cover saturate-[0.96]"
          onError={e => {
            e.currentTarget.src =
              "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1600&fit=crop";
          }}
        />

        {/* Overlay topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#fbf6f1]/80 to-transparent" />

        {/* Header */}
        <div className="relative z-20 grid grid-cols-[40px_1fr_40px] items-center px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7ea]/58 text-[var(--fg-ink-2)] backdrop-blur-2xl transition hover:bg-white/70"
            style={{ boxShadow: "0 10px 30px -22px rgba(80,40,60,0.45)" }}
            aria-label="Voltar"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </button>

          <div
            className="mx-auto rounded-full px-4 py-2 text-center text-[12px] font-semibold tracking-[-0.01em] text-[var(--fg-ink)] backdrop-blur-2xl"
            style={{
              background: "rgba(255,247,234,0.68)",
              boxShadow: "0 12px 34px -24px rgba(80,40,60,0.42)",
            }}
          >
            Idade da pele: {skinAge ?? "--"}
          </div>

          <div />
        </div>

        {/* Painel inferior */}
        <motion.div
          className="absolute inset-x-0 bottom-0 z-30 flex flex-col"
          style={{
            background: "rgba(251,246,241,0.94)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            borderRadius: "28px 28px 0 0",
            boxShadow: "0 -8px 40px rgba(80,40,60,0.14), inset 0 1px 0 rgba(255,255,255,0.72)",
          }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Handle — toque para colapsar/expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(v => !v)}
            className="flex flex-col items-center w-full pt-3 pb-2 flex-shrink-0"
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
            aria-label={isCollapsed ? "Expandir métricas" : "Ocultar métricas"}
          >
            <div className="h-1 w-9 rounded-full bg-black/10 mb-1.5" />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--fg-ink-3)", textTransform: "uppercase" }}>
              {isCollapsed ? "ver métricas" : "ocultar"}
            </span>
          </button>

          {/* Lista de métricas — colapsa ao tocar no handle */}
          <motion.div
            animate={{ height: isCollapsed ? 0 : "auto", opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 pb-2"
              style={{
                overflowY: "auto",
                maxHeight: "calc(60svh - 148px)",
                scrollbarWidth: "none",
              }}
            >
              <div className="flex flex-col gap-2">
                {allMetrics.map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.18 + i * 0.04 }}
                    style={{
                      position: "relative",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.55)",
                      border: "1px solid rgba(255,255,255,0.65)",
                    }}
                  >
                    <motion.div
                      style={{
                        position: "absolute",
                        top: 0, left: 0, bottom: 0,
                        width: `${metric.value}%`,
                        background: "linear-gradient(90deg, rgba(221,182,147,0.28) 0%, rgba(232,169,194,0.22) 60%, rgba(239,143,184,0.18) 100%)",
                        transformOrigin: "left center",
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.65, delay: 0.22 + i * 0.04, ease: "easeOut" }}
                    />
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-ink)" }}>
                        {metric.label}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          background: "var(--grad-coral)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {metric.value}%
                      </span>
                    </div>
                  </motion.div>
                ))}

                {allMetrics.length === 0 && (
                  <div className="flex h-14 items-center justify-center text-sm text-[var(--fg-ink-3)]">
                    Métricas não disponíveis
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Footer fixo: confiança + slider */}
          <div
            className="flex flex-shrink-0 flex-col gap-2.5 px-4 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 14px)" }}
          >
            <motion.div
              className="flex items-center justify-center gap-2 text-[11px] font-medium text-[var(--fg-ink-3)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]"
                animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              Analisando pele...{confidence ? ` ${confidence}% de confiança` : ""}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52 }}
            >
              <SlideToView onAction={onClose} />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
