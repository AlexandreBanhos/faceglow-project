import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Clock, User, Camera, Sparkles, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

// ── Geometria ─────────────────────────────────────────────────────────────────
const BUBBLE  = 52;          // diâmetro da bolha
const NAV_H   = 64;          // altura da barra
const DIP_D   = Math.round(NAV_H * 0.85);   // = 54px (85% da altura)
const DIP_HW  = 26;          // meia-largura do vão (= raio da bolha → vão = 52px)
const CR_TOP  = 12;          // raio do canto na abertura
const CR_BOT  = 18;          // raio do canto na base
const PILL_R  = 28;          // border-radius do path SVG (< NAV_H/2 para cantos reais)
const WAVE_H  = Math.round(DIP_D * 0.38);   // altura da camada de onda
const SPRING  = { type: "spring" as const, stiffness: 370, damping: 24, mass: 0.75 };
const EASING  = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// cx mínimo/máximo para que o path seja válido (dip não ultrapassa cantos da pill)
const minCx = (W: number) => PILL_R + DIP_HW - CR_TOP + 2;   // ≈ 44px
const maxCx = (W: number) => W - PILL_R - DIP_HW + CR_TOP - 2;

interface Tab { path: string; icon: LucideIcon; label: string }

// ── Path SVG: pill com calha-U profunda, cantos arredondados ─────────────────
// 18 comandos fixos → CSS transition interpola corretamente entre posições.
function buildNavPath(W: number, H: number, cx: number): string {
  const d = DIP_D, hw = DIP_HW, crt = CR_TOP, crb = CR_BOT, r = PILL_R;
  return [
    `M ${r} 0`,
    `L ${cx - hw + crt} 0`,
    `Q ${cx - hw} 0 ${cx - hw} ${crt}`,
    `L ${cx - hw} ${d - crb}`,
    `Q ${cx - hw} ${d} ${cx - hw + crb} ${d}`,
    `L ${cx + hw - crb} ${d}`,
    `Q ${cx + hw} ${d} ${cx + hw} ${d - crb}`,
    `L ${cx + hw} ${crt}`,
    `Q ${cx + hw} 0 ${cx + hw - crt} 0`,
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

// ── Onda SVG (um período completo, scrollada infinitamente) ──────────────────
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
  const { isPremium, isLoading: premiumLoading, statusUnknown } = useIsPremium();
  const showRoutine = isPremium || premiumLoading || statusUnknown;

  const leftTabs: Tab[]  = [
    { path: "/dashboard", icon: Home,       label: "Início"    },
    { path: "/history",   icon: Clock,      label: "Histórico" },
  ];
  const rightTabs: Tab[] = [
    showRoutine
      ? { path: "/routine",  icon: ListChecks, label: "Rotina"   }
      : { path: "/premium",  icon: Sparkles,   label: "Premium"  },
    { path: "/profile",   icon: User,       label: "Perfil"    },
  ];
  const allTabs   = [...leftTabs, ...rightTabs];
  const activeIdx = allTabs.findIndex(t => location.pathname === t.path);
  const ActiveIcon = activeIdx >= 0 ? allTabs[activeIdx].icon : null;

  // ── State ─────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs      = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready,     setReady]     = useState(false);
  const [dipCx,     setDipCx]     = useState(0);   // centro clamped do dip
  const [bubbleX,   setBubbleX]   = useState(0);   // left da bolha (= dipCx - BUBBLE/2)
  const [navPath,   setNavPath]   = useState("");
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
      // Clamp: garante que o path SVG seja geometricamente válido
      cx = Math.min(Math.max(raw, minCx(W)), maxCx(W));
    } else {
      cx = W / 2;  // câmera / página sem aba ativa → dip no centro
    }

    // Bolha e dip sempre usam o mesmo cx → sem desalinhamento
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

  // Posição vertical: bolha centrada no vão
  const bubbleBottom = NAV_H - DIP_D / 2 - BUBBLE / 2;
  // Câmera: mesmo centro vertical da bolha, dentro do flex (shift a partir do centro do nav)
  const cameraShift  = NAV_H / 2 - DIP_D / 2;

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 bottom-nav-safe px-4">
      <div
        ref={containerRef}
        style={{ position: "relative", height: NAV_H, maxWidth: 448, margin: "0 auto", overflow: "visible", pointerEvents: "auto" }}
      >
        {/* ── z:1 Glass com clip-path do dip ─────────────────────────────── */}
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

        {/* ── z:2 Borda SVG sincronizada ──────────────────────────────────── */}
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

        {/* ── z:4 Onda no vão (segue a bolha com o mesmo spring) ──────────── */}
        {ready && activeIdx >= 0 && (
          <motion.div
            initial={false}
            animate={{ x: dipCx - DIP_HW }}
            transition={SPRING}
            style={{
              position: "absolute",
              bottom: NAV_H - DIP_D + CR_BOT,
              left: 0,
              width: DIP_HW * 2,
              height: WAVE_H,
              overflow: "hidden",
              borderRadius: `0 0 ${CR_BOT - 4}px ${CR_BOT - 4}px`,
              zIndex: 4,
              pointerEvents: "none",
            }}
          >
            {/* 3 períodos: scroll de 1 período cria loop perfeito */}
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

        {/* ── z:20 Bolha flutuante (spring) ───────────────────────────────── */}
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
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.04 }}
            >
              {ActiveIcon && <ActiveIcon size={22} color="white" strokeWidth={2.2} />}
            </motion.div>
          </motion.div>
        )}

        {/* ── z:10 Conteúdo (tabs + câmera) ───────────────────────────────── */}
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
                width: BUBBLE,
                height: BUBBLE,
                borderRadius: "50%",
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
