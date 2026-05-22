import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Clock, User, Camera, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

// ── Geometria ─────────────────────────────────────────────────────────────────
const BUBBLE = 52;
const NAV_H  = 64;
const DIP_D  = Math.round(NAV_H * 0.85);  // 54px
const DIP_HW = 28;                         // meia-largura do vão
const WAVE_H = Math.round(DIP_D * 0.38);
const SPRING = { type: "spring" as const, stiffness: 370, damping: 24, mass: 0.75 };
const EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const NAV_RADIUS = 24; // raio dos cantos — visível pois o nav flutua

const minCx = (W: number) => DIP_HW + 2;
const maxCx = (W: number) => W - DIP_HW - 2;

interface Tab { path: string; icon: LucideIcon; label: string }

// ── Path SVG: todos os cantos arredondados + dip suave ───────────────────────
function buildNavPath(W: number, H: number, cx: number): string {
  const hw = DIP_HW;
  const sm = hw * 0.48;
  const bm = hw * 0.22;
  const d  = DIP_D;
  const r  = NAV_RADIUS;
  return [
    `M ${r} 0`,
    `L ${cx - hw} 0`,
    `C ${cx - hw + sm} 0 ${cx - bm} ${d} ${cx} ${d}`,
    `C ${cx + bm} ${d} ${cx + hw - sm} 0 ${cx + hw} 0`,
    `L ${W - r} 0`,
    `Q ${W} 0 ${W} ${r}`,
    `L ${W} ${H - r}`,
    `Q ${W} ${H} ${W - r} ${H}`,
    `L ${r} ${H}`,
    `Q 0 ${H} 0 ${H - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    `Z`,
  ].join(" ");
}

// ── Onda ─────────────────────────────────────────────────────────────────────
const waveW = DIP_HW * 2;
const waveD = [
  `M 0 ${WAVE_H * 0.5}`,
  `C ${waveW * 0.25} 0 ${waveW * 0.25} 0 ${waveW * 0.5} ${WAVE_H * 0.5}`,
  `C ${waveW * 0.75} ${WAVE_H} ${waveW * 0.75} ${WAVE_H} ${waveW} ${WAVE_H * 0.5}`,
  `L ${waveW} ${WAVE_H} L 0 ${WAVE_H} Z`,
].join(" ");

const WavePeriod = () => (
  <svg width={waveW} height={WAVE_H} style={{ display: "block", flexShrink: 0 }}>
    <defs>
      <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(239,143,184,0.22)" />
        <stop offset="100%" stopColor="rgba(221,182,147,0.08)" />
      </linearGradient>
    </defs>
    <path d={waveD} fill="url(#wg)" />
  </svg>
);

// ── Helper ────────────────────────────────────────────────────────────────────
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
  const location = useNavigate ? useLocation() : { pathname: "/" };
  const navigate = useNavigate();
  const leftTabs: Tab[]  = [
    { path: "/dashboard", icon: Home,       label: "Início"    },
    { path: "/history",   icon: Clock,      label: "Histórico" },
  ];
  const rightTabs: Tab[] = [
    { path: "/routine",  icon: ListChecks, label: "Rotina"   },
    { path: "/profile",  icon: User,       label: "Perfil"   },
  ];
  const allTabs   = [...leftTabs, ...rightTabs];
  const activeIdx = allTabs.findIndex(t => location.pathname === t.path);
  const ActiveIcon = activeIdx >= 0 ? allTabs[activeIdx].icon : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs      = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready,      setReady]      = useState(false);
  const [dipCx,      setDipCx]      = useState(0);
  const [bubbleX,    setBubbleX]    = useState(0);
  const [navPath,    setNavPath]     = useState("");
  const [containerW, setContainerW] = useState(0);

  const measure = useCallback(() => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const W  = wrap.offsetWidth;
    const wR = wrap.getBoundingClientRect();
    setContainerW(W);
    let cx: number;
    if (activeIdx >= 0) {
      const el = tabRefs.current[activeIdx];
      if (!el) return;
      const eR = el.getBoundingClientRect();
      const raw = eR.left - wR.left + eR.width / 2;
      cx = Math.min(Math.max(raw, minCx(W)), maxCx(W));
    } else {
      cx = W / 2;
    }
    setDipCx(cx);
    setBubbleX(cx - BUBBLE / 2);
    setNavPath(buildNavPath(W, NAV_H, cx));
    setReady(true);
  }, [activeIdx]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const handleRoutineClick = async () => {
    let analysis = getLastAnalysis();
    if (analysis?.id && !analysis.recommendations?.length) {
      try { const f = await fetchAnalysisWithRecommendations(analysis.id); if (f) analysis = f; }
      catch { /* prossegue */ }
    }
    if (analysis) navigate("/routine", { state: { analysis } });
    else navigate("/routine");
  };

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
        <tab.icon
          size={20}
          strokeWidth={isActive ? 2.2 : 1.8}
          style={{ color: isActive ? "transparent" : "var(--fg-ink-3, rgba(60,30,50,0.45))", transition: "color 0.2s" }}
        />
        <span style={{
          fontSize: 9, fontWeight: 700, lineHeight: 1, letterSpacing: "0.03em",
          color: isActive ? "transparent" : "var(--fg-ink-3, rgba(60,30,50,0.45))",
          transition: "color 0.2s",
        }}>
          {tab.label}
        </span>
      </button>
    );
  };

  const bubbleBottom = NAV_H - DIP_D / 2 - BUBBLE / 2;
  const cameraShift  = NAV_H / 2 - DIP_D / 2;

  return (
    // Wrapper: fixed inset-x com flex centering — sem transform para não criar containing block
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        padding: "0 12px",
        paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none",
      }}
    >
      {/* Container interno: max-width centralizado por margin, pointer-events auto */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          height: NAV_H,
          width: "100%",
          maxWidth: 520,
          overflow: "visible",
          pointerEvents: "auto",
          borderRadius: NAV_RADIUS,
        }}
      >
        {/* z:1 Glass com clip-path */}
        {ready && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: NAV_H,
            background: "var(--glass-bg-strong)",
            backdropFilter: "blur(28px) saturate(1.8)",
            WebkitBackdropFilter: "blur(28px) saturate(1.8)",
            clipPath: navPath ? `path('${navPath}')` : undefined,
            transition: `clip-path 0.4s ${EASING}`,
            zIndex: 1, pointerEvents: "none",
          }} />
        )}

        {/* z:2 Borda SVG sincronizada */}
        {ready && containerW > 0 && (
          <svg
            aria-hidden
            style={{ position: "absolute", top: 0, left: 0, width: containerW, height: NAV_H, zIndex: 2, pointerEvents: "none" }}
          >
            <path d={navPath} fill="none" stroke="var(--glass-border)" strokeWidth="1"
              style={{ transition: `d 0.4s ${EASING}` }} />
            <path d={navPath} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7"
              style={{ clipPath: `inset(0 0 ${NAV_H * 0.55}px 0)`, transition: `d 0.4s ${EASING}` }} />
          </svg>
        )}

        {/* z:4 Onda no vão */}
        {ready && activeIdx >= 0 && (
          <motion.div
            initial={false}
            animate={{ x: dipCx - DIP_HW }}
            transition={SPRING}
            style={{
              position: "absolute",
              bottom: NAV_H - DIP_D + 14,
              left: 0,
              width: DIP_HW * 2,
              height: WAVE_H,
              overflow: "hidden",
              borderRadius: `0 0 ${14 - 4}px ${14 - 4}px`,
              zIndex: 4,
              pointerEvents: "none",
            }}
          >
            <motion.div
              style={{ display: "flex", position: "absolute", top: 0, left: 0 }}
              animate={{ x: [0, -waveW] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
            >
              <WavePeriod />
              <WavePeriod />
              <WavePeriod />
            </motion.div>
          </motion.div>
        )}

        {/* z:20 Bolha flutuante (spring) */}
        {ready && activeIdx >= 0 && (
          <motion.div
            initial={false}
            animate={{ x: bubbleX }}
            transition={SPRING}
            style={{
              position: "absolute",
              bottom: bubbleBottom,
              left: 0,
              width: BUBBLE,
              height: BUBBLE,
              borderRadius: "50%",
              background: "var(--grad-coral)",
              boxShadow:
                "0 8px 28px -4px rgba(220,100,140,0.55)," +
                "0 2px 8px -2px rgba(220,100,140,0.3)," +
                "inset 0 1px 0 rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 20, pointerEvents: "none",
            }}
          >
            <motion.div
              key={activeIdx}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.04 }}
            >
              {ActiveIcon && <ActiveIcon size={22} color="white" strokeWidth={2.2} />}
            </motion.div>
          </motion.div>
        )}

        {/* z:10 Tabs + câmera */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingInline: 6, zIndex: 10 }}>
          <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {leftTabs.map((tab, i) => renderTab(tab, i))}
          </div>

          <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <motion.button
              onClick={() => navigate("/analyze")}
              aria-label="Analisar pele"
              whileTap={{ scale: 0.9 }}
              style={{
                width: BUBBLE, height: BUBBLE, borderRadius: "50%",
                background: "var(--grad-coral)",
                border: "none",
                transform: `translateY(-${cameraShift}px)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow:
                  "0 8px 28px -4px rgba(220,100,140,0.55)," +
                  "0 2px 8px -2px rgba(220,100,140,0.3)," +
                  "inset 0 1px 0 rgba(255,255,255,0.35)",
                cursor: "pointer", flexShrink: 0, zIndex: 15,
              }}
            >
              <Camera size={22} color="white" strokeWidth={2} />
            </motion.button>
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {rightTabs.map((tab, i) => renderTab(tab, leftTabs.length + i))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
