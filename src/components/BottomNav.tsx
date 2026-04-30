import { Home, Clock, User, Camera, Sparkles, ListChecks } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useIsPremium } from "@/hooks/useIsPremium";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

const leftTabs = [
  { path: "/dashboard", icon: Home, label: "Inicio" },
  { path: "/history", icon: Clock, label: "Historico" },
];

const getRightTabs = (isActive: boolean) => [
  isActive
    ? { path: "/routine", icon: ListChecks, label: "Rotina" }
    : { path: "/premium", icon: Sparkles, label: "Premium" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const getLastAnalysis = () => {
  const cached = getCachedLatestAnalysis();
  if (cached) {
    console.debug("[BottomNav] Using cached analysis", { id: cached.id });
    return cached;
  }

  try {
    const raw = localStorage.getItem("faceglow-last-analysis");
    if (raw) {
      const normalized = normalizeAnalysis(JSON.parse(raw));
      if (normalized) {
        console.debug("[BottomNav] Using localStorage analysis", { id: normalized.id });
        return normalized;
      }
    }
  } catch (e) {
    console.debug("[BottomNav] Error reading localStorage:", e);
  }

  console.warn("[BottomNav] Cache and localStorage unavailable - will fetch from API");
  return null;
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();

  const rightTabs = getRightTabs(isPremium);

  const handleRoutineClick = async () => {
    let analysis = getLastAnalysis();

    console.debug("[BottomNav] Routine click - analysis available:", {
      hasAnalysis: !!analysis,
      analysisId: analysis?.id,
      hasRoutine: !!(analysis?.routine?.morning?.length || analysis?.routine?.night?.length),
      hasRecommendations: !!analysis?.recommendations?.length,
      recommendationCount: analysis?.recommendations?.length ?? 0,
    });

    if (analysis && analysis.id && !analysis.recommendations?.length) {
      try {
        console.debug("[BottomNav] Fetching full analysis with recommendations...");
        const fullAnalysis = await fetchAnalysisWithRecommendations(analysis.id);
        if (fullAnalysis) {
          analysis = fullAnalysis;
          console.debug("[BottomNav] Fetched full analysis", {
            id: analysis.id,
            recommendationCount: analysis.recommendations?.length ?? 0,
          });
        }
      } catch (error) {
        console.error("[BottomNav] Failed to fetch full analysis:", error);
      }
    }

    if (analysis) {
      console.debug("[BottomNav] Navigating to routine with analysis", { id: analysis.id });
      navigate("/routine", { state: { analysis } });
    } else {
      console.warn("[BottomNav] No analysis available - navigating to routine without data");
      navigate("/routine");
    }
  };

  const renderTab = ({ path, icon: Icon, label }: typeof leftTabs[0]) => {
    const isActive = location.pathname === path;

    return (
      <button
        key={path}
        onClick={() => {
          if (path === "/routine") {
            handleRoutineClick();
          } else {
            navigate(path);
          }
        }}
        className="relative flex h-12 min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 transition-colors"
      >
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-0 rounded-2xl bg-white/75 shadow-soft"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <Icon
          size={20}
          className={`relative z-10 ${isActive ? "text-primary" : "text-[var(--fg-ink-4)]"}`}
          strokeWidth={isActive ? 2.5 : 1.8}
        />
        <span
          className={`relative z-10 text-[10px] font-bold leading-none ${
            isActive ? "text-primary" : "text-[var(--fg-ink-4)]"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 bottom-nav-safe px-4">
      <div className="fg-tabbar pointer-events-auto mx-auto flex h-[72px] max-w-md items-center justify-between px-3">
        <div className="flex flex-1 items-center justify-around">
          {leftTabs.map(renderTab)}
        </div>

        <div className="flex w-[74px] items-center justify-center">
          <button
            onClick={() => navigate("/analyze")}
            aria-label="Analisar pele"
            className="flex h-16 w-16 -translate-y-4 items-center justify-center rounded-full border-[6px] border-white/80 bg-[var(--grad-coral)] shadow-glow transition-transform active:scale-95"
          >
            <Camera size={24} className="text-white" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-around">
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
