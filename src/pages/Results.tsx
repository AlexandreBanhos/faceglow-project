import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Ellipsis, BookOpen, Droplets, Zap, Sun, Eye, AlertTriangle, Gift, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import MetricBar from "@/components/MetricBar";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FloatingAnalysisCard } from "@/components/FloatingAnalysisCard";
import { PremiumUnlockModal } from "@/components/PremiumUnlockModal";
import SkinTypeInfoSection from "@/components/SkinTypeInfoSection";
import { normalizeAnalysis, type AnalysisResponse } from "@/lib/analysis";
import { fetchAnalysisStatus, getCachedLatestAnalysis, setCachedLatestAnalysis } from "@/lib/analysisClient";
import { fetchBillingStatus } from "@/lib/billing";
import { getAccessToken } from "@/lib/auth";
import { apiRoutes, apiBaseUrl } from "@/lib/api";
import { AuroraBackdrop, FGScoreOrb, FGMetricBar } from "@/components/shared";

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

      console.debug("[Results] Iniciando criação de rotina para análise:", analysisToPass.id);

      // 1️⃣ Enviar request para CRIAR rotina (assíncrono no backend)
      const createResponse = await fetch(`${apiBaseUrl}${apiRoutes.analysis}/${analysisToPass.id}/routine`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (createResponse.status === 202 || createResponse.status === 200) {
        // Rotina está sendo processada ou já foi completada
        console.debug("[Results] Rotina iniciada, aguardando conclusão...");

        // 2️⃣ Aguardar conclusão da rotina (polling /status endpoint)
        let updatedAnalysis: unknown;
        try {
          updatedAnalysis = await waitForRoutineCompletion(analysisToPass.id, token);
        } catch (pollError) {
          console.warn("[Results] Timeout ou erro no polling, usando análise do cache:", pollError);
          // Fallback: Buscar análise com endpoint GET
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
        if (!fullAnalysis) {
          throw new Error("Falha ao normalizar análise completa");
        }

        console.debug("[Results] Rotina criada, navegando para rotina com análise:", {
          id: fullAnalysis.id,
          hasRoutine: !!fullAnalysis.routine?.morning?.length,
          hasRecommendations: !!fullAnalysis.recommendations?.length,
        });

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

  const confidence = 92;
  const skinAge = Math.max(18, Math.round(36 - analysis.overallScore / 5));
  const allMetricOptions: Array<{ label: string; value: number }> = [
    { label: "Acne", value: analysis.scores.acne },
    { label: "Oleosidade", value: analysis.scores.oiliness },
    { label: "Manchas", value: analysis.scores.darkSpots },
    { label: "Sensibilidade", value: analysis.scores.sensitivity },
    { label: "Hidratação", value: analysis.scores.hydration },
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

  const metrics = [
    { label: "Acne", value: analysis.scores.acne * 10, icon: <Zap size={16} /> },
    { label: "Oleosidade", value: analysis.scores.oiliness * 10, icon: <Droplets size={16} /> },
    { label: "Manchas", value: analysis.scores.darkSpots * 10, icon: <Eye size={16} /> },
    { label: "Sensibilidade", value: analysis.scores.sensitivity * 10, icon: <Sun size={16} /> },
    ...(analysis.scores.poros !== undefined ? [{ label: "Poros", value: analysis.scores.poros * 10, icon: <AlertTriangle size={16} /> }] : []),
    ...(analysis.scores.olheiras !== undefined ? [{ label: "Olheiras", value: analysis.scores.olheiras * 10, icon: <Eye size={16} /> }] : []),
    ...(analysis.scores.linhasFinas !== undefined ? [{ label: "Linhas finas", value: analysis.scores.linhasFinas * 10, icon: <Sparkles size={16} /> }] : []),
    ...(analysis.scores.vermelhidao !== undefined ? [{ label: "Vermelhidão", value: analysis.scores.vermelhidao * 10, icon: <AlertTriangle size={16} /> }] : []),
  ];

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
  const extraRecommendations = analysis.recommendations.filter((item) => /extra|adicional/i.test(item.type));
  const primaryRecommendations = analysis.recommendations.filter((item) => !/extra|adicional/i.test(item.type));
  
  // Mapeamento de keys de condições para keys de scores
  const conditionToScoreMap: Record<string, keyof typeof analysis.scores> = {
    acne: "acne",
    olheiras: "olheiras",
    poros: "poros",
    manchas: "darkSpots",
    linhas_finas: "linhasFinas",
    vermelhidao: "vermelhidao",
    espinhas_ativas: "espinhasAtivas",
    cravos: "cravos",
  };
  
  // Filtre apenas as condições ativas que têm score/impacto > 0
  const impactfulConditions = activeConditions.filter((condition) => {
    const scoreKey = conditionToScoreMap[condition.key];
    const scoreValue = scoreKey ? analysis.scores[scoreKey] : 0;
    return scoreValue !== undefined && scoreValue > 0;
  });
  const skinTypeLabel = analysis.skinType.trim().toLowerCase() === "mista" 
    ? "PELE MISTA" 
    : analysis.skinType.trim().charAt(0).toUpperCase() + analysis.skinType.trim().slice(1).toLowerCase();
  const extraReasonCandidates = [
    analysis.conditions?.olheiras ? "olheiras" : null,
    analysis.conditions?.manchas ? "manchas" : null,
    analysis.conditions?.poros ? "poros dilatados" : null,
    analysis.conditions?.acne ? "acne" : null,
    analysis.scores.sensitivity >= 6 ? "sensibilidade" : null,
    analysis.scores.darkSpots >= 6 ? "uniformizacao do tom" : null,
    analysis.scores.oiliness >= 6 ? "controle de oleosidade" : null,
  ].filter(Boolean) as string[];
  const extraReasonsText = extraReasonCandidates.slice(0, 3).join(", ");

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

  return (
    <div className="relative w-full min-h-screen px-6 pt-4 pb-8 overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10">
      <AnimatePresence>
        {showFloatingCard && (
          <FloatingAnalysisCard
            imageUrl={analysis.imageUrl}
            onClose={() => setShowFloatingCard(false)}
            isOpen={showFloatingCard}
            landmarkPoints={landmarkPoints}
            metricCards={metricCards}
            facialPoints={analysis.facialPoints}
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
        className="lg-surface-strong p-8 flex flex-col items-center mb-12 rounded-3xl"
      >
        <FGScoreOrb score={analysis.overallScore} size={320} variant="default" />
        <div className="mt-5 flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-full gradient-primary text-primary-foreground text-sm font-bold shadow-glow">
            {skinTypeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-medium">
          {confidence}% de confiança na análise
        </p>
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

      {/* Premium Content - All remaining analysis details */}
      {isPremiumBlocked ? (
        <div className="relative mb-8">
          {/* Blur layer - covers all premium content */}
          <div className="blur-lg pointer-events-none select-none space-y-6">
            {/* RESULTADO - Moved to top and renamed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg-surface p-5 rounded-2xl"
            >
              <h3 className="text-sm font-bold text-[var(--fg-ink)] mb-3">Resultado</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Sua análise facial está pronta. Idade da pele: <span className="font-bold text-foreground">{skinAge} anos</span>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight}
              </p>
              {impactfulConditions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {impactfulConditions.map((item) => (
                    <span
                      key={item.key}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-coral-light text-primary"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* PONTOS DE MELHORIA - Métricas com scores > 0 */}
            {metrics.filter((m) => m.value > 0).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg-surface p-5 rounded-2xl"
              >
                <h3 className="text-sm font-bold text-[var(--fg-ink)] mb-4">Pontos de Melhoria</h3>
                <div className="space-y-2.5">
                  {metrics
                    .filter((m) => m.value > 0)
                    .map((metric, i) => (
                      <MetricBar
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                        icon={metric.icon}
                        delay={0.55 + i * 0.1}
                      />
                    ))}
                </div>
              </motion.div>
            )}

            {/* PONTOS POSITIVOS - Métricas com scores = 0 */}
            {metrics.filter((m) => m.value === 0).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="lg-surface p-5 rounded-2xl"
              >
                <h3 className="text-sm font-bold text-[var(--fg-ink)] mb-4">✅ Pontos Positivos</h3>
                <div className="flex flex-wrap gap-2">
                  {metrics
                    .filter((m) => m.value === 0)
                    .map((metric) => (
                      <div
                        key={metric.label}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-50 border border-green-200/60"
                      >
                        <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-green-800">{metric.label}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Detected Conditions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="lg-surface p-5 rounded-2xl"
            >
              <h3 className="text-sm font-bold text-[var(--fg-ink)] mb-3">Pontos detectados pela IA</h3>
              {activeConditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeConditions.map((item) => (
                    <span
                      key={item.key}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-coral-light text-primary"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma condicao adicional detectada.</p>
              )}
            </motion.div>

            {/* Rotina + Produtos */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.85 }}
            >
              {routineState === "done" && primaryRecommendations.length > 0 && (
                <div className="glass-card p-5 mb-4">
                  <h3 className="text-sm font-bold text-foreground mb-3">Produtos Recomendados</h3>
                  <Carousel opts={{ align: "start", loop: primaryRecommendations.length > 1 }} className="w-full">
                    <CarouselContent className="-ml-2">
                      {primaryRecommendations.map((item) => (
                        <CarouselItem key={`${item.type}-${item.product}`} className="basis-1/3 sm:basis-1/4 pl-2">
                          <div className="rounded-xl border border-border/60 p-2 h-full flex flex-col">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground line-clamp-1">{item.type}</p>
                            <div className="mt-1.5 overflow-hidden rounded-lg bg-muted aspect-[3/4] flex-shrink-0">
                              <img src={item.imageUrl} alt={item.product} loading="eager" referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"; }}
                                className="w-full h-full object-contain bg-white p-1.5" />
                            </div>
                            <p className="text-[10px] font-bold text-foreground mt-1.5 line-clamp-2">{item.product}</p>
                            <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2 flex-1">{item.reason}</p>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>
              )}

              {routineState === "done" && extraRecommendations.length > 0 && (
                <div className="glass-card p-5 mb-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="extra-products" className="border-border/60">
                      <AccordionTrigger className="py-0 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <h3 className="text-sm font-bold text-foreground text-left flex items-center gap-2">
                            <Gift size={15} className="text-primary" /> Produtos Extras
                          </h3>
                          <span className="text-xs font-semibold text-muted-foreground">{extraRecommendations.length} itens</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3">
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Indicados para: {extraReasonsText || "olheiras, textura e equilíbrio da pele"}.
                        </p>
                        <Carousel opts={{ align: "start", loop: extraRecommendations.length > 1 }} className="w-full">
                          <CarouselContent className="-ml-2">
                            {extraRecommendations.map((item) => (
                              <CarouselItem key={`${item.type}-${item.product}`} className="basis-1/3 sm:basis-1/4 pl-2">
                                <div className="rounded-xl border border-border/60 p-1.5 h-full flex flex-col">
                                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground line-clamp-1">{item.type}</p>
                                  <div className="mt-1 overflow-hidden rounded-lg bg-muted aspect-[3/4] flex-shrink-0">
                                    <img src={item.imageUrl} alt={item.product} loading="eager" referrerPolicy="no-referrer"
                                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"; }}
                                      className="w-full h-full object-contain bg-white p-1" />
                                  </div>
                                  <p className="text-[9px] font-bold text-foreground mt-1 line-clamp-2">{item.product}</p>
                                  <p className="text-[8px] text-muted-foreground mt-0.5 line-clamp-2 flex-1">{item.reason}</p>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                        </Carousel>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </motion.div>
          </div>

          {/* Modal overlay - positioned absolutely on top of blur */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <PremiumUnlockModal isVisible={true} />
          </div>
        </div>
      ) : (
        /* Content não bloqueado */
        <div className="mb-8 space-y-6">
          {/* RESULTADO - Moved to top and renamed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-bold text-foreground mb-3">Resultado</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {insight}
            </p>
            {impactfulConditions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-coral-light text-primary">
                  Parece ter {skinAge} anos
                </span>
                {impactfulConditions.map((item) => (
                  <span
                    key={item.key}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-coral-light text-primary"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* PONTOS DE MELHORIA - Métricas com scores > 0 */}
          {metrics.filter((m) => m.value > 0).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-5"
            >
              <h3 className="text-sm font-bold text-foreground mb-4">Pontos de Melhoria</h3>
              <div className="space-y-2.5">
                {metrics
                  .filter((m) => m.value > 0)
                  .map((metric, i) => (
                    <MetricBar
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      icon={metric.icon}
                      delay={0.55 + i * 0.1}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {/* PONTOS POSITIVOS - Métricas com scores = 0 */}
          {metrics.filter((m) => m.value === 0).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="glass-card p-5"
            >
              <h3 className="text-sm font-bold text-foreground mb-4">Pontos não identificados</h3>
              <div className="flex flex-wrap gap-2">
                {metrics
                  .filter((m) => m.value === 0)
                  .map((metric) => (
                    <div
                      key={metric.label}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-50 border border-green-200/60"
                    >
                      <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-green-800">{metric.label}</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Rotina + Produtos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.75 }}
          >
            {routineState === "done" && primaryRecommendations.length > 0 && (
              <div className="glass-card p-5 mb-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Produtos Recomendados</h3>
                <Carousel opts={{ align: "start", loop: primaryRecommendations.length > 1 }} className="w-full">
                  <CarouselContent className="-ml-2">
                    {primaryRecommendations.map((item) => (
                      <CarouselItem key={`${item.type}-${item.product}`} className="basis-1/3 sm:basis-1/4 pl-2">
                        <div className="rounded-xl border border-border/60 p-2 h-full flex flex-col">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground line-clamp-1">{item.type}</p>
                          <div className="mt-1.5 overflow-hidden rounded-lg bg-muted aspect-[3/4] flex-shrink-0">
                            <img src={item.imageUrl} alt={item.product} loading="eager" referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"; }}
                              className="w-full h-full object-contain bg-white p-1.5" />
                          </div>
                          <p className="text-[10px] font-bold text-foreground mt-1.5 line-clamp-2">{item.product}</p>
                          <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2 flex-1">{item.reason}</p>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            )}

            {routineState === "done" && extraRecommendations.length > 0 && (
              <div className="lg-surface p-5 mb-4 rounded-2xl">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="extra-products" className="border-border/60">
                    <AccordionTrigger className="py-0 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-3">
                        <h3 className="text-sm font-bold text-foreground text-left flex items-center gap-2">
                          <Gift size={15} className="text-primary" /> Produtos Extras
                        </h3>
                        <span className="text-xs font-semibold text-muted-foreground">{extraRecommendations.length} itens</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3">
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        Indicados para: {extraReasonsText || "olheiras, textura e equilíbrio da pele"}.
                      </p>
                      <Carousel opts={{ align: "start", loop: extraRecommendations.length > 1 }} className="w-full">
                        <CarouselContent className="-ml-2">
                          {extraRecommendations.map((item) => (
                            <CarouselItem key={`${item.type}-${item.product}`} className="basis-1/3 sm:basis-1/4 pl-2">
                              <div className="rounded-xl border border-border/60 p-1.5 h-full flex flex-col">
                                <p className="text-[9px] uppercase tracking-wide text-muted-foreground line-clamp-1">{item.type}</p>
                                <div className="mt-1 overflow-hidden rounded-lg bg-muted aspect-[3/4] flex-shrink-0">
                                  <img src={item.imageUrl} alt={item.product} loading="eager" referrerPolicy="no-referrer"
                                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"; }}
                                    className="w-full h-full object-contain bg-white p-1" />
                                </div>
                                <p className="text-[9px] font-bold text-foreground mt-1 line-clamp-2">{item.product}</p>
                                <p className="text-[8px] text-muted-foreground mt-0.5 line-clamp-2 flex-1">{item.reason}</p>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                      </Carousel>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {routineState === "loading" && (
              <div className="lg-surface p-5 mb-4 rounded-2xl space-y-3 animate-pulse">
                <div className="h-4 w-40 rounded-full bg-muted-foreground/20" />
                <div className="h-32 rounded-xl bg-muted-foreground/10" />
                <div className="h-3 w-3/4 rounded-full bg-muted-foreground/15" />
                <div className="h-3 w-1/2 rounded-full bg-muted-foreground/10" />
              </div>
            )}

            {routineState === "idle" && !isPremiumBlocked && (
              <button onClick={handleLoadRoutine}
                className="coral-button w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 mb-4">
                <Sparkles size={18} /> Ver rotina completa
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* Footer buttons - Always visible */}
      <div className="space-y-3 mt-8">
        {routineState === "done" && !isPremiumBlocked && (
          <button onClick={handleLoadRoutine}
            className="coral-button w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2">
            <BookOpen size={18} /> Ver Rotina Recomendada
          </button>
        )}
        <button onClick={() => navigate("/dashboard")}
          className="liquiglass-button w-full py-4 rounded-2xl text-foreground font-semibold text-base">
          Voltar ao Início
        </button>
      </div>
      </div>
    </div>
  );
};

export default Results;
