import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { type AnalysisResponse } from "@/lib/analysis";
import { fetchRoutineSteps, fetchCatalogProducts, type RoutineStep as ApiRoutineStep } from "@/lib/analysisClient";
import { PremiumUnlockModal } from "@/components/PremiumUnlockModal";
import SerumSvg from "@/assets/icones/serum-svg.svg";

interface RoutineSummaryCardProps {
  analysis: AnalysisResponse;
  delay?: number;
}

const getRoutineTitle = (step: string) => {
  const idx = step.indexOf(":");
  const raw = idx >= 0 ? step.slice(idx + 1).trim() : step.trim();
  return raw.replace(/\(([^)]+)\)\s*$/, "").trim();
};

const normalizeLabel = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

// Mapeia label do passo para step_type_key do catálogo
const labelToStepTypeKey = (label: string): string => {
  const n = normalizeLabel(label);
  if (n.includes("limpeza")) return "cleanser";
  if (n.includes("hidratante") || n.includes("hidratacao")) return "moisturizer";
  if (n.includes("serum") || n.includes("antioxidante") || n.includes("sero")) return "serum";
  if (n.includes("protetor") || n.includes("solar") || n.includes("fps")) return "sunscreen";
  if (n.includes("tonico")) return "toner";
  if (n.includes("retinol") || n.includes("retino")) return "retinoid";
  if (n.includes("acido") || n.includes("acid") || n.includes("esfoliante")) return "acid";
  if (n.includes("mascara")) return "mask";
  if (n.includes("demaquilante")) return "makeup_remover";
  return "spot_treatment";
};

interface ProductSlot {
  name: string;
  imageUrl?: string;
}

const SLOT_DESKTOP = 50;
const SLOT_MOBILE = 36;
const OVERLAP_DESKTOP = 14;
const OVERLAP_MOBILE = 10;

// ─── Slot circle ─────────────────────────────────────────────────────────────

const ProductSlotCircle = ({
  slot,
  size,
  blurred = false,
}: {
  slot: ProductSlot;
  size: "mobile" | "desktop";
  blurred?: boolean;
}) => {
  const sz = size === "mobile" ? SLOT_MOBILE : SLOT_DESKTOP;

  return (
    <div
      className="rounded-full overflow-hidden border-2 shrink-0 flex items-center justify-center"
      style={{
        width: sz,
        height: sz,
        borderColor: "rgba(255,255,255,0.95)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,240,245,0.9) 100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
      }}
    >
      {slot.imageUrl ? (
        <img
          src={slot.imageUrl}
          alt={slot.name}
          className="w-full h-full object-cover"
          style={blurred ? { filter: "blur(5px) saturate(0.55)", transform: "scale(1.1)" } : undefined}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: "62%",
            height: "62%",
            background: "linear-gradient(135deg, #E8547A 0%, #E8A882 100%)",
            WebkitMaskImage: `url(${SerumSvg})`,
            maskImage: `url(${SerumSvg})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
};

// ─── Stacked row ─────────────────────────────────────────────────────────────

const StackedSlots = ({
  slots,
  extra = 0,
  blurred = false,
}: {
  slots: ProductSlot[];
  extra?: number;
  blurred?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxVisible, setMaxVisible] = useState(4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const width = el.clientWidth ?? 0;
      const isMobile = window.innerWidth < 640;
      const slotSz = isMobile ? SLOT_MOBILE : SLOT_DESKTOP;
      const overlap = isMobile ? OVERLAP_MOBILE : OVERLAP_DESKTOP;
      let count = 0, used = 0;
      for (let i = 0; i < (slots.length > 0 ? slots.length : 4); i++) {
        const sw = i === 0 ? slotSz : slotSz - overlap;
        if (used + sw <= width) { used += sw; count++; } else break;
      }
      setMaxVisible(Math.max(1, count));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [slots.length]);

  const displaySlots = slots.length > 0 ? slots : (Array(4).fill({}) as ProductSlot[]);
  const visible = displaySlots.slice(0, maxVisible);
  const totalExtra = displaySlots.length - maxVisible + extra;

  const renderStack = (mobile: boolean) => {
    const slotSz = mobile ? SLOT_MOBILE : SLOT_DESKTOP;
    const overlap = mobile ? OVERLAP_MOBILE : OVERLAP_DESKTOP;
    return (
      <div className={`${mobile ? "flex sm:hidden" : "hidden sm:flex"} items-center`}>
        {visible.map((slot, i) => (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i + 1, position: "relative", flexShrink: 0 }}>
            <ProductSlotCircle slot={slot} size={mobile ? "mobile" : "desktop"} blurred={blurred} />
          </div>
        ))}
        {totalExtra > 0 && (
          <div style={{
            marginLeft: -overlap, zIndex: visible.length + 2, position: "relative", flexShrink: 0,
            width: slotSz, height: slotSz, borderRadius: "50%",
            background: "var(--grad-coral)", border: "2px solid rgba(255,255,255,0.95)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: mobile ? 10 : 11, fontWeight: 800, lineHeight: 1 }}>
              +{totalExtra}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full">
      {renderStack(false)}
      {renderStack(true)}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const RoutineSummaryCard = ({ analysis, delay = 0 }: RoutineSummaryCardProps) => {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const [apiSteps, setApiSteps] = useState<ApiRoutineStep[]>([]);
  const [stepsLoaded, setStepsLoaded] = useState(false);
  // Imagens do catálogo por step_type_key — usado para preview borrado no free
  const [catalogImages, setCatalogImages] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);

  // Premium: busca steps estruturados com imagens reais
  useEffect(() => {
    if (!analysis?.id || !isPremium) { setStepsLoaded(true); return; }
    let cancelled = false;
    fetchRoutineSteps(analysis.id)
      .then((steps) => { if (!cancelled) { setApiSteps(steps); setStepsLoaded(true); } })
      .catch(() => { if (!cancelled) setStepsLoaded(true); });
    return () => { cancelled = true; };
  }, [analysis?.id, isPremium]);

  // Free: busca uma imagem representativa do catálogo para cada tipo de passo
  useEffect(() => {
    if (isPremium) return;
    const routine = analysis.routine;
    if (!routine) return;

    const allSteps = [...(routine.morning ?? []), ...(routine.night ?? [])];
    const uniqueKeys = new Set<string>();
    allSteps.forEach((step) => {
      const label = step.split(":")[0]?.trim() ?? "";
      uniqueKeys.add(labelToStepTypeKey(label));
    });

    const keys = Array.from(uniqueKeys).slice(0, 6);
    Promise.all(
      keys.map((key) =>
        fetchCatalogProducts(key)
          .then((products) => ({ key, imageUrl: products.find((p) => p.imageUrl)?.imageUrl }))
          .catch(() => ({ key, imageUrl: undefined }))
      )
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach(({ key, imageUrl }) => { if (imageUrl) map[key] = imageUrl; });
      setCatalogImages(map);
    });
  }, [isPremium, analysis?.id, analysis?.routine]);

  const { morningSlots, nightSlots, morningExtra, nightExtra } = useMemo(() => {
    const maxDisplay = 4;

    // Premium: steps estruturados com imagens reais
    if (isPremium && stepsLoaded && apiSteps.length > 0) {
      let displayNames: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(`faceglow-routine-display-${analysis.id}`);
        if (raw) displayNames = JSON.parse(raw) as Record<string, string>;
      } catch { displayNames = {}; }

      const buildSlotsFromApi = (period: "morning" | "night") => {
        const periodSteps = apiSteps.filter((s) => s.period === period).sort((a, b) => a.stepOrder - b.stepOrder);
        const slots: ProductSlot[] = periodSteps.slice(0, maxDisplay).map((s) => {
          const itemKey = `${period}::${s.productName.toLowerCase()}`;
          return {
            name: displayNames[itemKey] ?? s.overrideProductName ?? s.productName,
            imageUrl: s.overrideImageUrl ?? s.imageUrl,
          };
        });
        return { slots, extraCount: Math.max(0, periodSteps.length - maxDisplay) };
      };

      const m = buildSlotsFromApi("morning");
      const n = buildSlotsFromApi("night");
      return { morningSlots: m.slots, nightSlots: n.slots, morningExtra: m.extraCount, nightExtra: n.extraCount };
    }

    // Free: usa imagens do catálogo por tipo de passo (borradas no render)
    const buildSlots = (steps: string[]) => {
      const slots: ProductSlot[] = steps.slice(0, maxDisplay).map((step) => {
        const label = step.split(":")[0]?.trim() ?? "";
        const title = getRoutineTitle(step);
        const key = labelToStepTypeKey(label);
        return {
          name: label || title,
          imageUrl: catalogImages[key],
        };
      });
      return { slots, extraCount: Math.max(0, steps.length - maxDisplay) };
    };

    const m = buildSlots(analysis.routine?.morning ?? []);
    const n = buildSlots(analysis.routine?.night ?? []);
    return { morningSlots: m.slots, nightSlots: n.slots, morningExtra: m.extraCount, nightExtra: n.extraCount };
  }, [analysis, isPremium, apiSteps, stepsLoaded, catalogImages]);

  const morningCount = stepsLoaded && apiSteps.length > 0
    ? apiSteps.filter((s) => s.period === "morning").length
    : (analysis.routine?.morning?.length ?? 0);
  const nightCount = stepsLoaded && apiSteps.length > 0
    ? apiSteps.filter((s) => s.period === "night").length
    : (analysis.routine?.night?.length ?? 0);

  if (morningCount === 0 && nightCount === 0) return null;

  const goToRoutine = () => navigate("/routine", { state: { analysis } });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="px-6 mt-4"
      >
        <button onClick={goToRoutine} className="w-full text-left">
          <div
            className="rounded-3xl p-5 border border-white/30"
            style={{
              background: "linear-gradient(135deg, #FEF3C7 0%, #F5F3FF 50%, #F3E8FF 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 20px rgba(0,0,0,0.07)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="text-sm font-bold text-foreground">Sua Rotina</h3>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => { e.stopPropagation(); goToRoutine(); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                  style={isPremium
                    ? { background: "var(--grad-coral)", color: "white" }
                    : { background: "rgba(255,255,255,0.7)", color: "var(--fg-ink-2)", border: "1px solid rgba(0,0,0,0.08)" }
                  }
                >
                  Rotina Atual
                </motion.button>
                <ChevronRight size={16} className="text-primary" />
              </div>
            </div>

            {/* Two-column grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sun size={13} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-extrabold text-foreground">Manhã</span>
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    · {morningCount} {morningCount === 1 ? "passo" : "passos"}
                  </span>
                </div>
                <StackedSlots slots={morningSlots} extra={morningExtra} blurred={!isPremium} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Moon size={13} className="text-indigo-500 shrink-0" />
                  <span className="text-xs font-extrabold text-foreground">Noite</span>
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    · {nightCount} {nightCount === 1 ? "passo" : "passos"}
                  </span>
                </div>
                <StackedSlots slots={nightSlots} extra={nightExtra} blurred={!isPremium} />
              </div>
            </div>

            {/* Free CTA footer */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 pt-3.5 border-t border-white/40 flex items-center justify-between gap-3"
              >
                <p className="text-xs text-muted-foreground leading-tight">
                  Desbloqueie os produtos perfeitos para sua pele
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full text-white"
                  style={{ background: "var(--grad-coral)" }}
                >
                  <Sparkles size={10} />
                  Ver produtos
                </button>
              </motion.div>
            )}
          </div>
        </button>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center pb-6 px-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowModal(false)}
          >
            <PremiumUnlockModal isVisible={showModal} onClose={() => setShowModal(false)} />
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RoutineSummaryCard;
