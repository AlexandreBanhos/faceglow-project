import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, RefreshCw, Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";
import {
  fetchRoutineSuggestions,
  acceptRoutineSuggestion,
  rejectRoutineSuggestion,
  type RoutineSuggestion,
  type SuggestionType,
} from "@/lib/analysisClient";

interface Props {
  onApplied: () => void;
}

const fallbackImg = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=70";

const typeIcon: Record<SuggestionType, React.ReactNode> = {
  add_step:    <Plus size={16} />,
  remove_step: <Minus size={16} />,
  swap_product: <RefreshCw size={14} />,
};

const typeBg: Record<SuggestionType, string> = {
  add_step:    "bg-emerald-100 text-emerald-700",
  remove_step: "bg-rose-100 text-rose-700",
  swap_product: "bg-amber-100 text-amber-700",
};

const typeLabel: Record<SuggestionType, string> = {
  add_step:    "Adicionar",
  remove_step: "Remover",
  swap_product: "Trocar",
};

const periodBadge: Record<string, string> = {
  morning: "bg-amber-100 text-amber-700",
  night:   "bg-indigo-100 text-indigo-700",
  both:    "bg-primary/10 text-primary",
};

const periodLabel: Record<string, string> = {
  morning: "Manhã",
  night:   "Noite",
  both:    "Ambos",
};

export function RoutineSuggestionsPanel({ onApplied }: Props) {
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    void loadSuggestions();
  }, []);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const data = await fetchRoutineSuggestions();
      setSuggestions(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(suggestion: RoutineSuggestion) {
    setActing(suggestion.id);
    try {
      const ok = await acceptRoutineSuggestion(suggestion.id);
      if (ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        toast.success("Sugestão aplicada à sua rotina!");
        onApplied();
        if (suggestions.length <= 1) setOpen(false);
      } else {
        toast.error("Não foi possível aplicar a sugestão.");
      }
    } finally {
      setActing(null);
    }
  }

  async function handleReject(suggestion: RoutineSuggestion) {
    setActing(suggestion.id);
    try {
      const ok = await rejectRoutineSuggestion(suggestion.id);
      if (ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        toast("Sugestão ignorada.");
        if (suggestions.length <= 1) setOpen(false);
      } else {
        toast.error("Erro ao ignorar sugestão.");
      }
    } finally {
      setActing(null);
    }
  }

  if (loading || suggestions.length === 0) return null;

  return (
    <>
      {/* Banner trigger */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: "var(--grad-coral)" }}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold leading-tight">
              {suggestions.length === 1
                ? "1 sugestão para sua rotina"
                : `${suggestions.length} sugestões para sua rotina`}
            </p>
            <p className="text-xs text-white/80 mt-0.5">Toque para ver as recomendações</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xs font-bold">{suggestions.length}</span>
          </div>
        </button>
      </div>

      {/* Bottom Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-0 pb-8 pt-0 max-h-[85vh] overflow-hidden flex flex-col"
          style={{ background: "var(--bg-card, white)" }}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>

          <SheetHeader className="px-6 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold leading-tight flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                Sugestões de Rotina
              </SheetTitle>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Com base na sua nova análise, sugerimos estas alterações
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2">
            <AnimatePresence initial={false}>
              {suggestions.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <p className="text-base font-semibold text-foreground">Tudo certo com sua rotina!</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Não há mais sugestões pendentes.
                  </p>
                </motion.div>
              ) : (
                suggestions.map(s => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -32, transition: { duration: 0.2 } }}
                    className="rounded-2xl border border-border/40 bg-background overflow-hidden shadow-sm"
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${typeBg[s.suggestionType]}`}>
                        {typeIcon[s.suggestionType]}
                        {typeLabel[s.suggestionType]}
                      </span>
                      <span className="text-sm font-semibold text-foreground flex-1 truncate">
                        {s.stepDisplayName}
                      </span>
                      {s.stepPeriod && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${periodBadge[s.stepPeriod] ?? "bg-muted text-muted-foreground"}`}>
                          {periodLabel[s.stepPeriod] ?? s.stepPeriod}
                        </span>
                      )}
                    </div>

                    {/* Product comparison */}
                    {(s.suggestionType === "swap_product" || s.suggestionType === "add_step") && (
                      <div className="px-4 pb-2 flex items-center gap-3">
                        {s.suggestionType === "swap_product" && s.currentProductName && (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                                <img
                                  src={fallbackImg}
                                  alt={s.currentProductName}
                                  className="w-full h-full object-cover opacity-40 grayscale"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{s.currentProductName}</p>
                            </div>
                            <RefreshCw size={14} className="text-muted-foreground flex-shrink-0" />
                          </>
                        )}
                        {s.suggestedProductName && (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                              <img
                                src={s.suggestedImageUrl ?? fallbackImg}
                                alt={s.suggestedProductName}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                              />
                            </div>
                            <p className="text-xs font-medium text-foreground truncate">{s.suggestedProductName}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reason */}
                    <div className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        onClick={() => void handleReject(s)}
                        disabled={acting === s.id}
                        className="flex-1 h-10 rounded-xl border border-border/60 bg-background text-sm font-semibold text-muted-foreground disabled:opacity-40 transition-opacity active:scale-[0.97]"
                      >
                        Ignorar
                      </button>
                      <button
                        onClick={() => void handleAccept(s)}
                        disabled={acting === s.id}
                        className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm disabled:opacity-40 transition-opacity active:scale-[0.97]"
                      >
                        {acting === s.id ? "Aplicando…" : "Aplicar"}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
