import { Home, Clock, User, Camera, Sparkles, ListChecks } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useIsPremium } from "@/hooks/useIsPremium";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

const leftTabs = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/history", icon: Clock, label: "Histórico" },
];

// Tabs que mudam conforme plano ativo
const getRightTabs = (isActive: boolean) => [
  isActive
    ? { path: "/routine", icon: ListChecks, label: "Rotina" }
    : { path: "/premium", icon: Sparkles, label: "Premium" },
  { path: "/profile", icon: User, label: "Perfil" },
];

const getLastAnalysis = () => {
  // Prefer in-memory API cache (populated by Dashboard) — has full routine data
  const cached = getCachedLatestAnalysis();
  if (cached) {
    console.debug("[BottomNav] Using cached analysis", { id: cached.id });
    return cached;
  }

  // Fallback: localStorage stored after last analysis
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
    
    // Log current state
    console.debug("[BottomNav] Routine click - analysis available:", {
      hasAnalysis: !!analysis,
      analysisId: analysis?.id,
      hasRoutine: !!(analysis?.routine?.morning?.length || analysis?.routine?.night?.length),
      hasRecommendations: !!analysis?.recommendations?.length,
      recommendationCount: analysis?.recommendations?.length ?? 0,
    });
    
    // If we have an analysis ID but no recommendations, fetch the full version
    if (analysis && analysis.id && !analysis.recommendations?.length) {
      try {
        console.debug("[BottomNav] Fetching full analysis with recommendations...");
        const fullAnalysis = await fetchAnalysisWithRecommendations(analysis.id);
        if (fullAnalysis) {
          analysis = fullAnalysis;
          console.debug("[BottomNav] ✅ Fetched full analysis", {
            id: analysis.id,
            recommendationCount: analysis.recommendations?.length ?? 0,
          });
        }
      } catch (error) {
        console.error("[BottomNav] Failed to fetch full analysis:", error);
      }
    }
    
    // Always pass analysis, even if partial - Routine page will handle loading fallbacks
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
        className="flex flex-col items-center gap-0.5 py-1.5 px-3 relative min-w-[60px]"
      >
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute -top-1 w-10 h-1 rounded-full gradient-primary"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <Icon
          size={20}
          className={isActive ? "text-primary" : "text-muted-foreground"}
          strokeWidth={isActive ? 2.5 : 1.8}
        />
        <span
          className={`text-[10px] font-semibold ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass bottom-nav-safe border-t border-border/30">
      <div className="flex items-center justify-around max-w-md mx-auto px-2 pt-2 relative">
        {leftTabs.map(renderTab)}

        {/* Floating center camera button */}
        <div className="relative -mt-8">
          <button
            onClick={() => navigate("/analyze")}
            className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-glow active:scale-95 transition-transform border-4 border-background"
          >
            <Camera size={22} className="text-primary-foreground" />
          </button>
        </div>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
};

export default BottomNav;
