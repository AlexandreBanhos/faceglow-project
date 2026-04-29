import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Image, Upload, X, PackageOpen, Pencil, Lightbulb, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { uploadProductImage } from "@/lib/storage";
import { type UserCatalogProduct, getUserCatalog, saveUserCatalog } from "@/lib/userCatalog";
import { fetchMyProducts, createMyProduct, updateMyProduct, deleteMyProduct } from "@/lib/userProducts";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLatestAnalysis, loadRoutineCustomizations } from "@/lib/analysisClient";

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

// Helper function to get the ACTUAL routine with user's product swaps applied (loaded from BD)
async function getActualRoutineWithSwaps(analysis: any): Promise<string[]> {
  if (!analysis?.id) return [];
  
  try {
    // Load the original routine from analysis
    const originalRoutine = [
      ...(analysis.routine?.morning || []),
      ...(analysis.routine?.night || []),
    ];
    
    // Load customizations from BACKEND (not localStorage)
    const customizationData = await loadRoutineCustomizations(analysis.id);
    if (!customizationData?.customizations) {
      console.debug("[getActualRoutineWithSwaps] No customizations saved in BD, using original routine");
      return originalRoutine;
    }
    
    const customizations = customizationData.customizations as any;
    const selectedOptions: Record<string, string> = customizations.selectedByItem || {};
    
    console.debug("[getActualRoutineWithSwaps] Loaded customizations from BD:", {
      selectedCount: Object.keys(selectedOptions).length,
      selections: selectedOptions,
      updatedAt: customizationData.updatedAtUtc
    });
    
    if (Object.keys(selectedOptions).length === 0) {
      console.debug("[getActualRoutineWithSwaps] No swaps in customizations, returning original routine");
      return originalRoutine;
    }
    
    // Build the recommendations grouped by category (same as Routine.tsx)
    const recommendationsByType = new Map<string, any>();
    analysis.recommendations?.forEach((rec: any) => {
      const type = (rec.type || "").toLowerCase().trim();
      if (!recommendationsByType.has(type)) {
        recommendationsByType.set(type, []);
      }
      recommendationsByType.get(type).push(rec);
    });
    
    console.debug("[getActualRoutineWithSwaps] Recommendations by type:", {
      types: Array.from(recommendationsByType.keys())
    });
    
    // For each step in the original routine, check if it was swapped
    const actualRoutine = originalRoutine.map((step) => {
      if (!step) return step;
      
      // Extract category from step (e.g., "Limpeza" from "Limpeza: Product")
      const category = step.includes(":") ? step.split(":")[0].toLowerCase().trim() : "";
      if (!category) return step;
      
      // Check if there's a selected option for this category
      const selectedOption = Object.entries(selectedOptions).find(([key]) => {
        // The key format is like "morning-0-limpeza" or "night-4-hidratante"
        return key.toLowerCase().includes(category);
      })?.[1];
      
      if (!selectedOption) {
        console.debug("[getActualRoutineWithSwaps] No swap for step:", { step, category });
        return step;
      }
      
      // selectedOption format: "${item.key}::best" or "${item.key}::second" etc
      const categoryRecs = recommendationsByType.get(category) || [];
      const optionType = selectedOption.split("::")[1]; // "best", "second", "budget"
      
      let swappedProduct = null;
      if (optionType === "best" && categoryRecs[0]) {
        swappedProduct = categoryRecs[0].product;
      } else if (optionType === "second" && categoryRecs[1]) {
        swappedProduct = categoryRecs[1].product;
      } else if (optionType === "budget" && categoryRecs[2]) {
        swappedProduct = categoryRecs[2].product;
      }
      
      if (swappedProduct) {
        const newStep = `${category}: ${swappedProduct} (original: ${step})`;
        console.debug("[getActualRoutineWithSwaps] ✓ Swapped:", { original: step, swapped: newStep });
        return newStep;
      }
      
      return step;
    });
    
    console.debug("[getActualRoutineWithSwaps] Final actual routine:", {
      count: actualRoutine.length,
      steps: actualRoutine.slice(0, 3)
    });
    
    return actualRoutine;
  } catch (error) {
    console.error("[getActualRoutineWithSwaps] Error:", error);
    return [];
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
  const fileRef = useRef<HTMLInputElement>(null);
  
  // New: Tab management and recommendations
  const [activeTab, setActiveTab] = useState<"meus" | "indicados">("meus");
  const [recommendedProducts, setRecommendedProducts] = useState<Array<{ type: string; product: string; description: string; imageUrl?: string }>>([]);
  const [productsInUse, setProductsInUse] = useState<Set<string>>(new Set());

  // Function to check if a product name is in the routine (more strict matching)
  const isProductInRoutine = (productName: string, routineSteps: string[]): boolean => {
    if (!productName || !routineSteps || routineSteps.length === 0) return false;
    const lowerName = productName.toLowerCase().trim();
    
    const found = routineSteps.some(step => {
      if (!step) return false;
      const lowerStep = step.toLowerCase().trim();
      
      // Format: "Category: Product Name (period)" or "Category: Product Name"
      // Extract product name: everything after ":" and before "("
      let productFromStep = lowerStep;
      
      if (lowerStep.includes(":")) {
        // Get everything after the colon
        productFromStep = lowerStep.split(":")[1].trim();
        // Remove the period suffix like "(morning)", "(night)", etc
        if (productFromStep.includes("(")) {
          productFromStep = productFromStep.split("(")[0].trim();
        }
      }
      
      // Now compare
      const matches = 
        productFromStep === lowerName || 
        lowerStep.includes(lowerName) ||
        lowerName.includes(productFromStep);
      
      if (matches) {
        console.debug("[isProductInRoutine] ✓ Match found:", { 
          productName, 
          step, 
          productFromStep,
          lowerName 
        });
      }
      return matches;
    });
    
    if (!found) {
      console.debug("[isProductInRoutine] ✗ No match for:", { productName, routineStepsCount: routineSteps.length });
    }
    
    return found;
  };

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
        
        // Load recommended products from latest analysis
        try {
          const latestAnalysis = getCachedLatestAnalysis();
          if (latestAnalysis && latestAnalysis.recommendations && Array.isArray(latestAnalysis.recommendations)) {
            setRecommendedProducts(latestAnalysis.recommendations);
            
            // Get the ACTUAL routine with user's product swaps applied (from BD)
            const actualRoutineSteps: string[] = (await getActualRoutineWithSwaps(latestAnalysis))
              .filter(step => step && typeof step === 'string' && step.trim().length > 0);
            
            console.log("=== DEBUG ROTINA ATUAL COM TROCAS (DO BD) ===");
            console.log("ROTINA ATUAL (com trocas do BD):", actualRoutineSteps);
            console.log("PRODUTOS RECOMENDADOS:", latestAnalysis.recommendations.map(r => r.product));
            console.log("==========================================");
            
            console.debug("[MeusProdutos] Actual routine with swaps from BD:", { 
              count: actualRoutineSteps.length, 
              steps: actualRoutineSteps 
            });
            console.debug("[MeusProdutos] Recommended products to check:", { 
              count: latestAnalysis.recommendations.length,
              products: latestAnalysis.recommendations.map(r => r.product)
            });
            
            const inUse = new Set<string>();
            latestAnalysis.recommendations.forEach((rec) => {
              // Check against the ACTUAL routine (with swaps from BD)
              if (actualRoutineSteps.length > 0 && isProductInRoutine(rec.product, actualRoutineSteps)) {
                inUse.add(rec.product);
                console.debug("[MeusProdutos] ✅ Product marked as in-use:", rec.product);
              } else {
                console.debug("[MeusProdutos] ❌ Product NOT in routine:", rec.product);
              }
            });
            setProductsInUse(inUse);
            console.log("PRODUTOS EM USO (final, do BD):", Array.from(inUse));
            console.debug("[MeusProdutos] Final products in use:", { count: inUse.size, products: Array.from(inUse) });
          }
        } catch (err) {
          console.debug("[MeusProdutos] Erro ao carregar produtos indicados ou customizações:", err);
        }
        
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
      } else {
        const created = await createMyProduct(data, userId ?? undefined);
        const next = [created, ...products];
        setProducts(next);
        saveUserCatalog(next, userId ?? undefined);
      }
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
    } finally {
      setSaving(false);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteMyProduct(id);
      saveUserCatalog(products.filter((p) => p.id !== id), userId ?? undefined);
    } catch (err) {
      console.error("Erro ao remover produto:", err);
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
    <div className="min-h-screen pb-28" style={{ backgroundColor: "#FAF8F5" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-safe-top" style={{ backgroundColor: "#FAF8F5" }}>
        <div className="flex items-center gap-3 py-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white border border-border/40 flex items-center justify-center shadow-sm">
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
              className="h-9 px-4 rounded-full text-sm font-bold text-white flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg, #E8806A, #F4A68A)" }}
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
                ? "bg-white text-foreground border border-border/40 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Meus Produtos
          </button>
          <button
            onClick={() => setActiveTab("indicados")}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-1.5 ${
              activeTab === "indicados"
                ? "bg-white text-foreground border border-border/40 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lightbulb size={14} /> Indicados
          </button>
        </div>
      </div>

      <div className="px-4 space-y-6">
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
                  className="h-11 px-6 rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #E8806A, #F4A68A)" }}
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
                  className="rounded-3xl border border-border/60 bg-white p-4 space-y-3 shadow-sm"
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
                      className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40"
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
                        className="flex flex-col items-center text-center rounded-lg md:rounded-xl bg-white border border-border/40 shadow-sm p-2 md:p-2.5"
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
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-2 w-full">
                          <button 
                            onClick={() => openEdit(p)} 
                            className="flex-1 h-6 rounded-md border border-border/50 bg-background flex items-center justify-center hover:bg-muted transition-colors text-[11px]"
                          >
                            <Pencil size={11} className="text-muted-foreground" />
                          </button>
                          <button 
                            onClick={() => remove(p.id)} 
                            className="flex-1 h-6 rounded-md border border-destructive/40 bg-destructive/10 flex items-center justify-center text-[11px]"
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
                  className="h-11 px-6 rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #E8806A, #F4A68A)" }}
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
                            const isInUse = productsInUse.has(p.product);
                            return (
                              <motion.div
                                key={`${type}-${idx}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex flex-col items-center text-center rounded-lg md:rounded-xl border shadow-sm p-2 md:p-2.5 relative ${
                                  isInUse 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-white border-border/40'
                                }`}
                              >
                                {/* In-use badge */}
                                {isInUse && (
                                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md z-20">
                                    <Check size={14} className="text-white" />
                                  </div>
                                )}
                                
                                {/* Product image - compact */}
                                <div className="w-full h-16 md:h-20 lg:h-24 rounded-md flex items-center justify-center mb-1.5 md:mb-2 flex-shrink-0">
                                  {p.imageUrl ? (
                                    <img 
                                      src={p.imageUrl} 
                                      alt={p.product} 
                                      className="h-full object-contain"
                                      onError={(e) => { e.currentTarget.style.display = "none"; }} 
                                    />
                                  ) : (
                                    <Image size={20} className="text-muted-foreground md:w-6 md:h-6" />
                                  )}
                                </div>
                                
                                {/* Product name - Responsive text */}
                                <p className="text-[10px] md:text-xs font-semibold text-foreground line-clamp-2 leading-tight">{p.product}</p>
                                {p.description && (
                                  <p className="text-[8px] md:text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                                )}
                                
                                {/* In-use label */}
                                {isInUse && (
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

      <BottomNav />
    </div>
  );
}
