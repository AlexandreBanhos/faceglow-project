import { motion } from "framer-motion";
import { Sun, Moon, ChevronRight, Check, Flame, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type AnalysisResponse } from "@/lib/analysis";

interface DailyRoutineSectionProps {
  analysis: AnalysisResponse | null;
  isPremiumBlocked: boolean;
  currentPeriod: "morning" | "night";
  periodLabel: string;
  routineSummary: {
    total: number;
    pending: number;
    done: number;
    items: Array<{ title: string; done: boolean }>;
  };
  motivationText: string;
  isLoading: boolean;
  delay?: number;
}

// Gradientes personalizados por período
const PERIOD_GRADIENTS = {
  morning: "linear-gradient(135deg, #FFB347 0%, #FFD580 100%)",
  night: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
};

const COMPLETED_CARD_STYLES = {
  morning: {
    background: "linear-gradient(135deg, rgba(254, 243, 199, 0.86) 0%, rgba(253, 186, 116, 0.42) 100%)",
    backdropFilter: "blur(12px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -2px 4px rgba(180,110,20,0.08), 0 4px 16px rgba(180,110,20,0.08)",
  },
  night: {
    background: "linear-gradient(135deg, rgba(200, 240, 255, 0.4) 0%, rgba(220, 200, 255, 0.3) 100%)",
    backdropFilter: "blur(12px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.08)",
  },
};

const DailyRoutineSection = ({
  analysis,
  isPremiumBlocked,
  currentPeriod,
  periodLabel,
  routineSummary,
  motivationText,
  isLoading,
  delay = 0.45,
}: DailyRoutineSectionProps) => {
  const navigate = useNavigate();
  const periodGradient = PERIOD_GRADIENTS[currentPeriod];

  if (isPremiumBlocked) {
    return (
      // Premium Upsell Banner
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="px-6 mt-6 mb-6"
      >
        <div className="lg-surface-strong p-6 rounded-3xl relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral/30 to-pink/30 flex items-center justify-center flex-shrink-0">
              <Flame size={20} className="text-[#ef8fb8]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[var(--fg-ink)]">
                Desbloqueie sua análise completa
              </h2>
              <p className="text-sm text-[var(--fg-ink-3)] mt-1 leading-relaxed">
                Assine Premium para ver todos os produtos e sua rotina personalizada.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2.5">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              <span className="text-sm text-[var(--fg-ink)]">Todos os produtos recomendados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              <span className="text-sm text-[var(--fg-ink)]">Rotina personalizada (manhã e noite)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              <span className="text-sm text-[var(--fg-ink)]">Análise completa com detalhes</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate("/premium")}
            className="coral-button w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            Desbloquear Premium
          </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    // Normal Routine Display
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="px-6 mt-6"
    >
      <div className="lg-surface-strong rounded-3xl p-5 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{
            background:
              currentPeriod === "morning"
                ? "linear-gradient(180deg, rgba(254,243,199,0.58) 0%, rgba(255,255,255,0) 100%)"
                : "linear-gradient(180deg, rgba(220,200,255,0.42) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl"
          style={{
            background:
              currentPeriod === "morning"
                ? "rgba(253, 186, 116, 0.34)"
                : "rgba(196, 181, 253, 0.32)",
          }}
        />
        <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {currentPeriod === "morning" ? (
            <Sun size={20} className="text-[#ddb693]" />
          ) : (
            <Moon size={20} className="text-[#ef8fb8]" />
          )}
          <h2 className="text-lg font-bold text-[var(--fg-ink)]">
            Rotina da {periodLabel}
          </h2>
        </div>
        <button
          onClick={() => navigate("/routine", analysis ? { state: { analysis } } : undefined)}
          className="flex items-center gap-1 text-xs font-bold text-[var(--fg-ink-2)] hover:text-[var(--fg-ink)]"
        >
          Ver tudo
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="lg-surface p-4 mb-4 rounded-2xl">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-bold text-[var(--fg-ink)]">Resumo de hoje</p>
          <span className="text-xs font-bold text-[var(--fg-ink-2)]">
            {routineSummary.pending} pendentes
          </span>
        </div>
        <p className="text-xs text-[var(--fg-ink-3)]">{motivationText}</p>
      </div>

      <div className="space-y-2">
        {routineSummary.items.slice(0, 4).map((item, i) => (
          <motion.div
            key={`${item.title}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.05 + i * 0.08 }}
            className={`lg-surface p-4 rounded-2xl flex items-center gap-3 transition-all ${
              item.done ? "border border-white/45" : ""
            }`}
            style={item.done ? COMPLETED_CARD_STYLES[currentPeriod] : undefined}
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                item.done
                  ? "border-none"
                  : "border-[var(--glass-border)]"
              }`}
              style={item.done ? { background: periodGradient } : undefined}
            >
              {item.done && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6L5 9L10 3"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-bold ${
                  item.done ? "line-through text-[var(--fg-ink-3)]" : "text-[var(--fg-ink)]"
                }`}
              >
                {item.title}
              </p>
              <p className="text-xs text-[var(--fg-ink-3)]">
                {item.done ? "Concluído" : "Pendente"}
              </p>
            </div>

            {/* Indicator dot com gradiente do período */}
            {!item.done && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.05 + i * 0.08 + 0.1 }}
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: periodGradient }}
              />
            )}
          </motion.div>
        ))}
        {!isLoading && routineSummary.items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg-surface p-6 rounded-2xl flex flex-col items-center text-center gap-3"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FEF3C7, #FED7AA)" }}
            >
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--fg-ink)] mb-1">Sua rotina vai aparecer aqui</p>
              <p className="text-xs text-[var(--fg-ink-3)] leading-relaxed">
                Faça uma análise facial para receber uma rotina personalizada para o seu tipo de pele.
              </p>
            </div>
            <button
              onClick={() => navigate("/analyze")}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "var(--grad-coral)" }}
            >
              Fazer análise agora
            </button>
          </motion.div>
        )}
      </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyRoutineSection;
