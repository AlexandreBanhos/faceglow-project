import { useState } from "react";
import { Check, ChevronRight, Moon, Package, Sun, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

type ProductOption = {
  key: string;
  label: string;
  productName: string;
  reason: string;
  imageUrl?: string;
};

type Scope = "both" | "morning" | "night";

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
  onSave: () => void;
  onCancel: () => void;
  // custom product
  onSaveCustom: (name: string, imageUrl?: string) => void;
}

const fallbackImg = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=70";

const tierBadge: Record<string, { bg: string; text: string; label: string }> = {
  primary:    { bg: "bg-primary/10",  text: "text-primary",  label: "Melhor para sua pele" },
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
  onSave, onCancel,
  onSaveCustom,
}: Props) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customImg, setCustomImg] = useState("");

  const activeKey = pendingKey ?? selectedKey;
  const hasCounterpart = stepCategory !== "sunscreen"; // protetor só de manhã — sem counterpart

  const handleClose = () => {
    setShowCustom(false);
    setCustomName("");
    setCustomImg("");
    onCancel();
    onClose();
  };

  const handleSave = () => {
    setShowCustom(false);
    setCustomName("");
    setCustomImg("");
    onSave();
    onClose();
  };

  const handleSaveCustom = () => {
    if (!customName.trim()) return;
    onSaveCustom(customName.trim(), customImg.trim() || undefined);
    setShowCustom(false);
    setCustomName("");
    setCustomImg("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 pb-8 pt-0 max-h-[88vh] overflow-hidden flex flex-col"
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
              <SheetDescription className="text-xs text-muted-foreground capitalize mt-0.5">
                {period === "morning" ? "Rotina da manhã" : "Rotina da noite"}
              </SheetDescription>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
              <X size={15} className="text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-2">
          {/* Product options */}
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
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/40 bg-background hover:border-border"
                }`}
              >
                {/* Product image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={opt.imageUrl || fallbackImg}
                    alt={opt.productName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1 ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{opt.productName}</p>
                  {opt.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{opt.reason}</p>
                  )}
                </div>

                {/* Check */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive ? "bg-primary" : "bg-border/40"
                }`}>
                  {isActive && <Check size={13} strokeWidth={3} className="text-white" />}
                </div>
              </motion.button>
            );
          })}

          {/* Custom product toggle */}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Adicionar meu produto</p>
              <p className="text-xs text-muted-foreground">Digite o nome do seu produto atual</p>
            </div>
            <ChevronRight size={16} className={`text-muted-foreground transition-transform ${showCustom ? "rotate-90" : ""}`} />
          </button>

          {/* Custom product form */}
          <AnimatePresence>
            {showCustom && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pb-1 pt-1">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nome do produto (ex: Sabonete Granado)"
                    className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={customImg}
                    onChange={(e) => setCustomImg(e.target.value)}
                    placeholder="URL da imagem (opcional)"
                    className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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

          {/* Scope selector — segmented pill */}
          {hasCounterpart && options.length > 0 && (
            <div className="rounded-2xl border border-border/40 p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-2.5 font-medium">Aplicar em:</p>
              <div className="relative flex rounded-full bg-muted/50 p-1">
                <div
                  className={`absolute top-1 bottom-1 rounded-full shadow-sm transition-all duration-300 ease-out ${
                    pendingScope === "morning" ? "bg-amber-400" :
                    pendingScope === "night"   ? "bg-indigo-500" : "bg-primary"
                  }`}
                  style={{
                    width: "calc((100% - 8px) / 3)",
                    left: "4px",
                    transform: `translateX(calc(${
                      pendingScope === "morning" ? 0 : pendingScope === "both" ? 1 : 2
                    } * 100%))`,
                  }}
                />
                {([
                  { scope: "morning" as Scope, icon: <Sun size={13} />, label: "Manhã" },
                  { scope: "both"    as Scope, icon: <span className="flex items-center gap-0.5"><Sun size={11} /><Moon size={11} /></span>, label: "Ambos" },
                  { scope: "night"   as Scope, icon: <Moon size={13} />, label: "Noite" },
                ] as const).map(({ scope, icon, label }) => (
                  <button
                    key={scope}
                    onClick={() => onScopeChange(scope)}
                    className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-10 text-[10px] font-semibold z-10 transition-colors ${
                      pendingScope === scope ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-0.5">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pt-3 flex gap-3 flex-shrink-0 border-t border-border/30">
          <button
            onClick={handleClose}
            className="flex-1 h-12 rounded-2xl border border-border/60 bg-background text-foreground font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!pendingKey}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm shadow-sm disabled:opacity-40 transition-opacity"
          >
            Salvar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
