import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Upload, X, PackageOpen,
  Pencil, Lightbulb, Check, Loader2, Package,
  Droplets, Pipette, Shield, Layers, Sparkles, Eye, Zap, FlaskConical, Target, Droplet, Heart,
  ChevronDown, ChevronUp,
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

// ── Constantes (sincronizadas com step_types e products do banco) ─────────────

// step_types ordenados por default_order
const CATEGORIES = [
  "Limpeza",           // cleanser  — order 10
  "Tônico",            // toner     — order 20
  "Sérum",             // serum     — order 30
  "Ácido",             // acid      — order 40
  "Retinol/Retinoide", // retinoid  — order 50
  "Creme para Olhos",  // eye_cream — order 60
  "Hidratante",        // moisturizer — order 70
  "Óleo Facial",       // oil       — order 75
  "Protetor Solar",    // sunscreen — order 80
  "Tratamento Pontual",// spot_treatment — order 90
  "Máscara",
  "Esfoliante",
];

// marcas presentes em products (deduplicated, normalized)
const BRANDS = [
  "Acnezil", "Actine", "Avène", "Bepantol", "Bioderma", "Biore",
  "Botik", "CeraVe", "Cetaphil", "Creamy", "Darrow", "Dermage",
  "Dermotivin", "Differin", "Epidrat", "Episol", "Eucerin", "Galderma",
  "Garnier", "Granado", "Isdin", "L'Oréal", "La Roche-Posay", "Medley",
  "Neostrata", "Neutrogena", "Nivea", "Nutrel", "Panvel", "Payot",
  "Principia", "Sallve", "Simple", "Skin Aqua", "SkinCeuticals",
  "The Ordinary", "Vichy",
];

// compatible_skin_types do banco (oleosa, seca, mista, sensivel, normal)
const SKIN_TYPES = ["Oleosa", "Seca", "Mista", "Sensível", "Normal", "Todos"];

// target_concerns do banco
const TREATMENTS = [
  "Acne", "Cravos", "Manchas", "Rugas", "Olheiras",
  "Hidratação", "Oleosidade", "Sensibilidade", "Poros", "Vermelhidão", "Firmeza",
];

const PRODUCT_TYPES = ["Leave-on", "Rinse-off", "Pontual", "Proteção solar", "Tratamento noturno"];

// ── Ícone por categoria (alinhado com step_types) ────────────────────────────
const CATEGORY_ICON: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  "Limpeza":            { Icon: Droplets,    color: "text-cyan-500",    bg: "bg-cyan-50"    },
  "Tônico":             { Icon: Layers,      color: "text-teal-500",    bg: "bg-teal-50"    },
  "Sérum":              { Icon: Pipette,     color: "text-violet-500",  bg: "bg-violet-50"  },
  "Ácido":              { Icon: FlaskConical,color: "text-lime-600",    bg: "bg-lime-50"    },
  "Retinol/Retinoide":  { Icon: Zap,         color: "text-yellow-500",  bg: "bg-yellow-50"  },
  "Creme para Olhos":   { Icon: Eye,         color: "text-indigo-400",  bg: "bg-indigo-50"  },
  "Hidratante":         { Icon: Heart,        color: "text-pink-400",    bg: "bg-pink-50"    },
  "Óleo Facial":        { Icon: Droplet,     color: "text-amber-600",   bg: "bg-amber-50"   },
  "Protetor Solar":     { Icon: Shield,      color: "text-amber-500",   bg: "bg-amber-50"   },
  "Tratamento Pontual": { Icon: Target,      color: "text-rose-500",    bg: "bg-rose-50"    },
  "Esfoliante":         { Icon: Sparkles,    color: "text-orange-400",  bg: "bg-orange-50"  },
  "Máscara":            { Icon: Sparkles,    color: "text-fuchsia-500", bg: "bg-fuchsia-50" },
  // aliases para compatibilidade com dados antigos
  "Retinol":            { Icon: Zap,         color: "text-yellow-500",  bg: "bg-yellow-50"  },
  "Contorno dos Olhos": { Icon: Eye,         color: "text-indigo-400",  bg: "bg-indigo-50"  },
  "Óleo":               { Icon: Droplet,     color: "text-amber-600",   bg: "bg-amber-50"   },
};

const CategoryIcon = ({ category, size = 18 }: { category?: string; size?: number }) => {
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
  p === "morning" ? "☀️ Manhã" : p === "night" ? "🌙 Noite" : "☀️🌙 Ambas";

const PeriodBadge = ({ period }: { period: "morning" | "night" | "both" }) => {
  if (period === "both") return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
      style={{ background: "linear-gradient(90deg,#f59e0b 0%,#6366f1 100%)" }}>
      ☀️🌙 Ambas
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
      period === "morning" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
    }`}>
      {period === "morning" ? "☀️ Manhã" : "🌙 Noite"}
    </span>
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

const categoryDefaultPeriod = (cat: string): Period => {
  const n = cat.toLowerCase();
  if (n.includes("protetor") || n.includes("solar") || n.includes("sunscreen")) return "morning";
  if (n.includes("retinol") || n.includes("retinoide") || n.includes("ácido") || n.includes("acido") || n.includes("acid")) return "night";
  if (n.includes("óleo") || n.includes("oleo") || n.includes("oil")) return "night";
  return "both";
};

type FormState = {
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  note: string;
  defaultPeriod: Period;
  skinTypes: string[];
  treatments: string[];
  productType: string;
};

const emptyForm: FormState = {
  name: "", brand: "", category: "", imageUrl: "", note: "",
  defaultPeriod: "both", skinTypes: [], treatments: [], productType: "",
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function MeusProdutos() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<UserCatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeTab, setActiveTab] = useState<"meus" | "indicados">("meus");

  // "Indicados" data
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{
    type: string; product: string; description: string; imageUrl?: string;
  }>>([]);
  const [analysisRoutine, setAnalysisRoutine] = useState<{ morning: string[]; night: string[] }>({ morning: [], night: [] });
  const [additionalRecs, setAdditionalRecs] = useState<string>("");
  const [routineUsage, setRoutineUsage] = useState<RoutineUsage>(new Map());

  // ── Form Sheet ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ── Routine add ───────────────────────────────────────────────────────────
  type PendingAdd = { productName: string; imageUrl?: string; category: string; period: Period; id: string };
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);
  const [addingToRoutine, setAddingToRoutine] = useState<Record<string, boolean>>({});
  const [addedToRoutine, setAddedToRoutine] = useState<Record<string, string>>({});

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
          if (analysis?.routine) {
            setAnalysisRoutine(analysis.routine);
          }
          if (analysis?.additionalRecommendations) {
            setAdditionalRecs(analysis.additionalRecommendations);
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
    setAdvancedOpen(false);
    setFormOpen(true);
  };

  const openEdit = (p: UserCatalogProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      brand: p.brand ?? "",
      category: p.category,
      imageUrl: p.imageUrl ?? "",
      note: p.note ?? "",
      defaultPeriod: p.defaultPeriod ?? categoryDefaultPeriod(p.category),
      skinTypes: p.skinTypes ?? [],
      treatments: p.treatments ?? [],
      productType: p.productType ?? "",
    });
    setAdvancedOpen(false);
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
        brand: form.brand.trim() || undefined,
        category: form.category.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        note: form.note.trim() || undefined,
        defaultPeriod: form.defaultPeriod,
        skinTypes: form.skinTypes.length ? form.skinTypes : undefined,
        treatments: form.treatments.length ? form.treatments : undefined,
        productType: form.productType || undefined,
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

  // ── Autocomplete helpers ──────────────────────────────────────────────────
  const catSuggestions = CATEGORIES.filter((c) =>
    c.toLowerCase().includes(form.category.toLowerCase()) && form.category.length > 0
  );
  const brandSuggestions = BRANDS.filter((b) =>
    b.toLowerCase().includes(form.brand.toLowerCase()) && form.brand.length > 0
  );

  // ── Grouped products ──────────────────────────────────────────────────────
  const grouped = products.reduce<Record<string, UserCatalogProduct[]>>((acc, p) => {
    const key = p.category || "Sem categoria";
    acc[key] = [...(acc[key] ?? []), p];
    return acc;
  }, {});

  // ── Indicados: check if any data ──────────────────────────────────────────
  const hasIndicados =
    recommendedProducts.length > 0 ||
    analysisRoutine.morning.length > 0 ||
    analysisRoutine.night.length > 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-28" style={{ background: "var(--grad-aurora)" }}>
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

      <div className="mx-auto max-w-md px-4 pt-5 space-y-5">

        {/* ── Meus Produtos ──────────────────────────────────────────────────── */}
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
                  <p className="text-sm text-muted-foreground mt-1">Adicione os produtos que você usa para organizar sua rotina.</p>
                </div>
                <button onClick={openAdd} className="coral-button h-11 px-6 rounded-full text-sm font-bold text-white">
                  Adicionar primeiro produto
                </button>
              </motion.div>
            )}

            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">{category}</p>
                <div className="space-y-1.5">
                  {items.map((p, idx) => {
                    const usagePeriod = inRoutine(p.name);
                    const displayPeriod = usagePeriod ?? p.defaultPeriod;
                    return (
                      <motion.div key={p.id} layout
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                        style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 6px rgba(244,168,199,0.08)" }}
                      >
                        {/* Category icon */}
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
                          <CategoryIcon category={p.category} size={16} />
                        </div>

                        {/* Name + brand */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate leading-tight">{p.name}</p>
                          {p.brand && <p className="text-[11px] text-muted-foreground truncate">{p.brand}</p>}
                        </div>

                        {/* Period badge */}
                        {displayPeriod && (
                          <PeriodBadge period={displayPeriod} />
                        )}

                        {/* In-routine indicator */}
                        {usagePeriod && (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <Check size={10} className="text-white" />
                          </div>
                        )}

                        {/* Edit */}
                        <button onClick={() => openEdit(p)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ background: "rgba(244,168,199,0.12)", border: "1px solid rgba(244,168,199,0.25)" }}>
                          <Pencil size={13} style={{ color: "#E8748A" }} />
                        </button>

                        {/* Delete */}
                        <button onClick={() => remove(p.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <Trash2 size={13} className="text-destructive" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Indicados ──────────────────────────────────────────────────────── */}
        {activeTab === "indicados" && (
          <>
            {!hasIndicados ? (
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
              <>
                {/* Recomendados — agrupados por tipo */}
                {recommendedProducts.length > 0 && (() => {
                  const grouped = recommendedProducts.reduce<Record<string, typeof recommendedProducts>>((acc, p) => {
                    const key = p.type || "Outros";
                    acc[key] = [...(acc[key] ?? []), p];
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([type, items]) => (
                    <div key={type} className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">{type}</p>
                      <div className="space-y-1.5">
                        {items.map((p, idx) => {
                          const usagePeriod = inRoutine(p.product);
                          const typeNorm = (p.type ?? "").toLowerCase();
                          const defaultPeriod: Period =
                            typeNorm.includes("protetor") || typeNorm.includes("solar") ? "morning" :
                            typeNorm.includes("retinol") || typeNorm.includes("retinoide") ? "night" : "both";
                          const recId = `rec-${p.product}`;
                          return (
                            <motion.div key={`${type}-${idx}`}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                              style={{
                                background: usagePeriod ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.72)",
                                border: usagePeriod ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.6)",
                                boxShadow: "0 1px 6px rgba(244,168,199,0.08)",
                              }}
                            >
                              {/* Category icon */}
                              <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
                                <CategoryIcon category={p.type} size={16} />
                              </div>

                              {/* Name + description */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate leading-tight">{p.product}</p>
                                {p.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                                )}
                              </div>

                              {/* Period badge */}
                              <PeriodBadge period={defaultPeriod} />

                              {/* In-routine indicator */}
                              {usagePeriod ? (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                  <Check size={10} className="text-white" />
                                </div>
                              ) : addedToRoutine[recId] ? (
                                <Check size={14} className="text-green-500 flex-shrink-0" />
                              ) : (
                                <button
                                  disabled={!!addingToRoutine[recId]}
                                  onClick={() => requestAdd(p.product, p.imageUrl, p.type ?? "", defaultPeriod, recId)}
                                  className="flex-shrink-0 h-8 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-50"
                                  style={{ background: "linear-gradient(135deg,#E8748A,#F4A8C7)" }}
                                >
                                  {addingToRoutine[recId] ? <Loader2 size={11} className="animate-spin" /> : "+ Rotina"}
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}

                {/* Rotina sugerida — manhã */}
                {analysisRoutine.morning.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">☀️ Rotina manhã sugerida</p>
                    <div className="space-y-1.5">
                      {analysisRoutine.morning.map((name, idx) => {
                        const usagePeriod = inRoutine(name);
                        const recId = `morning-${name}-${idx}`;
                        return (
                          <motion.div key={recId}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                            style={{
                              background: usagePeriod ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.72)",
                              border: usagePeriod ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.6)",
                              boxShadow: "0 1px 6px rgba(244,168,199,0.08)",
                            }}
                          >
                            <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
                              <div className="w-full h-full flex items-center justify-center bg-amber-50">
                                <span style={{ fontSize: 16 }}>☀️</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                            </div>
                            <PeriodBadge period="morning" />
                            {usagePeriod ? (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <Check size={10} className="text-white" />
                              </div>
                            ) : (
                              <button
                                disabled={!!addingToRoutine[recId]}
                                onClick={() => requestAdd(name, undefined, "", "morning", recId)}
                                className="flex-shrink-0 h-8 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#E8748A,#F4A8C7)" }}
                              >
                                {addingToRoutine[recId] ? <Loader2 size={11} className="animate-spin" /> : "+ Rotina"}
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rotina sugerida — noite */}
                {analysisRoutine.night.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">🌙 Rotina noite sugerida</p>
                    <div className="space-y-1.5">
                      {analysisRoutine.night.map((name, idx) => {
                        const usagePeriod = inRoutine(name);
                        const recId = `night-${name}-${idx}`;
                        return (
                          <motion.div key={recId}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                            style={{
                              background: usagePeriod ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.72)",
                              border: usagePeriod ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.6)",
                              boxShadow: "0 1px 6px rgba(244,168,199,0.08)",
                            }}
                          >
                            <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden">
                              <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                <span style={{ fontSize: 16 }}>🌙</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                            </div>
                            <PeriodBadge period="night" />
                            {usagePeriod ? (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <Check size={10} className="text-white" />
                              </div>
                            ) : (
                              <button
                                disabled={!!addingToRoutine[recId]}
                                onClick={() => requestAdd(name, undefined, "", "night", recId)}
                                className="flex-shrink-0 h-8 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#E8748A,#F4A8C7)" }}
                              >
                                {addingToRoutine[recId] ? <Loader2 size={11} className="animate-spin" /> : "+ Rotina"}
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Observações adicionais */}
                {additionalRecs && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">Observações adicionais</p>
                    <div className="px-4 py-3 rounded-2xl text-sm text-muted-foreground leading-relaxed"
                      style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.6)" }}>
                      {additionalRecs}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Form Sheet ───────────────────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={(o) => { if (!o) setFormOpen(false); }}>
        <SheetContent side="bottom"
          className="rounded-t-3xl px-0 pb-8 pt-0 max-h-[92vh] overflow-hidden flex flex-col"
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

            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nome do produto *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Sérum Vitamina C"
                autoFocus
                className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Categoria</label>
              <div className="relative">
                <input
                  value={form.category}
                  onChange={(e) => { setForm((f) => ({ ...f, category: e.target.value, defaultPeriod: categoryDefaultPeriod(e.target.value) })); setCatOpen(true); }}
                  onFocus={() => setCatOpen(true)}
                  onBlur={() => setTimeout(() => setCatOpen(false), 150)}
                  placeholder="Limpeza, Sérum, Hidratante…"
                  className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {catOpen && catSuggestions.length > 0 && (
                  <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-xl overflow-y-auto max-h-40">
                    {catSuggestions.map((s) => (
                      <button key={s} type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setForm((f) => ({ ...f, category: s, defaultPeriod: categoryDefaultPeriod(s) })); setCatOpen(false); }}
                        className="w-full px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Marca */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Marca</label>
              <div className="relative">
                <input
                  value={form.brand}
                  onChange={(e) => { setForm((f) => ({ ...f, brand: e.target.value })); setBrandOpen(true); }}
                  onFocus={() => setBrandOpen(true)}
                  onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
                  placeholder="La Roche-Posay, Cosrx, The Ordinary…"
                  className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {brandOpen && brandSuggestions.length > 0 && (
                  <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-xl overflow-y-auto max-h-40">
                    {brandSuggestions.map((b) => (
                      <button key={b} type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setForm((f) => ({ ...f, brand: b })); setBrandOpen(false); }}
                        className="w-full px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                        {b}
                      </button>
                    ))}
                  </div>
                )}
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

            {/* Seção colapsável */}
            <div className="rounded-2xl border border-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span>Mais informações <span className="text-muted-foreground font-normal">(opcional)</span></span>
                {advancedOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>

              <AnimatePresence initial={false}>
                {advancedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-border/30">

                      {/* Foto do produto */}
                      <div className="pt-3">
                        <label className="text-xs font-semibold text-muted-foreground block mb-2">Foto do produto</label>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-muted/40 border border-border/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {form.imageUrl ? (
                              <img src={form.imageUrl} alt="Preview" className="w-full h-full object-contain p-1"
                                onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            ) : (
                              <Package size={22} className="text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                              className="h-8 px-3 rounded-lg border border-dashed border-border/60 text-xs font-semibold text-primary flex items-center gap-1.5 hover:bg-muted/20 disabled:opacity-50">
                              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                              {uploading ? "Enviando…" : form.imageUrl ? "Trocar foto" : "Enviar foto"}
                            </button>
                            {form.imageUrl && (
                              <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                                className="h-8 px-3 rounded-lg border border-destructive/30 text-xs font-semibold text-destructive flex items-center gap-1.5">
                                <X size={12} /> Remover
                              </button>
                            )}
                          </div>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </div>

                      {/* Tipo de pele */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-2">Tipo de pele indicado</label>
                        <div className="flex flex-wrap gap-1.5">
                          {SKIN_TYPES.map((st) => {
                            const selected = form.skinTypes.includes(st);
                            return (
                              <button key={st} type="button"
                                onClick={() => setForm((f) => ({
                                  ...f,
                                  skinTypes: selected ? f.skinTypes.filter(x => x !== st) : [...f.skinTypes, st],
                                }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                  selected
                                    ? "text-white"
                                    : "bg-muted/40 text-muted-foreground border border-border/40"
                                }`}
                                style={selected ? { background: "linear-gradient(135deg,#E8748A,#F4A8C7)" } : undefined}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tratamento */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-2">Objetivo de tratamento</label>
                        <div className="flex flex-wrap gap-1.5">
                          {TREATMENTS.map((tr) => {
                            const selected = form.treatments.includes(tr);
                            return (
                              <button key={tr} type="button"
                                onClick={() => setForm((f) => ({
                                  ...f,
                                  treatments: selected ? f.treatments.filter(x => x !== tr) : [...f.treatments, tr],
                                }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                  selected
                                    ? "text-white"
                                    : "bg-muted/40 text-muted-foreground border border-border/40"
                                }`}
                                style={selected ? { background: "linear-gradient(135deg,#E8748A,#F4A8C7)" } : undefined}
                              >
                                {tr}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tipo de produto */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-2">Tipo de produto</label>
                        <div className="flex flex-wrap gap-1.5">
                          {PRODUCT_TYPES.map((pt) => {
                            const selected = form.productType === pt;
                            return (
                              <button key={pt} type="button"
                                onClick={() => setForm((f) => ({ ...f, productType: selected ? "" : pt }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                  selected
                                    ? "text-white"
                                    : "bg-muted/40 text-muted-foreground border border-border/40"
                                }`}
                                style={selected ? { background: "linear-gradient(135deg,#E8748A,#F4A8C7)" } : undefined}
                              >
                                {pt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Observação */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Observação</label>
                        <input
                          value={form.note}
                          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                          placeholder="Ex: Uso à noite, evitar ao sol"
                          className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-6 pt-3 flex gap-3 flex-shrink-0 border-t border-border/30">
            <button onClick={() => setFormOpen(false)}
              className="flex-1 h-12 rounded-2xl border border-border/60 bg-background text-foreground font-semibold text-sm">
              Cancelar
            </button>
            <button onClick={save} disabled={!form.name.trim() || saving}
              className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm shadow-sm disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando…</> : editingId ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Confirmation dialog ───────────────────────────────────────────────── */}
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{pendingAdd.productName}</p>
                  <p className="text-xs text-muted-foreground">Adicionar à rotina</p>
                </div>
              </div>
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
