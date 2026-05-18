import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Ellipsis, BookOpen, AlertTriangle, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faDroplet, faSprayCan, faMicroscope, faMapLocation, faStar, faShieldHalved, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FloatingAnalysisCard } from "@/components/FloatingAnalysisCard";
import { PremiumUnlockModal } from "@/components/PremiumUnlockModal";
import SkinTypeInfoSection from "@/components/SkinTypeInfoSection";
import { normalizeAnalysis } from "@/lib/analysis";
import { ImprovementBar } from "@/components/results/ImprovementBar";
import { RegionCard } from "@/components/results/RegionCard";
import { StrengthCard } from "@/components/results/StrengthCard";
import { getSkinTypeInsights, type SkinInsight } from "@/data/skinTypeInsights";
import { getSkinTypeTips, getConditionTips } from "@/data/skinRoutineTips";
import { getCachedLatestAnalysis, setCachedLatestAnalysis } from "@/lib/analysisClient";
import { fetchBillingStatus } from "@/lib/billing";
import { getAccessToken } from "@/lib/auth";
import { apiRoutes, apiBaseUrl } from "@/lib/api";
import { AuroraBackdrop, FGScoreOrb } from "@/components/shared";

type LandmarkPoint = { x: number; y: number };

const DEFAULT_LANDMARK_POINTS: LandmarkPoint[] = [
  { x: 20, y: 34 },
  { x: 50, y: 28 },
  { x: 80, y: 34 },
  { x: 34, y: 56 },
  { x: 66, y: 56 },
  { x: 50, y: 74 },
  { x: 28, y: 95 },
  { x: 50, y: 104 },
  { x: 72, y: 95 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseStoredAnalysis = () => {
  const raw = localStorage.getItem("faceglow-last-analysis");
  if (!raw) {
    return null;
  }

  try {
    return normalizeAnalysis(JSON.parse(raw));
  } catch {
    return null;
  }
};

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysis, setAnalysis] = useState(() => {
    const stateAnalysis = normalizeAnalysis((location.state as { analysis?: unknown } | null)?.analysis);
    return stateAnalysis ?? parseStoredAnalysis();
  });
  const [landmarkPoints, setLandmarkPoints] = useState<LandmarkPoint[]>(DEFAULT_LANDMARK_POINTS);
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [routineState, setRoutineState] = useState<"idle" | "loading" | "done">("idle");
  const [showFloatingCard, setShowFloatingCard] = useState(true);
  const [isPremiumBlocked, setIsPremiumBlocked] = useState(true);
  const [showRoutineModal, setShowRoutineModal] = useState(false);

  useEffect(() => {
    fetchBillingStatus({ forceRefresh: true })
      .then((s) => {
        setHasPlan(s.isActive);
        setIsPremiumBlocked(!s.isActive || s.planKey !== "monthly");
      })
      .catch((err) => {
        console.error("[Results] Failed to load billing status:", err);
        // Sem assinatura (404) ou erro de rede: manter bloqueado por segurança
        setHasPlan(false);
        setIsPremiumBlocked(true);
      });
  }, []);

  // Ensure latest analysis is always cached (so Routine page can access it without Dashboard visit)
  useEffect(() => {
    if (analysis) {
      setCachedLatestAnalysis(analysis);
      localStorage.setItem("faceglow-last-analysis", JSON.stringify(analysis));
    }
  }, [analysis]);

  useEffect(() => {
    if (analysis?.hasRecommendations && analysis.recommendations.length > 0) {
      setRoutineState("done");
    }
  }, [analysis]);

  /**
   * Aguarda a conclusão da rotina chamando o endpoint de criação de forma assíncrona
   */
  const waitForRoutineCompletion = async (analysisId: string, token: string, maxWaitMs = 60000) => {
    const startTime = Date.now();
    const pollIntervalMs = 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const statusResponse = await fetch(`${apiBaseUrl}${apiRoutes.analysis}/${analysisId}/status`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        if (!statusResponse.ok) {
          console.warn(`[Results] Status check failed: HTTP ${statusResponse.status}`);
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
          continue;
        }

        const statusData = await statusResponse.json();
        
        // Verifica se a rotina foi criada completamente
        if (statusData.status === "completed" && statusData.result?.routine?.morning?.length > 0) {
          return statusData.result;
        }

        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Falha ao gerar rotina");
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        console.warn("[Results] Error polling routine status:", error);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    }

    throw new Error("Timeout aguardando criação da rotina (60s)");
  };

  const handleLoadRoutine = async () => {
    if (routineState === "loading") return;
    if (isPremiumBlocked) return;
    setRoutineState("loading");
    
    try {
      // Garantir que a análise sempre será passada
      const analysisToPass = analysis || parseStoredAnalysis() || getCachedLatestAnalysis();
      if (!analysisToPass?.id) {
        console.error("[Results] Nenhuma análise disponível para rotina");
        setRoutineState("idle");
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        console.error("[Results] Sem token para buscar análise completa");
        setRoutineState("idle");
        return;
      }

      // 1️⃣ Check if routine steps already exist for this analysis
      const stepsCheck = await fetch(`${apiBaseUrl}/analysis/${analysisToPass.id}/steps`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (stepsCheck.ok) {
        const existingSteps = await stepsCheck.json() as unknown[];
        if (existingSteps.length > 0) {
          // Routine already exists — navigate directly without regenerating
          navigate("/routine", { state: { analysis: analysisToPass } });
          return;
        }
      }

      // 2️⃣ No existing routine — generate one (only for this analysis's profile)
      const createResponse = await fetch(`${apiBaseUrl}${apiRoutes.analysis}/${analysisToPass.id}/routine`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (createResponse.status === 202 || createResponse.status === 200) {
        let updatedAnalysis: unknown;
        try {
          updatedAnalysis = await waitForRoutineCompletion(analysisToPass.id, token);
        } catch (pollError) {
          console.warn("[Results] Timeout ou erro no polling, usando análise do cache:", pollError);
          const getResponse = await fetch(`${apiBaseUrl}${apiRoutes.analysis}/${analysisToPass.id}`, {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (getResponse.ok) {
            updatedAnalysis = await getResponse.json();
          } else {
            updatedAnalysis = analysisToPass;
          }
        }

        const fullAnalysis = normalizeAnalysis(updatedAnalysis);
        if (!fullAnalysis) throw new Error("Falha ao normalizar análise completa");

        navigate("/routine", { state: { analysis: fullAnalysis } });
      } else {
        throw new Error(`Falha ao criar rotina: HTTP ${createResponse.status}`);
      }
    } catch (error) {
      console.error("[Results] Erro ao criar rotina:", error);
      // Fallback: navegue mesmo assim com a análise que tem
      const analysisToPass = analysis || parseStoredAnalysis() || getCachedLatestAnalysis();
      if (analysisToPass) {
        console.warn("[Results] Navegando para rotina com fallback (análise sem routine criada)");
        navigate("/routine", { state: { analysis: analysisToPass } });
      }
    } finally {
      setRoutineState("idle");
    }
  };

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background px-6 pt-4 pb-8 flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-2xl glass flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="text-xl font-extrabold text-foreground">Resultados</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-base font-bold text-foreground">Nenhuma análise encontrada</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Faça uma nova análise para carregar os resultados reais da API.
          </p>
          <button
            onClick={() => navigate("/analyze")}
            className="px-5 py-3 rounded-2xl coral-button font-semibold"
          >
            Ir para Análise
          </button>
        </div>
      </div>
    );
  }

  const confidence = Math.min(98, Math.max(70, Math.round(70 + analysis.overallScore * 0.28)));
  const skinAge = Math.max(18, Math.round(36 - analysis.overallScore / 5));
  const allMetricOptions: Array<{ label: string; value: number }> = [
    { label: "Acne", value: analysis.scores.acne ?? 0 },
    { label: "Oleosidade", value: analysis.scores.oiliness ?? 0 },
    { label: "Manchas", value: analysis.scores.darkSpots ?? 0 },
    { label: "Sensibilidade", value: analysis.scores.sensitivity ?? 0 },
    { label: "Hidratação", value: analysis.scores.hydration ?? 0 },
    ...(analysis.scores.poros ? [{ label: "Poros", value: analysis.scores.poros }] : []),
    ...(analysis.scores.olheiras ? [{ label: "Olheiras", value: analysis.scores.olheiras }] : []),
    ...(analysis.scores.linhasFinas ? [{ label: "Linhas finas", value: analysis.scores.linhasFinas }] : []),
    ...(analysis.scores.vermelhidao ? [{ label: "Vermelhidão", value: analysis.scores.vermelhidao }] : []),
    ...(analysis.scores.espinhasAtivas ? [{ label: "Espinhas ativas", value: analysis.scores.espinhasAtivas }] : []),
    ...(analysis.scores.cravos ? [{ label: "Cravos", value: analysis.scores.cravos }] : []),
  ].filter((m) => m.value > 0);
  const metricCards = [...allMetricOptions]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((m) => ({ label: m.label, value: Math.min(100, Math.round(m.value * 10)) }));
  const scanMetricCards = [
    { label: "Umidade", value: analysis.scores.hydration },
    { label: "Acne", value: analysis.scores.acne },
    { label: "Rugas", value: analysis.scores.linhasFinas },
    { label: "Oleosidade", value: analysis.scores.oiliness },
    { label: "Sensibilidade", value: analysis.scores.sensitivity },
  ]
    .filter((m) => m.value !== undefined && m.value !== null && m.value !== 0)
    .map((m) => ({ label: m.label, value: Math.min(100, Math.round((m.value ?? 0) * 10)) }));

  const detectedConditions = [
    { key: "acne", label: "Acne", active: analysis.conditions?.acne },
    { key: "olheiras", label: "Olheiras", active: analysis.conditions?.olheiras },
    { key: "poros", label: "Poros dilatados", active: analysis.conditions?.poros },
    { key: "manchas", label: "Manchas", active: analysis.conditions?.manchas },
    { key: "labios", label: "Lábios ressecados", active: analysis.conditions?.labiosRessecados },
    { key: "linhas_finas", label: "Linhas finas", active: analysis.conditions?.linhasFinas },
    { key: "vermelhidao", label: "Vermelhidão", active: analysis.conditions?.vermelhidao },
    { key: "espinhas_ativas", label: "Espinhas ativas", active: analysis.conditions?.espinhasAtivas },
    { key: "cravos", label: "Cravos", active: analysis.conditions?.cravos },
    { key: "ressecamento", label: "Ressecamento", active: analysis.conditions?.ressecamento },
  ];

  const activeConditions = detectedConditions.filter((item) => Boolean(item.active));
  const skinTypeLabel = analysis.skinType.trim().toLowerCase() === "mista"
    ? "PELE MISTA"
    : analysis.skinType.trim().charAt(0).toUpperCase() + analysis.skinType.trim().slice(1).toLowerCase();
  const skinRoutineTips = getSkinTypeTips(analysis.skinType);
  const activeTips = getConditionTips(activeConditions);

  // Gerar insight dinamicamente baseado nos scores reais (não no summary do backend que pode estar desatualizado)
  const generateInsight = () => {
    const issuesList: string[] = [];
    
    if (analysis.scores.olheiras && analysis.scores.olheiras > 0) issuesList.push("olheiras");
    if (analysis.scores.poros && analysis.scores.poros > 0) issuesList.push("poros visíveis");
    if (analysis.scores.oiliness && analysis.scores.oiliness > 0) issuesList.push("oleosidade");
    if (analysis.scores.acne && analysis.scores.acne > 0) issuesList.push("acne");
    if (analysis.scores.darkSpots && analysis.scores.darkSpots > 0) issuesList.push("manchas");
    if (analysis.scores.linhasFinas && analysis.scores.linhasFinas > 0) issuesList.push("linhas finas");
    if (analysis.scores.hydration && analysis.scores.hydration < 3) issuesList.push("ressecamento");
    if (analysis.scores.sensitivity && analysis.scores.sensitivity > 5) issuesList.push("sensibilidade");
    if (analysis.scores.vermelhidao && analysis.scores.vermelhidao > 0) issuesList.push("vermelhidão");
    
    if (issuesList.length === 0) {
      return "A pele apresenta um perfil saudável. Mantenha uma rotina consistente para manter os resultados.";
    }
    
    // Construir frase baseada nos problemas detectados
    const zone = analysis.scores.oiliness > 5 ? " na zona T" : "";
    const issuesStr = issuesList.join(", ");
    return `A pele apresenta ${issuesStr}${zone}. Recomenda-se uma rotina personalizada para estes problemas.`;
  };

  const insight = generateInsight();

  // ── S2: barras de melhoria — fonte de verdade única ─────────────────────
  // "É problema" = score > 0 OU condição booleana detectada pela IA.
  // Usamos a união dos dois para evitar divergências entre score e conditions.
  const isAProblem = (score: number | undefined, cond: boolean | undefined) =>
    (score ?? 0) > 0 || Boolean(cond);

  const improvementMetrics = [
    { label: "Acne",           value: Math.round((analysis.scores.acne         ?? 0) * 10), icon: "😤", cond: analysis.conditions?.acne },
    { label: "Oleosidade",     value: Math.round((analysis.scores.oiliness     ?? 0) * 10), icon: "✨", cond: false },
    { label: "Manchas",        value: Math.round((analysis.scores.darkSpots    ?? 0) * 10), icon: "🔶", cond: analysis.conditions?.manchas },
    { label: "Sensibilidade",  value: Math.round((analysis.scores.sensitivity  ?? 0) * 10), icon: "🌡️", cond: false },
    { label: "Poros",          value: Math.round((analysis.scores.poros        ?? 0) * 10), icon: "🔍", cond: analysis.conditions?.poros },
    { label: "Olheiras",       value: Math.round((analysis.scores.olheiras     ?? 0) * 10), icon: "👁️", cond: analysis.conditions?.olheiras },
    { label: "Linhas finas",   value: Math.round((analysis.scores.linhasFinas  ?? 0) * 10), icon: "⏳", cond: analysis.conditions?.linhasFinas },
    { label: "Vermelhidão",    value: Math.round((analysis.scores.vermelhidao  ?? 0) * 10), icon: "🔴", cond: analysis.conditions?.vermelhidao },
    { label: "Espinhas ativas",value: Math.round((analysis.scores.espinhasAtivas ?? 0) * 10), icon: "🔴", cond: analysis.conditions?.espinhasAtivas },
    { label: "Cravos",         value: Math.round((analysis.scores.cravos       ?? 0) * 10), icon: "⚫", cond: analysis.conditions?.cravos },
  ].filter((m) => isAProblem(m.value / 10, m.cond)).sort((a, b) => b.value - a.value);

  // Labels dos problemas confirmados — usados para garantir exclusão em S5
  const problemLabelSet = new Set(improvementMetrics.map((m) => m.label.toLowerCase()));

  // ── S3: pontos faciais únicos por fator, só com severidade real ──────────
  const uniqueRegionPoints = analysis.facialPoints
    ? Object.values(
        analysis.facialPoints.detectedPoints
          .filter((pt) => pt.severity > 0)
          .reduce<Record<string, (typeof analysis.facialPoints.detectedPoints)[0]>>(
            (acc, pt) => {
              const k = pt.factor.toLowerCase().trim();
              if (!acc[k] || pt.severity > acc[k].severity) acc[k] = pt;
              return acc;
            }, {}
          )
      ).sort((a, b) => b.severity - a.severity).slice(0, 5)
    : [];

  // ── S4: pontos fortes ────────────────────────────────────────────────────
  const baseInsights = getSkinTypeInsights(analysis.skinType);
  const extraStrengths: SkinInsight[] = [];
  if ((analysis.scores.hydration ?? 0) < 3)
    extraStrengths.push({ icon: "💧", title: "Boa hidratação natural", description: "Sua pele mantém bons níveis de umidade sem precisar de muitos produtos." });
  if (!isAProblem(analysis.scores.acne, analysis.conditions?.acne))
    extraStrengths.push({ icon: "🌸", title: "Livre de acne", description: "Nenhum foco de acne ativa foi identificado na análise." });
  const skinStrengths = [...extraStrengths, ...baseInsights].slice(0, 4);

  // ── S5: não identificados — garante exclusão de tudo que é "problema" ────
  // Um item só aparece aqui se NÃO é problema (nem por score, nem por condition).
  const ALL_CHECKS = [
    { label: "Acne",           score: analysis.scores.acne,       cond: analysis.conditions?.acne },
    { label: "Manchas",        score: analysis.scores.darkSpots,  cond: analysis.conditions?.manchas },
    { label: "Poros dilatados",score: analysis.scores.poros,      cond: analysis.conditions?.poros },
    { label: "Olheiras",       score: analysis.scores.olheiras,   cond: analysis.conditions?.olheiras },
    { label: "Linhas finas",   score: analysis.scores.linhasFinas,cond: analysis.conditions?.linhasFinas },
    { label: "Vermelhidão",    score: analysis.scores.vermelhidao,cond: analysis.conditions?.vermelhidao },
    { label: "Cravos",         score: analysis.scores.cravos,     cond: analysis.conditions?.cravos },
    { label: "Ressecamento",   score: undefined,                  cond: analysis.conditions?.ressecamento },
  ];
  const okConditions = ALL_CHECKS
    .filter((c) => !isAProblem(c.score, c.cond) && !problemLabelSet.has(c.label.toLowerCase()))
    .map((c) => c.label);

  // ── S6: comentário da IA ─────────────────────────────────────────────────
  const aiCommentary = analysis.summary?.trim() || analysis.additionalRecommendations?.trim() || null;

  return (
    <div className="relative w-full min-h-screen px-6 pt-4 pb-8 overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10 mx-auto w-full max-w-md">
      <AnimatePresence>
        {showFloatingCard && (
          <FloatingAnalysisCard
            imageUrl={analysis.imageUrl}
            onClose={() => setShowFloatingCard(false)}
            isOpen={showFloatingCard}
            landmarkPoints={landmarkPoints}
            metricCards={scanMetricCards}
            facialPoints={analysis.facialPoints}
            skinAge={skinAge}
            confidence={confidence}
            skinType={skinTypeLabel}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-4 grid grid-cols-[40px_1fr_40px] items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 rounded-2xl liquiglass-button flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="mx-auto rounded-full border border-border/70 bg-background/75 px-4 py-2 text-xs font-bold text-foreground backdrop-blur-xl">
          Sua análise concluída
        </div>
        <button className="w-10 h-10 rounded-2xl liquiglass-button flex items-center justify-center">
          <Ellipsis size={16} className="text-foreground" />
        </button>
      </div>

      {/* Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg-surface-strong p-6 flex flex-col items-center mb-8 rounded-[2rem]"
      >
        <FGScoreOrb score={analysis.overallScore} size={280} variant="default" />
        <div className="mt-5 flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-full gradient-primary text-primary-foreground text-sm font-bold shadow-glow">
            {skinTypeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-medium">
          {confidence}% de confiança na análise
        </p>

        {/* Mini metric donuts — top 3 scores */}
        {metricCards.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-4 w-full">
            {metricCards.map((m, i) => {
              const R = 18; const circ = 2 * Math.PI * R;
              const hue = m.value > 70 ? "#EF4444" : m.value > 40 ? "#F59E0B" : "#22C55E";
              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 260, damping: 20 }}
                  className="flex flex-col items-center gap-1"
                >
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="4"/>
                    <motion.circle
                      cx="22" cy="22" r={R}
                      fill="none" stroke={hue} strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - m.value / 100) }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.5 + i * 0.12 }}
                      transform="rotate(-90 22 22)"
                    />
                    <text x="22" y="22" textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fontWeight="800" fill={hue}>
                      {m.value}
                    </text>
                  </svg>
                  <p className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">
                    {m.label}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Low confidence warning */}
      {confidence < 70 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-warm-orange/10 border border-warm-orange/20 mb-5"
        >
          <AlertTriangle size={18} className="text-warm-orange flex-shrink-0" />
          <p className="text-xs font-semibold text-foreground">
            Confiança baixa. Por favor, revise os resultados e ajuste se necessário.
          </p>
        </motion.div>
      )}

      {/* Skin Type Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-0 mb-8"
      >
        <SkinTypeInfoSection 
          currentSkinType={analysis.skinType} 
          showAllTypes={false} 
          delay={0.35}
          onReopenPhoto={() => setShowFloatingCard(true)}
        />
      </motion.div>

      {/* ── ANÁLISE — VISÍVEL PARA TODOS OS USUÁRIOS ── */}

      {/* ── S1: Hero — data, resumo, chips ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl overflow-hidden mb-5"
        style={{
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(28px) saturate(1.8)",
          WebkitBackdropFilter: "blur(28px) saturate(1.8)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        {/* Gradient top accent */}
        <div style={{ height: "3px", background: "var(--grad-coral)" }} />
        <div className="p-5">
          <div className="mb-3">
            <span className="text-xs font-semibold text-primary border border-primary/20 bg-primary/5 px-3 py-1 rounded-full">
              📅 {new Date(analysis.createdAtUtc).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              {" às "}
              {new Date(analysis.createdAtUtc).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-base font-bold text-foreground mb-0.5">
            {skinTypeLabel} · {skinAge} anos aparentes
          </p>
          <p className={`text-sm text-muted-foreground ${activeConditions.length > 0 ? "mb-3" : ""}`}>
            {analysis.scores.sensitivity >= 7 ? "Alta Sensibilidade · " : analysis.scores.sensitivity >= 4 ? "Sensibilidade Moderada · " : ""}
            Score geral: {analysis.overallScore}/100
          </p>
          {activeConditions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeConditions.map((c) => (
                <span key={c.key} className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", color: "#e11d48", border: "1px solid #fecdd3" }}>
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── S2: Pontos de Melhoria ── */}
      {improvementMetrics.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="mb-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ef4444)", boxShadow: "0 4px 12px -2px rgba(239,68,68,0.38)" }}>
              <FontAwesomeIcon icon={faMicroscope} className="text-white text-sm" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground leading-tight">Pontos de Melhoria</h3>
              <p className="text-xs text-muted-foreground">Baseado na análise da sua pele</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {improvementMetrics.map((m, i) => (
              <ImprovementBar key={m.label} label={m.label} value={m.value} icon={m.icon} delay={0.48 + i * 0.07} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── S3: Análise por Região ── */}
      {uniqueRegionPoints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }} className="mb-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", boxShadow: "0 4px 12px -2px rgba(99,102,241,0.38)" }}>
              <FontAwesomeIcon icon={faMapLocation} className="text-white text-sm" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground leading-tight">Análise por Região</h3>
              <p className="text-xs text-muted-foreground">Regiões com condições identificadas</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {uniqueRegionPoints.map((pt, i) => (
              <RegionCard key={`${pt.factor}-${i}`} point={pt} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── S4: Pontos Fortes — carrossel horizontal ── */}
      {skinStrengths.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63 }} className="mb-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 12px -2px rgba(16,185,129,0.38)" }}>
              <FontAwesomeIcon icon={faStar} className="text-white text-sm" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground leading-tight">Pontos Fortes da Pele</h3>
              <p className="text-xs text-muted-foreground">Aspectos positivos identificados</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: "4px" }}>
            {skinStrengths.map((s, i) => (
              <div key={i} style={{ scrollSnapAlign: "start", flexShrink: 0, width: "calc(50% - 5px)" }}>
                <StrengthCard insight={s} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── S5: Não Identificados ── */}
      {okConditions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.70 }}
          className="lg-surface p-5 rounded-2xl mb-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 12px -2px rgba(16,185,129,0.35)" }}>
              <FontAwesomeIcon icon={faShieldHalved} className="text-white text-sm" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground leading-tight">Não Identificados</h3>
              <p className="text-xs text-muted-foreground">Condições não detectadas na análise</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {okConditions.map((label) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200/60">
                <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-green-800">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── S6: Assistente IA ── */}
      {aiCommentary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.76 }}
          className="rounded-2xl overflow-hidden mb-5"
          style={{
            background: "linear-gradient(135deg, var(--glass-bg-strong) 0%, rgba(239,143,184,0.08) 100%)",
            backdropFilter: "blur(24px) saturate(1.8)",
            WebkitBackdropFilter: "blur(24px) saturate(1.8)",
            border: "1px solid rgba(239,143,184,0.3)",
            boxShadow: "0 4px 20px -6px rgba(239,143,184,0.2)",
          }}
        >
          <div style={{ height: "2px", background: "var(--grad-coral-soft, var(--grad-coral))" }} />
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--grad-coral)", boxShadow: "0 3px 10px -2px rgba(220,100,140,0.4)" }}>
                <span className="text-sm">✨</span>
              </div>
              <span className="text-sm font-bold text-primary">Assistente IA</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{aiCommentary}</p>
          </div>
        </motion.div>
      )}

      {/* ── S7: Cuidados para sua pele — orientação por tipo ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82 }} className="mb-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--grad-coral)", boxShadow: "0 4px 12px -2px rgba(220,100,140,0.38)" }}>
            <FontAwesomeIcon icon={faDroplet} className="text-white text-sm" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground leading-tight">Cuidados para sua pele</h3>
            <p className="text-xs text-muted-foreground">{skinRoutineTips.description}</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {skinRoutineTips.routine.map((step, i) => {
            const faIcon = step.step === "Limpeza" ? faSprayCan : step.step === "Hidratação" ? faDroplet : faSun;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.86 + i * 0.06 }}
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 2px 12px -4px rgba(60,30,50,0.1)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--grad-coral)", boxShadow: "0 4px 14px -2px rgba(220,100,140,0.45)" }}
                >
                  <FontAwesomeIcon icon={faIcon} className="text-white text-base" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">{step.step}</p>
                  <p className="text-sm font-semibold text-foreground mb-1">{step.guidance}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── S8: O que observar — dicas por condição detectada ── */}
      {activeTips.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.96 }} className="mb-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #f59e0b)", boxShadow: "0 4px 12px -2px rgba(249,115,22,0.38)" }}>
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-white text-sm" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground leading-tight">O que observar</h3>
              <p className="text-xs text-muted-foreground">Dicas para as condições detectadas</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {activeTips.map(({ label, icon, tip }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 2px 12px -4px rgba(60,30,50,0.1)",
                }}
              >
                <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── CTA Rotina ── */}
      {routineState === "loading" ? (
        <div className="lg-surface p-5 rounded-2xl space-y-3 animate-pulse mb-5">
          <div className="h-4 w-40 rounded-full bg-muted-foreground/20" />
          <div className="h-12 rounded-2xl bg-muted-foreground/10" />
        </div>
      ) : isPremiumBlocked ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.02 }}
          onClick={() => setShowRoutineModal(true)}
          className="w-full py-5 rounded-[999px] flex items-center justify-center gap-2 font-extrabold text-base text-white mb-5"
          style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", boxShadow: "0 6px 22px rgba(99,102,241,0.35)" }}
        >
          <Lock size={18} /> Desbloquear Rotina Personalizada
        </motion.button>
      ) : (() => {
        const isLatest = !analysis?.id || getCachedLatestAnalysis()?.id === analysis.id;
        return isLatest ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.02 }}
            onClick={handleLoadRoutine}
            className="w-full py-5 rounded-[999px] flex items-center justify-center gap-2 font-extrabold text-base text-white mb-5"
            style={{ background: "linear-gradient(135deg, #f97316 0%, #f472b6 100%)", boxShadow: "0 6px 22px rgba(249,115,22,0.38)" }}
          >
            <Sparkles size={18} /> Ver Rotina Personalizada
          </motion.button>
        ) : (
          <div className="space-y-2 mb-5">
            <button disabled className="liquiglass-button w-full py-4 rounded-2xl text-muted-foreground font-semibold text-sm cursor-not-allowed opacity-60">
              Ver Rotina (análise anterior)
            </button>
            <p className="text-center text-xs text-muted-foreground">A rotina reflete sempre a análise mais recente</p>
            <button onClick={() => navigate("/routine")} className="liquiglass-button w-full py-3 rounded-2xl text-foreground font-semibold text-sm flex items-center justify-center gap-2">
              <BookOpen size={16} /> Ver rotina atual
            </button>
          </div>
        );
      })()}

      {/* Footer */}
      <div className="pb-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="liquiglass-button w-full py-4 rounded-2xl text-foreground font-semibold text-base"
        >
          Voltar ao Início
        </button>
      </div>

      {/* Modal premium — rotina bloqueada */}
      <AnimatePresence>
        {showRoutineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", overflowY: "auto" }}
            onClick={() => setShowRoutineModal(false)}
          >
            <PremiumUnlockModal isVisible={true} onClose={() => setShowRoutineModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default Results;
