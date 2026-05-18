import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, ChevronRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { type AnalysisResponse, type AnalysisRecommendation } from "@/lib/analysis";
import { fetchRoutineSteps, type RoutineStep as ApiRoutineStep } from "@/lib/analysisClient";
import SerumSvg from "@/assets/serum-svg.svg";

interface RoutineSummaryCardProps {
  analysis: AnalysisResponse;
  delay?: number;
}

const getDisplayStorageKey = (analysisId: string) =>
  `faceglow-routine-display-${analysisId}`;

const getRoutineStorageKey = (analysisId: string) => `faceglow-routine-schedule-${analysisId}`;

const getRoutineTitle = (step: string) => {
  const separatorIndex = step.indexOf(":");
  const raw = separatorIndex >= 0 ? step.slice(separatorIndex + 1).trim() : step.trim();
  return raw.replace(/\(([^)]+)\)\s*$/, "").trim();
};

const normalizeType = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

interface ProductSlot {
  name: string;
  imageUrl?: string;
}

const RoutineSummaryCard = ({ analysis, delay = 0 }: RoutineSummaryCardProps) => {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const [apiSteps, setApiSteps] = useState<ApiRoutineStep[]>([]);
  const [stepsLoaded, setStepsLoaded] = useState(false);

  useEffect(() => {
    if (!analysis?.id) return;
    let cancelled = false;
    fetchRoutineSteps(analysis.id)
      .then((steps) => { if (!cancelled) { setApiSteps(steps); setStepsLoaded(true); } })
      .catch(() => { if (!cancelled) setStepsLoaded(true); });
    return () => { cancelled = true; };
  }, [analysis?.id]);

  const { morningSlots, nightSlots, morningExtra, nightExtra } = useMemo(() => {
    const recommendations: AnalysisRecommendation[] = analysis.recommendations ?? [];
    const maxDisplay = 4;

    // --- Primary source: structured API steps ---
    if (stepsLoaded && apiSteps.length > 0) {
      // Build image lookup from API steps (overrideImageUrl > imageUrl)
      const apiImageByName = new Map<string, string>();
      const apiNameByPeriod = new Map<string, string>();
      apiSteps.forEach((s) => {
        const img = s.overrideImageUrl ?? s.imageUrl;
        if (img) apiImageByName.set(s.productName.toLowerCase().trim(), img);
        apiNameByPeriod.set(`${s.period}::${s.productName.toLowerCase().trim()}`, s.overrideProductName ?? s.productName);
      });

      // Read display storage overrides
      let displayNames: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(getDisplayStorageKey(analysis.id));
        if (raw) displayNames = JSON.parse(raw) as Record<string, string>;
      } catch { displayNames = {}; }

      const buildSlotsFromApi = (period: "morning" | "night") => {
        const periodSteps = apiSteps
          .filter((s) => s.period === period)
          .sort((a, b) => a.stepOrder - b.stepOrder);
        const slots: ProductSlot[] = periodSteps.slice(0, maxDisplay).map((s) => {
          const itemKey = `${period}::${s.productName.toLowerCase()}`;
          const displayName = displayNames[itemKey];
          return {
            name: displayName ?? s.overrideProductName ?? s.productName,
            imageUrl: s.overrideImageUrl ?? s.imageUrl,
          };
        });
        return { slots, extraCount: Math.max(0, periodSteps.length - maxDisplay) };
      };

      const morningResult = buildSlotsFromApi("morning");
      const nightResult = buildSlotsFromApi("night");
      return {
        morningSlots: morningResult.slots,
        nightSlots: nightResult.slots,
        morningExtra: morningResult.extraCount,
        nightExtra: nightResult.extraCount,
      };
    }

    // --- Fallback: string-parsing (while loading or no steps) ---
    const recByType = new Map<string, AnalysisRecommendation>();
    recommendations.forEach((rec) => {
      const key = normalizeType(rec.type ?? "");
      if (!recByType.has(key)) recByType.set(key, rec);
    });

    const recByName = new Map<string, string>();
    recommendations.forEach((rec) => {
      if (rec.product && rec.imageUrl) {
        recByName.set(rec.product.toLowerCase().trim(), rec.imageUrl);
      }
    });

    let displayNames: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(getDisplayStorageKey(analysis.id));
      if (raw) displayNames = JSON.parse(raw) as Record<string, string>;
    } catch {
      displayNames = {};
    }

    const buildSlots = (steps: string[], period: "morning" | "night") => {
      const slots: ProductSlot[] = steps.slice(0, maxDisplay).map((step) => {
        const idx = step.indexOf(":");
        const type = idx >= 0 ? step.slice(0, idx).trim() : step.trim();
        const title = getRoutineTitle(step);
        const itemKey = `${period}::${title.toLowerCase()}`;
        const displayName = displayNames[itemKey];
        const rec = recByType.get(normalizeType(type));
        const overrideImageUrl = displayName
          ? recByName.get(displayName.toLowerCase().trim())
          : undefined;
        return {
          name: displayName ?? rec?.product ?? title,
          imageUrl: overrideImageUrl ?? rec?.imageUrl,
        };
      });
      const extraCount = Math.max(0, steps.length - maxDisplay);
      return { slots, extraCount };
    };

    const morningSteps = analysis.routine?.morning ?? [];
    const nightSteps = analysis.routine?.night ?? [];

    const morningResult = buildSlots(morningSteps, "morning");
    const nightResult = buildSlots(nightSteps, "night");
    return {
      morningSlots: morningResult.slots,
      nightSlots: nightResult.slots,
      morningExtra: morningResult.extraCount,
      nightExtra: nightResult.extraCount,
    };
  }, [analysis, isPremium, apiSteps, stepsLoaded]);

  const morningCount = stepsLoaded && apiSteps.length > 0
    ? apiSteps.filter((s) => s.period === "morning").length
    : (analysis.routine?.morning?.length ?? 0);
  const nightCount = stepsLoaded && apiSteps.length > 0
    ? apiSteps.filter((s) => s.period === "night").length
    : (analysis.routine?.night?.length ?? 0);

  if (morningCount === 0 && nightCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mx-3 sm:mx-6 mt-4 sm:mt-6"
    >
      <button
        onClick={() => navigate("/routine", { state: { analysis } })}
        className="w-full text-left"
      >
        <div
          className="rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-sm border border-border/30"
          style={{
            background: "linear-gradient(90deg, #FEF3C7 0%, #F5F3FF 50%, #F3E8FF 100%)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {/* Title row */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-foreground truncate" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              Sua Rotina
            </h3>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
              {!isPremium && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold whitespace-nowrap">
                  <Lock size={11} className="sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">4 primeiros</span>
                  <span className="sm:hidden">4</span>
                </span>
              )}
              <div className="flex items-center gap-0 text-primary">
                <ChevronRight size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 overflow-hidden">
            {/* Morning */}
            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
                <Sun size={13} className="text-amber-500 shrink-0 sm:w-3.5 sm:h-3.5" />
                <span className="text-xs sm:text-xs font-extrabold text-foreground">Manhã:</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {morningCount} {morningCount === 1 ? "passo" : "passos"}
                </span>
              </div>
              <div className="overflow-hidden">
                <StackedSlots slots={morningSlots} extra={morningExtra} />
              </div>
            </div>

            {/* Night */}
            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
                <Moon size={13} className="text-indigo-500 shrink-0 sm:w-3.5 sm:h-3.5" />
                <span className="text-xs sm:text-xs font-extrabold text-foreground">Noite:</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {nightCount} {nightCount === 1 ? "passo" : "passos"}
                </span>
              </div>
              <div className="overflow-hidden">
                <StackedSlots slots={nightSlots} extra={nightExtra} />
              </div>
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
};

const SLOT_SIZE_DESKTOP = 54;
const SLOT_SIZE_MOBILE = 32;
const OVERLAP_DESKTOP = Math.round(SLOT_SIZE_DESKTOP * 0.25); // 25% overlap
const OVERLAP_MOBILE = Math.round(SLOT_SIZE_MOBILE * 0.25);

// Stacked row: first slot fully visible, each next tucked behind with -OVERLAP margin
const StackedSlots = ({ slots, extra = 0 }: { slots: ProductSlot[]; extra?: number }) => {
  const [maxVisible, setMaxVisible] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      const width = containerRef.current?.clientWidth ?? 0;
      const SLOT_SIZE = window.innerWidth < 640 ? 32 : 54;
      const OVERLAP = window.innerWidth < 640 ? 8 : 15;
      
      // Calcular quantos slots cabem com margem de segurança
      const availableWidth = width - 30; // margem para +numero e padding
      let visibleCount = 0;
      let usedWidth = 0;
      
      for (let i = 0; i < slots.length; i++) {
        const slotWidth = i === 0 ? SLOT_SIZE : SLOT_SIZE - OVERLAP;
        if (usedWidth + slotWidth <= availableWidth) {
          usedWidth += slotWidth;
          visibleCount++;
        } else {
          break;
        }
      }
      
      setMaxVisible(Math.max(1, visibleCount));
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [slots.length]);

  const items = slots.length > 0 ? slots : ([{}, {}, {}, {}] as ProductSlot[]);
  const total = items.length;
  const visibleSlots = items.slice(0, maxVisible);
  const totalExtra = total - maxVisible + (extra ?? 0);
  
  return (
    <div
      ref={containerRef}
      className="relative inline-flex max-w-full overflow-visible w-full"
      style={{
        "--slot-size": `${SLOT_SIZE_DESKTOP}px`,
        "--overlap": `${OVERLAP_DESKTOP}px`,
        "--slot-size-mobile": `${SLOT_SIZE_MOBILE}px`,
        "--overlap-mobile": `${OVERLAP_MOBILE}px`,
      } as React.CSSProperties & {
        "--slot-size": string;
        "--overlap": string;
        "--slot-size-mobile": string;
        "--overlap-mobile": string;
      }}
    >
      <div className="flex flex-shrink-0 relative w-full">
        {visibleSlots.map((slot, i) => (
          <div
            key={i}
            className="sm:block hidden"
            style={{
              marginLeft: i === 0 ? 0 : -OVERLAP_DESKTOP,
              zIndex: total - i,
              position: "relative",
              flexShrink: 0,
            }}
          >
            <ProductSlotCircle slot={slot} index={i} size="desktop" />
          </div>
        ))}
        {visibleSlots.map((slot, i) => (
          <div
            key={`mobile-${i}`}
            className="block sm:hidden"
            style={{
              marginLeft: i === 0 ? 0 : -OVERLAP_MOBILE,
              zIndex: total - i,
              position: "relative",
              flexShrink: 0,
            }}
          >
            <ProductSlotCircle slot={slot} index={i} size="mobile" />
          </div>
        ))}

        {totalExtra > 0 && (
          <div className="sm:block hidden absolute z-50 flex items-center justify-center rounded-full font-extrabold text-xs text-foreground bg-secondary shrink-0 sm:w-6 sm:h-6"
            style={{
              bottom: "0px",
              right: "0px",
            }}
          >
            +{totalExtra}
          </div>
        )}
        
        {totalExtra > 0 && (
          <div className="block sm:hidden absolute z-50 flex items-center justify-center rounded-full font-extrabold text-[10px] text-foreground bg-secondary shrink-0 w-5 h-5"
            style={{
              bottom: "0px",
              right: "0px",
            }}
          >
            +{totalExtra}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductSlotCircle = ({ slot, index, size }: { slot: ProductSlot; index: number; size: "mobile" | "desktop" }) => {
  const isFirst = index === 0;
  const slotSize = size === "mobile" ? 32 : 54;

  if (slot.imageUrl) {
    return (
      <div
        className="relative rounded-full overflow-hidden border-2 shadow-lg shrink-0 group"
        style={{
          width: slotSize,
          height: slotSize,
          borderColor: "rgba(255,255,255,0.95)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,240,245,0.9) 100%)",
          boxShadow: isFirst
            ? `0 3px 12px rgba(0,0,0,${size === "mobile" ? 0.1 : 0.12})`
            : `0 1.5px 6px rgba(0,0,0,${size === "mobile" ? 0.06 : 0.08})`,
        }}
      >
        <img
          src={slot.imageUrl}
          alt={slot.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          style={{ filter: isFirst ? "none" : "brightness(0.95)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.02)" }} />
        {!isFirst && (
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-full overflow-hidden border-2 shadow-lg shrink-0 flex items-center justify-center group"
      style={{
        width: slotSize,
        height: slotSize,
        borderColor: "rgba(255,255,255,0.95)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,240,245,0.9) 100%)",
        boxShadow: isFirst
          ? `0 3px 12px rgba(0,0,0,${size === "mobile" ? 0.1 : 0.12})`
          : `0 1.5px 6px rgba(0,0,0,${size === "mobile" ? 0.06 : 0.08})`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
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
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.02)" }} />
      {!isFirst && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
      )}
    </div>
  );
};

export default RoutineSummaryCard;
