import { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, Loader2, Search, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/analysisClient";
import { fetchMyProducts, type UserCatalogProduct } from "@/lib/userProducts";
import { PeriodSelector, type Period } from "./PeriodSelector";
import { StepIcon } from "@/components/routine/StepIcon";
import { Mascot, SpeechBubble, useFloatAnimation } from "@/components/quiz/Mascot";

type ProductOption = {
  key: string;
  label: string;
  productName: string;
  reason: string;
  imageUrl?: string;
};

type Scope = Period;

interface Props {
  open: boolean;
  onClose: () => void;
  stepLabel: string;
  stepCategory: string;
  period: "morning" | "night";
  options: ProductOption[];
  selectedKey: string | null;
  pendingKey: string | null;
  pendingScope: Scope;
  onSelectOption: (key: string) => void;
  onScopeChange: (scope: Scope) => void;
  isSaving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onSaveCustom: (name: string, imageUrl?: string) => void;
  onAddCatalogProduct?: (productId: string, name: string, imageUrl?: string) => void;
}

const STEP_TO_CATEGORY: Record<string, string> = {
  cleanser:       "Limpeza",
  moisturizer:    "Hidratante",
  serum:          "Sérum",
  sunscreen:      "Protetor Solar",
  toner:          "Tônico",
  exfoliant:      "Esfoliante",
  mask:           "Máscara Facial",
  eye_cream:      "Contorno dos Olhos",
  retinoid:       "Retinol",
  acid:           "Ácido",
  spot_treatment: "Tratamento Pontual",
  oil:            "Óleo Facial",
  makeup_remover: "Removedor de Maquiagem",
};

const tierBadge: Record<string, { bg: string; text: string; label: string }> = {
  primary:    { bg: "bg-rose-50",   text: "text-rose-700",   label: "Melhor para sua pele" },
  alt_budget: { bg: "bg-green-50",  text: "text-green-700",  label: "Custo-benefício"      },
  alt_rated:  { bg: "bg-amber-50",  text: "text-amber-700",  label: "Mais avaliado"        },
  user_custom:{ bg: "bg-violet-50", text: "text-violet-700", label: "Seu produto"          },
};

const getTier = (key: string) => key.split("::").pop() ?? "primary";

// Thumbnail de produto com StepIcon como fallback
function ProductThumb({ imageUrl, stepCategory, size = 56 }: { imageUrl?: string; stepCategory: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: "#f5f1ff", border: "1px solid rgba(0,0,0,0.05)" }}
    >
      {imageUrl && !errored ? (
        <img src={imageUrl} alt="" className="w-full h-full object-contain p-1" onError={() => setErrored(true)} />
      ) : (
        <StepIcon stepTypeKey={stepCategory} />
      )}
    </div>
  );
}

export const ProductSwitchSheet = ({
  open, onClose,
  stepLabel, stepCategory, period,
  options, selectedKey, pendingKey, pendingScope,
  onSelectOption, onScopeChange,
  isSaving = false,
  onSave, onCancel,
  onSaveCustom,
  onAddCatalogProduct,
}: Props) => {
  useFloatAnimation();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName]         = useState("");
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching]       = useState(false);
  const [userProducts, setUserProducts]     = useState<UserCatalogProduct[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchMyProducts().then(setUserProducts).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const results = await fetchCatalogProducts(stepCategory, searchQuery.trim());
      setSearchResults(results);
      setIsSearching(false);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, stepCategory]);

  const activeKey = pendingKey ?? selectedKey;
  const hasCounterpart = stepCategory !== "sunscreen";
  const expectedCategory = STEP_TO_CATEGORY[stepCategory];
  const matchingUserProducts = userProducts.filter(p => !expectedCategory || p.category === expectedCategory);
  const optionNames = new Set(options.map(o => o.productName.toLowerCase()));
  const filteredUserProducts = matchingUserProducts.filter(p => !optionNames.has(p.name.toLowerCase()));

  const reset = () => { setShowCustomForm(false); setCustomName(""); setSearchQuery(""); setSearchResults([]); };
  const handleClose = () => { reset(); onCancel(); onClose(); };
  const handleSave  = () => { reset(); onSave(); onClose(); };
  const handleSaveCustom = () => {
    if (!customName.trim()) return;
    onSaveCustom(customName.trim());
    reset(); onClose();
  };
  const handleCatalogPick = (p: CatalogProduct) => {
    if (onAddCatalogProduct) onAddCatalogProduct(p.id, p.name, p.imageUrl ?? undefined);
    else onSaveCustom(p.name, p.imageUrl ?? undefined);
    reset(); onClose();
  };
  const handleUserProductPick = (p: UserCatalogProduct) => {
    onSaveCustom(p.name, p.imageUrl ?? undefined);
    reset(); onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="switch-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[990] flex items-end justify-center"
        style={{ backgroundColor: "rgba(15,10,30,0.5)", backdropFilter: "blur(6px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          key="switch-panel"
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {period === "morning" ? "Rotina da manhã" : "Rotina da noite"}
              </p>
              <p className="text-sm font-bold text-slate-800 truncate">Trocar produto</p>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0"
            >
              <X size={14} className="text-slate-600" />
            </button>
          </div>

          <div className="h-px bg-white/50 flex-shrink-0 mx-4" />

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 space-y-4" style={{ scrollbarWidth: "none" }}>

            {/* Mascote */}
            <div className="flex items-start gap-3">
              <Mascot mood="thinking" size={60} />
              <SpeechBubble
                text={`Qual produto para ${stepLabel}?`}
                highlight={stepLabel}
                subtitle="Escolha uma das opções abaixo ou busque no catálogo"
              />
            </div>

            {/* Busca catálogo */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-100 shadow-sm">
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar produto no catálogo…"
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {isSearching && <Loader2 size={14} className="animate-spin text-slate-400 flex-shrink-0" />}
            </div>

            {/* Resultados do catálogo */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catálogo</p>
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleCatalogPick(p)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-left active:scale-[0.98] transition-transform"
                    >
                      <ProductThumb imageUrl={p.imageUrl ?? undefined} stepCategory={stepCategory} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500 truncate">{p.brand}{p.tagline ? ` · ${p.tagline}` : ""}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Opções recomendadas pela IA */}
            {options.length > 0 && searchResults.length === 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recomendados para você</p>
                {options.map((opt) => {
                  const tier = getTier(opt.key);
                  const badge = tierBadge[tier] ?? tierBadge.primary;
                  const isActive = opt.key === activeKey;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => onSelectOption(opt.key)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                      style={isActive ? { borderColor: "#e8a9c2", background: "rgba(232,169,194,0.08)", boxShadow: "0 0 0 3px rgba(232,169,194,0.15)" } : { borderColor: "#f1f5f9", background: "white" }}
                    >
                      <ProductThumb imageUrl={opt.imageUrl} stepCategory={stepCategory} size={52} />
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{opt.productName}</p>
                        {opt.reason && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{opt.reason}</p>}
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "" : "border-2 border-slate-200"}`}
                        style={isActive ? { background: "var(--grad-coral)" } : undefined}>
                        {isActive && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Meus produtos */}
            {filteredUserProducts.length > 0 && searchResults.length === 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Star size={9} className="text-amber-500" /> Meus produtos
                </p>
                {filteredUserProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleUserProductPick(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-left active:scale-[0.98] transition-transform"
                  >
                    <ProductThumb imageUrl={p.imageUrl} stepCategory={stepCategory} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      {p.note && <p className="text-xs text-slate-500 truncate">{p.note}</p>}
                    </div>
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Usar outro produto */}
            <div className="space-y-2">
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"
                  style={{ background: "#f5f1ff" }}>
                  <StepIcon stepTypeKey={stepCategory} size={28} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">Usar outro produto</p>
                  <p className="text-xs text-slate-500">Digite o nome do produto que você usa</p>
                </div>
                <ChevronRight size={15} className={`text-slate-400 transition-transform ${showCustomForm ? "rotate-90" : ""}`} />
              </button>

              <AnimatePresence>
                {showCustomForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Nome do produto (ex: Sabonete Granado)"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary/40"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveCustom}
                        disabled={!customName.trim()}
                        className="w-full py-3 rounded-xl coral-button text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        <Check size={14} />
                        Usar este produto
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Período */}
            {hasCounterpart && options.length > 0 && !showCustomForm && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aplicar em</p>
                <PeriodSelector value={pendingScope} onChange={onScopeChange} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pt-3 pb-safe pb-4 flex gap-3 flex-shrink-0 border-t border-white/60">
            <button
              onClick={handleClose}
              className="flex-1 h-12 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!pendingKey || isSaving}
              className="flex-1 h-12 rounded-2xl coral-button font-bold text-sm shadow-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {isSaving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : "Confirmar"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
