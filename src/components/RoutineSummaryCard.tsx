import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, ChevronRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { type AnalysisResponse, type AnalysisRecommendation } from "@/lib/analysis";

interface RoutineSummaryCardProps {
  analysis: AnalysisResponse;
  delay?: number;
}

const getDisplayStorageKey = (analysisId: string) =>
  `faceglow-routine-display-${analysisId}`;

const normalizeType = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const getStepType = (step: string) => {
  const idx = step.indexOf(":");
  return idx >= 0 ? step.slice(0, idx).trim() : step.trim();
};

const getStepTitle = (step: string) => {
  const idx = step.indexOf(":");
  const raw = idx >= 0 ? step.slice(idx + 1).trim() : step.trim();
  return raw.replace(/\(([^)]+)\)\s*$/, "").trim();
};

interface ProductSlot {
  name: string;
  imageUrl?: string;
}

const RoutineSummaryCard = ({ analysis, delay = 0 }: RoutineSummaryCardProps) => {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();

  const { morningSlots, nightSlots, morningExtra, nightExtra } = useMemo(() => {
    const recommendations: AnalysisRecommendation[] = analysis.recommendations ?? [];
    const maxDisplay = 4; // Always show max 4 in card, regardless of premium status
    const recByType = new Map<string, AnalysisRecommendation>();
    recommendations.forEach((rec) => {
      const key = normalizeType(rec.type ?? "");
      if (!recByType.has(key)) recByType.set(key, rec);
    });

    // Build product name → image map
    const recByName = new Map<string, string>();
    recommendations.forEach((rec) => {
      if (rec.product && rec.imageUrl) {
        recByName.set(rec.product.toLowerCase().trim(), rec.imageUrl);
      }
    });

    // Read display storage (selected product display names per item key)
    let displayNames: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(getDisplayStorageKey(analysis.id));
      if (raw) displayNames = JSON.parse(raw) as Record<string, string>;
    } catch {
      displayNames = {};
    }

    const buildSlots = (steps: string[], period: "morning" | "night") => {
      const slots: ProductSlot[] = steps.slice(0, maxDisplay).map((step) => {
        const type = getStepType(step);
        const title = getStepTitle(step);
        const itemKey = `${period}::${title.toLowerCase()}`;

        // Try display name override first
        const displayName = displayNames[itemKey];

        // Get image from recommendation matching by type
        const rec = recByType.get(normalizeType(type));

        // If display name matches a recommendation product, use its image
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

    console.log("[RoutineCard] MORNING RAW:", morningSteps);
    console.log("[RoutineCard] NIGHT RAW:", nightSteps);
    console.log("[RoutineCard] Recommendations:", recommendations.map(r => ({ type: r.type, product: r.product })));

    const morningResult = buildSlots(morningSteps, "morning");
    const nightResult = buildSlots(nightSteps, "night");

    console.log("[RoutineCard] ✅ FINAL RESULT:", { 
      morningSlots: morningResult.slots.map(s => s.name),
      nightSlots: nightResult.slots.map(s => s.name),
      morningExtra: morningResult.extraCount,
      nightExtra: nightResult.extraCount,
    });

    return {
      morningSlots: morningResult.slots,
      nightSlots: nightResult.slots,
      morningExtra: morningResult.extraCount,
      nightExtra: nightResult.extraCount,
    };
  }, [analysis, isPremium]);

  const morningCount = analysis.routine?.morning?.length ?? 0;
  const nightCount = analysis.routine?.night?.length ?? 0;

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
            background: "rgba(255, 255, 255, 0.82)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Title row */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-foreground truncate">
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
              <div className="flex items-center gap-1 text-xs sm:text-xs font-bold text-primary">
                Ver
                <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Morning */}
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
                <Sun size={13} className="text-amber-500 shrink-0 sm:w-3.5 sm:h-3.5" />
                <span className="text-xs sm:text-xs font-extrabold text-foreground">Manhã:</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {morningCount} {morningCount === 1 ? "passo" : "passos"}
                </span>
              </div>
              <StackedSlots slots={morningSlots} extra={morningExtra} />
            </div>

            {/* Night */}
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
                <Moon size={13} className="text-indigo-500 shrink-0 sm:w-3.5 sm:h-3.5" />
                <span className="text-xs sm:text-xs font-extrabold text-foreground">Noite:</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {nightCount} {nightCount === 1 ? "passo" : "passos"}
                </span>
              </div>
              <StackedSlots slots={nightSlots} extra={nightExtra} />
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
};

const getSlotSize = () => {
  if (typeof window !== "undefined") {
    return window.innerWidth < 640 ? 44 : 60; // 44px on mobile, 60px on desktop
  }
  return 60;
};

const SLOT_SIZE_DESKTOP = 60;
const SLOT_SIZE_MOBILE = 44;
const OVERLAP_DESKTOP = Math.round(SLOT_SIZE_DESKTOP * 0.25); // 25% overlap
const OVERLAP_MOBILE = Math.round(SLOT_SIZE_MOBILE * 0.25);

// Stacked row: first slot fully visible, each next tucked behind with -OVERLAP margin
const StackedSlots = ({ slots, extra = 0 }: { slots: ProductSlot[]; extra?: number }) => {
  const items = slots.length > 0 ? slots : ([{}, {}, {}, {}] as ProductSlot[]);
  const total = items.length;
  
  return (
    <div
      className="relative inline-flex"
      style={{
        // Desktop
        "--slot-size": `${SLOT_SIZE_DESKTOP}px`,
        "--overlap": `${OVERLAP_DESKTOP}px`,
        "--width": `${SLOT_SIZE_DESKTOP + (total - 1) * (SLOT_SIZE_DESKTOP - OVERLAP_DESKTOP)}px`,
        // Mobile
        "--slot-size-mobile": `${SLOT_SIZE_MOBILE}px`,
        "--overlap-mobile": `${OVERLAP_MOBILE}px`,
        "--width-mobile": `${SLOT_SIZE_MOBILE + (total - 1) * (SLOT_SIZE_MOBILE - OVERLAP_MOBILE)}px`,
      } as React.CSSProperties & {
        "--slot-size": string;
        "--overlap": string;
        "--width": string;
        "--slot-size-mobile": string;
        "--overlap-mobile": string;
        "--width-mobile": string;
      }}
    >
      <div className="flex">
        {items.map((slot, i) => (
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
        {items.map((slot, i) => (
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
      </div>

      {extra > 0 && (
        <div className="absolute -bottom-0.5 -right-0.5 z-50 flex items-center justify-center rounded-full font-extrabold text-xs text-foreground bg-secondary shrink-0 sm:w-6 sm:h-6 w-5 h-5 sm:text-xs text-[10px]">
          +{extra}
        </div>
      )}
    </div>
  );
};

const ProductSlotCircle = ({ slot, index, size }: { slot: ProductSlot; index: number; size: "mobile" | "desktop" }) => {
  const isFirst = index === 0;
  const slotSize = size === "mobile" ? 44 : 60;

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

  return <EmptySlot muted={!isFirst} size={slotSize} />;
};

const EmptySlot = ({ muted = false, size = 72 }: { muted?: boolean; size?: number }) => (
  <div
    className="rounded-full shrink-0 border-2 border-white/70"
    style={{
      width: size,
      height: size,
      background: muted
        ? "rgba(240,240,245,0.75)"
        : "rgba(250,250,255,0.9)",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    }}
  />
);

export default RoutineSummaryCard;
