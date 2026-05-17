import { motion } from "framer-motion";
import { ChevronRight, ScanFace, Zap, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AnalysisResponse } from "@/lib/analysis";

const CONDITION_LABELS: Record<string, string> = {
  acne: "Acne",
  olheiras: "Olheiras",
  poros: "Poros dilatados",
  manchas: "Manchas",
  labiosRessecados: "Lábios ressecados",
  linhasFinas: "Linhas finas",
  vermelhidao: "Vermelhidão",
  espinhasAtivas: "Espinhas ativas",
  cravos: "Cravos",
  ressecamento: "Ressecamento",
};

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";

interface SkinCardProps {
  skinType?: string;
  overallScore?: number;
  conditions?: Record<string, boolean>;
  imageUrl?: string;
  analysisDate?: string;
  latestAnalysis?: AnalysisResponse | null;
  isFullAccess: boolean;
}

export function SkinCard({
  skinType, overallScore, conditions, imageUrl, analysisDate, latestAnalysis, isFullAccess,
}: SkinCardProps) {
  const navigate = useNavigate();

  const activeConditions = Object.entries(conditions ?? {})
    .filter(([, v]) => v === true)
    .map(([k]) => CONDITION_LABELS[k] ?? k);

  const hasAnalysis = !!(skinType || overallScore || imageUrl);

  const formattedDate = analysisDate
    ? new Date(analysisDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const skinTypeLabel = skinType
    ? skinType.charAt(0).toUpperCase() + skinType.slice(1).toLowerCase()
    : null;

  const score = overallScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="lg-surface rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <ScanFace size={17} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">Análise de Pele</h2>
        </div>
        {formattedDate && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarDays size={11} />
            {formattedDate}
          </span>
        )}
      </div>

      {!hasAnalysis ? (
        /* Empty state */
        <div className="px-5 pb-5 flex flex-col items-center text-center gap-3 py-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScanFace size={26} className="text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhuma análise realizada ainda.</p>
          <button
            onClick={() => navigate("/analyze")}
            className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-glow active:scale-[0.97] transition-transform"
          >
            Fazer minha primeira análise
          </button>
        </div>
      ) : (
        <>
          {/* Analysis summary */}
          <div className="px-5 pb-4 flex items-center gap-4">
            {/* Photo */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Última análise"
                className="w-16 h-16 rounded-xl object-cover border border-border/40 flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <ScanFace size={26} className="text-white" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              {skinTypeLabel && (
                <p className="text-base font-extrabold text-foreground">{skinTypeLabel}</p>
              )}
              {score > 0 && (
                <p className="text-sm font-semibold mt-0.5" style={{ color: SCORE_COLOR(score) }}>
                  Score de saúde: {score}/100
                </p>
              )}
            </div>

            {/* Score ring */}
            {score > 0 && (
              <div className="flex-shrink-0">
                {(() => {
                  const R = 19;
                  const circ = 2 * Math.PI * R;
                  const color = SCORE_COLOR(score);
                  return (
                    <svg width="46" height="46" viewBox="0 0 46 46">
                      <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="4" />
                      <motion.circle
                        cx="23" cy="23" r={R}
                        fill="none" stroke={color} strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ * (1 - score / 100) }}
                        transition={{ duration: 1.1, ease: "easeOut", delay: 0.35 }}
                        transform="rotate(-90 23 23)"
                      />
                      <text x="23" y="23" textAnchor="middle" dominantBaseline="middle"
                        fontSize="9.5" fontWeight="800" fill={color}>
                        {score}
                      </text>
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Condition chips */}
          {activeConditions.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-1.5">
              {activeConditions.slice(0, 5).map((c) => (
                <span key={c} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {c}
                </span>
              ))}
              {activeConditions.length > 5 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  +{activeConditions.length - 5}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="px-5 pb-5">
            <button
              onClick={() =>
                navigate(
                  isFullAccess ? "/routine" : "/analyze",
                  latestAnalysis && isFullAccess ? { state: { analysis: latestAnalysis } } : undefined
                )
              }
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-primary/8 active:bg-primary/15 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-primary">
                <Zap size={14} />
                {isFullAccess ? "Ver minha rotina completa" : "Fazer nova análise"}
              </span>
              <ChevronRight size={14} className="text-primary" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
