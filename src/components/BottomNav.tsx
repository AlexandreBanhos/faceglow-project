import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Clock, User, Camera, Sparkles, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

// ── Constantes ────────────────────────────────────────────────────────────────
const BUBBLE   = 52;   // diâmetro da bolha
const NAV_H    = 64;   // altura do container escuro
const BUBBLE_B = 24;   // bottom da bolha relativo ao container (24 → sobe 12px acima do nav)

interface Tab { path: string; icon: LucideIcon; label: string }

// ── Helper: último análise salvo ──────────────────────────────────────────────
const getLastAnalysis = () => {
  const cached = getCachedLatestAnalysis();
  if (cached) return cached;
  try {
    const raw = localStorage.getItem("faceglow-last-analysis");
    if (raw) return normalizeAnalysis(JSON.parse(raw));
  } catch { /* silent */ }
  return null;
};

// ── Componente ────────────────────────────────────────────────────────────────
const BottomNav = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { isPremium, isLoading: premiumLoading, statusUnknown } = useIsPremium();
  const showRoutine = isPremium || premiumLoading || statusUnknown;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const leftTabs: Tab[] = [
    { path: "/dashboard", icon: Home,       label: "Início"   },
    { path: "/history",   icon: Clock,      label: "Histórico"},
  ];
  const rightTabs: Tab[] = [
    showRoutine
      ? { path: "/routine",  icon: ListChecks, label: "Rotina"   }
      : { path: "/premium",  icon: Sparkles,   label: "Premium"  },
    { path: "/profile",  icon: User,       label: "Perfil"   },
  ];
  const allTabs = [...leftTabs, ...rightTabs];
  const activeIdx = allTabs.findIndex(t => location.pathname === t.path);
  const ActiveIcon = activeIdx >= 0 ? allTabs[activeIdx].icon : null;

  // ── Bubble position ───────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs      = useRef<(HTMLButtonElement | null)[]>([]);
  const [bubbleX, setBubbleX] = useState<number | null>(null);

  const measure = useCallback(() => {
    if (activeIdx < 0) return;
    const el   = tabRefs.current[activeIdx];
    const wrap = containerRef.current;
    if (!el || !wrap) return;
    const wR = wrap.getBoundingClientRect();
    const eR = el.getBoundingClientRect();
    setBubbleX(eR.left - wR.left + eR.width / 2 - BUBBLE / 2);
  }, [activeIdx]);

  // Mede ANTES do paint → bubble aparece no lugar certo desde o frame 0
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // ── Routine click (mantém lógica original) ────────────────────────────────
  const handleRoutineClick = async () => {
    let analysis = getLastAnalysis();
    if (analysis?.id && !analysis.recommendations?.length) {
      try { const f = await fetchAnalysisWithRecommendations(analysis.id); if (f) analysis = f; }
      catch { /* segue sem recomendações */ }
    }
    if (analysis) navigate("/routine", { state: { analysis } });
    else navigate("/routine");
  };

  // ── Render helper ─────────────────────────────────────────────────────────
  const renderTab = (tab: Tab, idx: number) => {
    const isActive = location.pathname === tab.path;
    return (
      <button
        key={tab.path}
        ref={el => { tabRefs.current[idx] = el; }}
        onClick={() => { if (tab.path === "/routine") void handleRoutineClick(); else navigate(tab.path); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 3,
          height: 48, minWidth: 52, padding: "0 8px",
          border: "none", background: "transparent", cursor: "pointer",
        }}
      >
        {/* Ícone invisível quando ativo (o bubble mostra o ativo) */}
        <tab.icon
          size={20}
          strokeWidth={1.9}
          style={{ color: isActive ? "transparent" : "#888", transition: "color 0.2s" }}
        />
        <span style={{
          fontSize: 9, fontWeight: 700, lineHeight: 1, letterSpacing: "0.03em",
          color: isActive ? "transparent" : "#666",
          transition: "color 0.2s",
        }}>
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 bottom-nav-safe px-4">
      {/* Container relativo — âncora da bolha absoluta */}
      <div ref={containerRef} style={{ position: "relative", maxWidth: 448, margin: "0 auto" }}>

        {/* ── Bolha flutuante ─────────────────────────────────────────────── */}
        {bubbleX !== null && activeIdx >= 0 && (
          <motion.div
            initial={false}                  // sem animação no mount → posição instantânea
            animate={{ x: bubbleX }}
            transition={{
              type: "spring",
              stiffness: 370,
              damping: 24,
              mass: 0.75,
            }}
            style={{
              position: "absolute",
              bottom: BUBBLE_B,
              left: 0,
              width: BUBBLE,
              height: BUBBLE,
              borderRadius: "50%",
              background: "var(--grad-coral)",
              boxShadow: "0 8px 28px -4px rgba(220,100,140,0.55), 0 2px 8px -2px rgba(220,100,140,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            {/* Ícone ativo — anima ao mudar de aba */}
            <motion.div
              key={activeIdx}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.04 }}
            >
              {ActiveIcon && <ActiveIcon size={22} color="white" strokeWidth={2.2} />}
            </motion.div>
          </motion.div>
        )}

        {/* ── Navbar escura ───────────────────────────────────────────────── */}
        <div
          style={{
            height: NAV_H,
            background: "#1c1c1e",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 -2px 16px -4px rgba(0,0,0,0.25), 0 8px 32px -8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            paddingInline: 6,
          }}
        >
          {/* Tabs esquerdas */}
          <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {leftTabs.map((tab, i) => renderTab(tab, i))}
          </div>

          {/* Câmera — FAB central que flutua acima */}
          <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <motion.button
              onClick={() => navigate("/analyze")}
              aria-label="Analisar pele"
              whileTap={{ scale: 0.91 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--grad-coral)",
                border: "4px solid #1c1c1e",
                transform: "translateY(-14px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 28px -4px rgba(220,100,140,0.55)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Camera size={22} color="white" strokeWidth={2} />
            </motion.button>
          </div>

          {/* Tabs direitas */}
          <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {rightTabs.map((tab, i) => renderTab(tab, leftTabs.length + i))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
