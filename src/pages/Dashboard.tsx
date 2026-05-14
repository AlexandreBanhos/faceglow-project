import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, TrendingUp, Droplets, Sun, Moon, ChevronRight, Check, Flame, Lock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SkinTypeInfoSection from "@/components/SkinTypeInfoSection";
import RoutineSummaryCard from "@/components/RoutineSummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import { type AnalysisResponse } from "@/lib/analysis";
import { fetchDashboardSummary, fetchRoutineSteps } from "@/lib/analysisClient";
import { getCurrentUser, getAccessTokenWithWait } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/api";
import { useIsPremium } from "@/hooks/useIsPremium";
import { staleWhileRevalidate } from "@/shared/services/cache/CacheService";
import { AuroraBackdrop, FGScoreOrb, FGMetricBar } from "@/components/shared";

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
  const { isPremium, isConfirmedNonPremium } = useIsPremium();
  const isPremiumBlocked = isConfirmedNonPremium;
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [routineSteps, setRoutineSteps] = useState<Array<{ id: string; period: string; productName: string }>>([]);

  // Efeito 1: Carregar dados do usuÃ¡rio
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
          true // forÃ§a refresh a cada navegaÃ§Ã£o para refletir alteraÃ§Ãµes de rotina
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

  // Premium status Ã© lido diretamente do UserContext (jÃ¡ hidratado pelo RequireAuth)

  // Efeito 2.6a: Carregar steps da rotina (muda apenas quando anÃ¡lise muda)
  useEffect(() => {
    if (!latestAnalysis?.id) return;
    let cancelled = false;
    fetchRoutineSteps(latestAnalysis.id)
      .then(steps => { if (!cancelled) setRoutineSteps(steps.map(s => ({ id: s.id, period: s.period, productName: s.productName }))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [latestAnalysis?.id]);

  // Efeito 2.6b: Progresso do dia â€” recarrega TODA VEZ que o usuÃ¡rio navega ao Dashboard
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

  // Efeito 3: Usar imageUrl da anÃ¡lise como avatar quando nÃ£o hÃ¡ avatar customizado.
  // Usa latestAnalysis jÃ¡ carregado â€” sem segunda chamada Ã  API.
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
    if (t.includes("sens"))                         return { bg: "#FFF1F2", color: "#E11D48", label: "SensÃ­vel",   dot: "#F43F5E" };
    if (t.includes("norm") || t === "normal")       return { bg: "#F0FDF4", color: "#16A34A", label: "Normal",     dot: "#22C55E" };
    return null;
  })();

  const currentPeriod: "morning" | "night" = new Date().getHours() < 18 ? "morning" : "night";
  const periodLabel = currentPeriod === "morning" ? "Manha" : "Noite";

  const routineSummary = useMemo(() => {
    if (!latestAnalysis) {
      return { total: 0, pending: 0, done: 0, items: [] as Array<{ title: string; done: boolean }> };
    }

    const completedSet = new Set(completedStepIds);

    // LÃª localStorage para respeitar desmarques feitos na pÃ¡gina Routine
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

    // Fonte primÃ¡ria: steps estruturados da API v2 (mais confiÃ¡vel que string-parsing)
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
      return "FaÃ§a sua primeira analise para desbloquear uma rotina personalizada.";
    }

    if (routineSummary.total === 0) {
      return `Sem passos para ${periodLabel.toLowerCase()} hoje. Volte mais tarde para continuar sua evolucao.`;
    }

    if (routineSummary.pending === 0) {
      return `${periodLabel} concluÃ­da! Sua pele agradece consistÃªncia todos os dias.`;
    }

    if (routineSummary.pending === 1) {
      return `Falta so 1 passo na rotina da ${periodLabel.toLowerCase()}. Bora fechar com chave de ouro.`;
    }

    return `Voce tem ${routineSummary.pending} passos pendentes nesta ${periodLabel.toLowerCase()}. Complete agora e mantenha o progresso.`;
  })();

  // Se ainda estÃ¡ carregando e nÃ£o tem dados, mostra spinner
  if (isLoading && !latestAnalysis) {
    return <LoadingSpinnerFullScreen message="Carregando seu dashboard..." />;
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
              QUARTA Â· 28 ABR
            </p>
            <h1 className="text-2xl font-bold text-[var(--fg-ink)] mt-1">
              {firstName ? `OlÃ¡, ${firstName}` : "OlÃ¡"}
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
                  setAvatarUrl(""); // Limpa para voltar Ã  letra
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
        className="mx-6 mt-6 lg-surface-strong p-6 rounded-3xl"
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Label row + skin type badge */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="fg-mono text-[11px] text-[var(--fg-ink-3)] font-semibold tracking-wide uppercase">Score geral</p>
                {skinTypeMeta && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 20 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: skinTypeMeta.bg, color: skinTypeMeta.color }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: skinTypeMeta.dot }}
                    />
                    Pele {skinTypeMeta.label}
                  </motion.span>
                )}
              </div>

              {/* Score number */}
              <div className="flex items-baseline gap-1.5 mb-3">
                <motion.span
                  className="font-heading text-5xl font-bold leading-none text-[var(--fg-ink)]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {latestAnalysis?.overallScore ?? 0}
                </motion.span>
                <span className="text-base text-[var(--fg-ink-3)] font-medium">/100</span>
              </div>

              {/* Change indicator */}
              {scoreChange !== null ? (
                <motion.div
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-coral to-pink flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={10} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: scoreChange >= 0 ? "#16A34A" : "#DC2626" }}>
                    {scoreChange > 0 ? "+" : ""}{scoreChange} desde Ãºltima anÃ¡lise
                  </span>
                </motion.div>
              ) : (
                <p className="text-xs text-[var(--fg-ink-4)]">Primeira anÃ¡lise registrada</p>
              )}
            </div>

            <FGScoreOrb score={latestAnalysis?.overallScore ?? 0} size={110} variant="compact" />
          </div>
        )}
      </motion.div>

      {/* Scan CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="px-6 mt-6"
      >
        <button
          onClick={() => navigate("/analyze")}
          className="coral-button w-full py-4 rounded-2xl text-base flex items-center justify-center gap-3 font-bold"
        >
          <Camera size={20} />
          Analisar Minha Pele
        </button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="px-6 mt-6 grid grid-cols-3 gap-3"
      >
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        ) : (
          [
            { label: "Acne", value: `${(latestAnalysis?.scores.acne ?? 0) * 10}%`, icon: <Droplets size={18} /> },
            { label: "Oleosidade", value: `${(latestAnalysis?.scores.oiliness ?? 0) * 10}%`, icon: <Sun size={18} /> },
            { label: "Hidratacao", value: `${(latestAnalysis?.scores.hydration ?? 0) * 10}%`, icon: <TrendingUp size={18} /> },
          ].map((stat) => (
            <div key={stat.label} className="lg-surface p-4 rounded-2xl text-center">
              <span className="text-lg flex justify-center items-center text-[var(--fg-ink-2)]">{stat.icon}</span>
              <p className="text-sm font-bold text-[var(--fg-ink)] mt-2">{stat.value}</p>
              <p className="text-xs fg-mono text-[var(--fg-ink-3)] uppercase tracking-wide">
                {stat.label}
              </p>
            </div>
          ))
        )}
      </motion.div>

      {/* Routine Summary Card */}
      {latestAnalysis && !isPremiumBlocked && (
        <RoutineSummaryCard analysis={latestAnalysis} delay={0.38} />
      )}

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

      {/* Daily Routine or Premium Upsell */}
      {isPremiumBlocked ? (
        // Premium Upsell Banner
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="px-6 mt-6 mb-6"
        >
          <div className="lg-surface-strong p-6 rounded-3xl">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral/30 to-pink/30 flex items-center justify-center flex-shrink-0">
                <Flame size={20} className="text-[#ef8fb8]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[var(--fg-ink)]">
                  Desbloqueie sua anÃ¡lise completa
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
                <span className="text-sm text-[var(--fg-ink)]">Rotina personalizada (manhÃ£ e noite)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={16} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-[var(--fg-ink)]">AnÃ¡lise completa com detalhes</span>
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
        </motion.div>
      ) : (
        // Normal Routine Display
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="px-6 mt-6"
        >
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
              onClick={() => navigate("/routine", latestAnalysis ? { state: { analysis: latestAnalysis } } : undefined)}
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
                transition={{ delay: 0.5 + i * 0.08 }}
                className={`lg-surface p-4 rounded-2xl flex items-center gap-3 transition-all ${
                  item.done ? "opacity-60" : ""
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  item.done 
                    ? "bg-gradient-to-r from-coral to-pink border-none" 
                    : "border-[var(--glass-border)]"
                }`}>
                  {item.done && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${item.done ? "line-through text-[var(--fg-ink-3)]" : "text-[var(--fg-ink)]"}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--fg-ink-3)]">
                    {item.done ? "ConcluÃ­do" : "Pendente"}
                  </p>
                </div>
              </motion.div>
            ))}
            {!isLoading && routineSummary.items.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg-surface p-6 rounded-2xl flex flex-col items-center text-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FEF3C7, #FED7AA)" }}>
                  <span className="text-2xl">âœ¨</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--fg-ink)] mb-1">Sua rotina vai aparecer aqui</p>
                  <p className="text-xs text-[var(--fg-ink-3)] leading-relaxed">FaÃ§a uma anÃ¡lise facial para receber uma rotina personalizada para o seu tipo de pele.</p>
                </div>
                <button
                  onClick={() => navigate("/analyze")}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: "var(--grad-coral)" }}
                >
                  Fazer anÃ¡lise agora
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      <BottomNav />
      </div>
    </div>
  );
};

export default Dashboard;
