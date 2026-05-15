import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Home, Clock, User, Camera, Sparkles, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsPremium } from "@/hooks/useIsPremium";
import { normalizeAnalysis } from "@/lib/analysis";
import { getCachedLatestAnalysis, fetchAnalysisWithRecommendations } from "@/lib/analysisClient";

// ── Constantes ────────────────────────────────────────────────────────────────
const BUBBLE  = 52;                          // diâmetro da bolha
const NAV_H   = 64;                          // altura da barra
const DIP_D   = Math.round(NAV_H * 0.85);   // profundidade = 85% da altura (≈54px)
const DIP_HW  = BUBBLE / 2 + 10;            // meia-largura da calha (36px → 72px total)
const CR_TOP  = 14;                          // raio do canto na abertura superior
const CR_BOT  = 22;                          // raio do canto na base da calha
const EASING  = "cubic-bezier(0.34, 1.56, 0.64, 1)";

interface Tab { path: string; icon: LucideIcon; label: string }

// ── Path SVG: pill com calha U profunda e cantos arredondados ─────────────────
// Estrutura FIXA de 18 comandos → CSS transition interpola corretamente.
// A calha tem paredes verticais + raios nos 4 cantos do U.
// A bolha (BUBBLE=52) fica centralizada no vão (altura DIP_D, largura DIP_HW*2).
function buildNavPath(W: number, H: number, cx: number): string {
  const r   = 32;    // pill border-radius
  const d   = DIP_D;
  const hw  = DIP_HW;
  const crt = CR_TOP;
  const crb = CR_BOT;

  // Clamp: calha não cruza os cantos da pill
  const scx = Math.min(Math.max(cx, r + hw + 2), W - r - hw - 2);

  return [
    `M ${r} 0`,
    `L ${scx - hw + crt} 0`,                               // topo até canto esq-abertura
    `Q ${scx - hw} 0 ${scx - hw} ${crt}`,                  // canto sup-esq (entrada da calha)
    `L ${scx - hw} ${d - crb}`,                             // parede esquerda
    `Q ${scx - hw} ${d} ${scx - hw + crb} ${d}`,           // canto inf-esq (base da calha)
    `L ${scx + hw - crb} ${d}`,                             // fundo da calha
    `Q ${scx + hw} ${d} ${scx + hw} ${d - crb}`,           // canto inf-dir
    `L ${scx + hw} ${crt}`,                                 // parede direita
    `Q ${scx + hw} 0 ${scx + hw - crt} 0`,                 // canto sup-dir (saída da calha)
    `L ${W - r} 0`,                                         // topo até canto pill dir
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
          pointerEvents: "auto",
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
              pointerEvents: "none",
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
              // Centro da bolha no meio do vão: DIP_D/2 do topo → bottom = NAV_H - DIP_D/2 - BUBBLE/2
              bottom: NAV_H - DIP_D / 2 - BUBBLE / 2,
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
                // Câmera alinhada com o centro do vão: shift de (NAV_H/2 - DIP_D/2) para cima
                transform: `translateY(-${Math.round(NAV_H / 2 - DIP_D / 2)}px)`,
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
