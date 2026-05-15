import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Image, Upload, X, PackageOpen, Pencil, Lightbulb, Check, Sun, Moon, ChevronRight, Loader2, Package } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { uploadProductImage } from "@/lib/storage";
import { type UserCatalogProduct, getUserCatalog, saveUserCatalog } from "@/lib/userCatalog";
import { fetchMyProducts, createMyProduct, updateMyProduct, deleteMyProduct } from "@/lib/userProducts";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLatestAnalysis, fetchRoutineSteps, addRoutineStep, invalidateAnalysisCache } from "@/lib/analysisClient";
import { toast } from "@/components/ui/sonner";
import { AuroraBackdrop } from "@/components/shared";

const CATEGORIES = [
  "Limpeza", "Hidratante", "Sérum", "Protetor Solar", "Tônico",
  "Esfoliante", "Máscara", "Contorno dos Olhos", "Retinol", "Ácido",
];

// Fallback images por categoria
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Retinol": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776263050155-fojzlv.png",
  "Ácido": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776263050155-fojzlv.png",
  "Tônico": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776263016335-s8ggzz.png",
  "Protetor Solar": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224363237-e81o0d.png",
  "Hidratante": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224296863-0qst29.png",
  "Sérum": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224156505-c7bgop.png",
  "Limpeza": "https://hemoqtqlczjgtrfibudj.supabase.co/storage/v1/object/public/product-images/57b9be3c-9834-4a62-951a-6f8d16d3c92b/1776224112164-r15mn9.png",
};

const getProductImageUrl = (imageUrl: string | undefined, category: string): string | undefined => {
  if (imageUrl) return imageUrl;
  return CATEGORY_FALLBACK_IMAGES[category];
};

const emptyForm = { name: "", category: "", imageUrl: "", note: "" };

// Busca nomes de produtos em uso na rotina atual (via API v2 — dados sempre frescos)
async function fetchProductNamesInRoutine(analysisId: string): Promise<Set<string>> {
  try {
    const steps = await fetchRoutineSteps(analysisId);
    const names = new Set<string>();
    steps.forEach((s) => {
      // Nome resolvido do step (override tem prioridade)
      const main = (s.overrideProductName ?? s.productName ?? "").toLowerCase().trim();
      if (main) names.add(main);
      // Slots selecionados
      s.slots?.filter(sl => sl.isSelected && sl.productName).forEach(sl => {
        names.add(sl.productName!.toLowerCase().trim());
      });
    });
    return names;
  } catch {
    return new Set();
  }
}

export default function MeusProdutos() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<UserCatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [addingToRoutine, setAddingToRoutine] = useState<Record<string, boolean>>({});
  const [addedToRoutine, setAddedToRoutine] = useState<Record<string, string>>({});

  type PendingAdd = { productName: string; imageUrl?: string; category: string; period: "morning" | "night" | "both"; id: string };
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);

  const periodLabel = (p: "morning" | "night" | "both") =>
    p === "morning" ? "manhã" : p === "night" ? "noite" : "manhã e noite";

  const confirmAdd = async () => {
    if (!pendingAdd) return;
    const { productName, imageUrl, category, period, id } = pendingAdd;
    setPendingAdd(null);
    const latestAnalysis = getCachedLatestAnalysis();
    if (!latestAnalysis?.id) return;
    setAddingToRoutine((prev) => ({ ...prev, [id]: true }));
    try {
      const periods: Array<"morning" | "night"> = period === "both" ? ["morning", "night"] : [period];
      await Promise.all(periods.map((p) =>
        addRoutineStep(latestAnalysis.id, { period: p, productName, imageUrl, category, recurrence: "daily" })
      ));
      invalidateAnalysisCache();
      setAddedToRoutine((prev) => ({ ...prev, [id]: period }));
      toast.success("Adicionado à rotina!", {
        duration: 3000,
        action: { label: "Ver rotina →", onClick: () => navigate("/routine") },
      });
      setTimeout(() => setAddedToRoutine((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    } finally {
      setAddingToRoutine((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAddToRoutine = (
    productName: string,
    imageUrl: string | undefined,
    category: string,
    period: "morning" | "night" | "both",
    id: string,
  ) => {
    setPendingAdd({ productName, imageUrl, category, period, id });
  };
  const fileRef = useRef<HTMLInputElement>(null);
  
  // New: Tab management and recommendations
  const [activeTab, setActiveTab] = useState<"meus" | "indicados">("meus");
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{ type: string; product: string; description: string; imageUrl?: string }>>([]);
  const [productsInUse, setProductsInUse] = useState<Set<string>>(new Set());

  const isProductInRoutine = (productName: string): boolean =>
    productsInUse.has(productName.toLowerCase().trim());

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (user?.id) {
        setUserId(user.id);
        setProducts(getUserCatalog(user.id));
        try {
          const remote = await fetchMyProducts(user.id);
          setProducts(remote);
        } catch {
          // keep localStorage fallback
        }
        
        // Carrega recomendações e verifica quais estão em uso na rotina (API v2)
        try {
          const latestAnalysis = getCachedLatestAnalysis();
          if (latestAnalysis?.recommendations?.length) {
            setRecommendedProducts(latestAnalysis.recommendations);
            const inUse = await fetchProductNamesInRoutine(latestAnalysis.id);
            setProductsInUse(inUse);
          }
        } catch { /* falha silenciosa — não crítico */ }
        
        setLoadingProducts(false);
      } else {
        setLoadingProducts(false);
      }
    });
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCategorySearch("");
    setShowForm(true);
  };

  const openEdit = (p: UserCatalogProduct) => {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, imageUrl: p.imageUrl ?? "", note: p.note ?? "" });
    setCategorySearch(p.category);
    setShowForm(true);
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
        toast.success("Produto atualizado!", { duration: 2000 });
      } else {
        const created = await createMyProduct(data, userId ?? undefined);
        const next = [created, ...products];
        setProducts(next);
        saveUserCatalog(next, userId ?? undefined);
        toast.success("Produto cadastrado!", { duration: 2000 });
      }
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    const name = products.find((p) => p.id === id)?.name ?? "Produto";
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteMyProduct(id);
      saveUserCatalog(products.filter((p) => p.id !== id), userId ?? undefined);
      toast.success(`"${name}" removido`, { duration: 2000 });
    } catch (err) {
      console.error("Erro ao remover produto:", err);
      toast.error("Erro ao remover. Tente novamente.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
    } finally {
      setUploading(false);
    }
  };

  const categorySuggestions = CATEGORIES.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const grouped = products.reduce<Record<string, UserCatalogProduct[]>>((acc, p) => {
    const key = p.category || "Sem categoria";
    acc[key] = [...(acc[key] ?? []), p];
    return acc;
  }, {});

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
                ? `${products.length} produto${products.length !== 1 ? "s" : ""} cadastrado${products.length !== 1 ? "s" : ""}`
                : `${recommendedProducts.length} produto${recommendedProducts.length !== 1 ? "s" : ""} indicado${recommendedProducts.length !== 1 ? "s" : ""}`
              }
            </p>
          </div>
          {activeTab === "meus" && (
            <button
              onClick={openAdd}
              className="coral-button h-9 px-4 rounded-full text-sm font-bold text-white flex items-center gap-1.5"
            >
              <Plus size={15} /> Adicionar
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 pb-3 border-b border-border/20">
          <button
            onClick={() => setActiveTab("meus")}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              activeTab === "meus"
                ? "bg-white/80 text-foreground border border-white/80 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Meus Produtos
          </button>
          <button
            onClick={() => setActiveTab("indicados")}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === "indicados"
                ? "bg-white/80 text-foreground border border-white/80 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lightbulb size={14} /> Indicados
          </button>
        </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-5 space-y-6">
        {/* "Meus Produtos" tab */}
        {activeTab === "meus" && (
          <>
            {/* Empty state */}
            {products.length === 0 && !showForm && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <PackageOpen size={36} className="text-primary/60" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Nenhum produto cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Adicione os produtos que você tem em casa para organizar sua rotina.</p>
                </div>
                <button
                  onClick={openAdd}
                  className="coral-button h-11 px-6 rounded-full text-sm font-bold text-white"
                >
                  Adicionar primeiro produto
                </button>
              </motion.div>
            )}

            {/* Add/Edit form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="lg-surface-strong rounded-[1.75rem] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{editingId ? "Editar produto" : "Novo produto"}</p>
                    <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>

                  {/* Image preview */}
                  {(() => {
                    const previewUrl = form.imageUrl || CATEGORY_FALLBACK_IMAGES[form.category];
                    return previewUrl && (
                      <div className="h-24 w-full rounded-xl bg-white border border-border/30 overflow-hidden flex items-center justify-center">
                        <img src={previewUrl} alt="Preview" className="h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    );
                  })()}

                  {/* Image upload */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={form.imageUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="URL da imagem"
                      className="h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="h-9 rounded-lg border border-dashed border-border/70 bg-background text-xs font-semibold text-primary flex items-center justify-center gap-1.5 hover:bg-muted/20 disabled:opacity-50"
                    >
                      <Upload size={12} /> {uploading ? "Enviando..." : "Enviar arquivo"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome do produto *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Gel de limpeza Cetaphil"
                      className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                      autoFocus
                    />
                  </div>

                  {/* Category autocomplete */}
                  <div className="relative">
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Categoria</label>
                    <input
                      value={categorySearch}
                      onChange={(e) => { setCategorySearch(e.target.value); setForm((prev) => ({ ...prev, category: e.target.value })); setCategoryOpen(true); }}
                      onFocus={() => setCategoryOpen(true)}
                      placeholder="Limpeza, Sérum, Hidratante..."
                      className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                    />
                    {categoryOpen && categorySuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-lg overflow-hidden">
                        {categorySuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setForm((prev) => ({ ...prev, category: s })); setCategorySearch(s); setCategoryOpen(false); }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Observação (opcional)</label>
                    <input
                      value={form.note}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Ex: Uso à noite, pele seca"
                      className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={save}
                      disabled={!form.name.trim() || saving}
                      className="coral-button flex-1 h-10 rounded-xl text-xs font-bold disabled:opacity-40"
                    >
                      {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar produto"}
                    </button>
                    <button onClick={() => setShowForm(false)} className="h-10 px-4 rounded-xl border border-border/60 bg-background text-xs font-semibold text-foreground">
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Product grid grouped by category */}
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-2 md:space-y-3">
                <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wide px-1">{category}</p>
                
                {/* Grid layout - Responsive */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {items.map((p) => {
                    const productImageUrl = getProductImageUrl(p.imageUrl, p.category);
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3, boxShadow: "0 12px 32px -8px rgba(180,100,140,0.18)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="lg-surface flex flex-col items-center text-center rounded-lg md:rounded-xl p-2 md:p-2.5 cursor-default"
                      >
                        {/* Product image - compact */}
                        <div className="w-full h-16 md:h-20 lg:h-24 rounded-md flex items-center justify-center mb-1.5 md:mb-2 flex-shrink-0">
                          {productImageUrl ? (
                            <img 
                              src={productImageUrl} 
                              alt={p.name} 
                              className="h-full object-contain"
                              onError={(e) => { e.currentTarget.style.display = "none"; }} 
                            />
                          ) : (
                            <Image size={20} className="text-muted-foreground md:w-6 md:h-6" />
                          )}
                        </div>
                        
                        {/* Product name - Responsive text */}
                        <p className="text-[10px] md:text-xs font-semibold text-foreground line-clamp-2 leading-tight">{p.name}</p>
                        {p.note && (
                          <p className="text-[8px] md:text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{p.note}</p>
                        )}
                        
                        {/* Quick add to routine */}
                        {addedToRoutine[p.id] ? (
                          <div className="flex items-center gap-1 mt-2 w-full justify-center">
                            <Check size={12} className="text-green-600" />
                            <p className="text-[10px] font-bold text-green-600">Adicionado!</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 mt-2 w-full">
                            <button
                              title="Adicionar à manhã"
                              disabled={addingToRoutine[p.id]}
                              onClick={() => handleAddToRoutine(p.name, p.imageUrl, p.category, "morning", p.id)}
                              className="flex-1 h-6 rounded-l-md border border-border/50 bg-background flex items-center justify-center hover:bg-amber-50 transition-colors"
                            >
                              <Sun size={11} className="text-amber-500" />
                            </button>
                            <button
                              title="Adicionar à noite"
                              disabled={addingToRoutine[p.id]}
                              onClick={() => handleAddToRoutine(p.name, p.imageUrl, p.category, "night", p.id)}
                              className="flex-1 h-6 border-y border-border/50 bg-background flex items-center justify-center hover:bg-indigo-50 transition-colors"
                            >
                              <Moon size={11} className="text-indigo-500" />
                            </button>
                            <button
                              title="Adicionar às duas rotinas"
                              disabled={addingToRoutine[p.id]}
                              onClick={() => handleAddToRoutine(p.name, p.imageUrl, p.category, "both", p.id)}
                              className="flex-1 h-6 border border-border/50 bg-background flex items-center justify-center gap-0.5 hover:bg-primary/5 transition-colors"
                            >
                              <Sun size={9} className="text-amber-500" /><Moon size={9} className="text-indigo-500" />
                            </button>
                          </div>
                        )}
                        {/* Edit / delete */}
                        <div className="flex items-center gap-1 mt-1 w-full">
                          <button
                            onClick={() => openEdit(p)}
                            className="flex-1 h-6 rounded-md border border-border/50 bg-background flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Pencil size={11} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="flex-1 h-6 rounded-md border border-destructive/40 bg-destructive/10 flex items-center justify-center"
                          >
                            <Trash2 size={11} className="text-destructive" />
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

        {/* "Produtos Indicados" tab */}
        {activeTab === "indicados" && (
          <>
            {recommendedProducts.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Lightbulb size={36} className="text-primary/60" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Nenhuma recomendação disponível</p>
                  <p className="text-sm text-muted-foreground mt-1">Realize uma análise de pele para receber recomendações personalizadas de produtos.</p>
                </div>
                <button
                  onClick={() => navigate("/analysis")}
                  className="coral-button h-11 px-6 rounded-full text-sm font-bold text-white"
                >
                  Fazer análise
                </button>
              </motion.div>
            ) : (
              <>
                {/* Shelf-style layout - Responsive */}
                {(() => {
                  const grouped = recommendedProducts.reduce<Record<string, typeof recommendedProducts>>((acc, p) => {
                    const key = p.type || "Outros";
                    acc[key] = [...(acc[key] ?? []), p];
                    return acc;
                  }, {});
                  
                  return Object.entries(grouped).map(([type, items]) => (
                    <div key={type} className="space-y-2 md:space-y-3">
                      <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wide px-1">{type}</p>
                      
                      {/* Shelf container - Responsive */}
                      <div className="relative rounded-xl md:rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100 p-3 md:p-4 shadow-md border border-amber-200">
                        {/* Shelf lines (decorative) */}
                        <div className="absolute inset-0 rounded-xl md:rounded-2xl overflow-hidden pointer-events-none">
                          <div className="absolute bottom-1/3 left-0 right-0 h-px bg-amber-300/30"></div>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400/20"></div>
                        </div>
                        
                        {/* Products grid - Responsive: 2 col mobile, 3 col tablet, 4 col desktop */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 relative z-10">
                          {items.map((p, idx) => {
                            const isInUse = isProductInRoutine(p.product);
                            const typeNorm = (p.type ?? "").toLowerCase();
                            const recPeriod = typeNorm.includes("protetor") || typeNorm.includes("solar")
                              ? "morning"
                              : typeNorm.includes("retinol") || typeNorm.includes("retinoide")
                              ? "night"
                              : "both";
                            const recId = `rec-${p.product}`;
                            return (
                              <motion.div
                                key={`${type}-${idx}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex flex-col items-center text-center rounded-lg md:rounded-xl border shadow-sm p-2 md:p-2.5 relative ${
                                  isInUse ? "bg-green-50 border-green-200" : "bg-white border-border/40"
                                }`}
                              >
                                {/* In-use badge */}
                                {isInUse && (
                                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md z-20">
                                    <Check size={14} className="text-white" />
                                  </div>
                                )}
                                {/* Period icon */}
                                <div className="absolute top-1.5 left-1.5 flex gap-0.5">
                                  {(recPeriod === "morning" || recPeriod === "both") && <Sun size={9} className="text-amber-400" />}
                                  {(recPeriod === "night" || recPeriod === "both") && <Moon size={9} className="text-indigo-400" />}
                                </div>

                                {/* Product image */}
                                <div className="w-full h-16 md:h-20 lg:h-24 rounded-md flex items-center justify-center mb-1.5 md:mb-2 flex-shrink-0">
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.product} className="h-full object-contain"
                                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                  ) : (
                                    <Image size={20} className="text-muted-foreground md:w-6 md:h-6" />
                                  )}
                                </div>

                                <p className="text-[10px] md:text-xs font-semibold text-foreground line-clamp-2 leading-tight">{p.product}</p>
                                {p.description && (
                                  <p className="text-[8px] md:text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                                )}

                                {/* Quick add to routine */}
                                {addedToRoutine[recId] ? (
                                  <div className="flex items-center gap-1 mt-1.5 justify-center">
                                    <Check size={10} className="text-green-600" />
                                    <p className="text-[9px] font-bold text-green-600">Adicionado!</p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-0.5 mt-1.5 w-full">
                                    {(recPeriod === "morning" || recPeriod === "both") && (
                                      <button title="Manhã" disabled={addingToRoutine[recId]}
                                        onClick={() => handleAddToRoutine(p.product, p.imageUrl, p.type ?? "", "morning", recId)}
                                        className="flex-1 h-5 rounded-l-md border border-border/50 bg-white flex items-center justify-center hover:bg-amber-50">
                                        <Sun size={10} className="text-amber-500" />
                                      </button>
                                    )}
                                    {(recPeriod === "night" || recPeriod === "both") && (
                                      <button title="Noite" disabled={addingToRoutine[recId]}
                                        onClick={() => handleAddToRoutine(p.product, p.imageUrl, p.type ?? "", "night", recId)}
                                        className="flex-1 h-5 border border-border/50 bg-white flex items-center justify-center hover:bg-indigo-50">
                                        <Moon size={10} className="text-indigo-500" />
                                      </button>
                                    )}
                                    {recPeriod === "both" && (
                                      <button title="Ambas" disabled={addingToRoutine[recId]}
                                        onClick={() => handleAddToRoutine(p.product, p.imageUrl, p.type ?? "", "both", recId)}
                                        className="flex-1 h-5 rounded-r-md border border-border/50 bg-white flex items-center justify-center gap-0.5 hover:bg-primary/5">
                                        <Sun size={8} className="text-amber-500" /><Moon size={8} className="text-indigo-500" />
                                      </button>
                                    )}
                                  </div>
                                )}

                                {isInUse && !addedToRoutine[recId] && (
                                  <p className="text-[8px] font-semibold text-green-600 mt-1 px-1.5 py-0.5 bg-green-100 rounded-full">Em uso</p>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </>
            )}
          </>
        )}
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {pendingAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-8"
            onClick={() => setPendingAdd(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                {pendingAdd.imageUrl ? (
                  <img src={pendingAdd.imageUrl} alt={pendingAdd.productName}
                    className="w-14 h-14 rounded-2xl object-contain bg-muted/40 border border-border/30 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package size={22} className="text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground leading-snug">{pendingAdd.productName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicionar à rotina da <span className="font-semibold text-foreground">{periodLabel(pendingAdd.period)}</span>?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingAdd(null)}
                  className="flex-1 h-12 rounded-2xl border border-border/60 bg-background text-foreground font-semibold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { void confirmAdd(); }}
                  disabled={addingToRoutine[pendingAdd.id]}
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingToRoutine[pendingAdd.id]
                    ? <><Loader2 size={16} className="animate-spin" /> Adicionando…</>
                    : "Adicionar"
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
