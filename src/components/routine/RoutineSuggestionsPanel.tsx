import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Plus, Minus, RefreshCw, X, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  fetchRoutineSuggestions,
  acceptRoutineSuggestion,
  rejectRoutineSuggestion,
  type RoutineSuggestion,
  type SuggestionType,
} from "@/lib/analysisClient";
import { StepIcon } from "@/components/routine/StepIcon";
import { Mascot, SpeechBubble, useFloatAnimation } from "@/components/quiz/Mascot";

interface Props {
  onApplied: () => void;
}

// ── Mapas de tipo ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<SuggestionType, React.ReactNode> = {
  add_step:    <Plus  size={11} strokeWidth={2.5} />,
  remove_step: <Minus size={11} strokeWidth={2.5} />,
  swap_product:<RefreshCw size={10} strokeWidth={2.5} />,
};

const TYPE_STYLE: Record<SuggestionType, { pill: string; label: string; applyLabel: string }> = {
  add_step:    { pill: "bg-emerald-100 text-emerald-700", label: "Adicionar", applyLabel: "Adicionar" },
  remove_step: { pill: "bg-rose-100 text-rose-700",       label: "Remover",   applyLabel: "Remover"   },
  swap_product:{ pill: "bg-amber-100 text-amber-700",     label: "Trocar",    applyLabel: "Aplicar"   },
};

const PERIOD_STYLE: Record<string, string> = {
  morning: "bg-amber-100 text-amber-700",
  night:   "bg-indigo-100 text-indigo-700",
  both:    "bg-violet-100 text-violet-700",
};

const PERIOD_LABEL: Record<string, string> = {
  morning: "Manhã", night: "Noite", both: "Ambos",
};

// ── Thumb de produto ──────────────────────────────────────────────────────────

function ProductThumb({ url, stepTypeKey, dim = false }: { url?: string | null; stepTypeKey: string; dim?: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
      style={{ background: "#f5f1ff", border: "1px solid rgba(0,0,0,0.05)", opacity: dim ? 0.45 : 1 }}
    >
      {url && !err
        ? <img src={url} alt="" className="w-full h-full object-contain p-1" onError={() => setErr(true)} />
        : <StepIcon stepTypeKey={stepTypeKey} />}
    </div>
  );
}

// ── Card de sugestão ──────────────────────────────────────────────────────────

function SuggestionCard({
  s, acting, onAccept, onReject,
}: {
  s: RoutineSuggestion;
  acting: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const ts = TYPE_STYLE[s.suggestionType];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.18 } }}
      className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ts.pill}`}>
          {TYPE_ICON[s.suggestionType]}
          {ts.label}
        </span>
        <span className="text-sm font-bold text-slate-800 flex-1 min-w-0 truncate">
          {s.stepDisplayName}
        </span>
        {s.stepPeriod && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PERIOD_STYLE[s.stepPeriod] ?? "bg-slate-100 text-slate-600"}`}>
            {PERIOD_LABEL[s.stepPeriod] ?? s.stepPeriod}
          </span>
        )}
      </div>

      {/* Visualização */}
      <div className="px-4 pb-2">
        {s.suggestionType === "swap_product" ? (
          <div className="flex items-center gap-2">
            {/* Produto atual */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <ProductThumb url={null} stepTypeKey={s.stepTypeKey} dim />
              <p className="text-xs text-slate-400 truncate line-through">{s.currentProductName}</p>
            </div>
            <RefreshCw size={13} className="text-slate-400 flex-shrink-0" />
            {/* Sugerido */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <ProductThumb url={s.suggestedImageUrl} stepTypeKey={s.stepTypeKey} />
              <p className="text-xs font-semibold text-slate-700 truncate">{s.suggestedProductName}</p>
            </div>
          </div>
        ) : s.suggestionType === "add_step" ? (
          <div className="flex items-center gap-2">
            <ProductThumb url={s.suggestedImageUrl} stepTypeKey={s.stepTypeKey} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700">{s.suggestedProductName ?? s.stepDisplayName}</p>
              <p className="text-[10px] text-slate-400">Adicionar à rotina</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ProductThumb url={null} stepTypeKey={s.stepTypeKey} dim />
            <div className="min-w-0">
              <p className="text-xs text-slate-500 line-through">{s.currentProductName ?? s.stepDisplayName}</p>
              <p className="text-[10px] text-slate-400">Remover da rotina</p>
            </div>
          </div>
        )}
      </div>

      {/* Razão */}
      <div className="px-4 pb-3">
        <p className="text-xs text-slate-500 leading-relaxed">{s.reason}</p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onReject}
          disabled={acting}
          className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-500 disabled:opacity-40 active:scale-[0.97] transition-transform"
        >
          Ignorar
        </button>
        <button
          onClick={onAccept}
          disabled={acting}
          className="flex-1 h-10 rounded-xl coral-button text-xs font-bold disabled:opacity-40 active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
        >
          {acting
            ? <Loader2 size={13} className="animate-spin" />
            : <Check size={13} strokeWidth={2.5} />}
          {acting ? "Aplicando…" : ts.applyLabel}
        </button>
      </div>
    </motion.div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RoutineSuggestionsPanel({ onApplied }: Props) {
  useFloatAnimation();

  const [suggestions, setSuggestions]   = useState<RoutineSuggestion[]>([]);
  const [open, setOpen]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const [acting, setActing]             = useState<string | null>(null);
  const [bulkActing, setBulkActing]     = useState<"accept" | "reject" | null>(null);

  useEffect(() => { void loadSuggestions(); }, []);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const data = await fetchRoutineSuggestions();
      setSuggestions(data);
      if (data.length > 0) setOpen(true); // abre automaticamente se existir sugestão
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(s: RoutineSuggestion) {
    setActing(s.id);
    try {
      const ok = await acceptRoutineSuggestion(s.id);
      if (ok) {
        setSuggestions(prev => prev.filter(x => x.id !== s.id));
        toast.success("Sugestão aplicada à rotina!");
        onApplied();
        if (suggestions.length <= 1) setOpen(false);
      } else {
        toast.error("Não foi possível aplicar.");
      }
    } finally { setActing(null); }
  }

  async function handleReject(s: RoutineSuggestion) {
    setActing(s.id);
    try {
      const ok = await rejectRoutineSuggestion(s.id);
      if (ok) {
        setSuggestions(prev => prev.filter(x => x.id !== s.id));
        if (suggestions.length <= 1) setOpen(false);
      } else {
        toast.error("Erro ao ignorar.");
      }
    } finally { setActing(null); }
  }

  async function handleAcceptAll() {
    setBulkActing("accept");
    try {
      for (const s of [...suggestions]) {
        await acceptRoutineSuggestion(s.id).catch(() => {});
      }
      setSuggestions([]);
      onApplied();
      setOpen(false);
      toast.success("Todas as sugestões foram aplicadas!");
    } finally { setBulkActing(null); }
  }

  async function handleRejectAll() {
    setBulkActing("reject");
    try {
      for (const s of [...suggestions]) {
        await rejectRoutineSuggestion(s.id).catch(() => {});
      }
      setSuggestions([]);
      setOpen(false);
      toast("Todas as sugestões ignoradas.");
    } finally { setBulkActing(null); }
  }

  const isBusy = !!acting || !!bulkActing;

  if (loading || suggestions.length === 0) return null;

  return (
    <>
      {/* ── Pill trigger ─────────────────────────────────────────────────── */}
      <div className="flex justify-center px-4 pb-3">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full coral-button text-sm font-bold shadow-md active:scale-[0.97] transition-transform"
        >
          <Lightbulb size={15} />
          {suggestions.length === 1
            ? "1 sugestão para sua rotina"
            : `${suggestions.length} sugestões para sua rotina`}
        </button>
      </div>

      {/* ── Painel overlay ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="suggestions-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[990] flex items-end justify-center"
            style={{ backgroundColor: "rgba(15,10,30,0.5)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              key="suggestions-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360 }}
              className="w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden"
              style={{
                background: "linear-gradient(170deg,#f4f2ff 0%,#f8f5ff 40%,#fff0f8 100%)",
                height: "88svh",
                maxHeight: "88svh",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-300/60" />
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-2 pb-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inteligência da Análise</p>
                  <p className="text-sm font-bold text-slate-800">Sugestões para sua rotina</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0"
                >
                  <X size={14} className="text-slate-600" />
                </button>
              </div>

              <div className="h-px bg-white/50 flex-shrink-0 mx-4" />

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3" style={{ scrollbarWidth: "none" }}>

                {/* Mascote */}
                <div className="flex items-start gap-3">
                  <Mascot mood="happy" size={60} />
                  <SpeechBubble
                    text={suggestions.length === 1
                      ? "Tenho uma sugestão para você!"
                      : `Tenho ${suggestions.length} sugestões para você!`}
                    highlight={suggestions.length === 1 ? "sugestão" : "sugestões"}
                    subtitle="Com base na sua análise, veja o que melhoraria sua rotina"
                  />
                </div>

                {/* Aviso */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-amber-800 leading-relaxed">
                    Aplicar uma sugestão <strong>modifica sua rotina atual</strong>. Você pode ignorar qualquer sugestão que não faça sentido para você.
                  </p>
                </div>

                {/* Cards */}
                <AnimatePresence initial={false}>
                  {suggestions.map(s => (
                    <SuggestionCard
                      key={s.id}
                      s={s}
                      acting={acting === s.id}
                      onAccept={() => void handleAccept(s)}
                      onReject={() => void handleReject(s)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Footer — Ignorar tudo / Aplicar tudo */}
              {suggestions.length > 1 && (
                <div className="flex gap-2 px-4 pt-3 pb-safe pb-4 border-t border-white/60 flex-shrink-0">
                  <button
                    onClick={() => void handleRejectAll()}
                    disabled={isBusy}
                    className="flex-1 h-12 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                  >
                    {bulkActing === "reject"
                      ? <Loader2 size={14} className="animate-spin" />
                      : <X size={14} />}
                    Ignorar tudo
                  </button>
                  <button
                    onClick={() => void handleAcceptAll()}
                    disabled={isBusy}
                    className="flex-1 h-12 rounded-2xl coral-button text-sm font-bold shadow-sm disabled:opacity-40 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                  >
                    {bulkActing === "accept"
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Check size={14} strokeWidth={2.5} />}
                    Aplicar tudo
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
