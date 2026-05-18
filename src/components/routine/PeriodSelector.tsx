import { motion } from "framer-motion";
import { Sun, Moon, Sparkles } from "lucide-react";

export type Period = "morning" | "night" | "both";

interface Props {
  value: Period;
  onChange: (p: Period) => void;
  locked?: boolean;
  lockedReason?: string;
  /** "lg" = cards (padrão) | "sm" = pill compacto para cards de produto */
  size?: "lg" | "sm";
  className?: string;
}

// ── Paleta de cada período (gradientes claros, texto escuro) ──────────────────
const PERIODS = [
  {
    value: "morning" as const,
    Icon: Sun,
    iconColor: "#92400e",
    label: "Manhã",
    gradActive:  "linear-gradient(135deg,#fde68a 0%,#fdba74 100%)",
    bgInactive:  "bg-amber-50",
    borderActive:   "border-amber-300/70",
    borderInactive: "border-amber-200/60",
    textActive:   "text-amber-900",
    textInactive: "text-amber-600",
    pillActive: "linear-gradient(90deg,#fde68a 0%,#fbbf24 100%)",
    pillText:   "text-amber-900",
  },
  {
    value: "both" as const,
    Icon: Sparkles,
    iconColor: "#6d28d9",
    label: "Ambos",
    gradActive:  "linear-gradient(135deg,#fde68a 0%,#f9a8d4 45%,#c4b5fd 100%)",
    bgInactive:  "bg-violet-50",
    borderActive:   "border-violet-300/70",
    borderInactive: "border-violet-200/60",
    textActive:   "text-violet-900",
    textInactive: "text-violet-500",
    pillActive: "linear-gradient(90deg,#fbbf24 0%,#f472b6 50%,#a78bfa 100%)",
    pillText:   "text-violet-900",
  },
  {
    value: "night" as const,
    Icon: Moon,
    iconColor: "#3730a3",
    label: "Noite",
    gradActive:  "linear-gradient(135deg,#c7d2fe 0%,#ddd6fe 100%)",
    bgInactive:  "bg-indigo-50",
    borderActive:   "border-indigo-300/70",
    borderInactive: "border-indigo-200/60",
    textActive:   "text-indigo-900",
    textInactive: "text-indigo-500",
    pillActive: "linear-gradient(90deg,#a5b4fc 0%,#c4b5fd 100%)",
    pillText:   "text-indigo-900",
  },
] as const;

// ── Locked state ──────────────────────────────────────────────────────────────
const LockedNight = ({ reason }: { reason?: string }) => (
  <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-indigo-200 bg-indigo-50">
    <div className="w-9 h-9 rounded-xl bg-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm">
      <Moon size={18} className="text-white" />
    </div>
    <div>
      <p className="text-sm font-bold text-indigo-800">Somente noite</p>
      {reason && <p className="text-xs text-indigo-500 mt-0.5">{reason}</p>}
    </div>
  </div>
);

// ── Variante SM — pill horizontal animado ─────────────────────────────────────
const PeriodPill = ({ value, onChange }: { value: Period; onChange: (p: Period) => void }) => {
  const idx = PERIODS.findIndex((p) => p.value === value);
  return (
    <div className="relative flex rounded-2xl bg-muted/40 p-1 gap-0.5">
      {/* Indicador deslizante */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-xl shadow-sm"
        animate={{ left: `calc(${idx} * (100% - 8px) / 3 + 4px)` }}
        style={{
          width: "calc((100% - 8px) / 3)",
          background: PERIODS[idx].pillActive,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      />
      {PERIODS.map(({ value: opt, Icon, iconColor, label, pillText, textInactive }) => {
        const isActive = value === opt;
        return (
          <motion.button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            whileTap={{ scale: 0.96 }}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-10 z-10 rounded-xl transition-colors`}
          >
            <Icon size={13} style={{ color: isActive ? iconColor : undefined }} className={isActive ? "" : textInactive} />
            <span className={`text-[9px] font-bold tracking-wide transition-colors ${isActive ? pillText : textInactive}`}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

// ── Variante LG — cards animados ─────────────────────────────────────────────
const PeriodCards = ({ value, onChange }: { value: Period; onChange: (p: Period) => void }) => (
  <div className="grid grid-cols-3 gap-2">
    {PERIODS.map(({ value: opt, Icon, iconColor, label, gradActive, bgInactive, borderActive, borderInactive, textActive, textInactive }) => {
      const isActive = value === opt;
      return (
        <motion.button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          whileTap={{ scale: 0.95 }}
          animate={{ scale: isActive ? 1.03 : 1, y: isActive ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={`relative overflow-hidden rounded-2xl border-2 h-[72px] flex flex-col items-center justify-center gap-1.5 transition-colors ${
            isActive
              ? `${borderActive} shadow-lg`
              : `${bgInactive} ${borderInactive} hover:scale-[1.01]`
          }`}
          style={isActive ? { background: gradActive, borderColor: "transparent" } : undefined}
        >
          <Icon size={22} style={{ color: iconColor }} className="leading-none" />
          <span className={`text-[11px] font-bold tracking-wide ${isActive ? textActive : textInactive}`}>
            {label}
          </span>

          {isActive && (
            <motion.div
              className="absolute inset-[-4px] rounded-[18px] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ background: gradActive, filter: "blur(10px)", zIndex: -1 }}
            />
          )}
        </motion.button>
      );
    })}
  </div>
);

// ── Export principal ──────────────────────────────────────────────────────────
export const PeriodSelector = ({
  value, onChange,
  locked, lockedReason,
  size = "lg",
  className = "",
}: Props) => {
  if (locked) return <LockedNight reason={lockedReason} />;

  return (
    <div className={className}>
      {size === "sm"
        ? <PeriodPill value={value} onChange={onChange} />
        : <PeriodCards value={value} onChange={onChange} />
      }
    </div>
  );
};
