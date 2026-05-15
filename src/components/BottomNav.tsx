import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Clock, User, Camera, Sparkles, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

// ── Constantes ────────────────────────────────────────────────────────────────
const BUBBLE  = 52;  // diâmetro da bolha
const NAV_H   = 64;  // altura da barra
const DIP_D   = 20;  // profundidade do dip (sink effect)
const DIP_W   = 68;  // largura total do dip
const EASING  = "cubic-bezier(0.34, 1.56, 0.64, 1)";

interface Tab { path: string; icon: LucideIcon; label: string }

// ── Path SVG da navbar: pill com dip afundado no topo ────────────────────────
// Estrutura FIXA de 13 comandos → CSS transition interpola corretamente
function buildNavPath(W: number, H: number, cx: number, dd = DIP_D): string {
  const r  = 32;          // border-radius da pill
  const dw = DIP_W;
  // Garante que o dip não cruze os cantos arredondados
  const safeCx = Math.min(Math.max(cx, r + dw / 2 + 2), W - r - dw / 2 - 2);
  const lx = safeCx - dw / 2;
  const rx = safeCx + dw / 2;
  // Pontos de controle para curva suave (S-curve)
  const cp1x = lx + dw * 0.44;
  const cp2x = safeCx - dw * 0.1;
  const cp3x = safeCx + dw * 0.1;
  const cp4x = rx - dw * 0.44;

  return [
    `M ${r} 0`,
    `L ${lx} 0`,
    `C ${cp1x} 0 ${cp2x} ${dd} ${safeCx} ${dd}`,
    `C ${cp3x} ${dd} ${cp4x} 0 ${rx} 0`,
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
  const location = useLocation();
  const navigate = useNavigate();
  const { isPremium, isLoading: premiumLoading, statusUnknown } = useIsPremium();
  const showRoutine = isPremium || premiumLoading || statusUnknown;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const leftTabs: Tab[] = [
    { path: "/dashboard", icon: Home,       label: "Início"    },
    { path: "/history",   icon: Clock,      label: "Histórico" },
  ];
  const rightTabs: Tab[] = [
    showRoutine
      ? { path: "/routine", icon: ListChecks, label: "Rotina"   }
      : { path: "/premium", icon: Sparkles,   label: "Premium"  },
    { path: "/profile",   icon: User,       label: "Perfil"    },
  ];
  const allTabs      = [...leftTabs, ...rightTabs];
  const activeIdx    = allTabs.findIndex(t => location.pathname === t.path);
  const ActiveIcon   = activeIdx >= 0 ? allTabs[activeIdx].icon : null;

  // ── State ─────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs      = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready,    setReady]    = useState(false);
  const [bubbleX,  setBubbleX]  = useState(0);
  const [navPath,  setNavPath]  = useState("");
  const [containerW, setContainerW] = useState(0);

  // ── Medição e cálculo do path ─────────────────────────────────────────────
  const measure = useCallback(() => {
    const wrap = containerRef.current;
    if (!wrap) return;

    const W   = wrap.offsetWidth;
    const wR  = wrap.getBoundingClientRect();
    setContainerW(W);

    if (activeIdx >= 0) {
      const el = tabRefs.current[activeIdx];
      if (!el) return;
      const eR = el.getBoundingClientRect();
      const cx = eR.left - wR.left + eR.width / 2;
      const bx = cx - BUBBLE / 2;
      setBubbleX(bx);
      setNavPath(buildNavPath(W, NAV_H, cx));
    } else {
      // Nenhuma aba ativa (ex: /analyze) — dip no centro (abaixo da câmera)
      const cx = W / 2;
      setNavPath(buildNavPath(W, NAV_H, cx));
    }

    setReady(true);
  }, [activeIdx]);

  // useLayoutEffect: síncrono antes do paint → zero flash
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // ── Routine click ─────────────────────────────────────────────────────────
  const handleRoutineClick = async () => {
    let analysis = getLastAnalysis();
    if (analysis?.id && !analysis.recommendations?.length) {
      try { const f = await fetchAnalysisWithRecommendations(analysis.id); if (f) analysis = f; }
      catch { /* segue */ }
    }
    if (analysis) navigate("/routine", { state: { analysis } });
    else navigate("/routine");
  };

  // ── Render tab ────────────────────────────────────────────────────────────
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

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 bottom-nav-safe px-4">
      <div
        ref={containerRef}
        style={{
          position: "relative",
          height: NAV_H,
          maxWidth: 448,
          margin: "0 auto",
          overflow: "visible",
        }}
      >
        {/* ── Camada 1: Fundo liquiglass com dip (clip-path: path) ─────────── */}
        {ready && (
          <div
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%",
              height: NAV_H,
              background: "var(--glass-bg-strong)",
              backdropFilter: "blur(28px) saturate(1.8)",
              WebkitBackdropFilter: "blur(28px) saturate(1.8)",
              clipPath: navPath ? `path('${navPath}')` : undefined,
              transition: `clip-path 0.4s ${EASING}`,
              zIndex: 1,
            }}
          />
        )}

        {/* ── Camada 2: Borda + highlight SVG (sincronizado com o dip) ──────── */}
        {ready && containerW > 0 && (
          <svg
            style={{ position: "absolute", top: 0, left: 0, width: containerW, height: NAV_H, zIndex: 2, pointerEvents: "none" }}
            aria-hidden="true"
          >
            {/* Borda externa */}
            <path
              d={navPath}
              fill="none"
              stroke="var(--glass-border)"
              strokeWidth="1"
              style={{ transition: `d 0.4s ${EASING}` }}
            />
            {/* Inset highlight (reflexo de vidro no topo) */}
            <path
              d={navPath}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="0.8"
              strokeDasharray="1 0"
              style={{
                clipPath: `inset(0 0 ${NAV_H * 0.6}px 0)`,
                transition: `d 0.4s ${EASING}`,
              }}
            />
          </svg>
        )}

        {/* ── Camada 3: Bolha flutuante (spring) ───────────────────────────── */}
        {ready && activeIdx >= 0 && (
          <motion.div
            initial={false}
            animate={{ x: bubbleX }}
            transition={{ type: "spring", stiffness: 370, damping: 24, mass: 0.75 }}
            style={{
              position: "absolute",
              bottom: NAV_H / 2 - BUBBLE / 2 + DIP_D - 6,  // centro alinhado ao fundo do dip
              left: 0,
              width: BUBBLE,
              height: BUBBLE,
              borderRadius: "50%",
              background: "var(--grad-coral)",
              boxShadow:
                "0 8px 28px -4px rgba(220,100,140,0.55)," +
                "0 2px 8px -2px rgba(220,100,140,0.3)," +
                "inset 0 1px 0 rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              pointerEvents: "none",
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

        {/* ── Camada 4: Conteúdo da barra (tabs + câmera) ──────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            paddingInline: 6,
            zIndex: 10,
          }}
        >
          {/* Tabs esquerdas */}
          <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {leftTabs.map((tab, i) => renderTab(tab, i))}
          </div>

          {/* Câmera — FAB central flutuante, alinhado ao dip central */}
          <div
            style={{
              width: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              // Não é incluída nos tabRefs — posição fixa no centro
            }}
          >
            <motion.button
              onClick={() => navigate("/analyze")}
              aria-label="Analisar pele"
              whileTap={{ scale: 0.9 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--grad-coral)",
                border: "none",
                // translateY para que o centro da câmera coincida com o fundo do dip
                transform: `translateY(-${DIP_D / 2 + 6}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 8px 28px -4px rgba(220,100,140,0.55)," +
                  "0 2px 8px -2px rgba(220,100,140,0.3)," +
                  "inset 0 1px 0 rgba(255,255,255,0.35)",
                cursor: "pointer",
                flexShrink: 0,
                zIndex: 15,
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
