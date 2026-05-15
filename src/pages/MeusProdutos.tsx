import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Image, Upload, X, PackageOpen,
  Pencil, Lightbulb, Check, Loader2, Package,
  Droplets, Pipette, Shield, Layers, Sparkles, Eye, Zap, FlaskConical, Target, Droplet, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { uploadProductImage } from "@/lib/storage";
import { type UserCatalogProduct, getUserCatalog, saveUserCatalog } from "@/lib/userCatalog";
import { fetchMyProducts, createMyProduct, updateMyProduct, deleteMyProduct } from "@/lib/userProducts";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLatestAnalysis, fetchRoutineSteps, addRoutineStep, invalidateAnalysisCache } from "@/lib/analysisClient";
import { PeriodSelector, type Period } from "@/components/routine/PeriodSelector";
import { toast } from "@/components/ui/sonner";
import { AuroraBackdrop } from "@/components/shared";

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Limpeza", "Hidratante", "Sérum", "Protetor Solar", "Tônico",
  "Esfoliante", "Máscara", "Contorno dos Olhos", "Retinol", "Ácido",
];

const CATEGORY_FALLBACK: Record<string, string> = {
  "Retinol": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776263050155-fojzlv.png",
  "Ácido": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776263050155-fojzlv.png",
  "Tônico": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776263016335-s8ggzz.png",
  "Protetor Solar": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224363237-e81o0d.png",
  "Hidratante": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224296863-0qst29.png",
  "Sérum": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224156505-c7bgop.png",
  "Limpeza": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224112164-r15mn9.png",
};

const getImg = (url?: string, cat?: string) => url || (cat ? CATEGORY_FALLBACK[cat] : undefined);

// ── Ícone por categoria (fallback quando não há imagem nem fallback de URL) ───
const CATEGORY_ICON: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  "Limpeza":            { Icon: Droplets,     color: "text-cyan-500",    bg: "bg-cyan-50"    },
  "Hidratante":         { Icon: Heart,         color: "text-pink-400",    bg: "bg-pink-50"    },
  "Sérum":              { Icon: Pipette,       color: "text-violet-500",  bg: "bg-violet-50"  },
  "Protetor Solar":     { Icon: Shield,        color: "text-amber-500",   bg: "bg-amber-50"   },
  "Tônico":             { Icon: Layers,        color: "text-teal-500",    bg: "bg-teal-50"    },
  "Esfoliante":         { Icon: Sparkles,      color: "text-orange-400",  bg: "bg-orange-50"  },
  "Máscara":            { Icon: Sparkles,      color: "text-fuchsia-500", bg: "bg-fuchsia-50" },
  "Contorno dos Olhos": { Icon: Eye,           color: "text-indigo-400",  bg: "bg-indigo-50"  },
  "Retinol":            { Icon: Zap,           color: "text-yellow-500",  bg: "bg-yellow-50"  },
  "Ácido":              { Icon: FlaskConical,  color: "text-lime-600",    bg: "bg-lime-50"    },
  "Óleo":               { Icon: Droplet,       color: "text-amber-600",   bg: "bg-amber-50"   },
  "Tratamento Pontual": { Icon: Target,        color: "text-rose-500",    bg: "bg-rose-50"    },
};

const CategoryIcon = ({ category, size = 20 }: { category?: string; size?: number }) => {
  const entry = category ? CATEGORY_ICON[category] : undefined;
  if (!entry) return <Package size={size} className="text-muted-foreground/50" />;
  const { Icon, color, bg } = entry;
  return (
    <div className={`w-full h-full flex items-center justify-center rounded-lg ${bg}`}>
      <Icon size={size} className={color} />
    </div>
  );
};

const periodLabel = (p: "morning" | "night" | "both") =>
  p === "morning" ? "manhã" : p === "night" ? "noite" : "manhã e noite";

const PeriodBadge = ({ period }: { period: "morning" | "night" | "both" }) => {
  if (period === "both") return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold w-fit mx-auto mt-0.5 text-white"
      style={{ background: "linear-gradient(90deg, #f59e0b 0%, #6366f1 100%)" }}>
      <span>☀️</span><span>🌙</span><span>Ambas</span>
    </div>
  );
  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold w-fit mx-auto mt-0.5 ${
      period === "morning" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
    }`}>
      <span>{period === "morning" ? "☀️" : "🌙"}</span>
      <span>{period === "morning" ? "Manhã" : "Noite"}</span>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
type RoutineUsage = Map<string, "morning" | "night" | "both">;

async function fetchRoutineUsage(analysisId: string): Promise<RoutineUsage> {
  try {
    const steps = await fetchRoutineSteps(analysisId);
    const map: RoutineUsage = new Map();
    const merge = (name: string, period: "morning" | "night") => {
      const key = name.toLowerCase().trim();
      const cur = map.get(key);
      if (!cur) { map.set(key, period); return; }
      if (cur !== period) map.set(key, "both");
    };
    steps.forEach((s) => {
      const name = s.overrideProductName ?? s.productName;
      if (name) merge(name, s.period);
      s.slots?.filter(sl => sl.isSelected && sl.productName).forEach(sl => {
        merge(sl.productName!, s.period);
      });
    });
    return map;
  } catch {
    return new Map();
  }
}

const emptyForm = { name: "", category: "", imageUrl: "", note: "", defaultPeriod: "both" as Period };

const categoryDefaultPeriod = (cat: string): Period => {
  const n = cat.toLowerCase();
  if (n.includes("protetor") || n.includes("solar")) return "morning";
  if (n.includes("retinol") || n.includes("ácido") || n.includes("acido")) return "night";
  return "both";
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function MeusProdutos() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<UserCatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeTab, setActiveTab] = useState<"meus" | "indicados">("meus");
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{
    type: string; product: string; description: string; imageUrl?: string;
  }>>([]);
  const [routineUsage, setRoutineUsage] = useState<RoutineUsage>(new Map());

  // ── Form Sheet ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  // ── Routine add ───────────────────────────────────────────────────────────
  const [addingToRoutine, setAddingToRoutine] = useState<Record<string, boolean>>({});
  const [addedToRoutine, setAddedToRoutine] = useState<Record<string, string>>({});

  type PendingAdd = { productName: string; imageUrl?: string; category: string; period: Period; id: string };
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (user?.id) {
        setUserId(user.id);
        setProducts(getUserCatalog(user.id));
        try {
          const remote = await fetchMyProducts(user.id);
          setProducts(remote);
        } catch { /* keep localStorage */ }

        try {
          const analysis = getCachedLatestAnalysis();
          if (analysis?.recommendations?.length) {
            setRecommendedProducts(analysis.recommendations);
          }
          if (analysis?.id) {
            setRoutineUsage(await fetchRoutineUsage(analysis.id));
          }
        } catch { /* silent */ }

        setLoadingProducts(false);
      } else {
        setLoadingProducts(false);
      }
    });
  }, []);

  const inRoutine = (name: string) => routineUsage.get(name.toLowerCase().trim());

  // ── Form handlers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: UserCatalogProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      imageUrl: p.imageUrl ?? "",
      note: p.note ?? "",
      defaultPeriod: categoryDefaultPeriod(p.category),
    });
    setFormOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch { toast.error("Erro ao enviar imagem."); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      if (editingId) {
        const updated = await updateMyProduct(editingId, data);
        const next = products.map((p) => p.id === editingId ? updated : p);
        setProducts(next);
        saveUserCatalog(next, userId ?? undefined);
        toast.success("Produto atualizado!");
      } else {
        const created = await createMyProduct(data, userId ?? undefined);
        const next = [created, ...products];
        setProducts(next);
        saveUserCatalog(next, userId ?? undefined);
        toast.success("Produto cadastrado!");
      }
      setFormOpen(false);
    } catch { toast.error("Erro ao salvar. Tente novamente."); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    const name = products.find((p) => p.id === id)?.name ?? "Produto";
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteMyProduct(id);
      saveUserCatalog(products.filter((p) => p.id !== id), userId ?? undefined);
      toast.success(`"${name}" removido`);
    } catch { toast.error("Erro ao remover. Tente novamente."); }
  };

  // ── Routine add handlers ──────────────────────────────────────────────────
  const requestAdd = (productName: string, imageUrl: string | undefined, category: string, period: Period, id: string) => {
    setPendingAdd({ productName, imageUrl, category, period, id });
  };

  const confirmAdd = async () => {
    if (!pendingAdd) return;
    const { productName, imageUrl, category, period, id } = pendingAdd;
    setPendingAdd(null);
    const analysis = getCachedLatestAnalysis();
    if (!analysis?.id) { toast.error("Faça uma análise primeiro."); return; }
    setAddingToRoutine((prev) => ({ ...prev, [id]: true }));
    try {
      const periods: Array<"morning" | "night"> = period === "both" ? ["morning", "night"] : [period];
      await Promise.all(periods.map((p) =>
        addRoutineStep(analysis.id, { period: p, productName, imageUrl, category, recurrence: "daily" })
      ));
      invalidateAnalysisCache();
      // Atualiza routineUsage localmente sem refetch
      setRoutineUsage((prev) => {
        const next = new Map(prev);
        const key = productName.toLowerCase().trim();
        const cur = next.get(key);
        next.set(key, (!cur || cur === period) ? period : "both");
        return next;
      });
      setAddedToRoutine((prev) => ({ ...prev, [id]: period }));
      toast.success("Adicionado à rotina!", {
        duration: 3000,
        action: { label: "Ver rotina →", onClick: () => navigate("/routine") },
      });
      setTimeout(() => setAddedToRoutine((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    } catch { toast.error("Erro ao adicionar. Tente novamente."); }
    finally { setAddingToRoutine((prev) => ({ ...prev, [id]: false })); }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const grouped = products.reduce<Record<string, UserCatalogProduct[]>>((acc, p) => {
    const key = p.category || "Sem categoria";
    acc[key] = [...(acc[key] ?? []), p];
    return acc;
  }, {});

  const catSuggestions = CATEGORIES.filter((c) =>
    c.toLowerCase().includes(form.category.toLowerCase())
  );

  const previewImg = form.imageUrl || CATEGORY_FALLBACK[form.category];

  return (
    <div className="relative min-h-screen overflow-hidden pb-28" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-safe-top">
        <div className="lg-surface-strong mx-auto max-w-md rounded-[1.75rem] p-3">
          <div className="flex items-center gap-3 py-2">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center">
              <ArrowLeft size={18} className="text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Produtos</h1>
              <p className="text-xs text-muted-foreground">
                {activeTab === "meus"
                  ? `${products.length} produto${products.length !== 1 ? "s" : ""}`
                  : `${recommendedProducts.length} indicado${recommendedProducts.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            {activeTab === "meus" && (
              <button onClick={openAdd} className="coral-button h-9 px-4 rounded-full text-sm font-bold text-white flex items-center gap-1.5">
                <Plus size={15} /> Adicionar
              </button>
            )}
          </div>

          <div className="flex gap-2 pb-3 border-b border-border/20">
            {(["meus", "indicados"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                  activeTab === tab
                    ? "bg-white/80 text-foreground border border-white/80 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "indicados" && <Lightbulb size={14} />}
                {tab === "meus" ? "Meus Produtos" : "Indicados"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-5 space-y-6">

        {/* ── Meus Produtos ─────────────────────────────────────────────────── */}
        {activeTab === "meus" && (
          <>
            {products.length === 0 && !loadingProducts && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <PackageOpen size={36} className="text-primary/60" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Nenhum produto cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Adicione os produtos que você tem em casa para organizar sua rotina.</p>
                </div>
                <button onClick={openAdd} className="coral-button h-11 px-6 rounded-full text-sm font-bold text-white">
                  Adicionar primeiro produto
                </button>
              </motion.div>
            )}

            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">{category}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((p) => {
                    const img = getImg(p.imageUrl, p.category);
                    const usagePeriod = inRoutine(p.name);
                    return (
                      <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="lg-surface flex flex-col items-center text-center rounded-xl p-2.5">
                        {/* Image / icon */}
                        <div className="w-full h-16 rounded-lg flex items-center justify-center mb-1.5 relative overflow-hidden">
                          {img ? (
                            <img src={img} alt={p.name} className="h-full object-contain"
                              onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          ) : (
                            <CategoryIcon category={p.category} size={22} />
                          )}
                          {usagePeriod && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm z-10">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <p className="text-[10px] font-semibold text-foreground line-clamp-2 leading-tight w-full text-center">{p.name}</p>

                        {/* Period badge when in routine */}
                        {usagePeriod
                          ? <PeriodBadge period={usagePeriod} />
                          : p.note && <p className="text-[8px] text-muted-foreground line-clamp-1 mt-0.5">{p.note}</p>
                        }

                        {/* Toggle período + adicionar */}
                        {addedToRoutine[p.id] ? (
                          <div className="flex items-center gap-1 mt-2 justify-center">
                            <Check size={11} className="text-green-600" />
                            <span className="text-[9px] font-bold text-green-600">Adicionado!</span>
                          </div>
                        ) : (
                          <div className="mt-2 w-full" onClick={(e) => e.stopPropagation()}>
                            <PeriodSelector
                              size="sm"
                              value={categoryDefaultPeriod(p.category)}
                              onChange={(period) => !addingToRoutine[p.id] && requestAdd(p.name, p.imageUrl, p.category, period, p.id)}
                            />
                          </div>
                        )}

                        {/* Edit / delete */}
                        <div className="flex items-center gap-1 mt-1 w-full">
                          <button onClick={() => openEdit(p)}
                            className="flex-1 h-6 rounded-lg border border-border/50 bg-background flex items-center justify-center hover:bg-muted transition-colors">
                            <Pencil size={10} className="text-muted-foreground" />
                          </button>
                          <button onClick={() => remove(p.id)}
                            className="flex-1 h-6 rounded-lg border border-destructive/40 bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors">
                            <Trash2 size={10} className="text-destructive" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Indicados ─────────────────────────────────────────────────────── */}
        {activeTab === "indicados" && (
          <>
            {recommendedProducts.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Lightbulb size={36} className="text-primary/60" />
                </div>
                <p className="font-bold text-foreground">Nenhuma recomendação disponível</p>
                <p className="text-sm text-muted-foreground">Realize uma análise para receber produtos indicados.</p>
                <button onClick={() => navigate("/analyze")} className="coral-button h-11 px-6 rounded-full text-sm font-bold text-white">
                  Fazer análise
                </button>
              </motion.div>
            ) : (
              (() => {
                const grouped = recommendedProducts.reduce<Record<string, typeof recommendedProducts>>((acc, p) => {
                  const key = p.type || "Outros";
                  acc[key] = [...(acc[key] ?? []), p];
                  return acc;
                }, {});

                return Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">{type}</p>
                    <div className="relative rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100 p-3 shadow-md border border-amber-200">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {items.map((p, idx) => {
                          const usagePeriod = inRoutine(p.product);
                          const typeNorm = (p.type ?? "").toLowerCase();
                          const defaultPeriod: "morning" | "night" | "both" =
                            typeNorm.includes("protetor") || typeNorm.includes("solar") ? "morning" :
                            typeNorm.includes("retinol") || typeNorm.includes("retinoide") ? "night" : "both";
                          const recId = `rec-${p.product}`;
                          return (
                            <motion.div key={`${type}-${idx}`}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className={`flex flex-col items-center text-center rounded-xl border shadow-sm p-2 relative ${
                                usagePeriod ? "bg-green-50 border-green-200" : "bg-white border-border/40"
                              }`}
                            >
                              {usagePeriod && (
                                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-md z-10">
                                  <Check size={10} className="text-white" />
                                </div>
                              )}

                              <div className="w-full h-16 rounded-lg flex items-center justify-center mb-1.5 overflow-hidden">
                                {p.imageUrl
                                  ? <img src={p.imageUrl} alt={p.product} className="h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                  : <CategoryIcon category={p.type} size={20} />
                                }
                              </div>

                              <p className="text-[10px] font-semibold text-foreground line-clamp-2 leading-tight">{p.product}</p>

                              {usagePeriod
                                ? <PeriodBadge period={usagePeriod} />
                                : p.description && <p className="text-[8px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                              }

                              {addedToRoutine[recId] ? (
                                <div className="flex items-center gap-1 mt-2 justify-center">
                                  <Check size={10} className="text-green-600" />
                                  <span className="text-[9px] font-bold text-green-600">Adicionado!</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 mt-2 w-full">
                                  {(defaultPeriod === "morning" || defaultPeriod === "both") && (
                                    <button title="Manhã" disabled={!!addingToRoutine[recId]}
                                      onClick={() => requestAdd(p.product, p.imageUrl, p.type ?? "", "morning", recId)}
                                      className="flex-1 h-5 rounded-l-lg border border-border/50 bg-white flex items-center justify-center hover:bg-amber-50 transition-colors">
                                      <Sun size={9} className="text-amber-500" />
                                    </button>
                                  )}
                                  {(defaultPeriod === "night" || defaultPeriod === "both") && (
                                    <button title="Noite" disabled={!!addingToRoutine[recId]}
                                      onClick={() => requestAdd(p.product, p.imageUrl, p.type ?? "", "night", recId)}
                                      className="flex-1 h-5 border border-border/50 bg-white flex items-center justify-center hover:bg-indigo-50 transition-colors">
                                      <Moon size={9} className="text-indigo-500" />
                                    </button>
                                  )}
                                  {defaultPeriod === "both" && (
                                    <button title="Ambas" disabled={!!addingToRoutine[recId]}
                                      onClick={() => requestAdd(p.product, p.imageUrl, p.type ?? "", "both", recId)}
                                      className="flex-1 h-5 rounded-r-lg border border-border/50 bg-white flex items-center justify-center gap-0.5 hover:bg-primary/5 transition-colors">
                                      <Sun size={8} className="text-amber-500" /><Moon size={8} className="text-indigo-500" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ));
              })()
            )}
          </>
        )}
      </div>

      {/* ── Form Sheet (Add / Edit) ──────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={(o) => { if (!o) setFormOpen(false); }}>
        <SheetContent side="bottom"
          className="rounded-t-3xl px-0 pb-8 pt-0 max-h-[90vh] overflow-hidden flex flex-col"
          style={{ background: "var(--bg-card, white)" }}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>
          <SheetHeader className="px-6 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">{editingId ? "Editar produto" : "Novo produto"}</SheetTitle>
              <button onClick={() => setFormOpen(false)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-2">
            {/* Image + campos lado a lado */}
            <div className="flex gap-3">
              {/* Image preview / upload */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-muted/40 border border-border/40 overflow-hidden flex items-center justify-center relative">
                  {previewImg ? (
                    <>
                      <img src={previewImg} alt="Preview" className="w-full h-full object-contain p-1"
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      {form.imageUrl && (
                        <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                          <X size={9} className="text-white" />
                        </button>
                      )}
                    </>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/60 hover:text-muted-foreground disabled:cursor-default transition-colors">
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <><Upload size={18} /><span className="text-[9px] font-medium">Foto</span></>}
                    </button>
                  )}
                </div>
                {previewImg && !form.imageUrl && (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-20 mt-1 h-6 rounded-lg border border-dashed border-border/60 bg-background text-[9px] font-semibold text-primary flex items-center justify-center gap-1 hover:bg-muted/20 disabled:opacity-50">
                    <Upload size={10} /> {uploading ? "…" : "Trocar"}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* Nome + categoria */}
              <div className="flex-1 space-y-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do produto *"
                  autoFocus
                  className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                {/* Categoria com autocomplete */}
                <div className="relative">
                  <input
                    value={form.category}
                    onChange={(e) => { setForm((f) => ({ ...f, category: e.target.value, defaultPeriod: categoryDefaultPeriod(e.target.value) })); setCatOpen(true); }}
                    onFocus={() => setCatOpen(true)}
                    onBlur={() => setTimeout(() => setCatOpen(false), 150)}
                    placeholder="Categoria  (Limpeza, Sérum…)"
                    className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {catOpen && catSuggestions.length > 0 && (
                    <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-xl overflow-y-auto max-h-40">
                      {catSuggestions.map((s) => (
                        <button key={s} type="button" onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setForm((f) => ({ ...f, category: s, defaultPeriod: categoryDefaultPeriod(s) })); setCatOpen(false); }}
                          className="w-full px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Período de uso */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Período de uso</label>
              <PeriodSelector
                size="sm"
                value={form.defaultPeriod}
                onChange={(p) => setForm((f) => ({ ...f, defaultPeriod: p }))}
                locked={
                  form.category.toLowerCase().includes("retinol") ||
                  form.category.toLowerCase().includes("ácido") ||
                  form.category.toLowerCase().includes("acido")
                }
                lockedReason="Retinol e ácidos são de uso noturno"
              />
            </div>

            {/* Observação */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Observação (opcional)</label>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Ex: Uso à noite, pele seca"
                className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="px-6 pt-3 flex gap-3 flex-shrink-0 border-t border-border/30">
            <button onClick={() => setFormOpen(false)}
              className="flex-1 h-12 rounded-2xl border border-border/60 bg-background text-foreground font-semibold text-sm">
              Cancelar
            </button>
            <button onClick={save} disabled={!form.name.trim() || saving}
              className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm shadow-sm disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando…</> : editingId ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Confirmation dialog — z-[60] para ficar acima do BottomNav z-50 ── */}
      <AnimatePresence>
        {pendingAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-safe-bottom"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
            onClick={() => setPendingAdd(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-3xl p-6 shadow-2xl space-y-4 mb-2"
            >
              {/* Produto */}
              <div className="flex items-center gap-3">
                {pendingAdd.imageUrl ? (
                  <img src={pendingAdd.imageUrl} alt={pendingAdd.productName}
                    className="w-14 h-14 rounded-2xl object-contain bg-muted/40 border border-border/30 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package size={22} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-snug truncate">{pendingAdd.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Adicionar à rotina</p>
                </div>
              </div>

              {/* Período — ajustável antes de confirmar */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Período</p>
                <PeriodSelector
                  value={pendingAdd.period}
                  onChange={(p) => setPendingAdd((prev) => prev ? { ...prev, period: p } : null)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPendingAdd(null)}
                  className="flex-1 h-12 rounded-2xl border border-border/60 bg-background text-foreground font-semibold text-sm">
                  Cancelar
                </button>
                <button onClick={() => { void confirmAdd(); }} disabled={!!addingToRoutine[pendingAdd.id]}
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {addingToRoutine[pendingAdd.id]
                    ? <><Loader2 size={16} className="animate-spin" /> Adicionando…</>
                    : "Adicionar à rotina"
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
