import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ScanFace, CalendarDays, Eye } from "lucide-react";
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

const SCORE_LABEL = (s: number) =>
  s >= 80 ? "Ótimo" : s >= 60 ? "Bom" : s >= 40 ? "Médio" : "Atenção";

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
  const [imgErrored, setImgErrored] = useState(false);

  const CONDITION_SCORE_KEY: Record<string, keyof NonNullable<AnalysisResponse["scores"]>> = {
    acne: "acne", olheiras: "olheiras", poros: "poros", manchas: "darkSpots",
    linhasFinas: "linhasFinas", vermelhidao: "vermelhidao",
    espinhasAtivas: "espinhasAtivas", cravos: "cravos",
  };

  const scores = latestAnalysis?.scores ?? {};
  const activeConditions = Object.entries(conditions ?? {})
    .filter(([k, v]) => {
      if (!v) return false;
      const scoreKey = CONDITION_SCORE_KEY[k];
      if (scoreKey) return (scores[scoreKey] ?? 0) > 0;
      return true;
    })
    .map(([k]) => CONDITION_LABELS[k] ?? k);

  const hasAnalysis = !!(skinType || overallScore || imageUrl);
  const hasPhoto = !!(imageUrl && !imgErrored);

  const formattedDate = analysisDate
    ? new Date(analysisDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const skinTypeLabel = skinType
    ? skinType.charAt(0).toUpperCase() + skinType.slice(1).toLowerCase()
    : "Pele";

  const score = overallScore ?? 0;
  const scoreColor = SCORE_COLOR(score);
  const GRAD = "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="lg-surface rounded-2xl overflow-hidden"
    >
      {!hasAnalysis ? (
        /* ── Empty state ── */
        <>
          <div style={{ position: "relative", height: 140, background: GRAD, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ position: "absolute", bottom: -30, right: 30, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "16px 20px" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Análise de Pele
              </p>
              <h2 style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>
                Nenhuma análise ainda
              </h2>
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Faça sua primeira análise para descobrir seu tipo de pele e receber cuidados personalizados.
            </p>
            <button
              onClick={() => navigate("/analyze")}
              className="w-full h-11 rounded-2xl coral-button font-bold text-sm flex items-center justify-center gap-2"
            >
              <ScanFace size={16} /> Fazer minha primeira análise
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Header: fundo borrado + círculo com foto nítida ── */}
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>

            {/* Camada 1: fundo — gradiente coral ou foto borrada */}
            {hasPhoto ? (
              <img
                src={imageUrl}
                alt="background"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: -10,
                  width: "calc(100% + 20px)",
                  height: "calc(100% + 20px)",
                  objectFit: "cover",
                  objectPosition: "center top",
                  filter: "blur(16px) saturate(0.65)",
                  transform: "scale(1.05)",
                }}
              />
            ) : (
              <div style={{ position: "absolute", inset: 0, background: GRAD }} />
            )}

            {/* Camada 2: overlay escuro para contraste do texto */}
            <div style={{
              position: "absolute", inset: 0,
              background: hasPhoto
                ? "rgba(0,0,0,0.42)"
                : "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 60%)",
            }} />

            {/* Camada 3: círculo centralizado com a foto nítida */}
            {hasPhoto && (
              <div style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -58%)",
                width: 96, height: 96,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.92)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.15)",
                flexShrink: 0,
              }}>
                <img
                  src={imageUrl}
                  alt={skinTypeLabel}
                  onError={() => setImgErrored(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            )}

            {/* Camada 4: gradiente bottom + texto */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 45%, transparent 65%)",
            }} />
            <div style={{ position: "absolute", bottom: 14, left: 18, right: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.78)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Análise de Pele
                </p>
                <h2 style={{ margin: "3px 0 0", fontSize: 21, fontWeight: 800, color: "white", letterSpacing: "-0.3px", textShadow: "0 1px 4px rgba(0,0,0,0.35)", lineHeight: 1.2 }}>
                  {skinTypeLabel}
                </h2>
              </div>
              {score > 0 && (
                <div style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 999,
                  background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.32)",
                  textAlign: "center",
                }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1 }}>{score}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {SCORE_LABEL(score)}
                  </p>
                </div>
              )}
            </div>

            {/* Camada 5: data + botão olho (topo-direito) */}
            <div style={{ position: "absolute", top: 12, right: 14, display: "flex", alignItems: "center", gap: 6 }}>
              {formattedDate && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 99,
                  background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)",
                }}>
                  <CalendarDays size={10} color="rgba(255,255,255,0.8)" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{formattedDate}</span>
                </div>
              )}
              {latestAnalysis && (
                <button
                  onClick={() => navigate("/results", { state: { analysis: latestAnalysis } })}
                  aria-label="Ver resultados"
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <Eye size={14} color="white" />
                </button>
              )}
            </div>
          </div>

          {/* ── Corpo ── */}
          <div className="px-5 pt-4 pb-5 space-y-4">
            {/* Condition chips */}
            {activeConditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeConditions.slice(0, 5).map((c) => (
                  <span
                    key={c}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(232,116,138,0.1)", color: "#E8748A", border: "1px solid rgba(232,116,138,0.2)" }}
                  >
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

            {/* Score bar */}
            {score > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: scoreColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor }}>
                  {score}/100
                </span>
              </div>
            )}

            {/* CTA — coral-button padrão do sistema */}
            <button
              onClick={() =>
                navigate(
                  isFullAccess ? "/routine" : "/analyze",
                  latestAnalysis && isFullAccess ? { state: { analysis: latestAnalysis } } : undefined
                )
              }
              className="w-full h-11 rounded-2xl coral-button font-bold text-sm flex items-center justify-center gap-2"
            >
              <ScanFace size={15} />
              {isFullAccess ? "Ver minha rotina" : "Nova análise"}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
