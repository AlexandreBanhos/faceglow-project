import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, RefreshCw, TrendingUp, Trophy, Coins, Flame,
  ScanFace, ClipboardList, Pencil, Eye, CalendarDays,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVenus, faMars, faVenusMars, faMinus } from "@fortawesome/free-solid-svg-icons";
import type { AnalysisResponse } from "@/lib/analysis";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";

// ── Label maps — todos os valores do questionário ────────────────────────────

const AGE_LABELS: Record<string, string> = {
  under25: "Menos de 25 anos", "25to34": "25–34 anos",
  "35to44": "35–44 anos",  "45to60": "45–60 anos", over60: "Mais de 60",
};
const GENDER_LABELS: Record<string, string> = {
  female: "Feminino", male: "Masculino",
  nonbinary: "Não binário", prefer_not: "Prefiro não informar",
};
const SKIN_TONE_LABELS: Record<string, string> = {
  very_light: "Muito clara", light: "Clara",
  medium: "Média / Trigal", tan: "Morena", dark: "Negra / Escura",
};
const SKIN_TONE_COLORS: Record<string, string> = {
  very_light: "#FDDBB4", light: "#E8AC7E",
  medium: "#C17F4A", tan: "#8B5A2B", dark: "#3D1F0E",
};
const GENDER_ICONS = {
  female:     faVenus,
  male:       faMars,
  nonbinary:  faVenusMars,
  prefer_not: faMinus,
} as const;
const SKIN_TYPE_LABELS: Record<string, string> = {
  oleosa: "Oleosa", seca: "Seca", normal: "Normal", mista: "Mista",
};
const SENSITIVITY_LABELS: Record<string, string> = {
  sensitive: "Sensível", not_sensitive: "Não sensível", unsure: "Às vezes reage",
};
const CONCERN_LABELS: Record<string, string> = {
  rugas: "Rugas e linhas finas", acne: "Acne e espinhas", manchas: "Manchas",
  poros: "Poros visíveis", vermelhidao: "Vermelhidão", hidratacao: "Pele ressecada",
  textura: "Textura irregular", oleosidade: "Oleosidade excessiva", firmeza: "Firmeza",
  marcas_acne: "Marcas pós-acne", sensibilidade: "Sensibilidade",
  descobrir: "Quero descobrir com FaceGlow",
};
const BUDGET_LABELS: Record<string, string> = {
  super_low: "Super econômico", low: "Econômico",
  medium: "Intermediário", high: "Premium", premium: "Sem restrição",
};
const MAKEUP_LABELS: Record<string, string> = {
  daily: "Sim, diariamente", sometimes: "Sim, às vezes",
  rarely: "Raramente", never: "Não uso maquiagem",
};
const SUNSCREEN_LABELS: Record<string, string> = {
  always: "Sempre", sometimes: "Às vezes", rarely: "Raramente", never: "Nunca",
};
const CONDITION_LABELS: Record<string, string> = {
  acne: "Acne", olheiras: "Olheiras", poros: "Poros dilatados",
  manchas: "Manchas", labiosRessecados: "Lábios ressecados",
  linhasFinas: "Linhas finas", vermelhidao: "Vermelhidão",
  espinhasAtivas: "Espinhas ativas", cravos: "Cravos", ressecamento: "Ressecamento",
};
const SKIN_COND_LABELS: Record<string, string> = {
  rosacea: "Rosácea", dermatitis: "Dermatite", eczema: "Eczema",
  psoriasis: "Psoríase", atopic: "Pele atópica",
};
const HORMONAL_LABELS: Record<string, string> = {
  pregnancy: "Gravidez", breastfeed: "Amamentação",
  hormonal: "Desequilíbrio hormonal", menopause: "Menopausa", autoimmune: "Doença autoimune",
};
const ROUTINE_ITEM_LABELS: Record<string, string> = {
  cleanser: "Limpador facial", moisturizer: "Hidratante", toner: "Tônico",
  makeup_remover: "Removedor de maquiagem", serum: "Sérum",
  sunscreen: "Protetor solar", exfoliant: "Esfoliante",
};
const PREF_LABELS: Record<string, string> = {
  fragrance_free: "Sem fragrância", sulfate_free: "Sem sulfatos",
  alcohol_free: "Sem álcool", non_comedogenic: "Não comedogênico",
  paraben_free: "Livre de parabenos", eo_free: "Sem óleos essenciais",
};
const CERT_LABELS: Record<string, string> = {
  vegan: "Vegano", cruelty_free: "Livre de crueldade animal",
  clean_beauty: "Beleza limpa", organic: "Orgânico",
  derma_tested: "Testado dermatologicamente",
};
const INGREDIENT_LABELS: Record<string, string> = {
  retinol: "Retinol / Vitamina A", niacinamide: "Niacinamida",
  vitamin_c: "Vitamina C", salicylic: "Ácido salicílico (BHA)",
  aha: "Ácidos AHA", fragrance: "Fragrâncias",
  alcohol: "Álcool", sulfates: "Sulfatos",
};

function mapList(arr: string[], map: Record<string, string>) {
  return arr.filter(v => v !== "none").map(k => map[k] ?? k).filter(Boolean);
}

// ── Score helpers ─────────────────────────────────────────────────────────────

const SCORE_META = [
  { key: "acne",           label: "Acne",            inverted: true  },
  { key: "oiliness",       label: "Oleosidade",      inverted: true  },
  { key: "darkSpots",      label: "Manchas",         inverted: true  },
  { key: "poros",          label: "Poros",           inverted: true  },
  { key: "olheiras",       label: "Olheiras",        inverted: true  },
  { key: "linhasFinas",    label: "Linhas finas",    inverted: true  },
  { key: "vermelhidao",    label: "Vermelhidão",     inverted: true  },
  { key: "espinhasAtivas", label: "Espinhas ativas", inverted: true  },
  { key: "cravos",         label: "Cravos",          inverted: true  },
  { key: "sensitivity",    label: "Sensibilidade",   inverted: true  },
  { key: "hydration",      label: "Hidratação",      inverted: false },
] as const;

function pct(raw: number, inverted: boolean) {
  return inverted ? Math.max(0, (10 - raw) * 10) : raw * 10;
}
function scoreColor(p: number) {
  return p >= 70 ? "#81c1a7" : p >= 45 ? "#f59e0b" : "#ef4444";
}
function scoreLabel(p: number) {
  return p >= 80 ? "Ótimo" : p >= 60 ? "Bom" : p >= 40 ? "Médio" : "Atenção";
}

function ScoreBar({ label, raw, inverted }: { label: string; raw: number; inverted: boolean }) {
  const p = pct(raw, inverted);
  const color = scoreColor(p);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 12, color: "#6b5f7a" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{scoreLabel(p)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-start justify-between px-4 py-3.5 ${!last ? "border-b" : ""}`}
      style={{ borderColor: "rgba(180,160,200,0.2)" }}
    >
      <span style={{ fontSize: 12, color: "#8b7fa0", flexShrink: 0, paddingTop: 1, lineHeight: "16px" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#2d1f3d", textAlign: "right", marginLeft: 12, maxWidth: "65%", lineHeight: "16px" }}>
        {value}
      </span>
    </div>
  );
}

// ── Constantes visuais ────────────────────────────────────────────────────────

const BG  = "linear-gradient(160deg, #f4f2ff 0%, #ede8ff 28%, #f8f5ff 55%, #fff0f8 100%)";
const CARD = { background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 14px rgba(120,80,160,0.07)" };

// ── Modal ─────────────────────────────────────────────────────────────────────

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestAnalysis: AnalysisResponse | null;
  quizAnswers: LifestyleAnswers | null;
  onEdit: () => void;
  onOpenEdit?: () => void;
  onViewAnalysis: () => void;
  totalAnalyses: number;
  bestScore: number;
  activeProducts: number;
  streakDays: number;
}

export function UserProfileModal({
  isOpen, onClose, latestAnalysis, quizAnswers,
  onEdit, onOpenEdit, onViewAnalysis,
  totalAnalyses, bestScore, activeProducts, streakDays,
}: UserProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    if (!modal) return;
    const focusables = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables[0]?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); prev?.focus(); };
  }, [isOpen, onClose]);
  const scores      = latestAnalysis?.scores ?? {};
  const conditions  = latestAnalysis?.conditions ?? {};
  const overall     = latestAnalysis?.overallScore ?? 0;
  const skinType    = latestAnalysis?.skinType
    ? latestAnalysis.skinType.charAt(0).toUpperCase() + latestAnalysis.skinType.slice(1).toLowerCase()
    : null;
  const imageUrl    = latestAnalysis?.imageUrl;
  const analysisDate = latestAnalysis?.createdAtUtc
    ? new Date(latestAnalysis.createdAtUtc).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Só métricas relevantes — problema: raw > 1; hidratação: raw < 9
  const relevantScores = SCORE_META
    .filter(m => {
      const raw = (scores as Record<string, number | undefined>)[m.key];
      if (raw == null) return false;
      return m.inverted ? raw > 1 : raw > 0 && raw < 9;
    })
    .map(m => {
      const raw = (scores as Record<string, number>)[m.key];
      return { ...m, raw, severity: m.inverted ? raw : 10 - raw };
    })
    .sort((a, b) => b.severity - a.severity); // pior primeiro

  const activeConditions = Object.entries(conditions)
    .filter(([, v]) => v)
    .map(([k]) => CONDITION_LABELS[k] ?? k);

  // Questionário — valores completos em PT-BR
  const q = quizAnswers;

  // Identidade — sempre exibida (mesmo sem dados)
  const genderIcon = q?.gender ? GENDER_ICONS[q.gender as keyof typeof GENDER_ICONS] : null;
  const toneColor  = q?.skinTone ? SKIN_TONE_COLORS[q.skinTone] : null;
  const identityItems = [
    {
      label: "Idade",
      value: (q?.ageRange && AGE_LABELS[q.ageRange]) || "—",
      icon: <CalendarDays size={15} style={{ color: "#a855f7" }} />,
    },
    {
      label: "Gênero",
      value: (q?.gender && GENDER_LABELS[q.gender]) || "—",
      icon: genderIcon
        ? <FontAwesomeIcon icon={genderIcon} style={{ color: "#a855f7", fontSize: 15 }} />
        : <FontAwesomeIcon icon={faMinus} style={{ color: "#c4b5d4", fontSize: 15 }} />,
    },
    {
      label: "Tom de pele",
      value: (q?.skinTone && SKIN_TONE_LABELS[q.skinTone]) || "—",
      icon: toneColor
        ? <span style={{ display: "inline-block", width: 15, height: 15, borderRadius: "50%", background: toneColor, border: "1.5px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
        : <span style={{ display: "inline-block", width: 15, height: 15, borderRadius: "50%", background: "#ddd6fe", border: "1.5px solid rgba(0,0,0,0.08)" }} />,
    },
  ];

  const v = (val: string | undefined | null) => val && val.trim() ? val.trim() : null;
  const concerns = [q?.primaryConcern, ...(q?.secondaryConcerns ?? [])]
    .filter(s => s && s.trim()).map(k => CONCERN_LABELS[k!] ?? k!);

  const quizRows: { label: string; value: string }[] = [
    v(q?.selfReportedSkinType) && { label: "Tipo (declarado)",  value: SKIN_TYPE_LABELS[q!.selfReportedSkinType] ?? q!.selfReportedSkinType },
    v(q?.skinSensitivity)      && { label: "Sensibilidade",     value: SENSITIVITY_LABELS[q!.skinSensitivity] ?? q!.skinSensitivity },
    concerns.length > 0        && { label: "Preocupações",      value: concerns.join(" · ") },
    v(q?.budgetRange)          && { label: "Orçamento",         value: BUDGET_LABELS[q!.budgetRange] ?? q!.budgetRange },
    v(q?.makeupUsage)          && { label: "Maquiagem",         value: MAKEUP_LABELS[q!.makeupUsage] ?? q!.makeupUsage },
    v(q?.sunscreenUsage)       && { label: "Protetor solar",    value: SUNSCREEN_LABELS[q!.sunscreenUsage] ?? q!.sunscreenUsage },
    (() => {
      const items = mapList(q?.currentRoutineItems ?? [], ROUTINE_ITEM_LABELS);
      return items.length > 0 && { label: "Rotina atual", value: items.join(" · ") };
    })(),
    (() => {
      const conds = mapList(q?.skinConditions ?? [], SKIN_COND_LABELS);
      return conds.length > 0 && { label: "Condições de pele", value: conds.join(" · ") };
    })(),
    (() => {
      const hc = mapList(q?.hormonalConditions ?? [], HORMONAL_LABELS);
      return hc.length > 0 && { label: "Saúde hormonal", value: hc.join(" · ") };
    })(),
    (() => {
      const prefs = mapList(q?.productPreferences ?? [], PREF_LABELS);
      return prefs.length > 0 && { label: "Preferências", value: prefs.join(" · ") };
    })(),
    (() => {
      const certs = mapList(q?.certifications ?? [], CERT_LABELS);
      return certs.length > 0 && { label: "Selos", value: certs.join(" · ") };
    })(),
    (() => {
      const ing = mapList(q?.ingredientReactions ?? [], INGREDIENT_LABELS);
      return ing.length > 0 && { label: "Reações a ingredientes", value: ing.join(" · ") };
    })(),
  ].filter(Boolean) as { label: string; value: string }[];

  const statsItems = [
    { label: "Análises",  value: totalAnalyses  > 0 ? String(totalAnalyses)  : "0", Icon: TrendingUp, color: "#a855f7" },
    { label: "Score",     value: bestScore       > 0 ? String(bestScore)       : "—",  Icon: Trophy,     color: "#f59e0b" },
    { label: "Ativos",    value: activeProducts  > 0 ? String(activeProducts)  : "—",  Icon: Coins,      color: "#81c1a7" },
    { label: "Sequência", value: streakDays      > 0 ? `${streakDays}d`        : "—",  Icon: Flame,      color: "#f97316" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90]"
            style={{ background: "rgba(20,10,40,0.55)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl flex flex-col"
            style={{ background: BG, maxHeight: "92dvh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full" style={{ background: "rgba(120,80,160,0.18)" }} />
            </div>

            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-3.5 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(180,160,220,0.22)" }}>
              <h2 id="profile-modal-title" style={{ fontSize: 16, fontWeight: 800, color: "#2d1f3d" }}>Meu Perfil</h2>
              <button onClick={onClose}
                aria-label="Fechar perfil"
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{ background: "rgba(0,0,0,0.07)" }}>
                <X size={15} style={{ color: "#6b5f7a" }} />
              </button>
            </div>

            {/* Scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {statsItems.map(({ label, value, Icon, color }) => (
                  <div key={label} className="rounded-2xl p-3 flex flex-col items-center text-center" style={CARD}>
                    <Icon size={15} style={{ color, marginBottom: 5 }} />
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#2d1f3d", lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#8b7fa0", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* ── Análise de Pele ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ScanFace size={13} style={{ color: "#a855f7" }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#8b7fa0", textTransform: "uppercase", letterSpacing: "0.1em" }}>Análise de Pele</span>
                  </div>
                  {latestAnalysis && (
                    <button onClick={onViewAnalysis}
                      className="flex items-center gap-1 active:scale-95 transition-transform"
                      style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>
                      <Eye size={13} />
                      Ver completa
                    </button>
                  )}
                </div>

                {latestAnalysis ? (
                  <>
                    {/* Hero SkinCard */}
                    <div className="rounded-2xl overflow-hidden mb-3" style={CARD}>
                      <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
                        {imageUrl ? (
                          <img src={imageUrl} alt="" style={{ position: "absolute", inset: -8, width: "calc(100%+16px)", height: "calc(100%+16px)", objectFit: "cover", objectPosition: "center top", filter: "blur(14px) saturate(0.65)", transform: "scale(1.1)" }} />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)" }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.36)" }} />

                        {imageUrl && (
                          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -58%)", width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.92)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                            <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                          </div>
                        )}

                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 52%)" }} />
                        <div style={{ position: "absolute", bottom: 12, left: 16, right: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tipo de pele</p>
                            <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>{skinType ?? "—"}</p>
                          </div>
                          {overall > 0 && (
                            <div style={{ padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", textAlign: "center" }}>
                              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white" }}>{overall}</p>
                              <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>{scoreLabel(overall)}</p>
                            </div>
                          )}
                        </div>

                        {analysisDate && (
                          <div style={{ position: "absolute", top: 10, right: 12, padding: "3px 8px", borderRadius: 99, background: "rgba(0,0,0,0.28)" }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{analysisDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Score bars — só métricas relevantes */}
                      {relevantScores.length > 0 && (
                        <div style={{ padding: "14px 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                          {relevantScores.map(m => (
                            <ScoreBar key={m.key} label={m.label} raw={m.raw} inverted={m.inverted} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Condition chips */}
                    {activeConditions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {activeConditions.map(c => (
                          <span key={c} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "rgba(232,116,138,0.12)", color: "#E8748A", border: "1px solid rgba(232,116,138,0.25)" }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl p-6 flex flex-col items-center gap-2 text-center" style={CARD}>
                    <ScanFace size={28} style={{ color: "rgba(120,80,160,0.2)" }} />
                    <p style={{ fontSize: 13, color: "#8b7fa0" }}>Nenhuma análise realizada ainda.</p>
                  </div>
                )}
              </div>

              {/* ── Questionário ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={13} style={{ color: "#a855f7" }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#8b7fa0", textTransform: "uppercase", letterSpacing: "0.1em" }}>Questionário</span>
                  </div>
                  <button onClick={onOpenEdit ?? onEdit}
                    className="flex items-center gap-1 active:scale-95 transition-transform"
                    style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>
                    <Pencil size={12} />
                    Editar respostas
                  </button>
                </div>

                {/* Card de identidade — sempre visível */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {identityItems.map(({ label, value, icon }) => (
                    <div key={label} className="rounded-2xl p-3 flex flex-col items-center text-center gap-1" style={CARD}>
                      <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {icon}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#2d1f3d", lineHeight: "1.3" }}>
                        {value}
                      </p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#8b7fa0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {quizRows.length > 0 ? (
                  <div className="rounded-2xl overflow-hidden" style={CARD}>
                    {quizRows.map((row, i) => (
                      <InfoRow key={row.label} label={row.label} value={row.value} last={i === quizRows.length - 1} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center" style={CARD}>
                    <p style={{ fontSize: 13, color: "#8b7fa0" }}>Responda o questionário para ver os dados completos.</p>
                    <button onClick={onOpenEdit ?? onEdit}
                      className="px-4 py-2 rounded-xl active:scale-95 transition-transform"
                      style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.1)" }}>
                      Responder agora
                    </button>
                  </div>
                )}
              </div>

              <div style={{ height: 4 }} />
            </div>

            {/* Footer */}
            <div className="px-5 pt-3 pb-8 flex-shrink-0 space-y-2.5"
              style={{ borderTop: "1px solid rgba(180,160,220,0.22)", background: "rgba(255,255,255,0.65)", backdropFilter: "blur(16px)" }}>
              {latestAnalysis && (
                <button onClick={onViewAnalysis}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  style={{ background: "rgba(168,85,247,0.1)", color: "#7c3aed", border: "1px solid rgba(168,85,247,0.18)" }}>
                  <Eye size={15} />
                  Ver análise completa
                </button>
              )}
              <button onClick={onEdit}
                className="w-full py-3.5 rounded-2xl coral-button font-bold text-sm flex items-center justify-center gap-2 shadow-glow">
                <RefreshCw size={15} />
                Nova análise / Atualizar dados
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
