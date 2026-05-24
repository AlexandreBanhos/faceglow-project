import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Droplets, ChevronDown, ChevronUp, AlertCircle, Eye, Zap, Wind, Sun, Sparkles, ScanFace, ListChecks, Target, Clock, Flame, CircleDot, ShieldAlert } from "lucide-react";
import logoUrl from "@/assets/logos/logo-faceglow-escrito-color.webp";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SkinTypeInfoSection from "@/components/SkinTypeInfoSection";
import RoutineSummaryCard from "@/components/RoutineSummaryCard";
import DailyRoutineSection from "@/components/DailyRoutineSection";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { type AnalysisResponse } from "@/lib/analysis";
import { fetchDashboardSummary, fetchRoutineSteps, readDashboardCache, type RoutineStep as ApiRoutineStep } from "@/lib/analysisClient";
import { getCurrentUser, getAccessTokenWithWait } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/api";
import { useIsPremium } from "@/hooks/useIsPremium";
import { staleWhileRevalidate } from "@/shared/services/cache/CacheService";
import { getFreeStepsForDay } from "@/lib/freeRoutine";
import { AuroraBackdrop, FGScoreOrb } from "@/components/shared";
import { LearnCard } from "@/components/LearnCard";
import { LEARN_CARDS, type LearnCard as LearnCardData } from "@/data/skincareLearn";

// ─── Personaliza cards de aprendizado com base na análise do usuário ──────────
function getPersonalizedLearnCards(analysis: AnalysisResponse | null): LearnCardData[] {
  const byId = (id: string) => LEARN_CARDS.find(c => c.id === id);

  if (!analysis) {
    // Sem análise: um de cada categoria exceto tipos-de-pele
    return [
      byId("ativo-spf"),
      byId("rotina-limpeza"),
      byId("mitos-limpeza"),
      byId("prob-acne"),
      byId("ativo-niacinamida"),
      byId("mitos-protetor"),
    ].filter(Boolean) as LearnCardData[];
  }

  const s = analysis.scores;
  const c = analysis.conditions ?? {};

  // ── 1. Problema mais relevante ─────────────────────────────────────────────
  const probScore = (score: number | undefined, cond?: boolean) =>
    (score ?? 0) * 10 + (cond ? 30 : 0);

  const probRanked = [
    { id: "prob-acne",        v: probScore(s.acne,           c.acne) },
    { id: "prob-manchas",     v: probScore(s.darkSpots,      c.manchas) },
    { id: "prob-oleosidade",  v: probScore(s.oiliness) },
    { id: "prob-poros",       v: probScore(s.poros,          c.poros) },
    { id: "prob-olheiras",    v: probScore(s.olheiras,       c.olheiras) },
    { id: "prob-rugas",       v: probScore(s.linhasFinas,    c.linhasFinas) },
    { id: "prob-vermelhidao", v: probScore(s.vermelhidao,    c.vermelhidao) },
    { id: "prob-ressecamento",v: (s.hydration ?? 5) < 4 ? (4 - (s.hydration ?? 5)) * 20 + (c.ressecamento ? 30 : 0) : 0 },
  ].sort((a, b) => b.v - a.v);

  const topProb = probRanked[0].id;
  const secondProb = probRanked[1]?.v > 0 ? probRanked[1].id : null;

  // ── 2. Ingrediente mais relevante para o problema ──────────────────────────
  const ingredientFor: Record<string, string> = {
    "prob-acne":        "ativo-bha",
    "prob-manchas":     "ativo-vitamina-c",
    "prob-oleosidade":  "ativo-niacinamida",
    "prob-poros":       "ativo-bha",
    "prob-olheiras":    "ativo-hialuronico",
    "prob-rugas":       "ativo-retinol",
    "prob-vermelhidao": "ativo-niacinamida",
    "prob-ressecamento":"ativo-ceramidas",
  };
  const topIngredient = ingredientFor[topProb] ?? "ativo-spf";
  const secondIngredient = secondProb ? (ingredientFor[secondProb] ?? "ativo-spf") : "ativo-spf";

  // ── 3. Mito relacionado ────────────────────────────────────────────────────
  const mythFor: Record<string, string> = {
    "prob-acne":        "mitos-acne",
    "prob-manchas":     "mitos-protetor",
    "prob-rugas":       "mitos-protetor",
    "prob-oleosidade":  "mitos-ingredientes",
    "prob-poros":       "mitos-limpeza",
    "prob-olheiras":    "mitos-ingredientes",
    "prob-vermelhidao": "mitos-ingredientes",
    "prob-ressecamento":"mitos-limpeza",
  };
  const topMyth = mythFor[topProb] ?? "mitos-limpeza";

  // ── 4. Passo de rotina relevante ───────────────────────────────────────────
  const routineFor: Record<string, string> = {
    "prob-manchas":     "rotina-protetor",
    "prob-rugas":       "rotina-protetor",
    "prob-oleosidade":  "rotina-esfoliacao",
    "prob-poros":       "rotina-double-cleanse",
    "prob-ressecamento":"rotina-hidratante",
    "prob-acne":        "rotina-limpeza",
    "prob-olheiras":    "rotina-manha-noite",
    "prob-vermelhidao": "rotina-hidratante",
  };
  const topRoutine = routineFor[topProb] ?? "rotina-limpeza";

  // ── 5. Monta lista priorizando 1 por categoria, sem tipos-de-pele ──────────
  const ids = [topProb, topIngredient, topMyth, topRoutine];
  if (secondProb && !ids.includes(secondProb)) ids.push(secondProb);
  if (!ids.includes(secondIngredient)) ids.push(secondIngredient);
  if (!ids.includes("ativo-spf")) ids.push("ativo-spf"); // SPF sempre relevante

  return ids
    .map(byId)
    .filter(Boolean) as LearnCardData[];
}

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

// Extrai o nome do produto (após ":") — usado para usuários premium
const getRoutineTitle = (step: string) => {
  const separatorIndex = step.indexOf(":");
  const raw = separatorIndex >= 0 ? step.slice(separatorIndex + 1).trim() : step.trim();
  return raw.replace(/\(([^)]+)\)\s*$/, "").trim();
};

// Extrai só o rótulo do passo (antes de ":") — usado para usuários free
const getStepLabel = (step: string) => {
  const separatorIndex = step.indexOf(":");
  return separatorIndex >= 0 ? step.slice(0, separatorIndex).trim() : step.trim();
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
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponse | null>(() => readDashboardCache()?.latest ?? null);
  const [previousOverallScore, setPreviousOverallScore] = useState<number | null>(() => readDashboardCache()?.previousOverallScore ?? null);
  const [isLoading, setIsLoading] = useState(() => readDashboardCache() === null);
  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [avatarLetter, setAvatarLetter] = useState("U");
  const [userReady, setUserReady] = useState(false);
  const [expandMetrics, setExpandMetrics] = useState(false);
  const [activeMetricKey, setActiveMetricKey] = useState<string>("overall");
  const { isPremium, isConfirmedNonPremium, isLoading: isPremiumLoading } = useIsPremium();
  const isPremiumBlocked = isConfirmedNonPremium;
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [routineSteps, setRoutineSteps] = useState<ApiRoutineStep[]>([]);
  const [stepsLoaded, setStepsLoaded] = useState(false);

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
        // staleWhileRevalidate: retorna cache imediatamente (in-memory ou localStorage),
        // revalida em background se stale. Não força re-fetch a cada navegação.
        const summary = await staleWhileRevalidate(
          'dashboard-summary',
          () => fetchDashboardSummary(false),
          false
        );

        if (!mounted) return;
        setLatestAnalysis(summary.latest);
        setPreviousOverallScore(summary.previousOverallScore);
      } catch (error) {
        if (!mounted) return;
        console.error('Erro ao carregar analises:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadAnalyses();

    return () => { mounted = false; };
  }, []); // sem location.pathname — staleWhileRevalidate gerencia revalidação em background

  // Premium status é lido diretamente do UserContext (já hidratado pelo RequireAuth)

  // Efeito 2.6a: Carregar steps — apenas premium. Free usa analysis.routine + freeRoutine.ts
  useEffect(() => {
    if (!latestAnalysis?.id || isPremiumBlocked) {
      setStepsLoaded(true);
      return;
    }
    let cancelled = false;
    setStepsLoaded(false);
    fetchRoutineSteps(latestAnalysis.id)
      .then(steps => {
        if (!cancelled) {
          setRoutineSteps(steps);
          setStepsLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setStepsLoaded(true); });
    return () => { cancelled = true; };
  }, [latestAnalysis?.id, isPremiumBlocked]);

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

    // Enquanto premium status ou steps ainda carregam, usa analysis.routine como fallback seguro
    // para evitar flash de "sem rotina". Isso afeta apenas o primeiro carregamento sem cache.
    const stillLoading = isPremiumLoading || (!isPremiumBlocked && !stepsLoaded);
    if (stillLoading && latestAnalysis.routine) {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const freeChecked = getFreeStepsForDay(latestAnalysis.id, dateStr);
      const steps = (latestAnalysis.routine[currentPeriod] ?? []).filter(s => !isExtraRoutineStep(s));
      const items = steps.map(step => {
        const label = getStepLabel(step);
        return { title: label, done: Boolean(freeChecked[`${currentPeriod}::${label.toLowerCase().trim()}`]) };
      });
      const done = items.filter(i => i.done).length;
      return { total: items.length, done, pending: Math.max(items.length - done, 0), items };
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

    // ── FREE: usa analysis.routine strings + freeRoutine localStorage ──────────
    if (isPremiumBlocked) {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const freeChecked = getFreeStepsForDay(latestAnalysis.id, dateStr);
      const steps = (latestAnalysis.routine[currentPeriod] ?? []).filter(s => !isExtraRoutineStep(s));
      const items = steps.map(step => {
        const label = getStepLabel(step);
        const doneKey = `${currentPeriod}::${label.toLowerCase().trim()}`;
        return { title: label, done: Boolean(freeChecked[doneKey]) };
      });
      const done = items.filter(i => i.done).length;
      return { total: items.length, done, pending: Math.max(items.length - done, 0), items };
    }

    // ── PREMIUM: steps estruturados da API v2 ────────────────────────────────
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

    // Fallback legado premium: string-parsing
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
  }, [currentPeriod, latestAnalysis, completedStepIds, routineSteps, isPremiumBlocked, isPremiumLoading, stepsLoaded]);

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

  // Se ainda está carregando e não tem dados em cache, mostra skeleton
  if (isLoading && !latestAnalysis) {
    return <DashboardSkeleton />;
  }

  // Tela de boas-vindas quando não há análise
  if (!latestAnalysis) {
    return <DashboardWelcome navigate={navigate} />;
  }

  return (
    <div className="relative w-full min-h-screen pb-28 overflow-x-hidden"
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

      {/* Score Card — gradiente coral → rosa → lavanda */}
      {(() => {
        // ── Mapeamento de ícones por chave de métrica ──────────────────────
        const METRIC_ICONS: Record<string, React.ReactNode> = {
          overall:       <Target size={20} />,
          acne:          <Zap size={20} />,
          oiliness:      <Droplets size={20} />,
          hydration:     <Sun size={20} />,
          darkSpots:     <CircleDot size={20} />,
          sensitivity:   <ShieldAlert size={20} />,
          poros:         <Wind size={20} />,
          olheiras:      <Eye size={20} />,
          linhasFinas:   <Clock size={20} />,
          vermelhidao:   <Flame size={20} />,
          espinhasAtivas:<Zap size={20} />,
          cravos:        <AlertCircle size={20} />,
        };

        // ── Monta lista de métricas: score geral primeiro, depois as demais ──
        const allScoreMetrics = [
          {
            key: "overall",
            label: "Pontuação geral",
            value: latestAnalysis?.overallScore ?? 0,
            icon: METRIC_ICONS.overall,
          },
          ...[...sortedMetrics.top3, ...sortedMetrics.others].map(m => ({
            key: m.key,
            label: m.label,
            value: m.value,
            icon: METRIC_ICONS[m.key] ?? <AlertCircle size={20} />,
          })),
        ];

        const activeMet = allScoreMetrics.find(m => m.key === activeMetricKey) ?? allScoreMetrics[0];

        // Tamanho do texto do tipo de pele (adaptativo)
        const skinLabel = skinTypeMeta?.label ?? "—";
        const skinFontSize = skinLabel.length <= 5 ? 48 : skinLabel.length <= 7 ? 36 : 26;

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              marginInline: 24,
              marginTop: 24,
              borderRadius: 20,
              background: "var(--grad-coral)",
              padding: "22px 22px 18px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Bolhas decorativas */}
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.12)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -20, left: 10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />

            {isLoading ? (
              /* Skeleton */
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 110, height: 13, borderRadius: 6, background: "rgba(255,255,255,0.25)" }} />
                  <div style={{ width: 75, height: 52, borderRadius: 8, background: "rgba(255,255,255,0.2)" }} />
                  <div style={{ width: 120, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.18)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ width: 80, height: 13, borderRadius: 6, background: "rgba(255,255,255,0.25)" }} />
                  <div style={{ width: 65, height: 48, borderRadius: 8, background: "rgba(255,255,255,0.2)" }} />
                </div>
              </div>
            ) : (
              <>
                {/* ── TOPO: métrica ativa (esq) ↔ tipo de pele (dir) ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: allScoreMetrics.length > 1 ? 20 : 0 }}>
                  {/* Esquerda — intercalável */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {activeMet.label}
                    </p>
                    <motion.p
                      key={activeMetricKey}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ margin: "2px 0 0", fontSize: 52, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-2px" }}
                    >
                      {activeMet.value}
                    </motion.p>
                    {activeMetricKey === "overall" && scoreChange !== null && (
                      <p style={{ margin: "5px 0 0", fontSize: 12, color: "rgba(255,255,255,0.78)", fontWeight: 600 }}>
                        {scoreChange > 0 ? "↑" : scoreChange < 0 ? "↓" : "—"} {Math.abs(scoreChange)} pts vs. anterior
                      </p>
                    )}
                  </div>

                  {/* Direita — tipo de pele (nunca muda) */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Tipo de pele
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: skinFontSize, fontWeight: 800, color: "white", lineHeight: 1, letterSpacing: "-1px" }}>
                      {skinLabel}
                    </p>
                  </div>
                </div>

                {/* ── CARROSSEL DE ÍCONES — scroll horizontal, sem quebra ── */}
                {allScoreMetrics.length > 1 && (
                  <div style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 2,
                    marginInline: -2,
                    paddingInline: 2,
                  }}>
                    {allScoreMetrics.map(m => {
                      const isActive = m.key === activeMetricKey;
                      return (
                        <motion.button
                          key={m.key}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setActiveMetricKey(m.key)}
                          style={{
                            flexShrink: 0,
                            width: 44, height: 44, borderRadius: "50%",
                            background: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.22)",
                            border: isActive ? "none" : "1px solid rgba(255,255,255,0.25)",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "background 180ms, border 180ms",
                            color: isActive ? "#e8a9c2" : "rgba(255,255,255,0.9)",
                          }}
                          title={m.label}
                        >
                          {m.icon}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </motion.div>
        );
      })()}

      {/* Routine Summary Card — visível para todos (free vê CTA premium, premium vê produtos) */}
      {latestAnalysis && (
        <RoutineSummaryCard
          analysis={latestAnalysis}
          delay={0.38}
          prefetchedSteps={routineSteps}
          prefetchedStepsLoaded={stepsLoaded}
        />
      )}

      {/* Daily Routine Section — visível para todos; free vê passos, premium vê produtos */}
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

      {/* Aprenda sobre Skincare — personalizado pela análise */}
      {(() => {
        const learnCards = getPersonalizedLearnCards(latestAnalysis);
        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="px-6 mt-8"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground leading-tight">Aprenda sobre Skincare</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {latestAnalysis ? "Selecionado para o seu perfil de pele" : "Guias práticos para cuidar melhor da sua pele"}
                </p>
              </div>
              <button
                onClick={() => navigate("/aprenda")}
                className="text-xs font-bold"
                style={{ color: "#E8748A", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
              >
                Ver tudo
              </button>
            </div>

            {/* Carrossel horizontal */}
            <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
              {learnCards.map((card, i) => (
                <div key={card.id} style={{ scrollSnapAlign: "start", flexShrink: 0, width: "72vw", maxWidth: 280 }}>
                  <LearnCard card={card} delay={0.54 + i * 0.05} />
                </div>
              ))}
            </div>
          </motion.div>
        );
      })()}

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
