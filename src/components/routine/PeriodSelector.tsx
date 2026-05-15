import { motion } from "framer-motion";
import { Moon } from "lucide-react";

export type Period = "morning" | "night" | "both";

interface Props {
  value: Period;
  onChange: (p: Period) => void;
  /** Trava somente noite (retinol, ácidos) */
  locked?: boolean;
  lockedReason?: string;
  className?: string;
}

// ── Arte decorativa por período ───────────────────────────────────────────────

const SunArt = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full opacity-100 pointer-events-none" aria-hidden>
    {/* Halo externo */}
    <circle cx="32" cy="28" r="22"
      fill="none" stroke={active ? "rgba(255,255,255,0.15)" : "rgba(245,158,11,0.12)"} strokeWidth="8" />
    {/* Halo médio */}
    <circle cx="32" cy="28" r="15"
      fill={active ? "rgba(255,255,255,0.18)" : "rgba(251,191,36,0.18)"} />
    {/* Sol */}
    <circle cx="32" cy="28" r="9"
      fill={active ? "rgba(255,255,255,0.35)" : "rgba(251,191,36,0.5)"} />
    {/* Raios */}
    {[0,45,90,135,180,225,270,315].map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 32 + 13 * Math.cos(rad), y1 = 28 + 13 * Math.sin(rad);
      const x2 = 32 + 18 * Math.cos(rad), y2 = 28 + 18 * Math.sin(rad);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={active ? "rgba(255,255,255,0.4)" : "rgba(251,191,36,0.4)"} strokeWidth="2" strokeLinecap="round" />;
    })}
  </svg>
);

const NightArt = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full opacity-100 pointer-events-none" aria-hidden>
    {/* Lua crescente */}
    <path d="M38 18 A14 14 0 1 0 38 46 A10 10 0 1 1 38 18Z"
      fill={active ? "rgba(255,255,255,0.28)" : "rgba(99,102,241,0.3)"} />
    {/* Estrelas */}
    {[[50,14,1.5],[12,20,1],[52,40,1],[8,36,1.2],[44,52,1],[20,52,0.9]].map(([x,y,r],i) => (
      <circle key={i} cx={x} cy={y} r={r}
        fill={active ? "rgba(255,255,255,0.7)" : "rgba(99,102,241,0.5)"} />
    ))}
    {/* Brilho de estrela */}
    {[[50,14],[12,20]].map(([x,y],i) => (
      <g key={i}>
        <line x1={x} y1={y-3} x2={x} y2={y+3} stroke={active ? "rgba(255,255,255,0.5)" : "rgba(99,102,241,0.4)"} strokeWidth="0.8" />
        <line x1={x-3} y1={y} x2={x+3} y2={y} stroke={active ? "rgba(255,255,255,0.5)" : "rgba(99,102,241,0.4)"} strokeWidth="0.8" />
      </g>
    ))}
  </svg>
);

const BothArt = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 80 64" className="absolute inset-0 w-full h-full opacity-100 pointer-events-none" aria-hidden>
    {/* Sol lado esquerdo */}
    <circle cx="22" cy="32" r="10"
      fill={active ? "rgba(255,255,255,0.28)" : "rgba(251,191,36,0.35)"} />
    <circle cx="22" cy="32" r="6"
      fill={active ? "rgba(255,255,255,0.35)" : "rgba(251,191,36,0.55)"} />
    {[0,60,120,180,240,300].map((deg,i) => {
      const rad = (deg*Math.PI)/180;
      return <line key={i} x1={22+9*Math.cos(rad)} y1={32+9*Math.sin(rad)} x2={22+13*Math.cos(rad)} y2={32+13*Math.sin(rad)}
        stroke={active ? "rgba(255,255,255,0.35)" : "rgba(251,191,36,0.5)"} strokeWidth="1.5" strokeLinecap="round" />;
    })}
    {/* Divisor */}
    <line x1="40" y1="10" x2="40" y2="54"
      stroke={active ? "rgba(255,255,255,0.2)" : "rgba(200,200,200,0.3)"} strokeWidth="1" strokeDasharray="3 2" />
    {/* Lua lado direito */}
    <path d="M56 20 A12 12 0 1 0 56 44 A9 9 0 1 1 56 20Z"
      fill={active ? "rgba(255,255,255,0.28)" : "rgba(99,102,241,0.3)"} />
    {/* Estrelas lado direito */}
    {[[70,16,1.2],[67,48,1],[74,34,0.9]].map(([x,y,r],i) => (
      <circle key={i} cx={x} cy={y} r={r}
        fill={active ? "rgba(255,255,255,0.6)" : "rgba(99,102,241,0.45)"} />
    ))}
  </svg>
);

// ── Opções ────────────────────────────────────────────────────────────────────
const OPTIONS = [
  {
    value: "morning" as const,
    label: "Manhã",
    emoji: "☀️",
    gradientActive: "linear-gradient(135deg,#f59e0b 0%,#fb923c 100%)",
    bgInactive: "bg-amber-50 dark:bg-amber-950/30",
    borderActive: "border-amber-400/60",
    borderInactive: "border-amber-200/60 dark:border-amber-800/40",
    textActive: "text-white",
    textInactive: "text-amber-700 dark:text-amber-400",
    Art: SunArt,
  },
  {
    value: "both" as const,
    label: "Ambos",
    emoji: "✦",
    gradientActive: "linear-gradient(135deg,#f59e0b 0%,#a855f7 55%,#6366f1 100%)",
    bgInactive: "bg-violet-50 dark:bg-violet-950/20",
    borderActive: "border-violet-400/60",
    borderInactive: "border-violet-200/60 dark:border-violet-800/40",
    textActive: "text-white",
    textInactive: "text-violet-700 dark:text-violet-400",
    Art: BothArt,
  },
  {
    value: "night" as const,
    label: "Noite",
    emoji: "🌙",
    gradientActive: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
    bgInactive: "bg-indigo-50 dark:bg-indigo-950/30",
    borderActive: "border-indigo-500/60",
    borderInactive: "border-indigo-200/60 dark:border-indigo-800/40",
    textActive: "text-white",
    textInactive: "text-indigo-700 dark:text-indigo-400",
    Art: NightArt,
  },
] as const;

// ── Componente ────────────────────────────────────────────────────────────────
export const PeriodSelector = ({ value, onChange, locked, lockedReason, className = "" }: Props) => {
  if (locked) {
    return (
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Moon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Somente noite</p>
          {lockedReason && <p className="text-xs text-indigo-500 mt-0.5">{lockedReason}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {OPTIONS.map(({ value: opt, label, emoji, gradientActive, bgInactive, borderActive, borderInactive, textActive, textInactive, Art }) => {
        const isActive = value === opt;
        return (
          <motion.button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: isActive ? 1.02 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={`relative overflow-hidden rounded-2xl border-2 h-[72px] flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              isActive ? `${borderActive} shadow-md` : `${bgInactive} ${borderInactive} hover:border-opacity-80`
            }`}
            style={isActive ? { background: gradientActive, borderColor: "transparent" } : undefined}
          >
            {/* Arte de fundo */}
            <Art active={isActive} />

            {/* Conteúdo */}
            <span className="relative z-10 text-xl leading-none">{emoji}</span>
            <span className={`relative z-10 text-[11px] font-bold tracking-wide ${isActive ? textActive : textInactive}`}>
              {label}
            </span>

            {/* Glow ao redor quando ativo */}
            {isActive && (
              <motion.div
                layoutId="period-glow"
                className="absolute inset-0 rounded-2xl opacity-30"
                style={{ background: gradientActive, filter: "blur(8px)", transform: "scale(1.1)" }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
