import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  checkAdminAccess,
  AdminProduct,
  CreateAdminProductPayload,
} from "@/lib/admin-products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit, Trash2, Plus, Search, Upload, Sparkles, RefreshCw,
  ExternalLink, CheckCircle2, FileJson, X,
} from "lucide-react";
import { uploadProductImage } from "@/lib/storage";
import {
  enrichProductPreview,
  enrichAndSaveProduct,
  type EnrichmentResult,
} from "@/lib/admin-products";

const STEP_TYPES = [
  "cleanser", "toner", "serum", "moisturizer", "sunscreen",
  "eye_cream", "retinoid", "acid", "spot_treatment", "oil", "mask", "exfoliant",
];

const STEP_TYPES_SET = new Set(STEP_TYPES);

const IMPORT_EXAMPLE = JSON.stringify(
  [
    {
      name: "Sérum Vitamina C 10%",
      brand: "Sua Marca",
      stepTypeKey: "serum",
      compatibleSkinTypes: ["normal", "mista", "seca"],
      targetsConcerns: ["manchas", "firmeza", "oleosidade"],
      strengthLevel: "moderate",
      suitablePeriods: ["morning"],
      priceRange: "medium",
      price: 79.90,
      curationScore: 88,
      isActive: true,
      imageUrl: "https://exemplo.com/imagem.jpg",
      tagline: "Luminosidade e proteção antioxidante.",
      description: "Sérum com vitamina C para uniformizar o tom e proteger contra radicais livres.",
    },
    {
      name: "Hidratante Barreira Repair",
      brand: "Sua Marca",
      stepTypeKey: "moisturizer",
      compatibleSkinTypes: ["seca", "sensivel", "normal"],
      targetsConcerns: ["hidratacao", "sensibilidade", "vermelhidao"],
      strengthLevel: "mild",
      suitablePeriods: ["morning", "night"],
      priceRange: "low",
      price: 49.90,
      curationScore: 85,
      isActive: true,
      imageUrl: "",
      tagline: "Hidratação profunda para peles sensíveis.",
      description: "Hidratante com ceramidas e pantenol para restaurar a barreira cutânea.",
    },
    {
      name: "Protetor Solar FPS 40 Toque Seco",
      brand: "Sua Marca",
      stepTypeKey: "sunscreen",
      compatibleSkinTypes: ["oleosa", "mista", "normal"],
      targetsConcerns: ["manchas", "oleosidade"],
      strengthLevel: "mild",
      suitablePeriods: ["morning"],
      priceRange: "low",
      price: 44.90,
      curationScore: 91,
      isActive: true,
      imageUrl: "",
      tagline: "Proteção solar diária com acabamento matte.",
      description: "Protetor solar de textura fluida e toque seco para uso diário.",
    },
  ],
  null,
  2
);
const VALID_SKIN_SET  = new Set(["oleosa", "seca", "mista", "sensivel", "normal"]);
const VALID_CONCERN_SET = new Set([
  "acne", "cravos", "manchas", "rugas", "olheiras",
  "hidratacao", "oleosidade", "sensibilidade", "poros", "vermelhidao", "firmeza",
]);
const VALID_PERIOD_SET   = new Set(["morning", "night"]);
const VALID_STRENGTH_SET = new Set(["mild", "moderate", "strong"]);
const VALID_PRICE_SET    = new Set(["low", "medium", "high", "premium"]);

const CONCERN_ALIASES: Record<string, string> = {
  "poros dilatados":      "poros",
  "ressecamento":         "hidratacao",
  "desidratacao":         "hidratacao",
  "linhas finas":         "rugas",
  "envelhecimento":       "firmeza",
  "envelhecimento precoce": "firmeza",
  "textura irregular":    "poros",
  "barreira cutanea":     "hidratacao",
  "opacidade":            "manchas",
  "fotodano":             "manchas",
};

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normKey(v: unknown): string {
  return typeof v === "string" ? stripAccents(v.trim().toLowerCase()) : "";
}

function mapArr(v: unknown, valid: Set<string>, aliases?: Record<string, string>): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const item of v) {
    const k = normKey(item);
    if (valid.has(k)) { out.add(k); continue; }
    const alias = aliases?.[k] ?? aliases?.[String(item)];
    if (alias && valid.has(alias)) out.add(alias);
  }
  return [...out];
}

function parseImportItem(raw: Record<string, unknown>): CreateAdminProductPayload {
  const stepTypeKey = String(raw.stepTypeKey ?? raw.category ?? "");
  return {
    name: String(raw.name ?? ""),
    brand: String(raw.brand ?? ""),
    stepTypeKey: STEP_TYPES_SET.has(stepTypeKey) ? stepTypeKey : "",
    compatibleSkinTypes: mapArr(raw.compatibleSkinTypes, VALID_SKIN_SET),
    targetsConcerns:     mapArr(raw.targetsConcerns, VALID_CONCERN_SET, CONCERN_ALIASES),
    strengthLevel:       VALID_STRENGTH_SET.has(String(raw.strengthLevel ?? "")) ? String(raw.strengthLevel) as "mild" | "moderate" | "strong" : "mild",
    suitablePeriods:     mapArr(raw.suitablePeriods, VALID_PERIOD_SET),
    priceRange:          VALID_PRICE_SET.has(String(raw.priceRange ?? "")) ? String(raw.priceRange) : "medium",
    priceAvg:            typeof raw.price === "number" ? raw.price : typeof raw.priceAvg === "number" ? raw.priceAvg : undefined,
    curationScore:       typeof raw.curationScore === "number" ? Math.min(100, Math.max(0, raw.curationScore)) : 50,
    isActive:            raw.isActive !== false,
    imageUrl:            String(raw.imageUrl ?? ""),
    tagline:             String(raw.tagline ?? ""),
    description:         String(raw.description ?? ""),
  };
}

const STEP_TYPE_LABELS: Record<string, string> = {
  cleanser: "Limpador",
  toner: "Tônico",
  serum: "Sérum",
  moisturizer: "Hidratante",
  sunscreen: "Protetor Solar",
  eye_cream: "Creme para Olhos",
  retinoid: "Retinóide",
  acid: "Ácido",
  spot_treatment: "Tratamento Localizado",
  oil: "Óleo",
  mask: "Máscara",
  exfoliant: "Esfoliante",
};

const stepLabel = (key: string | null | undefined) =>
  key ? (STEP_TYPE_LABELS[key] ?? key) : "—";

function productToPayload(p: AdminProduct): CreateAdminProductPayload {
  return {
    name: p.name,
    brand: p.brand,
    stepTypeKey: p.stepTypeKey ?? "",
    compatibleSkinTypes: p.compatibleSkinTypes ?? [],
    targetsConcerns: p.targetsConcerns ?? [],
    strengthLevel: p.strengthLevel ?? "mild",
    suitablePeriods: p.suitablePeriods ?? ["morning", "night"],
    priceRange: p.priceRange ?? "medium",
    priceAvg: p.priceAvg,
    curationScore: p.curationScore ?? 50,
    isActive: p.isActive,
    imageUrl: p.primaryImageUrl ?? "",
    tagline: p.tagline ?? "",
    description: p.description ?? "",
  };
}

export function AdminProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editMode, setEditMode] = useState<"form" | "json">("form");
  const [jsonEditorValue, setJsonEditorValue] = useState("{}");
  const [jsonEditorError, setJsonEditorError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState<"sem-imagem" | "sem-descricao" | "padrao">("padrao");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; action: string } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [pendingBulkCategory, setPendingBulkCategory] = useState("");

  // Import JSON em lote
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importItems, setImportItems] = useState<CreateAdminProductPayload[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  // Form data
  const [formData, setFormData] = useState<CreateAdminProductPayload>({
    name: "", brand: "", stepTypeKey: "",
    compatibleSkinTypes: [], targetsConcerns: [],
    strengthLevel: "mild", suitablePeriods: ["morning", "night"],
    priceRange: "medium", priceAvg: undefined,
    curationScore: 50, isActive: true,
    imageUrl: "", tagline: "", description: "",
  });

  // Enrichment
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<EnrichmentResult | null>(null);
  const [enrichingRowId, setEnrichingRowId] = useState<string | null>(null);
  const [bulkEnrichProgress, setBulkEnrichProgress] = useState<{ done: number; total: number } | null>(null);

  // Derived — unique brands + categories for filter dropdowns
  const uniqueBrands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(),
    [products]
  );
  const uniqueCategories = useMemo(
    () => [...new Set(products.map((p) => p.stepTypeKey).filter(Boolean))].sort(),
    [products]
  );

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const result = await checkAdminAccess(controller.signal);
        clearTimeout(timeoutId);
        if (!result.isAdmin) { navigate("/dashboard"); return; }
        setIsAdmin(true);
        setLoading(false);
      } catch {
        navigate("/dashboard");
      }
    };
    checkAdmin();
  }, [navigate]);

  const filteredProducts = useMemo(() => {
    let f = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.stepTypeKey || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") f = f.filter((p) => filterStatus === "active" ? p.isActive : !p.isActive);
    if (filterBrand) f = f.filter((p) => p.brand === filterBrand);
    if (filterCategory) f = f.filter((p) => p.stepTypeKey === filterCategory);
    if (sortBy === "sem-imagem") f = [...f].sort((a, b) => (a.primaryImageUrl ? 1 : 0) - (b.primaryImageUrl ? 1 : 0));
    else if (sortBy === "sem-descricao") f = [...f].sort((a, b) => (a.description ? 1 : 0) - (b.description ? 1 : 0));
    return f;
  }, [products, searchQuery, filterStatus, filterBrand, filterCategory, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const allPageSelected =
    paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(p.id));

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setProducts(await getAdminProducts());
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar produtos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (isAdmin) loadProducts(); }, [isAdmin, loadProducts]);

  const getCompleteness = (p: AdminProduct) => {
    const checks = [
      !!p.name, !!p.brand, !!p.stepTypeKey, !!p.description, !!p.tagline,
      !!p.primaryImageUrl, (p.compatibleSkinTypes?.length ?? 0) > 0,
      (p.targetsConcerns?.length ?? 0) > 0, !!p.priceAvg,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  // ── JSON editor ──────────────────────────────────────────────────────────
  function openJsonTab() {
    setJsonEditorValue(JSON.stringify(formData, null, 2));
    setJsonEditorError(null);
    setEditMode("json");
  }

  function applyJsonAndSwitchToForm() {
    try {
      const parsed = JSON.parse(jsonEditorValue);
      setFormData((prev) => ({ ...prev, ...parsed }));
      setJsonEditorError(null);
      setEditMode("form");
    } catch {
      setJsonEditorError("JSON inválido — corrija antes de continuar.");
    }
  }

  // ── Enrichment ──────────────────────────────────────────────────────────
  const applyEnrichToForm = (result: EnrichmentResult) => {
    setFormData((prev) => ({
      ...prev,
      tagline: result.tagline || prev.tagline,
      description: result.description || prev.description,
      stepTypeKey: result.stepTypeKey || prev.stepTypeKey,
      compatibleSkinTypes: result.compatibleSkinTypes?.length ? result.compatibleSkinTypes : prev.compatibleSkinTypes,
      targetsConcerns: result.targetsConcerns?.length ? result.targetsConcerns : prev.targetsConcerns,
      strengthLevel: result.strengthLevel || prev.strengthLevel,
      suitablePeriods: result.suitablePeriods?.length ? result.suitablePeriods : prev.suitablePeriods,
      priceRange: result.priceRange || prev.priceRange,
      priceAvg: result.estimatedPriceBRL || prev.priceAvg,
    }));
    if (result.imageUrlSuggestion && !imagePreview) setImagePreview(result.imageUrlSuggestion);
    setEnrichResult(result);
  };

  const handleEnrichForm = async () => {
    if (!formData.name || !formData.brand) {
      toast({ title: "Atenção", description: "Preencha Nome e Marca antes de usar a IA.", variant: "destructive" });
      return;
    }
    setIsEnriching(true);
    setEnrichResult(null);
    try {
      const result = await enrichProductPreview(formData.name, formData.brand);
      applyEnrichToForm(result);
      toast({ title: "✓ IA preencheu os dados", description: `Confiança: ${Math.round(result.confidence * 100)}%.` });
    } catch (e) {
      toast({ title: "Erro na IA", description: e instanceof Error ? e.message : "Tente novamente", variant: "destructive" });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleEnrichRow = async (product: AdminProduct) => {
    setEnrichingRowId(product.id);
    try {
      await enrichAndSaveProduct(product.id);
      await loadProducts();
      toast({ title: "✓ Produto enriquecido", description: `${product.name} atualizado.` });
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha ao enriquecer", variant: "destructive" });
    } finally {
      setEnrichingRowId(null);
    }
  };

  const handleBulkEnrich = async () => {
    const toEnrich = products.filter((p) => !p.description);
    if (!toEnrich.length) { toast({ title: "Nenhum produto para enriquecer" }); return; }
    setBulkEnrichProgress({ done: 0, total: toEnrich.length });
    let done = 0;
    for (const p of toEnrich) {
      try { await enrichAndSaveProduct(p.id); } catch { /* continua */ }
      done++;
      setBulkEnrichProgress({ done, total: toEnrich.length });
      if (done < toEnrich.length) await new Promise((r) => setTimeout(r, 1200));
    }
    setBulkEnrichProgress(null);
    await loadProducts();
    toast({ title: `✓ ${done} produtos enriquecidos` });
  };

  // ── CRUD ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    let dataToSave = formData;
    if (editMode === "json") {
      try { dataToSave = JSON.parse(jsonEditorValue); }
      catch {
        toast({ title: "JSON inválido", description: "Corrija o JSON antes de salvar.", variant: "destructive" });
        return;
      }
    }
    if (!dataToSave.name?.trim()) {
      toast({ title: "Validação", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    try {
      setIsSaving(true);
      if (editingId) {
        await updateAdminProduct(editingId, dataToSave);
        toast({ title: "Sucesso", description: "Produto atualizado" });
      } else {
        await createAdminProduct(dataToSave);
        toast({ title: "Sucesso", description: "Produto criado" });
      }
      setIsFormOpen(false);
      resetForm();
      await loadProducts();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Operação falhou", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setIsSaving(true);
      await deleteAdminProduct(id);
      toast({ title: "Sucesso", description: "Produto deletado" });
      await loadProducts();
    } catch {
      toast({ title: "Erro", description: "Falha ao deletar produto", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(product: AdminProduct) {
    setEditingId(product.id);
    setFormData(productToPayload(product));
    setImagePreview(product.primaryImageUrl ?? "");
    setEditMode("form");
    setJsonEditorError(null);
    setEnrichResult(null);
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      name: "", brand: "", stepTypeKey: "",
      compatibleSkinTypes: [], targetsConcerns: [],
      strengthLevel: "mild", suitablePeriods: ["morning", "night"],
      priceRange: "medium", priceAvg: undefined,
      curationScore: 50, isActive: true,
      imageUrl: "", tagline: "", description: "",
    });
    setImagePreview("");
    setEditMode("form");
    setJsonEditorError(null);
    setEnrichResult(null);
  }

  function handleImageUrlChange(url: string) {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  }

  async function handleImageFileUpload(file: File) {
    try {
      setIsUploadingImage(true);
      const url = await uploadProductImage(file);
      handleImageUrlChange(url);
      toast({ title: "Sucesso", description: "Imagem enviada" });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao enviar imagem", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  }

  // ── Bulk selection ───────────────────────────────────────────────────────
  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() { setSelectedIds(new Set()); }

  async function handleBulkActivate(active: boolean) {
    const ids = [...selectedIds];
    setBulkProgress({ done: 0, total: ids.length, action: active ? "Ativando" : "Desativando" });
    let done = 0;
    for (const id of ids) {
      const p = products.find((x) => x.id === id);
      if (!p) { done++; continue; }
      try { await updateAdminProduct(id, { ...productToPayload(p), isActive: active }); } catch { /* continua */ }
      done++;
      setBulkProgress({ done, total: ids.length, action: active ? "Ativando" : "Desativando" });
    }
    setBulkProgress(null);
    clearSelection();
    await loadProducts();
    toast({ title: `✓ ${done} produto(s) ${active ? "ativados" : "desativados"}` });
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    setBulkProgress({ done: 0, total: ids.length, action: "Excluindo" });
    let done = 0;
    for (const id of ids) {
      try { await deleteAdminProduct(id); } catch { /* continua */ }
      done++;
      setBulkProgress({ done, total: ids.length, action: "Excluindo" });
    }
    setBulkProgress(null);
    clearSelection();
    setBulkDeleteOpen(false);
    await loadProducts();
    toast({ title: `✓ ${done} produto(s) excluídos` });
  }

  async function handleBulkSetCategory(category: string) {
    if (!category) return;
    const ids = [...selectedIds];
    setBulkProgress({ done: 0, total: ids.length, action: "Categorizando" });
    let done = 0;
    for (const id of ids) {
      const p = products.find((x) => x.id === id);
      if (!p) { done++; continue; }
      try { await updateAdminProduct(id, { ...productToPayload(p), stepTypeKey: category }); } catch { /* continua */ }
      done++;
      setBulkProgress({ done, total: ids.length, action: "Categorizando" });
    }
    setBulkProgress(null);
    clearSelection();
    setPendingBulkCategory("");
    await loadProducts();
    toast({ title: `✓ ${done} produto(s) → "${category}"` });
  }

  // ── Import JSON em lote ─────────────────────────────────────────────────
  function analyzeImport() {
    setImportItems(null);
    setImportError(null);
    try {
      const parsed = JSON.parse(importJson);
      const arr: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];
      const items = arr.map((r) => parseImportItem(r));
      const sem_nome = items.filter((i) => !i.name.trim()).length;
      if (sem_nome) setImportError(`${sem_nome} item(s) sem nome serão ignorados.`);
      setImportItems(items.filter((i) => i.name.trim()));
    } catch {
      setImportError("JSON inválido — verifique a sintaxe.");
    }
  }

  async function handleImport() {
    if (!importItems?.length) return;
    setImportProgress({ done: 0, total: importItems.length });
    let done = 0;
    for (const item of importItems) {
      try { await createAdminProduct(item); } catch { /* continua */ }
      done++;
      setImportProgress({ done, total: importItems.length });
    }
    setImportProgress(null);
    setIsImportOpen(false);
    setImportJson("");
    setImportItems(null);
    await loadProducts();
    toast({ title: `✓ ${done} produto(s) importados com sucesso` });
  }

  // ── Guards ───────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinnerFullScreen message="Carregando produtos..." />;
  if (error || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-50 to-slate-100 gap-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-2">Acesso Negado</h1>
          <p className="text-slate-600 mb-6 max-w-md">{error || "Sem permissão."}</p>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }
  if (isSaving) return <LoadingSpinnerFullScreen message="Salvando alterações..." />;

  const hasActiveFilters = !!(filterBrand || filterCategory || searchQuery || filterStatus !== "all");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-28">
      <div className="container mx-auto px-4 md:px-6 py-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900">Catálogo de Produtos</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">
              {products.length} produtos · {products.filter((p) => p.primaryImageUrl).length} com imagem · {products.filter((p) => p.description).length} com descrição
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleBulkEnrich}
              disabled={!!bulkEnrichProgress}
              className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 text-xs md:text-sm"
            >
              {bulkEnrichProgress
                ? <><RefreshCw size={15} className="animate-spin" /> {bulkEnrichProgress.done}/{bulkEnrichProgress.total}</>
                : <><Sparkles size={15} /> Enriquecer sem descrição ({products.filter((p) => !p.description).length})</>}
            </Button>

            {/* Importar JSON em lote */}
            <Dialog open={isImportOpen} onOpenChange={(o) => { setIsImportOpen(o); if (!o) { setImportJson(""); setImportItems(null); setImportError(null); } }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs md:text-sm">
                  <FileJson size={15} /> Importar JSON
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar Produtos via JSON</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Referência de valores aceitos */}
                  <details className="rounded-lg border border-slate-200 bg-slate-50">
                    <summary className="px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none list-none flex items-center justify-between">
                      <span>📋 Referência de campos e valores aceitos</span>
                      <span className="text-slate-400 text-[10px]">clique para expandir</span>
                    </summary>
                    <div className="px-4 pb-4 pt-2 space-y-2.5 text-[11px] text-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-slate-800 mb-0.5">stepTypeKey <span className="text-red-500">*</span></p>
                            <div className="flex flex-wrap gap-1">
                              {STEP_TYPES.map((k) => (
                                <code key={k} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">{k}</code>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 mb-0.5">compatibleSkinTypes</p>
                            <div className="flex flex-wrap gap-1">
                              {["oleosa","seca","mista","sensivel","normal"].map((k) => (
                                <code key={k} className="px-1.5 py-0.5 rounded bg-pink-50 border border-pink-200 text-pink-700">{k}</code>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 mb-0.5">suitablePeriods</p>
                            <div className="flex gap-1">
                              {["morning","night"].map((k) => (
                                <code key={k} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">{k}</code>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 mb-0.5">strengthLevel</p>
                            <div className="flex gap-1">
                              {["mild","moderate","strong"].map((k) => (
                                <code key={k} className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-violet-700">{k}</code>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 mb-0.5">priceRange</p>
                            <div className="flex gap-1">
                              {["low","medium","high","premium"].map((k) => (
                                <code key={k} className="px-1.5 py-0.5 rounded bg-green-50 border border-green-200 text-green-700">{k}</code>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-slate-800 mb-0.5">targetsConcerns</p>
                            <div className="flex flex-wrap gap-1">
                              {["acne","cravos","manchas","rugas","olheiras","hidratacao","oleosidade","sensibilidade","poros","vermelhidao","firmeza"].map((k) => (
                                <code key={k} className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">{k}</code>
                              ))}
                            </div>
                          </div>
                          <div className="pt-1">
                            <p className="font-semibold text-slate-800 mb-1">Outros campos</p>
                            <table className="w-full text-[10px] border-collapse">
                              <tbody>
                                {[
                                  ["name","string","obrigatório"],
                                  ["brand","string","obrigatório"],
                                  ["price / priceAvg","number","ex: 79.90"],
                                  ["curationScore","0–100","ex: 85"],
                                  ["isActive","true / false","padrão: true"],
                                  ["imageUrl","string URL","pode ser vazio"],
                                  ["tagline","string","frase curta"],
                                  ["description","string","texto livre"],
                                ].map(([field, type, note]) => (
                                  <tr key={field} className="border-b border-slate-100">
                                    <td className="py-0.5 pr-2 font-mono text-slate-700">{field}</td>
                                    <td className="py-0.5 pr-2 text-slate-500">{type}</td>
                                    <td className="py-0.5 text-slate-400">{note}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="mt-1.5 text-slate-400">Campos extras (sku, texture, warnings…) são ignorados.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-600">Cole um objeto ou array JSON de produtos</label>
                      <button
                        type="button"
                        onClick={() => { setImportJson(IMPORT_EXAMPLE); setImportItems(null); setImportError(null); }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Carregar exemplo
                      </button>
                    </div>
                    <textarea
                      value={importJson}
                      onChange={(e) => { setImportJson(e.target.value); setImportItems(null); setImportError(null); }}
                      className="w-full h-56 font-mono text-xs rounded-lg border border-slate-300 bg-slate-950 text-green-400 p-4 focus:outline-none resize-none"
                      placeholder={'[{ "name": "...", "brand": "...", "stepTypeKey": "serum", ... }]'}
                      spellCheck={false}
                    />
                  </div>

                  <Button onClick={analyzeImport} variant="outline" size="sm" className="text-xs gap-1.5" disabled={!importJson.trim()}>
                    <Search size={13} /> Analisar JSON
                  </Button>

                  {importError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      ⚠ {importError}
                    </div>
                  )}

                  {importItems && importItems.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">
                        {importItems.length} produto(s) prontos para importar
                      </p>
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Nome</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Marca</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Categoria</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Preço</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {importItems.map((item, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                                <td className="px-3 py-2 text-slate-500">{item.brand || "—"}</td>
                                <td className="px-3 py-2">
                                  {item.stepTypeKey
                                    ? <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{stepLabel(item.stepTypeKey)}</span>
                                    : <span className="text-red-400 text-[10px]">sem categoria</span>}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{item.priceAvg ? `R$ ${item.priceAvg}` : "—"}</td>
                                <td className="px-3 py-2 text-slate-500">{item.curationScore}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {importProgress ? (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <RefreshCw size={14} className="animate-spin text-blue-500" />
                          Importando... {importProgress.done}/{importProgress.total}
                        </div>
                      ) : (
                        <Button onClick={handleImport} className="gap-2">
                          <Plus size={16} /> Importar {importItems.length} produto(s)
                        </Button>
                      )}
                    </div>
                  )}

                  {importItems?.length === 0 && (
                    <p className="text-sm text-red-500">Nenhum produto válido encontrado no JSON.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsFormOpen(true); }} className="gap-2 w-full md:w-auto">
                  <Plus size={20} /> Novo Produto
                </Button>
              </DialogTrigger>

              <DialogContent className="w-full max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl">
                    {editingId ? "Editar Produto" : "Novo Produto"}
                  </DialogTitle>
                </DialogHeader>

                {/* Mode toggle: Formulário | JSON */}
                <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 w-fit mb-1">
                  <button
                    type="button"
                    onClick={() => { if (editMode === "json") applyJsonAndSwitchToForm(); }}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${editMode === "form" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Formulário
                  </button>
                  <button
                    type="button"
                    onClick={openJsonTab}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${editMode === "json" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <FileJson size={13} /> JSON
                  </button>
                </div>

                {/* JSON editor */}
                {editMode === "json" ? (
                  <div className="space-y-3">
                    {jsonEditorError && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        <span className="font-semibold">Erro:</span> {jsonEditorError}
                      </div>
                    )}
                    <textarea
                      value={jsonEditorValue}
                      onChange={(e) => { setJsonEditorValue(e.target.value); setJsonEditorError(null); }}
                      className="w-full h-96 font-mono text-xs rounded-lg border border-slate-300 bg-slate-950 text-green-400 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      spellCheck={false}
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={applyJsonAndSwitchToForm} variant="outline" size="sm" className="text-xs">
                        Aplicar e voltar ao formulário
                      </Button>
                      <Button type="button" onClick={handleSubmit} size="sm" className="text-xs">
                        {editingId ? "Atualizar" : "Criar"} Produto
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Form mode */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <div>
                        <label className="block text-xs md:text-sm font-medium mb-2">Nome *</label>
                        <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Nome do produto" className="bg-white text-sm" />
                      </div>

                      {/* IA button */}
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200">
                        <Sparkles size={16} className="text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-purple-900">Preencher com IA (Gemini)</p>
                          <p className="text-[10px] text-purple-600">Preencha Nome e Marca acima, depois clique</p>
                        </div>
                        <Button type="button" size="sm" onClick={handleEnrichForm} disabled={isEnriching || !formData.name || !formData.brand} className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1 flex-shrink-0">
                          {isEnriching ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          {isEnriching ? "Buscando..." : "Preencher"}
                        </Button>
                      </div>

                      {enrichResult && (
                        <div className="p-3 rounded-xl bg-green-50 border border-green-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-green-600" />
                              <p className="text-xs font-semibold text-green-800">IA preencheu com {Math.round(enrichResult.confidence * 100)}% de confiança</p>
                            </div>
                            <button type="button" onClick={() => setEnrichResult(null)} className="text-[10px] text-green-600 hover:text-green-800">✕</button>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {enrichResult.stepTypeKey && <span className="bg-white rounded px-1.5 py-0.5 text-slate-600">step: <b>{enrichResult.stepTypeKey}</b></span>}
                            {enrichResult.priceRange && <span className="bg-white rounded px-1.5 py-0.5 text-slate-600">faixa: <b>{enrichResult.priceRange}</b></span>}
                            {enrichResult.estimatedPriceBRL && <span className="bg-white rounded px-1.5 py-0.5 text-slate-600">preço: <b>R$ {enrichResult.estimatedPriceBRL.toFixed(0)}</b></span>}
                            {enrichResult.strengthLevel && <span className="bg-white rounded px-1.5 py-0.5 text-slate-600">força: <b>{enrichResult.strengthLevel}</b></span>}
                            {(enrichResult.suitablePeriods ?? []).length > 0 && <span className="bg-white rounded px-1.5 py-0.5 text-slate-600">período: <b>{enrichResult.suitablePeriods.join("+")}</b></span>}
                          </div>
                          {(enrichResult.compatibleSkinTypes ?? []).length > 0 && <p className="text-[10px] text-green-700"><b>Tipos de pele:</b> {enrichResult.compatibleSkinTypes.join(", ")}</p>}
                          {(enrichResult.targetsConcerns ?? []).length > 0 && <p className="text-[10px] text-green-700"><b>Concerns:</b> {enrichResult.targetsConcerns.join(", ")}</p>}
                          {(enrichResult.keyIngredients ?? []).length > 0 && <p className="text-[10px] text-green-700"><b>Ingredientes-chave:</b> {enrichResult.keyIngredients.join(", ")}</p>}
                          {enrichResult.inciList && (
                            <details className="text-[10px] text-green-700">
                              <summary className="cursor-pointer font-semibold">Ver INCI completo</summary>
                              <p className="mt-1 leading-relaxed break-words">{enrichResult.inciList}</p>
                            </details>
                          )}
                          {enrichResult.imageUrlSuggestion && (
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-green-300">
                              <img src={enrichResult.imageUrlSuggestion} alt="" className="w-10 h-10 object-contain rounded border border-slate-200 bg-white" onError={(e) => { e.currentTarget.parentElement!.style.display = "none"; }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-green-800">IA encontrou uma imagem</p>
                                <p className="text-[9px] text-green-600 truncate">{enrichResult.imageUrlSuggestion}</p>
                              </div>
                              <button type="button" onClick={() => handleImageUrlChange(enrichResult.imageUrlSuggestion!)} className="text-[10px] px-2 py-1 bg-green-600 text-white rounded font-semibold hover:bg-green-700 flex-shrink-0">Usar</button>
                            </div>
                          )}
                          <p className="text-[10px] text-green-600">Revise os campos abaixo e clique em Salvar.</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs md:text-sm font-medium mb-2">Tagline</label>
                        <Input value={formData.tagline ?? ""} onChange={(e) => setFormData((p) => ({ ...p, tagline: e.target.value }))} placeholder="Ex: Hidratação profunda sem oleosidade" className="bg-white text-sm" />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-medium mb-1">
                          Descrição <span className="text-xs text-slate-400 font-normal">(ingredientes, modo de uso, benefícios)</span>
                        </label>
                        <textarea value={formData.description ?? ""} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Marca</label>
                          <Input
                            list="brand-datalist"
                            value={formData.brand}
                            onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
                            placeholder="Selecione ou digite nova marca"
                            className="bg-white text-sm"
                          />
                          <datalist id="brand-datalist">
                            {uniqueBrands.map((b) => <option key={b} value={b} />)}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Step Type</label>
                          <select value={formData.stepTypeKey} onChange={(e) => setFormData((p) => ({ ...p, stepTypeKey: e.target.value }))} className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <option value="">-- Selecione --</option>
                            {STEP_TYPES.map((k) => <option key={k} value={k}>{stepLabel(k)}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5">Tipos de Pele Compatíveis</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(["oleosa","seca","mista","sensivel","normal"] as const).map((t) => {
                            const active = (formData.compatibleSkinTypes ?? []).includes(t);
                            return (
                              <button key={t} type="button"
                                onClick={() => setFormData((p) => ({ ...p, compatibleSkinTypes: active ? (p.compatibleSkinTypes ?? []).filter((x) => x !== t) : [...(p.compatibleSkinTypes ?? []), t] }))}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-pink-100 border-pink-400 text-pink-800" : "bg-white border-slate-300 text-slate-500 hover:border-slate-400"}`}
                              >{t}</button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5">Preocupações Tratadas</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(["acne","cravos","manchas","rugas","olheiras","hidratacao","oleosidade","sensibilidade","poros","vermelhidao","firmeza"] as const).map((c) => {
                            const active = (formData.targetsConcerns ?? []).includes(c);
                            return (
                              <button key={c} type="button"
                                onClick={() => setFormData((p) => ({ ...p, targetsConcerns: active ? (p.targetsConcerns ?? []).filter((x) => x !== c) : [...(p.targetsConcerns ?? []), c] }))}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${active ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-slate-300 text-slate-500 hover:border-slate-400"}`}
                              >{c}</button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Período de Uso</label>
                          <div className="flex gap-1.5">
                            {([["morning","Manhã"],["night","Noite"]] as const).map(([val, label]) => {
                              const active = (formData.suitablePeriods ?? []).includes(val);
                              return (
                                <button key={val} type="button"
                                  onClick={() => setFormData((p) => ({ ...p, suitablePeriods: active ? (p.suitablePeriods ?? []).filter((x) => x !== val) : [...(p.suitablePeriods ?? []), val] }))}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-white border-slate-300 text-slate-500"}`}
                                >{label}</button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Intensidade</label>
                          <div className="flex gap-1.5">
                            {([["mild","Leve"],["moderate","Média"],["strong","Forte"]] as const).map(([val, label]) => (
                              <button key={val} type="button"
                                onClick={() => setFormData((p) => ({ ...p, strengthLevel: val }))}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${formData.strengthLevel === val ? "bg-violet-100 border-violet-400 text-violet-800" : "bg-white border-slate-300 text-slate-500"}`}
                              >{label}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Preço Médio (R$)</label>
                          <Input type="number" value={formData.priceAvg || ""} onChange={(e) => setFormData((p) => ({ ...p, priceAvg: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="0.00" step="0.01" className="bg-white text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Faixa de Preço</label>
                          <select value={formData.priceRange ?? ""} onChange={(e) => setFormData((p) => ({ ...p, priceRange: e.target.value }))} className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <option value="">--</option>
                            <option value="low">low (até R$30)</option>
                            <option value="medium">medium (R$30-80)</option>
                            <option value="high">high (R$80-200)</option>
                            <option value="premium">premium (+R$200)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Score curadoria</label>
                          <Input type="number" min={0} max={100} value={formData.curationScore} onChange={(e) => setFormData((p) => ({ ...p, curationScore: parseInt(e.target.value) || 50 }))} className="bg-white text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-medium mb-2">Imagem do Produto</label>
                        <div className="space-y-3">
                          <div className="relative">
                            <input type="file" accept="image/*" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) handleImageFileUpload(f); }} disabled={isUploadingImage} className="hidden" id="image-file-input" />
                            <label htmlFor="image-file-input" className="flex items-center justify-center gap-2 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors">
                              <Upload size={18} className="text-slate-600" />
                              <span className="text-xs md:text-sm text-slate-600">{isUploadingImage ? "Enviando..." : "Clique para enviar arquivo"}</span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Ou cole uma URL</label>
                            <Input value={formData.imageUrl} onChange={(e) => handleImageUrlChange(e.target.value)} placeholder="https://..." className="bg-white text-xs md:text-sm" disabled={isUploadingImage} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg">
                        <Checkbox id="active" checked={formData.isActive} onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked === true }))} />
                        <label htmlFor="active" className="text-sm font-medium">Ativo</label>
                      </div>

                      <Button onClick={handleSubmit} className="w-full">
                        {editingId ? "Atualizar" : "Criar"} Produto
                      </Button>
                    </div>

                    {/* Preview column */}
                    <div className="lg:col-span-1">
                      <div className="sticky top-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 pb-3 border-b border-slate-200">
                          <h3 className="font-semibold text-slate-900">Prévia do Produto</h3>
                        </div>
                        <div className="px-4 pt-3 pb-0">
                          <div className="rounded-lg overflow-hidden bg-white border border-slate-100 aspect-[16/10] flex items-center justify-center">
                            {imagePreview ? (
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-white p-2" onError={() => setImagePreview("")} />
                            ) : (
                              <div className="text-center"><Search size={32} className="text-slate-300 mx-auto mb-1" /><p className="text-xs text-slate-400">Sem imagem</p></div>
                            )}
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div><p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Categoria</p><p className="text-xs text-slate-600 mt-0.5">{stepLabel(formData.stepTypeKey) || "—"}</p></div>
                          <div><p className="text-sm font-bold text-slate-900 line-clamp-2">{formData.name || "—"}</p></div>
                          <div><p className="text-xs text-slate-500 font-medium">{formData.brand || "—"}</p></div>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="bg-slate-50 p-2 rounded"><p className="text-xs text-slate-500">Preço</p><p className="font-semibold text-slate-900 text-sm">{formData.priceAvg ? `R$ ${formData.priceAvg.toFixed(2)}` : "—"}</p></div>
                            <div className="bg-slate-50 p-2 rounded"><p className="text-xs text-slate-500">Score</p><p className="font-semibold text-slate-900 text-sm">{formData.curationScore}</p></div>
                          </div>
                          <div className="pt-1">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${formData.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                              {formData.isActive ? "✓ Ativo" : "○ Inativo"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3 md:space-y-4 bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-2">
              <Search size={16} className="inline mr-2" />Buscar produtos
            </label>
            <Input placeholder="Buscar por nome, brand ou categoria..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="bg-slate-50 border-slate-300 text-sm" />
          </div>

          {/* Brand + Category selects */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Marca</label>
              <select
                value={filterBrand}
                onChange={(e) => { setFilterBrand(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas as marcas</option>
                {uniqueBrands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Categoria</label>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas as categorias</option>
                {uniqueCategories.map((c) => <option key={c} value={c}>{stepLabel(c)}</option>)}
              </select>
            </div>
          </div>

          {/* Status + sort pills */}
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {([
              ["all", `Todos (${products.length})`],
              ["active", `Ativos (${products.filter((p) => p.isActive).length})`],
              ["inactive", `Inativos (${products.filter((p) => !p.isActive).length})`],
            ] as const).map(([val, label]) => (
              <Button key={val} variant={filterStatus === val ? "default" : "outline"} onClick={() => { setFilterStatus(val); setCurrentPage(1); }} size="sm" className="text-xs md:text-sm">{label}</Button>
            ))}
            <Button variant={sortBy === "sem-imagem" ? "default" : "outline"} onClick={() => { setSortBy(sortBy === "sem-imagem" ? "padrao" : "sem-imagem"); setCurrentPage(1); }} size="sm" className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50">
              📷 Sem imagem ({products.filter((p) => !p.primaryImageUrl).length})
            </Button>
            <Button variant={sortBy === "sem-descricao" ? "default" : "outline"} onClick={() => { setSortBy(sortBy === "sem-descricao" ? "padrao" : "sem-descricao"); setCurrentPage(1); }} size="sm" className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
              📝 Sem descrição ({products.filter((p) => !p.description).length})
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs text-slate-500 gap-1" onClick={() => { setFilterBrand(""); setFilterCategory(""); setSearchQuery(""); setFilterStatus("all"); setSortBy("padrao"); setCurrentPage(1); }}>
                <X size={12} /> Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Table (Desktop) */}
        <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todos" />
                </th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Nome</th>
                <th className="hidden sm:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Brand</th>
                <th className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Categoria</th>
                <th className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Preço</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Status</th>
                <th className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Imagem</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Search size={40} className="text-slate-300 mb-2 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">{products.length === 0 ? "Nenhum produto encontrado" : "Nenhum produto atende aos critérios de busca"}</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-50 transition-colors ${selectedIds.has(product.id) ? "bg-blue-50" : !product.primaryImageUrl ? "bg-orange-50/30" : ""}`}
                  >
                    <td className="px-4 py-3 w-10">
                      <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} aria-label={`Selecionar ${product.name}`} />
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      {!product.description && <span className="text-[10px] text-blue-500">sem descrição</span>}
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-600">{product.brand}</td>
                    <td className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                      {product.stepTypeKey
                        ? <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">{stepLabel(product.stepTypeKey)}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-600">
                      {product.priceAvg ? `R$ ${product.priceAvg.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${product.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {product.isActive ? "✓ Ativo" : "○ Inativo"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                      {product.primaryImageUrl ? (
                        <img src={product.primaryImageUrl} alt={product.name} className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover border border-slate-200" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : (
                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">sem foto</span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                      <div className="flex justify-end items-center gap-1 md:gap-2">
                        <div className="hidden xl:flex items-center gap-1 mr-1">
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-green-500 transition-all" style={{ width: `${getCompleteness(product)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 w-7">{getCompleteness(product)}%</span>
                        </div>
                        {!product.primaryImageUrl && (
                          <a href={`https://www.google.com/search?q=${encodeURIComponent(`${product.name} ${product.brand} produto skincare`)}&tbm=isch`} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-md flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-colors" title="Buscar imagem no Google">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEnrichRow(product)} disabled={enrichingRowId === product.id} className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50" title="Enriquecer com IA">
                          {enrichingRowId === product.id ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-8 w-8 md:h-9 md:w-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50" title="Editar produto">
                          <Edit size={16} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9 text-slate-600 hover:text-red-600 hover:bg-red-50" title="Deletar produto">
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja deletar <strong>"{product.name}"</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
                            <div className="flex justify-end gap-2">
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-8">
              <Search size={40} className="text-slate-300 mb-2 mx-auto" />
              <p className="text-sm text-slate-500 font-medium">{products.length === 0 ? "Nenhum produto encontrado" : "Nenhum produto atende aos critérios"}</p>
            </div>
          ) : (
            paginatedProducts.map((product) => (
              <div key={product.id} className={`rounded-lg border p-3 space-y-2 ${selectedIds.has(product.id) ? "border-blue-300 bg-blue-50" : "bg-white border-slate-200"}`}>
                <div className="flex gap-3">
                  {product.primaryImageUrl && (
                    <img src={product.primaryImageUrl} alt={product.name} className="h-16 w-16 rounded-lg object-cover border border-slate-200 flex-shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{product.name}</h3>
                      <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} className="flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-slate-600">{product.brand}</p>
                    {product.stepTypeKey && <span className="inline-block px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] mt-0.5">{stepLabel(product.stepTypeKey)}</span>}
                    <p className="text-xs text-slate-600">{product.priceAvg ? `R$ ${product.priceAvg.toFixed(2)}` : "—"}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-full mt-1 ${product.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {product.isActive ? "✓ Ativo" : "○ Inativo"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="flex-1 text-xs gap-1">
                    <Edit size={14} /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50">
                        <Trash2 size={14} /> Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza que deseja deletar <strong>"{product.name}"</strong>?</AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 md:mt-6 flex flex-col md:flex-row md:items-center md:justify-center gap-3 md:gap-2">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} size="sm" className="text-xs md:text-sm w-full md:w-auto">← Anterior</Button>
            <div className="flex gap-1 mx-0 md:mx-2 justify-center flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(page)} className="min-w-8 md:min-w-10 text-xs md:text-sm h-8 md:h-9">{page}</Button>
              ))}
            </div>
            <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} size="sm" className="text-xs md:text-sm w-full md:w-auto">Próximo →</Button>
            <span className="ml-0 md:ml-4 text-xs md:text-sm font-medium text-slate-600 text-center">Página <span className="font-bold text-slate-900">{currentPage}</span> de {totalPages}</span>
          </div>
        )}

        <div className="mt-3 md:mt-4 text-xs md:text-sm text-slate-600 text-center">
          Exibindo <span className="font-semibold text-slate-900">{paginatedProducts.length}</span> de <span className="font-semibold text-slate-900">{filteredProducts.length}</span> produtos
        </div>
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-700 max-w-[calc(100vw-2rem)] flex-wrap justify-center">
          {bulkProgress ? (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw size={14} className="animate-spin text-blue-400" />
              <span>{bulkProgress.action}... {bulkProgress.done}/{bulkProgress.total}</span>
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-slate-300 pr-2 border-r border-slate-600 whitespace-nowrap">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
              </span>

              <Button size="sm" variant="ghost" onClick={() => handleBulkActivate(true)} className="text-xs text-green-400 hover:text-green-300 hover:bg-slate-800 h-7 px-2">
                Ativar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkActivate(false)} className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-7 px-2">
                Desativar
              </Button>

              {/* Bulk category */}
              <div className="flex items-center gap-1">
                <select
                  value={pendingBulkCategory}
                  onChange={(e) => setPendingBulkCategory(e.target.value)}
                  className="h-7 rounded-md bg-slate-800 border border-slate-600 text-white text-xs px-2 focus:outline-none"
                >
                  <option value="">Categoria...</option>
                  {STEP_TYPES.map((k) => <option key={k} value={k}>{stepLabel(k)}</option>)}
                </select>
                {pendingBulkCategory && (
                  <Button size="sm" variant="ghost" onClick={() => handleBulkSetCategory(pendingBulkCategory)} className="text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 h-7 px-2">
                    Aplicar
                  </Button>
                )}
              </div>

              {/* Bulk delete */}
              <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-xs text-red-400 hover:text-red-300 hover:bg-slate-800 h-7 px-2 gap-1">
                    <Trash2 size={12} /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Excluir {selectedIds.size} produto{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os {selectedIds.size} produtos selecionados serão excluídos permanentemente.
                  </AlertDialogDescription>
                  <div className="flex justify-end gap-2">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">Excluir todos</AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>

              <button
                type="button"
                onClick={clearSelection}
                className="ml-1 h-6 w-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                title="Limpar seleção"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
