import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Ellipsis, BookOpen, AlertTriangle, Lock, Sparkles, CheckCircle2, Info, Check } from "lucide-react";
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

// ── Dados informativos por condição ─────────────────────────────────────────
const CONDITION_INFO: Record<string, { cause: string; tip: string; ingredient: string }> = {
  "Acne":            { cause: "Produção excessiva de sebo, bactérias e células mortas obstruindo os poros.", tip: "Limpeza suave 2x/dia e uso de protetor solar oil-free são fundamentais.", ingredient: "Ácido salicílico (BHA) e niacinamida" },
  "Oleosidade":      { cause: "Hiperprodução das glândulas sebáceas, que pode ser agravada por calor, estresse e hormônios.", tip: "Evite produtos com álcool — eles estimulam ainda mais a produção de sebo.", ingredient: "Niacinamida e ácido azelaico" },
  "Manchas":         { cause: "Hiperpigmentação causada por sol, inflamação ou alterações hormonais.", tip: "Protetor solar diário é o item mais importante no controle de manchas.", ingredient: "Vitamina C, niacinamida e ácido kójico" },
  "Sensibilidade":   { cause: "Barreira cutânea comprometida que reage a produtos, temperatura e estresse.", tip: "Prefira fórmulas sem fragrância e introduza ativos novos um por vez.", ingredient: "Centella asiatica e alantoína" },
  "Hidratação":      { cause: "Falta de água na camada córnea, que pode deixar a pele seca, opaca e propensa a rugas.", tip: "Use hidratante logo após o banho para selar a umidade enquanto a pele ainda está úmida.", ingredient: "Ácido hialurônico e ceramidas" },
  "Poros dilatados": { cause: "Acúmulo de sebo e queratina que aumenta visivelmente os poros, especialmente na zona T.", tip: "Esfoliação química semanal ajuda a desobstruir os poros sem irritar a pele.", ingredient: "BHA (ácido salicílico) e retinol" },
  "Olheiras":        { cause: "Vasos sanguíneos visíveis, perda de volume ou hiperpigmentação sob os olhos.", tip: "Compressa fria pela manhã reduz inchaço; use protetor solar ao redor dos olhos.", ingredient: "Cafeína, vitamina K e retinol" },
  "Linhas finas":    { cause: "Perda de colágeno e elastina acelerada por sol, tabaco, estresse e envelhecimento.", tip: "Protetor solar diário é a medida preventiva mais eficaz contra linhas finas.", ingredient: "Retinol, peptídeos e vitamina C" },
  "Vermelhidão":     { cause: "Vasos dilatados, rosacea ou sensibilidade — inflamação na superfície da pele.", tip: "Produtos com cores neutras e fórmulas antiinflamatórias ajudam a reduzir o vermelho.", ingredient: "Centella asiatica, azuleno e aloé vera" },
  "Espinhas ativas": { cause: "Poros obstruídos com bactérias causando inflamação aguda na pele.", tip: "Não esprema — aumenta cicatrizes. Use tratamento pontual com ácido salicílico.", ingredient: "Ácido salicílico, peróxido de benzoíla" },
  "Cravos":          { cause: "Queratina e sebo oxidados obstruindo os poros (cravos pretos) ou fechados (brancos).", tip: "Esfoliação química regular com BHA mantém os poros limpos.", ingredient: "BHA (ácido salicílico) e retinol" },
  "Ressecamento":    { cause: "Barreira cutânea comprometida que não retém umidade suficiente, causando sensação de repuxamento.", tip: "Aplique hidratante imediatamente após o banho, ainda com a pele levemente úmida para selar a umidade.", ingredient: "Ácido hialurônico, ceramidas e ureia" },
};

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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
  const [activeTab, setActiveTab] = useState<"tipo" | "melhoria" | "fortes">("melhoria");

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
      if (mountedRef.current) setRoutineState("idle");
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

  // Only show condition tags where score is > 0 to avoid discrepancy with improvement bars
  const activeConditions = detectedConditions.filter((item) => {
    const scoreKey = item.key === "olheiras" ? "olheiras"
      : item.key === "poros" ? "poros"
      : item.key === "manchas" ? "darkSpots"
      : item.key === "linhas_finas" ? "linhasFinas"
      : item.key === "vermelhidao" ? "vermelhidao"
      : item.key === "espinhas_ativas" ? "espinhasAtivas"
      : item.key === "cravos" ? "cravos"
      : null;
    const score = scoreKey ? (analysis.scores as Record<string, number | undefined>)[scoreKey] : undefined;
    return Boolean(item.active) && (score === undefined || (score ?? 0) > 0);
  });
  const skinTypeLabel = analysis.skinType.trim().toLowerCase() === "mista"
    ? "PELE MISTA"
    : analysis.skinType.trim().charAt(0).toUpperCase() + analysis.skinType.trim().slice(1).toLowerCase();
  const skinRoutineTips = getSkinTypeTips(analysis.skinType);
  const activeTips = getConditionTips(activeConditions);

  // ── S2: barras de melhoria — todos os itens, incluindo 0% ────────────────
  const isAProblem = (score: number | undefined, cond: boolean | undefined) =>
    (score ?? 0) > 0 || Boolean(cond);

  // Hidratação é métrica positiva (quanto maior, melhor a pele).
  // Ressecamento é o problema — aparece quando hydration < 4 ou conditions.ressecamento = true.
  const hydration = analysis.scores.hydration ?? 0;
  const ressecamentoValue = hydration > 0
    ? Math.round(Math.max(0, Math.min(10, (4 - hydration))) * 10)
    : 0;

  const allImprovementMetrics = [
    { label: "Acne",            value: Math.round((analysis.scores.acne          ?? 0) * 10), cond: analysis.conditions?.acne },
    { label: "Oleosidade",      value: Math.round((analysis.scores.oiliness      ?? 0) * 10), cond: false },
    { label: "Manchas",         value: Math.round((analysis.scores.darkSpots     ?? 0) * 10), cond: analysis.conditions?.manchas },
    { label: "Sensibilidade",   value: Math.round((analysis.scores.sensitivity   ?? 0) * 10), cond: false },
    { label: "Ressecamento",    value: ressecamentoValue,                                      cond: analysis.conditions?.ressecamento },
    { label: "Poros dilatados", value: Math.round((analysis.scores.poros         ?? 0) * 10), cond: analysis.conditions?.poros },
    { label: "Olheiras",        value: Math.round((analysis.scores.olheiras      ?? 0) * 10), cond: analysis.conditions?.olheiras },
    { label: "Linhas finas",    value: Math.round((analysis.scores.linhasFinas   ?? 0) * 10), cond: analysis.conditions?.linhasFinas },
    { label: "Vermelhidão",     value: Math.round((analysis.scores.vermelhidao   ?? 0) * 10), cond: analysis.conditions?.vermelhidao },
    { label: "Espinhas ativas", value: Math.round((analysis.scores.espinhasAtivas ?? 0) * 10), cond: analysis.conditions?.espinhasAtivas },
    { label: "Cravos",          value: Math.round((analysis.scores.cravos        ?? 0) * 10), cond: analysis.conditions?.cravos },
  ].sort((a, b) => b.value - a.value);

  // Problemas reais (score > 0 ou condição detectada) — em ordem decrescente
  const improvementMetrics = allImprovementMetrics.filter((m) => isAProblem(m.value / 10, m.cond));
  // Itens "não identificados" (score = 0 e sem condição) — aparecem no final
  const okMetrics = allImprovementMetrics.filter((m) => !isAProblem(m.value / 10, m.cond));
  // Resumo coerente com os scores exibidos (nunca usa texto bruto da IA que pode contradizer)
  const insight = (() => {
    if (improvementMetrics.length === 0) {
      return `Sua pele está em ótimo estado — nenhuma condição problemática foi identificada. Continue com a rotina atual e aplique protetor solar diariamente.`;
    }
    const top = improvementMetrics[0];
    const others = improvementMetrics.slice(1, 3).map(m => m.label.toLowerCase());
    let text = `A análise identificou ${top.label.toLowerCase()} como principal preocupação`;
    if (others.length === 1) text += ` e ${others[0]}`;
    else if (others.length > 1) text += `, ${others[0]} e ${others[1]}`;
    text += `. `;
    if (okMetrics.length > 0) {
      text += `${okMetrics.length} condição${okMetrics.length > 1 ? "s estão" : " está"} dentro do esperado. `;
    }
    const info = CONDITION_INFO[top.label];
    if (info) text += info.tip;
    return text;
  })();

  // Top issue (maior percentual) para card informativo
  const topIssue = improvementMetrics[0] ?? null;

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
  // Hidratação alta (>= 6) é um ponto forte
  if ((analysis.scores.hydration ?? 0) >= 6)
    extraStrengths.push({ icon: "💧", title: "Boa hidratação", description: "Sua pele mantém ótimos níveis de hidratação — isso protege a barreira cutânea." });
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
        <FGScoreOrb score={analysis.overallScore} size={220} variant="default" />
        <div className="mt-5 flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-full gradient-primary text-primary-foreground text-sm font-bold shadow-glow">
            {skinTypeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-medium">
          {confidence}% de confiança na análise
        </p>

        {/* Anos aparentes — barra de progresso */}
        {skinAge > 0 && (() => {
          // Escala 18–42: quanto mais jovem o aparente, melhor (barra mais cheia)
          const ageProgress = Math.round(Math.max(0, Math.min(100, ((42 - skinAge) / (42 - 18)) * 100)));
          const ageColor = ageProgress >= 70 ? "#81c1a7" : ageProgress >= 45 ? "#f5d9a0" : "#f5a8b8";
          return (
            <div className="mt-5 w-full">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Idade aparente da pele
                </span>
                <span className="text-sm font-extrabold" style={{ color: ageColor }}>
                  {skinAge} anos
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: ageColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${ageProgress}%` }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {ageProgress >= 70 ? "Abaixo da sua idade — ótimo sinal!" : ageProgress >= 45 ? "Dentro da média esperada" : "Cuidados extras podem ajudar"}
              </p>
            </div>
          );
        })()}

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

      {/* ── Tabs ── */}
      <div className="mb-5">
        <div className="flex gap-1 p-1 rounded-2xl mb-5"
          style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.7)" }}>
          {([
            { id: "tipo",     label: "Tipo de pele" },
            { id: "melhoria", label: "Melhorias" },
            { id: "fortes",   label: "Pontos fortes" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all"
              style={activeTab === tab.id ? {
                background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
                color: "white",
                boxShadow: "0 4px 12px rgba(232,116,138,0.3)",
              } : {
                color: "var(--fg-ink-3)",
                background: "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Tipo de pele */}
        {activeTab === "tipo" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-0 mb-5">
              <SkinTypeInfoSection
                currentSkinType={analysis.skinType}
                showAllTypes={false}
                delay={0}
                onReopenPhoto={() => setShowFloatingCard(true)}
              />
            </div>

            {/* S7: Cuidados para sua pele */}
            <div className="mb-5">
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
                    <div
                      key={step.step}
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* S6: Resumo da análise */}
            {insight && (
              <div className="rounded-2xl overflow-hidden mb-5"
                style={{
                  background: "linear-gradient(135deg, var(--glass-bg-strong) 0%, rgba(239,143,184,0.08) 100%)",
                  backdropFilter: "blur(24px) saturate(1.8)",
                  WebkitBackdropFilter: "blur(24px) saturate(1.8)",
                  border: "1px solid rgba(239,143,184,0.3)",
                  boxShadow: "0 4px 20px -6px rgba(239,143,184,0.2)",
                }}
              >
                <div style={{ height: "2px", background: "var(--grad-coral)" }} />
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--grad-coral)", boxShadow: "0 3px 10px -2px rgba(220,100,140,0.4)" }}>
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-primary">Resumo da análise</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Pontos de Melhoria */}
        {activeTab === "melhoria" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* S1: Hero — data, resumo, chips */}
            <div className="rounded-2xl overflow-hidden mb-5"
              style={{
                background: "var(--glass-bg-strong)",
                backdropFilter: "blur(28px) saturate(1.8)",
                WebkitBackdropFilter: "blur(28px) saturate(1.8)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
              }}
            >
              <div style={{ height: "3px", background: "var(--grad-coral)" }} />
              <div className="p-5">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-primary border border-primary/20 bg-primary/5 px-3 py-1 rounded-full">
                    {new Date(analysis.createdAtUtc).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
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
                        style={{ background: "#fdf0f4", color: "#c07090", border: "1px solid #f5c0d0" }}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* S2: Pontos de Melhoria */}
            <div className="mb-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #f5c0a0, #f5a8b8)", boxShadow: "0 4px 12px -2px rgba(245,168,184,0.4)" }}>
                  <FontAwesomeIcon icon={faMicroscope} className="text-white text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground leading-tight">Pontos de Melhoria</h3>
                  <p className="text-xs text-muted-foreground">Baseado na análise da sua pele</p>
                </div>
              </div>

              {/* Card informativo do problema mais severo */}
              {topIssue && topIssue.value > 0 && CONDITION_INFO[topIssue.label] && (
                <div className="mb-3 rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(245,192,160,0.08) 0%, rgba(245,168,184,0.06) 100%)",
                    border: "1px solid rgba(245,192,160,0.3)",
                  }}>
                  <div style={{ height: "3px", background: "linear-gradient(90deg, #f5c0a0, #f5a8b8)" }} />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #f5c0a0, #f5a8b8)" }}>
                        <Info size={13} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#c09070" }}>Maior preocupação detectada</p>
                        <p className="text-sm font-extrabold text-foreground">{topIssue.label} — {topIssue.value}%</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                      <p><strong className="text-foreground">Causa:</strong> {CONDITION_INFO[topIssue.label].cause}</p>
                      <p><strong className="text-foreground">Dica:</strong> {CONDITION_INFO[topIssue.label].tip}</p>
                      <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: "1px solid rgba(245,192,160,0.4)" }}>
                        <span className="font-bold" style={{ color: "#c09070" }}>Ativos indicados:</span>
                        <span>{CONDITION_INFO[topIssue.label].ingredient}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {improvementMetrics.length > 0 ? (
                <div className="space-y-2.5">
                  {improvementMetrics.map((m, i) => (
                    <ImprovementBar key={m.label} label={m.label} value={m.value} delay={i * 0.05} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(129,193,167,0.15)", border: "1px solid rgba(129,193,167,0.4)" }}>
                  <CheckCircle2 size={28} style={{ color: "#81c1a7", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#2d6b52", margin: "0 0 4px" }}>Nenhuma condição crítica encontrada</p>
                  <p style={{ fontSize: 12, color: "#3d8a65", margin: 0 }}>Sua pele está em ótimo estado!</p>
                </div>
              )}
            </div>

            {/* Pontos para não se preocupar */}
            {okMetrics.length > 0 && (
              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #81c1a7, #7dcfc9)", boxShadow: "0 4px 12px -2px rgba(129,193,167,0.4)" }}>
                    <CheckCircle2 size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-foreground leading-tight">Pontos para não se preocupar</h3>
                    <p className="text-xs text-muted-foreground">Condições não identificadas na sua pele</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(129,193,167,0.15), rgba(144,210,205,0.22))", border: "1px solid rgba(129,193,167,0.45)" }}>
                  <div className="flex flex-wrap gap-2">
                    {okMetrics.map((m) => (
                      <span key={m.label} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ background: "rgba(129,193,167,0.35)", color: "#2d6b52", border: "1px solid rgba(129,193,167,0.6)" }}>
                        <Check size={10} strokeWidth={3} />
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* S3: Análise por Região */}
            {uniqueRegionPoints.length > 0 && (
              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #c8baf0, #b8c4f5)", boxShadow: "0 4px 12px -2px rgba(184,196,245,0.4)" }}>
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
              </div>
            )}

            {/* S8: O que observar */}
            {activeTips.length > 0 && (
              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f5c0a0, #f5d9a0)", boxShadow: "0 4px 12px -2px rgba(245,192,160,0.4)" }}>
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-white text-sm" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-foreground leading-tight">O que observar</h3>
                    <p className="text-xs text-muted-foreground">Dicas para as condições detectadas</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {activeTips.map(({ label, tip }) => (
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
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #f5c0a0, #f5d9a0)" }}>
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-white text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground mb-1">{label}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Pontos Fortes */}
        {activeTab === "fortes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {/* S4: Pontos Fortes */}
            {skinStrengths.length > 0 && (
              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #81c1a7, #81c1a7)", boxShadow: "0 4px 12px -2px rgba(129,193,167,0.4)" }}>
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
              </div>
            )}

            {/* S5: removido — itens não identificados já aparecem na aba Melhorias com tag "Não identificado" */}
          </motion.div>
        )}
      </div>

      {/* ── CTA Rotina ── */}
      {routineState === "loading" ? (
        <div className="lg-surface p-5 rounded-2xl space-y-3 animate-pulse mb-5">
          <div className="h-4 w-40 rounded-full bg-muted-foreground/20" />
          <div className="h-12 rounded-2xl bg-muted-foreground/10" />
        </div>
      ) : isPremiumBlocked ? (
        /* Free: rotina simples disponível para todos */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.02 }}
          className="space-y-3 mb-5"
        >
          <button
            onClick={() => navigate("/routine", { state: { analysis, simpleMode: true } })}
            className="w-full py-4 rounded-[999px] flex items-center justify-center gap-2 font-extrabold text-base text-white"
            style={{ background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)", boxShadow: "0 6px 22px rgba(232,116,138,0.35)", border: "none", cursor: "pointer" }}
          >
            <Sparkles size={18} /> Ver Minha Rotina
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Rotina personalizada para o seu tipo de pele
          </p>
        </motion.div>
      ) : (() => {
        const isLatest = !analysis?.id || getCachedLatestAnalysis()?.id === analysis.id;
        return isLatest ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.02 }}
            onClick={handleLoadRoutine}
            className="w-full py-5 rounded-[999px] flex items-center justify-center gap-2 font-extrabold text-base text-white mb-5"
            style={{ background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)", boxShadow: "0 6px 22px rgba(232,116,138,0.38)", border: "none", cursor: "pointer" }}
          >
            <Sparkles size={18} /> Ver Rotina Personalizada
          </motion.button>
        ) : (
          <div className="space-y-2 mb-5">
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
            className="fixed inset-0 flex items-end justify-center px-4 pb-6"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", overflowY: "auto", zIndex: 9999 }}
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
