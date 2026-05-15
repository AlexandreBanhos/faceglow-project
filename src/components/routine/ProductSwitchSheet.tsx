import { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, Loader2, Package, Search, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/analysisClient";
import { fetchMyProducts, type UserCatalogProduct } from "@/lib/userProducts";
import { PeriodSelector, type Period } from "./PeriodSelector";

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
  cleanser: "Limpeza",
  moisturizer: "Hidratante",
  serum: "Sérum",
  sunscreen: "Protetor Solar",
  toner: "Tônico",
  exfoliant: "Esfoliante",
  mask: "Máscara",
  eye_cream: "Contorno dos Olhos",
  retinoid: "Retinol",
  acid: "Ácido",
  spot_treatment: "Tratamento Pontual",
  oil: "Óleo",
};

const tierBadge: Record<string, { bg: string; text: string; label: string }> = {
  primary:    { bg: "bg-primary/10",  text: "text-primary",   label: "Melhor para sua pele" },
  alt_budget: { bg: "bg-green-50",    text: "text-green-700", label: "Custo-benefício" },
  alt_rated:  { bg: "bg-amber-50",    text: "text-amber-700", label: "Mais avaliado" },
  user_custom:{ bg: "bg-purple-50",   text: "text-purple-700",label: "Seu produto" },
};

const getTier = (key: string) => key.split("::").pop() ?? "primary";

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
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [userProducts, setUserProducts] = useState<UserCatalogProduct[]>([]);

  // Fetch user's saved products when sheet opens
  useEffect(() => {
    if (!open) return;
    fetchMyProducts().then(setUserProducts).catch(() => {});
  }, [open]);

  // Debounced catalog search
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

  // Filter user's saved products by matching category
  const expectedCategory = STEP_TO_CATEGORY[stepCategory];
  const matchingUserProducts = userProducts.filter(
    p => !expectedCategory || p.category === expectedCategory
  );

  // Exclude products already shown as options (avoid duplicates)
  const optionNames = new Set(options.map(o => o.productName.toLowerCase()));
  const filteredUserProducts = matchingUserProducts.filter(
    p => !optionNames.has(p.name.toLowerCase())
  );

  const reset = () => {
    setShowCustomForm(false);
    setCustomName("");
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClose = () => { reset(); onCancel(); onClose(); };
  const handleSave  = () => { reset(); onSave(); onClose(); };

  const handleSaveCustom = () => {
    if (!customName.trim()) return;
    onSaveCustom(customName.trim());
    reset();
    onClose();
  };

  const handleCatalogPick = (p: CatalogProduct) => {
    if (onAddCatalogProduct) {
      onAddCatalogProduct(p.id, p.name, p.imageUrl ?? undefined);
    } else {
      onSaveCustom(p.name, p.imageUrl ?? undefined);
    }
    reset();
    onClose();
  };

  const handleUserProductPick = (p: UserCatalogProduct) => {
    onSaveCustom(p.name, p.imageUrl ?? undefined);
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 pb-8 pt-0 max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: "var(--bg-card, white)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <SheetHeader className="px-6 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold leading-tight">{stepLabel}</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {period === "morning" ? "Rotina da manhã" : "Rotina da noite"}
              </SheetDescription>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
              <X size={15} className="text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-2">

          {/* Search catalog */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produto no catálogo…"
              className="w-full h-10 rounded-xl border border-border/60 bg-muted/30 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {isSearching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Catalog search results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2"
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Encontrados no catálogo
                </p>
                {searchResults.map((p) => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCatalogPick(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-background hover:border-primary/40 hover:bg-primary/5 text-left transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <Package size={18} className="text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.brand}{p.tagline ? ` · ${p.tagline}` : ""}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                  </motion.button>
                ))}
                <div className="h-px bg-border/30" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* IA-recommended options */}
          {options.length > 0 && searchResults.length === 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Recomendados para você
              </p>
              {options.map((opt) => {
                const tier = getTier(opt.key);
                const badge = tierBadge[tier] ?? tierBadge.primary;
                const isActive = opt.key === activeKey;
                return (
                  <motion.button
                    key={opt.key}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectOption(opt.key)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                      isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 bg-background hover:border-border"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted/60 flex-shrink-0 flex items-center justify-center">
                      {opt.imageUrl ? (
                        <img src={opt.imageUrl} alt={opt.productName} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <Package size={22} className="text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1 ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{opt.productName}</p>
                      {opt.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{opt.reason}</p>
                      )}
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? "bg-primary" : "bg-border/40"
                    }`}>
                      {isActive && <Check size={13} strokeWidth={3} className="text-white" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Meus Produtos salvos */}
          {filteredUserProducts.length > 0 && searchResults.length === 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Star size={10} className="text-amber-500" /> Meus produtos
              </p>
              {filteredUserProducts.map((p) => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleUserProductPick(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <Package size={18} className="text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    {p.note && <p className="text-xs text-muted-foreground truncate">{p.note}</p>}
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Adicionar produto manual */}
          <div className="space-y-2">
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Usar outro produto</p>
                <p className="text-xs text-muted-foreground">Digite o nome do produto que você usa</p>
              </div>
              <ChevronRight size={16} className={`text-muted-foreground transition-transform ${showCustomForm ? "rotate-90" : ""}`} />
            </button>

            <AnimatePresence>
              {showCustomForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Nome do produto (ex: Sabonete Granado)"
                      className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCustom}
                      disabled={!customName.trim()}
                      className="w-full h-10 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
                    >
                      Usar este produto
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scope selector */}
          {hasCounterpart && options.length > 0 && !showCustomForm && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Aplicar em</p>
              <PeriodSelector value={pendingScope} onChange={onScopeChange} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 flex gap-3 flex-shrink-0 border-t border-border/30">
          <button
            onClick={handleClose}
            className="flex-1 h-12 rounded-2xl border border-border/60 bg-background text-foreground font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!pendingKey || isSaving}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm shadow-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando…</>
            ) : "Confirmar"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
