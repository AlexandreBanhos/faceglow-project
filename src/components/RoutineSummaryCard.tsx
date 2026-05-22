import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { type AnalysisResponse, type AnalysisRecommendation } from "@/lib/analysis";
import { fetchRoutineSteps, type RoutineStep as ApiRoutineStep } from "@/lib/analysisClient";
import { PremiumUnlockModal } from "@/components/PremiumUnlockModal";
import SerumSvg from "@/assets/icones/serum-svg.svg";

interface RoutineSummaryCardProps {
  analysis: AnalysisResponse;
  delay?: number;
}

const getRoutineTitle = (step: string) => {
  const separatorIndex = step.indexOf(":");
  const raw = separatorIndex >= 0 ? step.slice(separatorIndex + 1).trim() : step.trim();
  return raw.replace(/\(([^)]+)\)\s*$/, "").trim();
};

const normalizeType = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

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
}: {
  slot: ProductSlot;
  size: "mobile" | "desktop";
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
}: {
  slots: ProductSlot[];
  extra?: number;
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
      let count = 0;
      let used = 0;
      for (let i = 0; i < (slots.length > 0 ? slots.length : 4); i++) {
        const sw = i === 0 ? slotSz : slotSz - overlap;
        if (used + sw <= width) {
          used += sw;
          count++;
        } else break;
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
    const cls = mobile ? "flex sm:hidden" : "hidden sm:flex";
    return (
      <div className={`${cls} items-center`}>
        {visible.map((slot, i) => (
          <div
            key={i}
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: i + 1,
              position: "relative",
              flexShrink: 0,
            }}
          >
            <ProductSlotCircle slot={slot} size={mobile ? "mobile" : "desktop"} />
          </div>
        ))}
        {totalExtra > 0 && (
          <div
            style={{
              marginLeft: -overlap,
              zIndex: visible.length + 2,
              position: "relative",
              flexShrink: 0,
              width: slotSz,
              height: slotSz,
              borderRadius: "50%",
              background: "var(--grad-coral)",
              border: "2px solid rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!analysis?.id || !isPremium) { setStepsLoaded(true); return; }
    let cancelled = false;
    fetchRoutineSteps(analysis.id)
      .then((steps) => { if (!cancelled) { setApiSteps(steps); setStepsLoaded(true); } })
      .catch(() => { if (!cancelled) setStepsLoaded(true); });
    return () => { cancelled = true; };
  }, [analysis?.id, isPremium]);

  const { morningSlots, nightSlots, morningExtra, nightExtra } = useMemo(() => {
    const maxDisplay = 4;

    // Premium: structured API steps with real product images
    if (isPremium && stepsLoaded && apiSteps.length > 0) {
      let displayNames: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(`faceglow-routine-display-${analysis.id}`);
        if (raw) displayNames = JSON.parse(raw) as Record<string, string>;
      } catch { displayNames = {}; }

      const buildSlotsFromApi = (period: "morning" | "night") => {
        const periodSteps = apiSteps
          .filter((s) => s.period === period)
          .sort((a, b) => a.stepOrder - b.stepOrder);
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

    // Free & fallback: build slots from routine strings — sem imageUrl (evita expor produtos)
    const buildSlots = (steps: string[], period: "morning" | "night") => {
      const slots: ProductSlot[] = steps.slice(0, maxDisplay).map((step) => {
        const idx = step.indexOf(":");
        const type = idx >= 0 ? step.slice(0, idx).trim() : step.trim();
        return {
          name: type || getRoutineTitle(step),
          imageUrl: undefined, // free nunca exibe imagens de produto
        };
      });
      return { slots, extraCount: Math.max(0, steps.length - maxDisplay) };
    };

    const recommendations: AnalysisRecommendation[] = analysis.recommendations ?? [];
    void recommendations; // ignorado no path free

    const m = buildSlots(analysis.routine?.morning ?? [], "morning");
    const n = buildSlots(analysis.routine?.night ?? [], "night");
    return { morningSlots: m.slots, nightSlots: n.slots, morningExtra: m.extraCount, nightExtra: n.extraCount };
  }, [analysis, isPremium, apiSteps, stepsLoaded]);

  const morningCount = stepsLoaded && apiSteps.length > 0
    ? apiSteps.filter((s) => s.period === "morning").length
    : (analysis.routine?.morning?.length ?? 0);
  const nightCount = stepsLoaded && apiSteps.length > 0
    ? apiSteps.filter((s) => s.period === "night").length
    : (analysis.routine?.night?.length ?? 0);

  if (morningCount === 0 && nightCount === 0) return null;

  const handleCardClick = () => {
    if (isPremium) {
      navigate("/routine", { state: { analysis } });
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="px-6 mt-4"
      >
        <button onClick={handleCardClick} className="w-full text-left">
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
                {!isPremium && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap text-white"
                    style={{ background: "var(--grad-coral)" }}
                  >
                    <Sparkles size={10} />
                    Ver produtos
                  </motion.button>
                )}
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
                <StackedSlots slots={morningSlots} extra={morningExtra} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Moon size={13} className="text-indigo-500 shrink-0" />
                  <span className="text-xs font-extrabold text-foreground">Noite</span>
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    · {nightCount} {nightCount === 1 ? "passo" : "passos"}
                  </span>
                </div>
                <StackedSlots slots={nightSlots} extra={nightExtra} />
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
                  Veja os produtos perfeitos para sua pele no Premium
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                  className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full text-white"
                  style={{ background: "var(--grad-coral)" }}
                >
                  Conhecer
                </button>
              </motion.div>
            )}
          </div>
        </button>
      </motion.div>

      {/* Premium Modal */}
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
