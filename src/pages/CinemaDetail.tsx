import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Home, Loader2, AlertCircle, X } from "lucide-react";
import supportIconUrl from "@/assets/icones/icone-conteudo-falado.svg";
import { PopcornIllustration } from "@/components/cinema/PopcornIllustration";
import { BackIcon, CheckIcon, ClubIcon, FilmsIcon, OrdersIcon, SnackIcon } from "@/components/cinema/CinemaIcons";
import {
  getPedido, deletePedido, resgataIngresso,
  type CinemaPedido, type CinemaIngresso,
} from "@/lib/cinema";

// ── Constants ─────────────────────────────────────────────────────────────────

// Paleta da referência visual
const PAGE_BG = "#111111";
const TICKET_BG = "#1A1A1A";
const NAV_BG = "#1A1A1A";
const SHEET_BG = "#1B1A18";
const DIVIDER = "#2D2E2B";
const RED = "#D90101";
const GREEN = "#0A7C53";
const GREEN_DARK = "#07543A";
const TEXT = "#FFFFFF";
const TEXT_2 = "#E6E6E6";
const TEXT_3 = "#B2B3B0";
const TEXT_MUTED = "#898886";
const SURFACE_2 = "#252525";
const RADIUS = 12;
// Oswald: display/cinematográfico (título, tags, estados, botões). Work Sans: interface e conteúdo.
const FONT_DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const FONT_UI = "'Work Sans', system-ui, sans-serif";

const actionBtn: React.CSSProperties = {
  fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 15,
  textTransform: "uppercase", letterSpacing: "0.02em",
  borderRadius: RADIUS, border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

// Layout (medidas da referência em tela de 390pt)
const CONTENT_W = "min(100vw - 78px, 420px)";
const TICKET_PX = 22;
const SCALLOP_R = 7;       // entalhes da borda superior do ticket
const SCALLOP_STEP = 22;
const DOT_SIZE = 15;       // perfuração entre ingressos
const DOT_END_SIZE = 22;   // entalhes das pontas (meio círculo em cada borda)
const DOT_COUNT = 13;

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

// "J10" → "J 10"
function fmtAssento(assento: string) {
  return assento.trim().replace(/^([A-Za-z]+)\s*(\d+)$/, "$1 $2");
}

// Código exibido abaixo do barcode: só dígitos, derivado do token (UUID hex → decimal)
function numericCode(token: string) {
  const hex = token.replace(/[^0-9a-f]/gi, "");
  if (!hex) return "";
  return BigInt(`0x${hex}`).toString().padStart(20, "0").slice(-20);
}

function tagStyle(tag: string): { bg: string; color: string } {
  const t = tag.toUpperCase();
  if (t === "DUB" || t === "DUBLADO")   return { bg: "#812627", color: TEXT };
  if (t === "LEG" || t === "LEGENDADO") return { bg: "#6B3A10", color: TEXT };
  if (t === "3D")                       return { bg: "#0C1960", color: TEXT };
  if (t === "IMAX")                     return { bg: "#3D0F6B", color: TEXT };
  if (t === "4DX")                      return { bg: "#004D40", color: TEXT };
  return { bg: "#333333", color: TEXT };
}

// Larguras alternadas barra/espaço, determinísticas pelo token. Barras finas predominam (1–4 módulos),
// espaços 1–3, com barras-guia nas pontas como num código real.
const BAR_WIDTHS = [1, 1, 1, 2, 2, 3, 4];
const GAP_WIDTHS = [1, 1, 2, 2, 3];
const GUARD = [1, 1, 1, 1, 1];

function barcodeWidths(seed: string, count = 150): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const result: number[] = [...GUARD];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    const table = i % 2 === 0 ? GAP_WIDTHS : BAR_WIDTHS;
    result.push(table[(h >>> 8) % table.length]);
  }
  result.push(1, ...GUARD);
  return result;
}

// ── Barcode ───────────────────────────────────────────────────────────────────

function Barcode({ value, color }: { value: string; color: string }) {
  const segments = useMemo(() => {
    const widths = barcodeWidths(value);
    let x = 0;
    return widths.map((w, i) => {
      const seg = { x, w, isBar: i % 2 === 0 };
      x += w;
      return seg;
    });
  }, [value]);

  const totalWidth = segments.reduce((s, seg) => s + seg.w, 0);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} 44`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 44, display: "block" }}
      aria-hidden="true"
    >
      {segments.filter((s) => s.isBar).map((s, i) => (
        <rect key={i} x={s.x} y={0} width={s.w} height={44} fill={color} />
      ))}
    </svg>
  );
}

// ── Loading (4 círculos vermelhos em sequência) ───────────────────────────────

function LoadingDots() {
  return (
    <div role="status" aria-label="Carregando" style={{ display: "flex", gap: 7 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.span
          key={i}
          style={{ width: 10, height: 10, borderRadius: "50%", background: RED }}
          animate={{ opacity: [0.35, 0.35, 1, 0.35] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear", times: [0, i * 0.25, i * 0.25 + 0.1, Math.min(1, i * 0.25 + 0.3)] }}
        />
      ))}
    </div>
  );
}

// ── Perfuração entre ingressos ────────────────────────────────────────────────
// Círculos com o fundo da página; os das pontas são maiores e cortam a borda do ticket.

function DotsDivider() {
  const dot = (size: number, key: number) => (
    <div key={key} style={{ width: size, height: size, borderRadius: "50%", background: PAGE_BG, flexShrink: 0 }} />
  );
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        margin: `0 -${TICKET_PX + DOT_END_SIZE / 2}px`,
      }}
    >
      {dot(DOT_END_SIZE, -1)}
      {Array.from({ length: DOT_COUNT }).map((_, i) => dot(DOT_SIZE, i))}
      {dot(DOT_END_SIZE, DOT_COUNT)}
    </div>
  );
}

// ── Ingresso ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  color: TEXT_3, fontSize: 11, fontWeight: 400, letterSpacing: "0.04em", textTransform: "uppercase",
};
const valueStyle: React.CSSProperties = { color: TEXT, fontSize: 14, fontWeight: 600, marginTop: 4, letterSpacing: "0.01em" };

function TicketItem({ ingresso }: { ingresso: CinemaIngresso }) {
  const resgatado = !!ingresso.resgatado_em;

  return (
    <section aria-label={`Ingresso ${ingresso.tipo || "Inteira"}`} style={{ padding: "26px 0 44px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", columnGap: 16, alignItems: "end", marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={labelStyle}>Tipo de ingresso</p>
          <p style={{ ...valueStyle, paddingLeft: 22 }}>{ingresso.tipo || "Inteira"}</p>
        </div>
        {ingresso.assento && (
          <div style={{ textAlign: "right" }}>
            <p style={labelStyle}>Assento:</p>
            <p style={valueStyle}>{fmtAssento(ingresso.assento)}</p>
          </div>
        )}
      </div>

      {/* Barcode — resgatado: barras escurecidas, código cinza e RESGATADO sobre a parte inferior */}
      <div style={{ display: "grid" }}>
        <div style={{ gridArea: "1 / 1" }}>
          <Barcode value={ingresso.token} color={resgatado ? "#433D3D" : "#8C8A88"} />
          <p style={{
            fontSize: 13, fontWeight: 400, color: resgatado ? TEXT_MUTED : TEXT,
            fontVariantNumeric: "tabular-nums",
            textAlign: "center", marginTop: 4, letterSpacing: "0.06em",
          }}>
            {numericCode(ingresso.token)}
          </p>
        </div>
        {resgatado && (
          <div style={{ gridArea: "1 / 1", height: 44, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6 }}>
            <p style={{
              fontFamily: FONT_DISPLAY, color: TEXT, fontSize: 15, fontWeight: 600, lineHeight: 1,
              textTransform: "uppercase", letterSpacing: "0.02em",
            }}>
              Resgatado
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Bloco de ingressos com swipe-to-action (todos deslizam juntos) ────────────

const SNAP_WIDTH = 148;
const DRAG_THRESHOLD = 55;
const SPRING = { type: "spring" as const, stiffness: 320, damping: 32 };

function TicketsBlock({
  ingressos,
  onResgatar,
}: {
  ingressos: CinemaIngresso[];
  onResgatar: (id: string) => Promise<void>;
}) {
  const controls = useAnimation();
  const [snapped, setSnapped] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pendentes = ingressos.filter((ing) => !ing.resgatado_em);
  const canSwipe = pendentes.length > 0 && !confirmOpen && !loading;

  async function snapOpen() {
    setSnapped(true);
    await controls.start({ x: -SNAP_WIDTH, transition: SPRING });
  }

  async function snapClose() {
    setSnapped(false);
    await controls.start({ x: 0, transition: SPRING });
  }

  async function handleDragEnd(_: unknown, info: PanInfo) {
    if (snapped) {
      if (info.offset.x > DRAG_THRESHOLD / 2) await snapClose();
      else await controls.start({ x: -SNAP_WIDTH, transition: SPRING });
    } else {
      if (info.offset.x < -DRAG_THRESHOLD) await snapOpen();
      else await controls.start({ x: 0, transition: SPRING });
    }
  }

  async function handleResgatar() {
    setConfirmOpen(true);
    await snapClose();
  }

  async function doConfirm() {
    setLoading(true);
    try {
      for (const ing of pendentes) await onResgatar(ing.id);
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const plural = pendentes.length > 1;

  return (
    <>
      {/* Ocupa a largura total do ticket para o painel verde ir até a borda */}
      <div style={{ position: "relative", overflow: "hidden", margin: `0 -${TICKET_PX}px` }}>

        {/* Área revelada no swipe — cobre todos os ingressos */}
        {pendentes.length > 0 && <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: SNAP_WIDTH,
          background: GREEN,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <button
            onClick={handleResgatar}
            className="flex flex-col items-center justify-center active:scale-95 transition-transform"
            style={{ width: 100, height: 80, gap: 8, borderRadius: 10, background: GREEN_DARK }}
            aria-label={plural ? "Resgatar ingressos" : "Resgatar ingresso"}
          >
            <CheckIcon size={20} className="text-white" />
            <span style={{ fontFamily: FONT_DISPLAY, color: TEXT, fontSize: 15, fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Resgatar
            </span>
          </button>
        </div>}

        {/* Ingressos deslizáveis — overflow hidden mantém os entalhes das pontas fora do painel verde */}
        <motion.div
          animate={controls}
          drag={canSwipe ? "x" : false}
          dragConstraints={{ left: -SNAP_WIDTH, right: 0 }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{
            position: "relative",
            overflow: "hidden",
            background: TICKET_BG,
            padding: `0 ${TICKET_PX}px`,
            cursor: canSwipe ? "grab" : "default",
            touchAction: "pan-y",
          }}
        >
          {ingressos.map((ing, idx) => (
            <div key={ing.id}>
              {idx > 0 && <DotsDivider />}
              <TicketItem ingresso={ing} />
            </div>
          ))}
        </motion.div>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        message={plural
          ? "Ao confirmar o resgate dos ingressos, eles não poderão mais ser utilizados."
          : "Ao confirmar o resgate do ingresso, ele não poderá mais ser utilizado."}
        loading={loading}
        onConfirm={doConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}

// ── Ilustração da sirene (popup de confirmação) ───────────────────────────────

function SirenIllustration() {
  return (
    <svg width="240" height="220" viewBox="0 0 240 220" aria-hidden="true">
      <defs>
        <linearGradient id="siren-dome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B80F0A" />
          <stop offset="0.35" stopColor="#F2443A" />
          <stop offset="0.6" stopColor="#DC2E25" />
          <stop offset="1" stopColor="#A10C07" />
        </linearGradient>
        <linearGradient id="siren-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A585B" />
          <stop offset="1" stopColor="#2A292B" />
        </linearGradient>
      </defs>

      {/* Confetes */}
      <path d="M120 22l8-12h-16z" fill="#E8261D" />
      <path d="M38 62l12 6-12 7z" fill="#E8261D" />
      <circle cx="201" cy="46" r="6.5" fill="#910A00" />
      <circle cx="214" cy="133" r="6.5" fill="#C40A00" />
      <path d="M24 160l-10 6 10 6z" fill="#910A00" />
      <circle cx="72" cy="203" r="6.5" fill="#E8261D" />
      <path d="M176 190l-12 3 10 8z" fill="#E8261D" />

      {/* Raios */}
      <g stroke="#F6C93C" strokeWidth="10" strokeLinecap="round">
        <line x1="120" y1="58" x2="120" y2="80" />
        <line x1="78" y1="76" x2="92" y2="90" />
        <line x1="162" y1="76" x2="148" y2="90" />
      </g>

      {/* Cúpula */}
      <path d="M78 168V136c0-26 18.8-44 42-44s42 18 42 44v32z" fill="url(#siren-dome)" />
      <path d="M96 128c2-14 10-22 20-25" stroke="#FF8A80" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Base */}
      <rect x="64" y="164" width="112" height="28" rx="10" fill="url(#siren-base)" />
    </svg>
  );
}

// ── Popup de confirmação (bottom sheet) ───────────────────────────────────────
// Renderizado via portal: dentro do ticket a máscara do serrilhado e o transform do swipe recortariam o sheet.

function ConfirmSheet({ open, message, loading, onConfirm, onClose }: {
  open: boolean; message: string; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            fontFamily: FONT_UI,
          }}
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="confirm-sheet-title"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 512,
              borderRadius: "26px 26px 0 0",
              background: SHEET_BG,
              padding: "24px 25px calc(28px + env(safe-area-inset-bottom, 0px))",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}
          >
            <SirenIllustration />

            <h2 id="confirm-sheet-title" style={{
              fontFamily: FONT_DISPLAY, color: TEXT, fontSize: 22, fontWeight: 600,
              textTransform: "uppercase", marginTop: 32,
            }}>
              Atenção!
            </h2>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 500, lineHeight: 1.45, textAlign: "center", marginTop: 12, maxWidth: 320 }}>
              {message}
            </p>

            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                ...actionBtn,
                width: "100%", height: 52, marginTop: 32,
                background: RED, color: TEXT,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Confirmar"}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                marginTop: 20, padding: "8px 16px",
                color: TEXT, fontSize: 14, fontWeight: 600,
                background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Modal de suporte ──────────────────────────────────────────────────────────

function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "0 20px 32px",
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)",
            fontFamily: FONT_UI,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, borderRadius: RADIUS, padding: 24, background: SHEET_BG }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ color: TEXT, fontSize: 16, fontWeight: 600 }}>Atendimento</p>
              <button onClick={onClose} style={{ padding: 4 }} aria-label="Fechar">
                <X size={20} color={TEXT_3} />
              </button>
            </div>
            <p style={{ color: TEXT_2, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
              Para dúvidas ou problemas com seu pedido, entre em contato com nosso suporte.
            </p>
            <a
              href="mailto:contato@faceglow-soora.me"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: 52, borderRadius: RADIUS,
                background: SURFACE_2, color: TEXT, fontWeight: 600, fontSize: 14,
                border: `1px solid ${DIVIDER}`,
              }}
            >
              contato@faceglow-soora.me
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Header e botão de suporte (compartilhados entre loading e conteúdo) ──────

function PageHeader({ codigo, onBack }: { codigo?: string; onBack: () => void }) {
  return (
    <header style={{ padding: "calc(16px + env(safe-area-inset-top, 0px)) 20px 0" }}>
      <div style={{ height: 72, display: "flex", alignItems: "center", gap: 18 }}>
        <button
          onClick={onBack}
          aria-label="Voltar"
          style={{
            width: 44, height: 44, flexShrink: 0, marginLeft: -10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          <BackIcon size={24} className="text-white" />
        </button>
        <p style={{
          flex: 1, minWidth: 0,
          color: TEXT, fontSize: 16, fontWeight: 600, letterSpacing: "0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          Pedido: {codigo}
        </p>
      </div>
    </header>
  );
}

// Fixo, sobre a borda direita do ticket
function SupportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Suporte"
      style={{
        position: "fixed", zIndex: 25,
        top: "calc(env(safe-area-inset-top, 0px) + 130px)",
        right: `max(8px, calc((100vw - ${CONTENT_W}) / 2 - 33px))`,
        width: 56, height: 56,
        borderRadius: "50%",
        background: TICKET_BG,
        border: "1px solid #2A2A2A",
        boxShadow: "0 4px 18px rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {/* SVG do Canva com PNG embutido: o filtro força o ícone para branco mantendo a transparência */}
      <img src={supportIconUrl} alt="" width={30} height={30} style={{ filter: "brightness(0) invert(1)" }} />
    </button>
  );
}

// ── Bottom Navigation ─────────────────────────────────────────────────────────

type NavItem = "inicio" | "snack" | "filmes" | "club" | "pedidos";

const ICON_BOX = 24;     // altura da área do ícone nos itens laterais
const CENTER_SIZE = 38;  // círculo central; sobe acima da barra para alinhar os labels

function CinemaBottomNav({ active, onNavigate }: { active?: NavItem; onNavigate: (item: NavItem) => void }) {
  const items: { id: NavItem; label: string; icon: React.ReactNode; center?: boolean }[] = [
    { id: "inicio",  label: "Início",    icon: <Home size={22} strokeWidth={2} /> },
    { id: "snack",   label: "Snack Bar", icon: <SnackIcon size={23} /> },
    { id: "filmes",  label: "Filmes",    icon: <FilmsIcon size={23} />, center: true },
    { id: "club",    label: "Club",      icon: <ClubIcon size={23} /> },
    { id: "pedidos", label: "Pedidos",   icon: <OrdersIcon size={23} /> },
  ];

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
        fontFamily: FONT_UI,
        background: NAV_BG,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "10px 8px 12px", maxWidth: 512, margin: "0 auto" }}>
        {items.map((item) => {
          const isActive = item.id === active;
          const label = (
            <span style={{ fontSize: 11, lineHeight: "14px", fontWeight: 600, color: TEXT }}>
              {item.label}
            </span>
          );

          if (item.center) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: -(CENTER_SIZE - ICON_BOX), background: "none", border: "none", cursor: "pointer" }}
              >
                <div style={{
                  width: CENTER_SIZE, height: CENTER_SIZE, borderRadius: "50%",
                  background: "#2F2D2D",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: TEXT,
                }}>
                  {item.icon}
                </div>
                {label}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "0 8px", background: "none", border: "none", cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: ICON_BOX, color: TEXT }}>{item.icon}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Tela de erro ──────────────────────────────────────────────────────────────

function ErrorScreen({ onRetry, onNavigate }: { onRetry: () => void; onNavigate: (item: NavItem) => void }) {
  return (
    <div style={{
      minHeight: "100vh", background: PAGE_BG, color: TEXT, fontFamily: FONT_UI,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "calc(70px + env(safe-area-inset-top, 0px)) 24px calc(124px + env(safe-area-inset-bottom, 0px))",
    }}>
      <PopcornIllustration />

      <h1 style={{
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.01em", marginTop: 68,
      }}>
        Ocorreu um erro
      </h1>
      <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, textAlign: "center", marginTop: 16 }}>
        Falha de internet.<br />Verifique sua conexão.
      </p>
      <button
        onClick={onRetry}
        style={{
          marginTop: 30, padding: "8px 16px",
          color: TEXT, fontSize: 14, fontWeight: 600,
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        Tente novamente.
      </button>

      <CinemaBottomNav onNavigate={onNavigate} />
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

// Sair da tela (voltar ou navbar) carrega por EXIT_LOADING_MS e cai na tela de erro;
// só "Tente novamente" leva de volta para /cinema.
const EXIT_LOADING_MS = 500;
type ExitState = "none" | "loading" | "error";

export default function CinemaDetail() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<CinemaPedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exitState, setExitState] = useState<ExitState>("none");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

  function failNavigation() {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setShowSupport(false);
    setExitState("loading");
    exitTimer.current = setTimeout(() => setExitState("error"), EXIT_LOADING_MS);
  }

  useEffect(() => {
    if (!pedidoId) return;
    let mounted = true;
    getPedido(pedidoId)
      .then((d) => { if (mounted) setPedido(d); })
      .catch((e: unknown) => { if (mounted) setError(e instanceof Error ? e.message : "Erro."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [pedidoId]);

  async function handleResgatar(ingressoId: string) {
    const updated = await resgataIngresso(ingressoId);
    setPedido((prev) => {
      if (!prev) return prev;
      return { ...prev, ingressos: prev.ingressos?.map((ing) => ing.id === ingressoId ? updated : ing) };
    });
  }

  async function handleDelete() {
    if (!pedido) return;
    setDeleting(true);
    try {
      await deletePedido(pedido.id);
      navigate("/cinema", { replace: true });
    } catch {
      setDeleting(false);
      setShowCancel(false);
    }
  }

  // paddingBottom: bottom nav (~92px) + respiro (32px)
  const contentPb = "calc(124px + env(safe-area-inset-bottom, 0px))";
  const pageStyle: React.CSSProperties = { minHeight: "100vh", background: PAGE_BG, color: TEXT, fontFamily: FONT_UI, paddingBottom: contentPb };

  if (exitState === "error") {
    return <ErrorScreen onRetry={() => navigate("/cinema")} onNavigate={failNavigation} />;
  }

  if (loading || exitState === "loading") {
    return (
      <div style={pageStyle}>
        <PageHeader onBack={failNavigation} />
        <SupportButton onClick={() => setShowSupport(true)} />
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <LoadingDots />
        </div>
        <CinemaBottomNav active="pedidos" onNavigate={failNavigation} />
        <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20, background: PAGE_BG, fontFamily: FONT_UI }}>
        <AlertCircle size={36} color={RED} />
        <p style={{ color: TEXT_2, fontSize: 14, textAlign: "center" }}>{error ?? "Pedido não encontrado."}</p>
        <button onClick={() => navigate(-1)} style={{ color: TEXT_3, fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
          Voltar
        </button>
      </div>
    );
  }

  const { date: dateFmt, time: timeFmt } = fmtDate(pedido.data_hora);
  const ingressos = pedido.ingressos ?? [];
  const hasPoster = !!pedido.imagem_url;

  // Borda superior serrilhada: cada faixa de SCALLOP_STEP px recorta um semicírculo (a capa aparece por trás)
  const scallop = `radial-gradient(circle at 50% 0, transparent ${SCALLOP_R}px, #000 ${SCALLOP_R + 0.5}px)`;

  return (
    <div style={pageStyle}>

      <PageHeader codigo={pedido.codigo} onBack={failNavigation} />
      <SupportButton onClick={() => setShowSupport(true)} />

      {/* ── Container principal ── */}
      <main style={{
        width: CONTENT_W, margin: "30px auto 0",
        display: "flex", flexDirection: "column",
      }}>

        {/* Capa — mais estreita que o ticket; a base fica por trás da borda serrilhada */}
        {hasPoster && (
          <img
            src={pedido.imagem_url!}
            alt={pedido.titulo}
            style={{
              display: "block",
              alignSelf: "center",
              width: "77%",
              aspectRatio: "240 / 206",
              objectFit: "cover",
              objectPosition: "top",
              borderRadius: `${RADIUS}px ${RADIUS}px 0 0`,
              marginBottom: -18,
            }}
          />
        )}

        {/* Ticket */}
        <div style={{
          position: "relative",
          background: TICKET_BG,
          padding: `38px ${TICKET_PX}px 0`,
          maskImage: scallop,
          maskSize: `${SCALLOP_STEP}px 100%`,
          maskRepeat: "repeat-x",
          maskPosition: "center top",
          WebkitMaskImage: scallop,
          WebkitMaskSize: `${SCALLOP_STEP}px 100%`,
          WebkitMaskRepeat: "repeat-x",
          WebkitMaskPosition: "center top",
        }}>

          {/* Informações do filme */}
          <div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, color: TEXT, fontSize: 17, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.01em", lineHeight: 1.18,
            }}>
              {pedido.titulo}
            </h1>

            {pedido.local && (
              <p style={{ color: TEXT_2, fontSize: 14, fontWeight: 500, marginTop: 12, lineHeight: 1.3 }}>
                {pedido.local}
              </p>
            )}

            {(pedido.sala || pedido.data_hora) && (
              <p style={{ color: TEXT_2, fontSize: 14, fontWeight: 500, marginTop: pedido.local ? 2 : 12, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>
                {[pedido.sala, `${dateFmt} ${timeFmt}`].filter(Boolean).join(" - ")}
              </p>
            )}

            {pedido.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                {pedido.tags.map((tag) => {
                  const s = tagStyle(tag);
                  return (
                    <span key={tag} style={{
                      display: "inline-flex", alignItems: "center",
                      height: 24, padding: "0 8px", borderRadius: 6,
                      background: s.bg, color: s.color,
                      fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 14,
                      letterSpacing: "0.02em",
                    }}>
                      {tag.toUpperCase()}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: `1px solid ${DIVIDER}`, margin: `18px -${TICKET_PX - 8}px 0` }} />

          {/* Ingressos */}
          {ingressos.length > 0 ? (
            <TicketsBlock ingressos={ingressos} onResgatar={handleResgatar} />
          ) : (
            <p style={{ color: TEXT_3, fontSize: 13, padding: "26px 0 32px" }}>
              Nenhum ingresso neste pedido.
            </p>
          )}
        </div>

        {/* ── Ação do pedido ── */}
        <button
          onClick={() => setShowCancel(true)}
          disabled={deleting}
          style={{
            ...actionBtn,
            marginTop: 16,
            width: "100%", height: 52,
            background: RED, color: TEXT,
            opacity: deleting ? 0.6 : 1,
            cursor: deleting ? "not-allowed" : "pointer",
          }}
        >
          {deleting ? <Loader2 size={18} className="animate-spin" /> : "Cancelar pedido"}
        </button>

        {/* ── Regras ── */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>
            Regras de cancelamento de pedido:
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20, color: TEXT_2, fontSize: 12, lineHeight: 1.35 }}>
            <p>
              Em caso de cancelamento ou desistência da compra dos PRODUTOS e/ou SERVIÇOS, o USUÁRIO terá
              direito à devolução da taxa de conveniência respectiva aos SERVIÇOS mediante a solicitação de
              cancelamento registrada até 2 horas antes do início da sessão.
            </p>
            <p>
              A desistência dos INGRESSOS adquiridos por meio do aplicativo móvel CINEMARK BRASIL ou no site
              CINEMARK.COM.BR somente poderá ocorrer até 2 (duas) horas antes da exibição da sessão adquirida
              pelo USUÁRIO no ato da compra.
            </p>
            <p>
              Compras realizadas com voucher ou produtos de parceiros trocados por pontos não poderão ser
              cancelados.
            </p>
            <p>Em caso de pedido de cancelamento, todos os itens do pedido serão cancelados.</p>
          </div>
        </section>
      </main>

      {/* ── Bottom Navigation ── */}
      <CinemaBottomNav active="pedidos" onNavigate={failNavigation} />

      {/* ── Modais ── */}
      <ConfirmSheet
        open={showCancel}
        message="Ao confirmar o cancelamento do pedido, ele não poderá ser revertido."
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowCancel(false)}
      />
      <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />
    </div>
  );
}
