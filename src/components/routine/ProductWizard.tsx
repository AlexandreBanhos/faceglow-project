/**
 * ProductWizard — wizard interativo de troca/adição de produto na rotina
 * Fluxo: categoria → fonte → (recomendações | catálogo | meus produtos | cadastrar) → período
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft, faChevronRight, faXmark, faCheck, faPlus,
  faMagnifyingGlass, faBoxOpen, faLayerGroup, faCamera,
  faArrowRightArrowLeft, faWandMagicSparkles, faToggleOn, faToggleOff,
  faCalendarDays, faTag, faBuilding, faArrowsRotate,
} from "@fortawesome/free-solid-svg-icons";
import { Loader2 } from "lucide-react";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/analysisClient";
import { fetchMyProducts, createMyProduct } from "@/lib/userProducts";
import type { UserCatalogProduct } from "@/lib/userProducts";
import { uploadProductImage } from "@/lib/storage";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WizardMode = "swap" | "add";
export type WizardPeriod = "morning" | "night" | "both";

export interface WizardProductOption {
  key: string;
  label: string;
  productName: string;
  reason: string;
  imageUrl?: string;
}

export interface WizardResult {
  productName: string;
  imageUrl?: string;
  category: string;
  categoryLabel: string;
  stepLabel: string;
  recurrence: string;
  scheduledDays?: string[]; // dias específicos se não for diário
  period: WizardPeriod;
  source: "recommendation" | "catalog" | "my_product" | "new";
}

interface ProductWizardProps {
  open: boolean;
  onClose: () => void;
  mode: WizardMode;
  initialCategory?: string;
  initialStepLabel?: string;
  initialPeriod?: "morning" | "night";
  currentProductName?: string;
  currentProductImage?: string;
  recommendations?: WizardProductOption[];
  onConfirm: (result: WizardResult) => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────

export const WIZARD_CATEGORIES = [
  { key: "cleanser",       label: "Limpeza",             icon: "🫧" },
  { key: "toner",          label: "Tônico",              icon: "💧" },
  { key: "serum",          label: "Sérum",               icon: "🧪" },
  { key: "moisturizer",    label: "Hidratante",          icon: "💦" },
  { key: "sunscreen",      label: "Protetor Solar",      icon: "☀️" },
  { key: "retinoid",       label: "Retinol",             icon: "⏳" },
  { key: "exfoliant",      label: "Esfoliante",          icon: "✨" },
  { key: "mask",           label: "Máscara",             icon: "🎭" },
  { key: "eye_cream",      label: "Contorno dos Olhos",  icon: "👁️" },
  { key: "acid",           label: "Ácido",               icon: "🔬" },
  { key: "oil",            label: "Óleo Facial",         icon: "🌿" },
  { key: "spot_treatment", label: "Tratamento Pontual",  icon: "🎯" },
];

const WEEK_DAYS = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

type Step =
  | "category"
  | "source"
  | "recommendations"
  | "catalog"
  | "my_products"
  | "register"
  | "period";

const STEP_TITLES: Partial<Record<Step, string>> = {
  category:        "Qual passo?",
  source:          "De onde vem o produto?",
  recommendations: "Recomendações para você",
  catalog:         "Buscar no catálogo",
  my_products:     "Meus produtos",
  register:        "Cadastrar produto",
  period:          "Para qual rotina?",
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir * -56, opacity: 0 }),
};

// ── Componente ────────────────────────────────────────────────────────────────

export function ProductWizard({
  open, onClose, mode,
  initialCategory, initialStepLabel, initialPeriod,
  currentProductName, currentProductImage,
  recommendations = [],
  onConfirm,
}: ProductWizardProps) {

  const firstStep: Step = mode === "swap" ? "source" : "category";

  const [step, setStep]       = useState<Step>(firstStep);
  const [history, setHistory] = useState<Step[]>([]);
  const [dir, setDir]         = useState(1);

  const [selectedCategory, setSelectedCategory] = useState<typeof WIZARD_CATEGORIES[0] | null>(
    () => WIZARD_CATEGORIES.find(c => c.key === initialCategory) ?? null
  );
  const [selectedProduct, setSelectedProduct]   = useState<{ name: string; imageUrl?: string } | null>(null);
  const [selectedSource, setSelectedSource]     = useState<WizardResult["source"] | null>(null);
  const [period, setPeriod]                     = useState<WizardPeriod>(
    initialPeriod === "morning" ? "morning" : initialPeriod === "night" ? "night" : "both"
  );

  // Catálogo
  const [catalogQuery, setCatalogQuery]         = useState("");
  const [catalogResults, setCatalogResults]     = useState<CatalogProduct[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogSearched, setCatalogSearched]   = useState(false);
  const catalogTimer = useRef<ReturnType<typeof setTimeout>>();

  // Meus produtos
  const [myProducts, setMyProducts]             = useState<UserCatalogProduct[]>([]);
  const [myProductsLoading, setMyProductsLoading] = useState(false);

  // Cadastro
  const [regName, setRegName]       = useState("");
  const [regBrand, setRegBrand]     = useState("");
  const [brands, setBrands]         = useState<string[]>([]);
  const [regImageUrl, setRegImageUrl] = useState<string | undefined>();
  const [regImageFile, setRegImageFile] = useState<File | null>(null);
  const [regIsDaily, setRegIsDaily] = useState(true);
  const [regDays, setRegDays]       = useState<string[]>(WEEK_DAYS.map(d => d.key));
  const [regUploading, setRegUploading] = useState(false);
  const [regSaving, setRegSaving]   = useState(false);
  const imageInputRef               = useRef<HTMLInputElement>(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setStep(firstStep);
      setHistory([]);
      setDir(1);
      setSelectedCategory(WIZARD_CATEGORIES.find(c => c.key === initialCategory) ?? null);
      setSelectedProduct(null);
      setSelectedSource(null);
      setPeriod(initialPeriod === "morning" ? "morning" : initialPeriod === "night" ? "night" : "both");
      setCatalogQuery(""); setCatalogResults([]); setCatalogSearched(false);
      setRegName(""); setRegBrand(""); setRegImageUrl(undefined); setRegImageFile(null);
      setRegIsDaily(true); setRegDays(WEEK_DAYS.map(d => d.key));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catálogo: busca automática por categoria ao abrir + debounce para texto
  useEffect(() => {
    if (step !== "catalog") return;
    if (catalogTimer.current) clearTimeout(catalogTimer.current);
    setIsCatalogLoading(true);
    setCatalogSearched(false);
    catalogTimer.current = setTimeout(async () => {
      const r = await fetchCatalogProducts(selectedCategory?.key ?? "", catalogQuery.trim()).catch(() => []);
      setCatalogResults(r);
      setIsCatalogLoading(false);
      setCatalogSearched(true);
    }, catalogQuery.trim().length >= 2 ? 350 : 0);
    return () => { if (catalogTimer.current) clearTimeout(catalogTimer.current); };
  }, [catalogQuery, step, selectedCategory?.key]);

  // Meus produtos
  useEffect(() => {
    if (step !== "my_products") return;
    setMyProductsLoading(true);
    fetchMyProducts().then(setMyProducts).catch(() => {}).finally(() => setMyProductsLoading(false));
  }, [step]);

  // Marcas para o form de cadastro
  useEffect(() => {
    if (step !== "register") return;
    fetchCatalogProducts(selectedCategory?.key ?? "", "")
      .then(products => {
        const b = [...new Set(products.map(p => p.brand).filter((x): x is string => !!x && x.length > 0))].sort();
        setBrands(b);
      })
      .catch(() => {});
  }, [step, selectedCategory?.key]);

  // ── Navegação ───────────────────────────────────────────────────────────────

  const goTo = (next: Step) => {
    setDir(1);
    setHistory(h => [...h, step]);
    setStep(next);
  };

  const goBack = () => {
    if (history.length === 0) { onClose(); return; }
    setDir(-1);
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setStep(prev);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const pickCategory = (cat: typeof WIZARD_CATEGORIES[0]) => {
    setSelectedCategory(cat);
    goTo("source");
  };

  const pickRecommendation = (opt: WizardProductOption) => {
    setSelectedProduct({ name: opt.productName, imageUrl: opt.imageUrl });
    setSelectedSource("recommendation");
    goTo("period");
  };

  const pickCatalogProduct = (p: CatalogProduct) => {
    setSelectedProduct({ name: p.name, imageUrl: p.imageUrl ?? undefined });
    setSelectedSource("catalog");
    goTo("period");
  };

  const pickMyProduct = (p: UserCatalogProduct) => {
    setSelectedProduct({ name: p.name, imageUrl: p.imageUrl });
    setSelectedSource("my_product");
    goTo("period");
  };

  const toggleDay = (key: string) => {
    setRegDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRegImageFile(file);
    setRegImageUrl(URL.createObjectURL(file));
  };

  const handleRegister = async () => {
    if (!regName.trim()) return;
    setRegSaving(true);
    try {
      let imageUrl: string | undefined;
      if (regImageFile) {
        setRegUploading(true);
        imageUrl = await uploadProductImage(regImageFile).catch(() => undefined);
        setRegUploading(false);
      }
      const recurrence = regIsDaily ? "daily"
        : regDays.length === 0 ? "as_needed"
        : regDays.length >= 6 ? "daily"
        : regDays.length === 3 ? "3x_week"
        : regDays.length === 2 ? "2x_week"
        : "weekly";

      const created = await createMyProduct({
        name: regName.trim(),
        brand: regBrand || undefined,
        category: selectedCategory?.label,
        imageUrl,
        defaultPeriod: period === "both" ? "morning" : period,
      });
      setSelectedProduct({ name: created.name, imageUrl: created.imageUrl });
      setSelectedSource("new");
      goTo("period");
    } catch {
      /* silencia */
    } finally {
      setRegSaving(false);
    }
  };

  const computeRecurrence = () => {
    // Vem do step period se não foi cadastro
    return "daily";
  };

  const handleConfirm = () => {
    if (!selectedProduct || !selectedCategory) return;
    const recurrence = regIsDaily ? "daily"
      : regDays.length === 0 ? "as_needed"
      : regDays.length >= 6 ? "daily"
      : regDays.length === 3 ? "3x_week"
      : regDays.length === 2 ? "2x_week"
      : "weekly";

    onConfirm({
      productName:   selectedProduct.name,
      imageUrl:      selectedProduct.imageUrl,
      category:      selectedCategory.key,
      categoryLabel: selectedCategory.label,
      stepLabel:     initialStepLabel ?? selectedCategory.label,
      recurrence:    selectedSource === "new" ? recurrence : "daily",
      scheduledDays: (!regIsDaily && selectedSource === "new") ? regDays : undefined,
      period,
      source:        selectedSource ?? "new",
    });
    onClose();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const matchingMyProducts = myProducts.filter(
    p => !selectedCategory || p.category === selectedCategory.label
  );

  const noResults = catalogSearched && !isCatalogLoading && catalogResults.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      key="wizard-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[999] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="wizard-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        className="w-full max-w-md rounded-t-[2rem] flex flex-col"
        style={{
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(32px) saturate(2)",
          WebkitBackdropFilter: "blur(32px) saturate(2)",
          border: "1px solid var(--glass-border)",
          height: "88svh",
          maxHeight: "88svh",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full" style={{ background: "rgba(60,30,50,0.18)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-3 flex-shrink-0">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full liquiglass-button flex items-center justify-center flex-shrink-0"
          >
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 14, color: "var(--fg-ink)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="fg-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {mode === "swap" ? "Trocar produto" : "Adicionar passo"}
            </p>
            <p className="text-sm font-bold text-foreground leading-tight truncate">
              {STEP_TITLES[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full liquiglass-button flex items-center justify-center flex-shrink-0"
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14, color: "var(--fg-ink)" }} />
          </button>
        </div>

        {/* Linha fina separadora */}
        <div style={{ height: 1, background: "var(--glass-border-soft)", flexShrink: 0 }} />

        {/* Body */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
              className="h-full overflow-y-auto px-5 pb-8 pt-4"
              style={{ scrollbarWidth: "none" }}
            >

              {/* ── CATEGORIA ── */}
              {step === "category" && (
                <div className="space-y-2.5">
                  <p className="text-xs text-muted-foreground mb-3">
                    Escolha a categoria do passo:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {WIZARD_CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => pickCategory(cat)}
                        className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all lg-surface"
                        style={selectedCategory?.key === cat.key ? {
                          border: "2px solid var(--primary, #e8a9c2)",
                          boxShadow: "0 0 0 3px rgba(232,169,194,0.15)",
                        } : { border: "2px solid transparent" }}
                      >
                        <span className="text-xl flex-shrink-0">{cat.icon}</span>
                        <span className="text-xs font-semibold text-foreground leading-tight">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FONTE ── */}
              {step === "source" && (
                <div className="space-y-2.5">
                  {/* Produto atual (swap) */}
                  {mode === "swap" && currentProductName && (
                    <div className="p-3 rounded-2xl mb-1" style={{ background: "var(--glass-bg-soft)", border: "1px solid var(--glass-border-soft)" }}>
                      <p className="fg-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Produto atual</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-border/30 flex-shrink-0 flex items-center justify-center">
                          {currentProductImage
                            ? <img src={currentProductImage} alt={currentProductName} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                            : <span className="text-lg">🧴</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{currentProductName}</p>
                          {selectedCategory && <p className="text-[11px] text-muted-foreground">{selectedCategory.label}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recomendações da IA */}
                  {recommendations.length > 0 && (
                    <WizardOption
                      faIcon={faWandMagicSparkles}
                      iconColor="#E8547A"
                      title="Recomendações para você"
                      sub="Produtos selecionados pela IA com base na sua análise"
                      highlight
                      onClick={() => goTo("recommendations")}
                    />
                  )}

                  <WizardOption
                    faIcon={faBoxOpen}
                    iconColor="#6366f1"
                    title="Buscar no catálogo"
                    sub="Pesquisar produtos disponíveis"
                    onClick={() => { setCatalogQuery(""); goTo("catalog"); }}
                  />

                  <WizardOption
                    faIcon={faLayerGroup}
                    iconColor="#0ea5e9"
                    title="Meus produtos"
                    sub="Produtos que você já cadastrou"
                    onClick={() => goTo("my_products")}
                  />

                  {/* Trocar categoria do passo */}
                  {mode === "swap" && (
                    <WizardOption
                      faIcon={faArrowRightArrowLeft}
                      iconColor="#f59e0b"
                      title="Trocar categoria do passo"
                      sub="Mudar este passo para outra categoria"
                      onClick={() => goTo("category")}
                    />
                  )}
                </div>
              )}

              {/* ── RECOMENDAÇÕES ── */}
              {step === "recommendations" && (
                <div className="space-y-2">
                  {recommendations.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => pickRecommendation(opt)}
                      className="w-full flex items-center gap-3 p-3 lg-surface rounded-2xl text-left hover:lg-surface-strong transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-border/30 flex items-center justify-center">
                        {opt.imageUrl
                          ? <img src={opt.imageUrl} alt={opt.productName} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                          : <span className="text-2xl">🧴</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-0.5">{opt.label}</p>
                        <p className="text-sm font-semibold text-foreground leading-tight">{opt.productName}</p>
                        {opt.reason && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{opt.reason}</p>}
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 12, color: "var(--fg-ink-3)", flexShrink: 0 }} />
                    </button>
                  ))}

                  <button
                    onClick={() => goTo("catalog")}
                    className="w-full py-3 rounded-2xl liquiglass-button text-sm font-semibold text-foreground mt-2"
                  >
                    Quero outro produto
                  </button>
                </div>
              )}

              {/* ── CATÁLOGO ── */}
              {step === "catalog" && (
                <div className="space-y-3">
                  {/* Busca */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl lg-surface">
                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 13, color: "var(--fg-ink-3)", flexShrink: 0 }} />
                    <input
                      autoFocus
                      value={catalogQuery}
                      onChange={e => setCatalogQuery(e.target.value)}
                      placeholder={`Buscar ${selectedCategory?.label ?? "produto"}...`}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {isCatalogLoading && <Loader2 size={14} className="animate-spin text-muted-foreground flex-shrink-0" />}
                  </div>

                  {/* Resultados */}
                  {catalogResults.length > 0 && (
                    <div className="space-y-2">
                      {catalogResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => pickCatalogProduct(p)}
                          className="w-full flex items-center gap-3 p-3 lg-surface rounded-2xl text-left hover:lg-surface-strong transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-border/30 flex items-center justify-center">
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                              : <span>🧴</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">{p.name}</p>
                            {p.brand && <p className="text-[11px] text-muted-foreground">{p.brand}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Não encontrado */}
                  {noResults && (
                    <div className="flex flex-col items-center py-6 gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(232,84,122,0.1)" }}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 20, color: "#E8547A" }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground mb-1">Produto não encontrado</p>
                        <p className="text-xs text-muted-foreground max-w-[220px]">
                          Não achamos "{catalogQuery}" no catálogo. Quer cadastrá-lo?
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setRegName(catalogQuery);
                          goTo("register");
                        }}
                        className="coral-button px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} />
                        Cadastrar este produto
                      </button>
                    </div>
                  )}

                  {!isCatalogLoading && !noResults && catalogResults.length === 0 && !catalogSearched && (
                    <p className="text-xs text-muted-foreground text-center py-4">Carregando produtos...</p>
                  )}
                </div>
              )}

              {/* ── MEUS PRODUTOS ── */}
              {step === "my_products" && (
                <div className="space-y-2">
                  {myProductsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : matchingMyProducts.length > 0 ? (
                    matchingMyProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => pickMyProduct(p)}
                        className="w-full flex items-center gap-3 p-3 lg-surface rounded-2xl text-left hover:lg-surface-strong transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-border/30 flex items-center justify-center">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                            : <span className="text-xl">🧴</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          {p.brand && <p className="text-[11px] text-muted-foreground">{p.brand}</p>}
                        </div>
                        <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 12, color: "var(--fg-ink-3)" }} />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum produto desta categoria ainda.
                    </p>
                  )}

                  <button
                    onClick={() => goTo("register")}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl coral-button font-semibold text-sm mt-2"
                  >
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} />
                    Cadastrar novo produto
                  </button>
                </div>
              )}

              {/* ── CADASTRAR ── */}
              {step === "register" && (
                <div className="space-y-4">
                  {/* Foto */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="relative w-20 h-20 rounded-2xl lg-surface border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 transition-colors overflow-hidden"
                    >
                      {regImageUrl ? (
                        <img src={regImageUrl} alt="preview" className="absolute inset-0 w-full h-full object-contain p-1" />
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCamera} style={{ fontSize: 20, color: "var(--fg-ink-3)" }} />
                          <span className="text-[10px] text-muted-foreground">Foto</span>
                        </>
                      )}
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </div>

                  {/* Nome */}
                  <FormField label="Nome do produto *">
                    <input
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Ex: Sérum Vitamina C"
                      className="w-full px-3.5 py-2.5 rounded-xl lg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </FormField>

                  {/* Marca — select com opções do banco */}
                  <FormField label="Marca" icon={faBuilding}>
                    <select
                      value={regBrand}
                      onChange={e => setRegBrand(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl lg-surface text-sm text-foreground outline-none appearance-none"
                      style={{ background: "var(--glass-bg)" }}
                    >
                      <option value="">Selecionar marca...</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                      <option value="__other">Outra marca</option>
                    </select>
                    {regBrand === "__other" && (
                      <input
                        autoFocus
                        placeholder="Digite o nome da marca"
                        className="w-full px-3.5 py-2.5 rounded-xl lg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none mt-2"
                        onChange={e => setRegBrand(e.target.value === "" ? "__other" : e.target.value)}
                      />
                    )}
                  </FormField>

                  {/* Categoria (info) */}
                  {selectedCategory && (
                    <div className="flex items-center gap-2.5 p-3 lg-surface rounded-xl">
                      <FontAwesomeIcon icon={faTag} style={{ fontSize: 12, color: "var(--fg-ink-3)" }} />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Categoria</p>
                        <p className="text-sm font-semibold text-foreground">{selectedCategory.label}</p>
                      </div>
                    </div>
                  )}

                  {/* Frequência — toggle Diário */}
                  <div>
                    <div className="flex items-center justify-between p-3.5 lg-surface rounded-2xl">
                      <div className="flex items-center gap-2.5">
                        <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14, color: "var(--fg-ink-3)" }} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Uso diário</p>
                          <p className="text-[11px] text-muted-foreground">Todo dia, manhã e/ou noite</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setRegIsDaily(v => !v); if (regIsDaily) setRegDays(WEEK_DAYS.map(d => d.key)); }}
                        className="flex-shrink-0 ml-3"
                      >
                        <FontAwesomeIcon
                          icon={regIsDaily ? faToggleOn : faToggleOff}
                          style={{ fontSize: 28, color: regIsDaily ? "#E8547A" : "var(--fg-ink-3)" }}
                        />
                      </button>
                    </div>

                    {/* Seleção de dias se não for diário */}
                    {!regIsDaily && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-3">
                          <p className="text-xs font-semibold text-foreground">Quais dias da semana?</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {WEEK_DAYS.map(d => (
                              <button
                                key={d.key}
                                onClick={() => toggleDay(d.key)}
                                className="flex-1 min-w-[38px] py-2 rounded-xl text-xs font-bold transition-all"
                                style={regDays.includes(d.key) ? {
                                  background: "var(--grad-coral)",
                                  color: "#fff",
                                  boxShadow: "0 2px 8px rgba(232,84,122,0.35)",
                                } : {
                                  background: "var(--glass-bg)",
                                  color: "var(--fg-ink-3)",
                                  border: "1px solid var(--glass-border)",
                                }}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setRegDays([])}
                            className="w-full py-2.5 rounded-xl liquiglass-button text-xs font-semibold text-foreground flex items-center justify-center gap-2"
                          >
                            <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 11 }} />
                            Quando necessário (sem dias fixos)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button
                    onClick={handleRegister}
                    disabled={!regName.trim() || regSaving}
                    className="w-full py-3.5 rounded-2xl coral-button font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {regSaving
                      ? <Loader2 size={17} className="animate-spin" />
                      : <FontAwesomeIcon icon={faCheck} style={{ fontSize: 15 }} />}
                    {regUploading ? "Enviando foto..." : regSaving ? "Salvando..." : "Continuar"}
                  </button>
                </div>
              )}

              {/* ── PERÍODO ── */}
              {step === "period" && (
                <div className="space-y-4">
                  {/* Produto escolhido */}
                  {selectedProduct && (
                    <div className="flex items-center gap-3 p-3 lg-surface rounded-2xl">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-border/30 flex items-center justify-center">
                        {selectedProduct.imageUrl
                          ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                          : <span className="text-2xl">🧴</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{selectedCategory?.label}</p>
                        <p className="text-sm font-bold text-foreground leading-tight">{selectedProduct.name}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--grad-coral)" }}>
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10, color: "white" }} />
                      </div>
                    </div>
                  )}

                  {/* Período */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Aplicar em qual rotina?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: "morning" as const, label: "Manhã",  icon: "☀️" },
                        { key: "night"   as const, label: "Noite",  icon: "🌙" },
                        { key: "both"    as const, label: "Ambos",  icon: "✨" },
                      ]).map(p => (
                        <button
                          key={p.key}
                          onClick={() => setPeriod(p.key)}
                          className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all lg-surface"
                          style={period === p.key ? {
                            border: "2px solid var(--primary, #e8a9c2)",
                            boxShadow: "0 0 0 3px rgba(232,169,194,0.15)",
                          } : { border: "2px solid transparent" }}
                        >
                          <span className="text-xl">{p.icon}</span>
                          <span className="text-xs font-semibold text-foreground">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleConfirm}
                    className="w-full py-4 rounded-2xl coral-button font-bold text-base flex items-center justify-center gap-2 shadow-glow"
                  >
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: 16 }} />
                    Adicionar à Rotina
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function WizardOption({
  faIcon, iconColor, title, sub, onClick, highlight,
}: {
  faIcon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  iconColor: string;
  title: string;
  sub: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all lg-surface"
      style={highlight ? {
        border: "2px solid var(--primary, #e8a9c2)",
        boxShadow: "0 0 0 3px rgba(232,169,194,0.12)",
      } : { border: "2px solid transparent" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}18` }}>
        <FontAwesomeIcon icon={faIcon} style={{ fontSize: 16, color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 12, color: "var(--fg-ink-3)", flexShrink: 0 }} />
    </button>
  );
}

function FormField({
  label, icon, children,
}: {
  label: string;
  icon?: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <FontAwesomeIcon icon={icon} style={{ fontSize: 11, color: "var(--fg-ink-3)" }} />}
        <p className="text-xs font-semibold text-foreground">{label}</p>
      </div>
      {children}
    </div>
  );
}
