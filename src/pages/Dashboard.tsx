import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Droplets, ChevronDown, ChevronUp, AlertCircle, Eye, Zap, Wind, Sun, Sparkles, ScanFace, ListChecks } from "lucide-react";
import logoUrl from "@/assets/logo-faceglow.svg";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SkinTypeInfoSection from "@/components/SkinTypeInfoSection";
import RoutineSummaryCard from "@/components/RoutineSummaryCard";
import DailyRoutineSection from "@/components/DailyRoutineSection";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import { type AnalysisResponse } from "@/lib/analysis";
import { fetchDashboardSummary, fetchRoutineSteps } from "@/lib/analysisClient";
import { getCurrentUser, getAccessTokenWithWait } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/api";
import { useIsPremium } from "@/hooks/useIsPremium";
import { staleWhileRevalidate } from "@/shared/services/cache/CacheService";
import { AuroraBackdrop, FGScoreOrb } from "@/components/shared";

type RoutineSchedule = {
  daysByItem?: Record<string, string[]>;
  checkedByDayItem?: Record<string, boolean>;
};

const getRoutineStorageKey = (analysisId: string) => `faceglow-routine-schedule-${analysisId}`;
const getRoutineSelectionStorageKey = (analysisId: string) => `faceglow-routine-selection-${analysisId}`;
const getRoutineDisplayStorageKey = (analysisId: string) => `faceglow-routine-display-${analysisId}`;

const getTodayWeekDay = () => {
  const day = new Date().getDay();
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return keys[day] ?? "mon";
};

const getRoutineTitle = (step: string) => {
  const separatorIndex = step.indexOf(":");
  const raw = separatorIndex >= 0 ? step.slice(separatorIndex + 1).trim() : step.trim();
  return raw.replace(/\(([^)]+)\)\s*$/, "").trim();
};

const isExtraRoutineStep = (step: string) => /^extras?\s*:/i.test(step.trim());

const parseRoutineForPeriod = (
  analysis: AnalysisResponse,
  period: "morning" | "night",
  todayWeekDay: string,
) => {
  const rawSchedule = localStorage.getItem(getRoutineStorageKey(analysis.id));
  let parsedSchedule: RoutineSchedule = {};
  if (rawSchedule) {
    try {
      parsedSchedule = JSON.parse(rawSchedule) as RoutineSchedule;
    } catch {
      parsedSchedule = {};
    }
  }
  const steps = analysis.routine[period] ?? [];

  return steps
    .map((step) => {
      const title = getRoutineTitle(step);
      const itemKey = `${period}::${title.toLowerCase()}`;
      const scheduledDays = parsedSchedule.daysByItem?.[itemKey];
      const isScheduledToday = !scheduledDays || scheduledDays.includes(todayWeekDay);
      const checkKey = `${todayWeekDay}::${itemKey}`;
      const done = Boolean(parsedSchedule.checkedByDayItem?.[checkKey]);

      return {
        step,
        title,
        isScheduledToday,
        done,
      };
    })
    .filter((item) => item.isScheduledToday && !isExtraRoutineStep(item.step));
};

// ── Mini anel de métrica ─────────────────────────────────────────────────────
function MetricRing({
  value, label, icon, delay = 0,
}: { value: number; label: string; icon: React.ReactNode; delay?: number }) {
  const R = 22; const C = 2 * Math.PI * R;
  const id = `mgr-${label.replace(/[^a-z]/gi, "").toLowerCase()}`;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#E8547A" />
              <stop offset="100%" stopColor="#E8A882" />
            </linearGradient>
          </defs>
          <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="5" />
          <motion.circle
            cx="28" cy="28" r={R}
            fill="none" stroke={`url(#${id})`}
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - Math.min(value, 100) / 100) }}
            transition={{ duration: 1.1, ease: "easeOut", delay }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--fg-ink)" }}>{value}%</span>
        </div>
      </div>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span className="fg-mono uppercase text-center"
        style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--fg-ink-3)", lineHeight: 1.2 }}>
        {label}
      </span>
    </div>
  );
}

// ── Mapa de métricas com labels e ícones ─────────────────────────────────────
const metricsMap: Record<string, { label: string; icon: React.ReactNode }> = {
  acne: { label: "Acne", icon: <Droplets size={14} /> },
  oiliness: { label: "Oleosidade", icon: <Sun size={14} /> },
  hydration: { label: "Hidratação", icon: <TrendingUp size={14} /> },
  darkSpots: { label: "Manchas Escuras", icon: <AlertCircle size={14} /> },
  sensitivity: { label: "Sensibilidade", icon: <Zap size={14} /> },
  poros: { label: "Poros", icon: <Wind size={14} /> },
  olheiras: { label: "Olheiras", icon: <Eye size={14} /> },
  linhasFinas: { label: "Linhas Finas", icon: <TrendingUp size={14} /> },
  vermelhidao: { label: "Vermelhidão", icon: <AlertCircle size={14} /> },
  espinhasAtivas: { label: "Espinhas Ativas", icon: <Droplets size={14} /> },
  cravos: { label: "Cravos", icon: <Wind size={14} /> },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponse | null>(null);
  const [previousOverallScore, setPreviousOverallScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [avatarLetter, setAvatarLetter] = useState("U");
  const [userReady, setUserReady] = useState(false);
  const [expandMetrics, setExpandMetrics] = useState(false);
  const { isPremium, isConfirmedNonPremium } = useIsPremium();
  const isPremiumBlocked = isConfirmedNonPremium;
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [routineSteps, setRoutineSteps] = useState<Array<{ id: string; period: string; productName: string }>>([]);

  // Efeito 1: Carregar dados do usuário
  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (!user) {
          setUserReady(true);
          return;
        }
        const meta = user.user_metadata ?? {};
        const fullName =
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta.name === "string" && meta.name.trim()) ||
          user.email?.split("@")[0] ||
          "";
        const first = fullName.split(" ")[0] ?? "";
        setFirstName(first);
        setAvatarLetter((first.charAt(0) || "U").toUpperCase());
        if (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) {
          setAvatarUrl(meta.avatar_url.trim());
        }
        setUserReady(true);
      })
      .catch((error) => {
        console.error("Erro ao carregar usuario:", error);
        if (mounted) setUserReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Efeito 2: Carregar analises (INDEPENDENTE de userReady - sem waterfall)
  useEffect(() => {
    let mounted = true;

    const loadAnalyses = async () => {
      try {
        // Aguarda um ciclo de renderizacao para garantir token pronto
        await new Promise(resolve => setTimeout(resolve, 0));

        // Usa padrao stale-while-revalidate
        // Retorna dados em cache imediatamente, revalida em background
        const summary = await staleWhileRevalidate(
          'dashboard-summary',
          () => fetchDashboardSummary(true),
          true // força refresh a cada navegação para refletir alterações de rotina
        );

        if (!mounted) return;
        setLatestAnalysis(summary.latest);
        setPreviousOverallScore(summary.previousOverallScore);
      } catch (error) {
        if (!mounted) return;
        console.error('Erro ao carregar analises:', error);
        setLatestAnalysis(null);
        setPreviousOverallScore(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    loadAnalyses();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  // Premium status é lido diretamente do UserContext (já hidratado pelo RequireAuth)

  // Efeito 2.6a: Carregar steps da rotina (muda apenas quando análise muda)
  useEffect(() => {
    if (!latestAnalysis?.id) return;
    let cancelled = false;
    fetchRoutineSteps(latestAnalysis.id)
      .then(steps => { if (!cancelled) setRoutineSteps(steps.map(s => ({ id: s.id, period: s.period, productName: s.productName }))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [latestAnalysis?.id]);

  // Efeito 2.6b: Progresso do dia — recarrega TODA VEZ que o usuário navega ao Dashboard
  useEffect(() => {
    if (!latestAnalysis?.id) return;
    let cancelled = false;
    const loadTodayProgress = async () => {
      try {
        const token = await getAccessTokenWithWait(3000);
        if (!token || cancelled) return;
        const today = new Date();
        const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const res = await fetch(`${apiBaseUrl}/routine/progress/today?localDate=${localDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const { completedStepIds: ids } = await res.json() as { completedStepIds: string[] };
        if (!cancelled) setCompletedStepIds(ids ?? []);
      } catch { /* silent */ }
    };
    loadTodayProgress();
    return () => { cancelled = true; };
  }, [latestAnalysis?.id, location.pathname]); // location.pathname garante refresh ao voltar para o dashboard

  // Efeito 3: Usar imageUrl da análise como avatar quando não há avatar customizado.
  // Usa latestAnalysis já carregado — sem segunda chamada à API.
  useEffect(() => {
    if (!latestAnalysis?.imageUrl) return;
    if (avatarUrl && !avatarUrl.startsWith("blob:")) return; // respeita avatar customizado
    setAvatarUrl(latestAnalysis.imageUrl);
    setIsImageLoaded(false);
  }, [latestAnalysis?.imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const scoreChange = latestAnalysis && previousOverallScore !== null
    ? latestAnalysis.overallScore - previousOverallScore
    : null;
  const skinTypeLabel = latestAnalysis?.skinType
    ? `${latestAnalysis.skinType.charAt(0).toUpperCase()}${latestAnalysis.skinType.slice(1).toLowerCase()}`
    : "";

  const skinTypeMeta = (() => {
    const t = (latestAnalysis?.skinType ?? "").toLowerCase();
    if (t.includes("oleo") || t === "oily")        return { bg: "#FEF3C7", color: "#D97706", label: "Oleosa",     dot: "#F59E0B" };
    if (t.includes("sec") || t === "dry")           return { bg: "#EFF6FF", color: "#2563EB", label: "Seca",       dot: "#3B82F6" };
    if (t.includes("mist") || t === "combination")  return { bg: "#F5F3FF", color: "#7C3AED", label: "Mista",      dot: "#8B5CF6" };
    if (t.includes("sens"))                         return { bg: "#FFF1F2", color: "#E11D48", label: "Sensível",   dot: "#F43F5E" };
    if (t.includes("norm") || t === "normal")       return { bg: "#F0FDF4", color: "#16A34A", label: "Normal",     dot: "#22C55E" };
    return null;
  })();

  // 📊 Ordenar métricas pelos 3 piores scores (maiores valores)
  const sortedMetrics = useMemo(() => {
    if (!latestAnalysis?.scores) return { top3: [], others: [] };
    
    const allMetrics = Object.entries(latestAnalysis.scores)
      .filter(([, value]) => typeof value === 'number' && value > 0 && value <= 10)
      .map(([key, value]) => ({
        key,
        value: Math.round(value * 10), // Converter para percentual
        label: metricsMap[key]?.label || key,
        icon: metricsMap[key]?.icon || <AlertCircle size={14} />,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      top3: allMetrics.slice(0, 3),
      others: allMetrics.slice(3),
    };
  }, [latestAnalysis?.scores]);

  const currentPeriod: "morning" | "night" = new Date().getHours() < 18 ? "morning" : "night";
  const periodLabel = currentPeriod === "morning" ? "Manha" : "Noite";

  const routineSummary = useMemo(() => {
    if (!latestAnalysis) {
      return { total: 0, pending: 0, done: 0, items: [] as Array<{ title: string; done: boolean }> };
    }

    const completedSet = new Set(completedStepIds);

    // Lê localStorage para respeitar desmarques feitos na página Routine
    // antes que o backend processe o DELETE de completion
    const localOverrides: Record<string, boolean> = {};
    try {
      const rawSchedule = localStorage.getItem(getRoutineStorageKey(latestAnalysis.id));
      if (rawSchedule) {
        const parsed = JSON.parse(rawSchedule) as RoutineSchedule;
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        Object.entries(parsed.checkedByDayItem ?? {}).forEach(([key, val]) => {
          // key formato: {date}::{uuid}
          if (key.startsWith(`${todayStr}::`)) {
            const stepId = key.slice(todayStr.length + 2);
            localOverrides[stepId] = val as boolean;
          }
        });
      }
    } catch { /* ignora erros de localStorage */ }

    // Fonte primária: steps estruturados da API v2 (mais confiável que string-parsing)
    const periodSteps = routineSteps.filter(s => s.period === currentPeriod);
    if (periodSteps.length > 0) {
      const items = periodSteps.map(s => {
        const localOverride = localOverrides[s.id];
        const done = localOverride !== undefined ? localOverride : completedSet.has(s.id);
        return { title: s.productName, done };
      });
      const done = items.filter(i => i.done).length;
      return { total: items.length, done, pending: Math.max(items.length - done, 0), items };
    }

    // Fallback legado: string-parsing de latestAnalysis.routine
    const todayWeekDay = getTodayWeekDay();
    const rawDisplay = localStorage.getItem(getRoutineDisplayStorageKey(latestAnalysis.id));
    const rawSelection = !rawDisplay ? localStorage.getItem(getRoutineSelectionStorageKey(latestAnalysis.id)) : null;
    let selectedByItem: Record<string, string> = {};
    const rawToParse = rawDisplay ?? rawSelection;
    if (rawToParse) {
      try { selectedByItem = JSON.parse(rawToParse) as Record<string, string>; } catch { selectedByItem = {}; }
    }

    const stepByKey = new Map(routineSteps.map(s => [`${s.period}::${s.productName.toLowerCase()}`, s.id]));
    const items = parseRoutineForPeriod(latestAnalysis, currentPeriod, todayWeekDay).map((item) => {
      const title = selectedByItem[`${currentPeriod}::${item.title.toLowerCase()}`] || item.title;
      const stepId = stepByKey.get(item.key);
      const doneFromBackend = stepId ? completedSet.has(stepId) : false;
      return { title, done: doneFromBackend || item.done };
    });

    const done = items.filter(i => i.done).length;
    const total = items.length;
    return { total, done, pending: Math.max(total - done, 0), items };
  }, [currentPeriod, latestAnalysis, completedStepIds, routineSteps]);

  const motivationText = (() => {
    if (!latestAnalysis) {
      return "Faça sua primeira analise para desbloquear uma rotina personalizada.";
    }

    if (routineSummary.total === 0) {
      return `Sem passos para ${periodLabel.toLowerCase()} hoje. Volte mais tarde para continuar sua evolucao.`;
    }

    if (routineSummary.pending === 0) {
      return `${periodLabel} concluída! Sua pele agradece consistência todos os dias.`;
    }

    if (routineSummary.pending === 1) {
      return `Falta so 1 passo na rotina da ${periodLabel.toLowerCase()}. Bora fechar com chave de ouro.`;
    }

    return `Voce tem ${routineSummary.pending} passos pendentes nesta ${periodLabel.toLowerCase()}. Complete agora e mantenha o progresso.`;
  })();

  // Se ainda está carregando e não tem dados, mostra spinner
  if (isLoading && !latestAnalysis) {
    return <LoadingSpinnerFullScreen message="Carregando seu dashboard..." />;
  }

  // Tela de boas-vindas quando não há análise
  if (!latestAnalysis) {
    return <DashboardWelcome navigate={navigate} />;
  }

  return (
    <div className="relative w-full min-h-screen pb-28 overflow-hidden"
         style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      
      <div className="relative z-10 mx-auto w-full max-w-md">
      {/* Header */}
      <div className="px-6 pt-14 pb-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="fg-mono text-xs text-[var(--fg-ink-3)] font-medium">
              {(() => {
                const d = new Date();
                const days = ["DOMINGO","SEGUNDA","TERÇA","QUARTA","QUINTA","SEXTA","SÁBADO"];
                const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
                return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
              })()}
            </p>
            <h1 className="text-2xl font-bold text-[var(--fg-ink)] mt-1">
              {firstName ? `Olá, ${firstName}` : "Olá"}
            </h1>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="w-12 h-12 rounded-xl lg-surface-strong flex items-center justify-center overflow-hidden relative shadow-glow"
          >
            {/* Letra como background */}
            <span className="text-sm font-bold text-[var(--fg-ink)]">{avatarLetter}</span>
            
            {/* Imagem com fade-in suave */}
            {avatarUrl && (
              <motion.img 
                key={avatarUrl}
                src={avatarUrl} 
                alt="Avatar" 
                className="absolute w-full h-full object-cover" 
                initial={{ opacity: 0 }}
                animate={{ opacity: isImageLoaded ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onLoad={() => {
                  setIsImageLoaded(true);
                }}
                onError={(e) => {
                  console.warn("[Dashboard] Erro ao carregar imagem do avatar:", avatarUrl);
                  setAvatarUrl(""); // Limpa para voltar à letra
                }}
              />
            )}
          </button>
        </motion.div>
      </div>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-6 mt-6 lg-surface-strong p-6 rounded-3xl relative"
      >
        {isLoading ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="w-[110px] h-[110px] rounded-full flex-shrink-0" />
          </div>
        ) : (
          <>
            {/* Score Orb + Pontuação — FIXO no canto superior direito */}
            <div className="absolute top-6 right-6 flex flex-col items-center gap-1.5">
              <div className="relative">
                <FGScoreOrb score={latestAnalysis?.overallScore ?? 0} size={116} variant="compact" />
                {scoreChange !== null && (
                  <motion.div
                    className="absolute bottom-5 left-1/4 -translate-x-1/2 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 }}
                  >
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded block" 
                      style={{ 
                        color: "var(--fg-ink-3)"
                      }}>
                      {scoreChange > 0 ? "+" : ""}{scoreChange} pts
                    </span>
                  </motion.div>
                )}
              </div>
              <span className="fg-mono uppercase text-center mt-2"
                style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--fg-ink-3)", lineHeight: 1.2 }}>
                Pontuação
              </span>
            </div>

            {/* Container esquerdo — Pele + Top 3 Metrics + Expandidas */}
            <motion.div 
              layout
              className="flex flex-col gap-3 pr-32"
            >
              {/* Pele + Top 3 Metrics */}
              <div>
                {skinTypeMeta && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col gap-0.5 mb-2"
                  >
                    <p className="text-xs font-semibold text-[var(--fg-ink-3)]">
                      Sua pele está:
                    </p>
                    <p className="text-2xl font-black" style={{
                      background: "linear-gradient(135deg, #E8547A 0%, #E8A882 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>
                      {skinTypeMeta.label.toUpperCase()}
                    </p>
                  </motion.div>
                )}
                <div className="flex gap-3.5">
                  {sortedMetrics.top3.map((metric, idx) => (
                    <MetricRing
                      key={metric.key}
                      value={metric.value}
                      label={metric.label}
                      icon={metric.icon}
                      delay={0.12 + idx * 0.08}
                    />
                  ))}
                </div>
              </div>

              {/* Métricas expandidas */}
              {expandMetrics && sortedMetrics.others.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-3 flex-wrap pt-2 border-t border-[var(--fg-ink-2)]/10"
                >
                  {sortedMetrics.others.map((metric, idx) => (
                    <MetricRing
                      key={metric.key}
                      value={metric.value}
                      label={metric.label}
                      icon={metric.icon}
                      delay={0.48 + idx * 0.06}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Ícone Chevron no canto inferior esquerdo — só apareça se houver mais de 3 métricas */}
            {sortedMetrics.others.length > 0 && (
              <motion.button
                onClick={() => setExpandMetrics(!expandMetrics)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.40 }}
                className="absolute bottom-3 left-6 text-[var(--fg-ink-3)] hover:text-[var(--fg-ink)] transition p-1.5"
              >
                <motion.div
                  animate={{ rotate: expandMetrics ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {expandMetrics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </motion.div>
              </motion.button>
            )}
          </>
        )}
      </motion.div>

      {/* Routine Summary Card */}
      {latestAnalysis && !isPremiumBlocked && (
        <RoutineSummaryCard analysis={latestAnalysis} delay={0.38} />
      )}

      {/* Daily Routine Section */}
      <DailyRoutineSection
        analysis={latestAnalysis}
        isPremiumBlocked={isPremiumBlocked}
        currentPeriod={currentPeriod}
        periodLabel={periodLabel}
        routineSummary={routineSummary}
        motivationText={motivationText}
        isLoading={isLoading}
        delay={0.45}
      />

      {/* Skin Type Info Section */}
      {latestAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-6 mt-6"
        >
          <SkinTypeInfoSection currentSkinType={latestAnalysis.skinType} showAllTypes={false} delay={0.42} />
        </motion.div>
      )}

      <BottomNav />
      </div>
    </div>
  );
};

function DashboardWelcome({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const BENEFITS = [
    { Icon: ScanFace, color: "#E8547A", label: "Análise de pele com IA em segundos" },
    { Icon: ListChecks, color: "#8b5cf6", label: "Rotina personalizada para o seu tipo de pele" },
    { Icon: Sparkles,  color: "#0ea5e9", label: "Recomendações de produtos curados" },
  ];

  return (
    <div className="relative w-full min-h-screen pb-28 flex flex-col" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-8">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <img src={logoUrl} alt="FaceGlow" className="h-9 object-contain" />
        </motion.div>

        {/* Orb vazio / placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 22 }}
          className="w-36 h-36 rounded-full flex items-center justify-center mb-6 relative"
          style={{
            background: "linear-gradient(135deg, rgba(232,84,122,0.12) 0%, rgba(232,169,194,0.08) 100%)",
            border: "2px dashed rgba(232,84,122,0.25)",
          }}
        >
          <ScanFace size={52} style={{ color: "var(--grad-coral, #E8547A)", opacity: 0.5 }} />
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ border: "2px solid rgba(232,84,122,0.25)" }}
          />
        </motion.div>

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="text-center mb-2"
        >
          <h1 className="text-2xl font-black text-foreground">Bem-vindo ao FaceGlow</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            Faça sua primeira análise de pele para desbloquear uma rotina personalizada com produtos ideais para você.
          </p>
        </motion.div>

        {/* Benefícios */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="w-full max-w-sm mt-5 space-y-2.5"
        >
          {BENEFITS.map(({ Icon, color, label }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl lg-surface">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          onClick={() => navigate("/analyze")}
          className="mt-7 w-full max-w-sm h-14 rounded-2xl coral-button font-bold text-base flex items-center justify-center gap-2.5 shadow-glow"
        >
          <ScanFace size={20} />
          Fazer minha análise gratuita
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-muted-foreground mt-3 text-center"
        >
          Sua primeira análise é gratuita · Leva menos de 30 segundos
        </motion.p>
      </div>
      <BottomNav />
    </div>
  );
}

export default Dashboard;
