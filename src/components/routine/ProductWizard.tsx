/**
 * ProductWizard — fluxo interativo de troca/adição de produto na rotina
 * Layout baseado no estilo do questionário/quiz: limpo, intuitivo, gradiente do sistema.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft, faChevronRight, faXmark, faCheck, faPlus,
  faMagnifyingGlass, faBoxOpen, faLayerGroup, faCamera,
  faArrowRightArrowLeft, faWandMagicSparkles, faToggleOn, faToggleOff,
  faCalendarDays, faTag, faBuilding, faArrowsRotate, faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";
import { Loader2, Sun, Moon, Sparkles } from "lucide-react";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/analysisClient";
import { fetchMyProducts, createMyProduct, updateMyProduct } from "@/lib/userProducts";
import type { UserCatalogProduct } from "@/lib/userProducts";
import { uploadProductImage } from "@/lib/storage";
import { StepIcon } from "@/components/routine/StepIcon";
import { Mascot, SpeechBubble, useFloatAnimation } from "@/components/quiz/Mascot";
import type { MascotMood } from "@/components/quiz/Mascot";
import { BrandLogoFilter } from "@/components/routine/BrandLogoFilter";
import { fetchBrandLogos, type BrandLogo } from "@/lib/brandLogos";
import { PeriodSelector } from "@/components/routine/PeriodSelector";

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
  scheduledDays?: string[];
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
  initialRecurrence?: string;
  currentProductName?: string;
  currentProductImage?: string | null;
  /** Se o produto atual foi cadastrado pelo usuário (exibe opção de editar) */
  isCurrentUserProduct?: boolean;
  recommendations?: WizardProductOption[];
  onConfirm: (result: WizardResult) => void;
}

function recurrenceToState(recurrence?: string): { isDaily: boolean; days: string[] } {
  switch (recurrence) {
    case "3x_week":  return { isDaily: false, days: ["mon", "wed", "fri"] };
    case "2x_week":  return { isDaily: false, days: ["mon", "thu"] };
    case "weekly":   return { isDaily: false, days: ["mon"] };
    case "as_needed":return { isDaily: false, days: [] };
    default:         return { isDaily: true,  days: WEEK_DAYS.map(d => d.key) };
  }
}

// ── Constantes ────────────────────────────────────────────────────────────────

export const WIZARD_CATEGORIES = [
  { key: "cleanser",       label: "Limpeza"            },
  { key: "toner",          label: "Tônico"             },
  { key: "serum",          label: "Sérum"              },
  { key: "moisturizer",    label: "Hidratante"         },
  { key: "sunscreen",      label: "Protetor Solar"     },
  { key: "retinoid",       label: "Retinol"            },
  { key: "exfoliant",      label: "Esfoliante"         },
  { key: "mask",           label: "Máscara"            },
  { key: "eye_cream",      label: "Contorno dos Olhos" },
  { key: "acid",           label: "Ácido"              },
  { key: "oil",            label: "Óleo Facial"        },
  { key: "spot_treatment", label: "Tratamento Pontual" },
  { key: "makeup_remover", label: "Removedor de Maquiagem" },
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
  | "action" | "frequency"
  | "category" | "source" | "recommendations" | "catalog"
  | "my_products" | "register" | "period"
  | "edit_name" | "edit_category" | "edit_brand" | "edit_photo";

const STEP_TITLES: Partial<Record<Step, string>> = {
  action:          "O que deseja fazer?",
  frequency:       "Quando usar?",
  category:        "Qual passo?",
  source:          "De onde vem o produto?",
  recommendations: "Recomendações para você",
  catalog:         "Buscar no catálogo",
  my_products:     "Meus produtos",
  register:        "Cadastrar produto",
  period:          "Para qual rotina?",
  edit_name:       "Nome do produto",
  edit_category:   "Categoria",
  edit_brand:      "Marca",
  edit_photo:      "Foto",
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir * -48, opacity: 0 }),
};

type StepMeta = { text: string; highlight: string; subtitle?: string; mood: MascotMood };
const STEP_MASCOT: Record<Step, StepMeta> = {
  action:          { text: "O que quer fazer com esse passo?",     highlight: "passo",           mood: "thinking" },
  frequency:       { text: "Com que frequência usar?",             highlight: "frequência",      mood: "happy"    },
  category:        { text: "Qual categoria de passo?",             highlight: "categoria",       mood: "happy"    },
  source:          { text: "De onde vem o produto?",               highlight: "produto",         mood: "thinking" },
  recommendations: { text: "Recomendações para você!",             highlight: "Recomendações",   mood: "happy"    },
  catalog:         { text: "Vamos buscar no catálogo?",            highlight: "catálogo",        mood: "thinking" },
  my_products:     { text: "Aqui estão seus produtos!",            highlight: "seus produtos",   mood: "happy"    },
  register:        { text: "Cadastrar produto",                    highlight: "Cadastrar",       mood: "happy"    },
  period:          { text: "Para qual momento da sua rotina?",     highlight: "momento",         mood: "happy"    },
  edit_name:       { text: "Como se chama o produto?",             highlight: "produto",         subtitle: "Confirme ou edite o nome", mood: "thinking" },
  edit_category:   { text: "Qual a categoria?",                    highlight: "categoria",       subtitle: "Selecione a que melhor descreve", mood: "thinking" },
  edit_brand:      { text: "Qual a marca?",                        highlight: "marca",           subtitle: "Selecione, adicione ou pule", mood: "happy" },
  edit_photo:      { text: "Tem foto do produto?",                 highlight: "foto",            subtitle: "Opcional, mas fica mais bonito!", mood: "happy" },
};

// ── Estilos base reutilizáveis ─────────────────────────────────────────────

const CARD_BASE = "w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all bg-white border border-slate-100 shadow-sm active:scale-[0.98]";
const BTN_PRIMARY = "w-full py-3.5 rounded-2xl coral-button font-bold text-sm flex items-center justify-center gap-2 shadow-sm";
const BTN_SECONDARY = "w-full py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 flex items-center justify-center gap-2";

// ── Componente ────────────────────────────────────────────────────────────────

export function ProductWizard({
  open, onClose, mode,
  initialCategory, initialStepLabel, initialPeriod, initialRecurrence,
  currentProductName, currentProductImage,
  isCurrentUserProduct = false,
  recommendations = [],
  onConfirm,
}: ProductWizardProps) {

  useFloatAnimation();

  const firstStep: Step = mode === "swap" ? "action" : "category";

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

  // Brand logos
  const [brandLogos, setBrandLogos]             = useState<BrandLogo[]>([]);

  // Meus produtos
  const [myProducts, setMyProducts]             = useState<UserCatalogProduct[]>([]);
  const [myProductsLoading, setMyProductsLoading] = useState(false);

  // Cadastro / edição
  const [regName, setRegName]       = useState("");
  const [regBrand, setRegBrand]     = useState("");
  const [brands, setBrands]         = useState<string[]>([]);
  const [regImageUrl, setRegImageUrl] = useState<string | undefined>();
  const [regImageFile, setRegImageFile] = useState<File | null>(null);
  const [regIsDaily, setRegIsDaily] = useState(true);
  const [regDays, setRegDays]       = useState<string[]>(WEEK_DAYS.map(d => d.key));
  const [regUploading, setRegUploading] = useState(false);
  const [regSaving, setRegSaving]   = useState(false);
  const [isEditMode, setIsEditMode]     = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [customBrandInput, setCustomBrandInput] = useState("");
  const imageInputRef                   = useRef<HTMLInputElement>(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setStep(mode === "swap" ? "action" : "category");
      setHistory([]);
      setDir(1);
      setSelectedCategory(WIZARD_CATEGORIES.find(c => c.key === initialCategory) ?? null);
      setSelectedProduct(null);
      setSelectedSource(null);
      setPeriod(initialPeriod === "morning" ? "morning" : initialPeriod === "night" ? "night" : "both");
      setCatalogQuery(""); setCatalogResults([]); setCatalogSearched(false);
      setRegName(""); setRegBrand(""); setRegImageUrl(undefined); setRegImageFile(null);
      const freqState = recurrenceToState(initialRecurrence);
      setRegIsDaily(freqState.isDaily); setRegDays(freqState.days);
      setIsEditMode(false); setEditingProductId(null);
      setCustomBrandInput("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catálogo
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

  // Marcas para o form (register ou edit_brand)
  useEffect(() => {
    if (step !== "register" && step !== "edit_brand") return;
    fetchCatalogProducts(selectedCategory?.key ?? "", "")
      .then(products => {
        const b = [...new Set(products.map(p => p.brand).filter((x): x is string => !!x && x.length > 0))].sort();
        setBrands(b);
      })
      .catch(() => {});
  }, [step, selectedCategory?.key]);

  // Brand logos — carrega uma vez e usa cache
  useEffect(() => {
    if (brandLogos.length > 0) return;
    fetchBrandLogos().then(setBrandLogos).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Passos que NÃO devem exibir filtro de marcas (medicamentos)
  const isMedicalCategory = selectedCategory?.key === "retinoid" || selectedCategory?.key === "acid";

  // ── Navegação ───────────────────────────────────────────────────────────────

  const goTo = (next: Step) => { setDir(1);  setHistory(h => [...h, step]); setStep(next); };
  const goBack = () => {
    if (history.length === 0) { onClose(); return; }
    setDir(-1);
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setStep(prev);
    if (prev !== "register") { setIsEditMode(false); setEditingProductId(null); }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const pickCategory = (cat: typeof WIZARD_CATEGORIES[0]) => { setSelectedCategory(cat); goTo("source"); };

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

  const startEditProduct = (p: UserCatalogProduct) => {
    setIsEditMode(true);
    setEditingProductId(p.id);
    setRegName(p.name);
    setRegBrand(p.brand ?? "");
    setRegImageUrl(p.imageUrl);
    setRegImageFile(null);
    setCustomBrandInput("");
    const matching = WIZARD_CATEGORIES.find(c => c.label.toLowerCase() === p.category.toLowerCase());
    if (matching) setSelectedCategory(matching);
    goTo("edit_name");
  };

  const startEditCurrentProduct = () => {
    setIsEditMode(true);
    setEditingProductId(null);
    setRegName(currentProductName ?? "");
    setRegBrand("");
    setRegImageUrl(currentProductImage ?? undefined);
    setRegImageFile(null);
    setCustomBrandInput("");
    goTo("edit_name");
  };

  const toggleDay = (key: string) =>
    setRegDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);

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
      let imageUrl: string | undefined = regImageUrl;
      if (regImageFile) {
        setRegUploading(true);
        imageUrl = await uploadProductImage(regImageFile).catch(() => regImageUrl);
        setRegUploading(false);
      }
      const recurrence = regIsDaily ? "daily"
        : regDays.length === 0 ? "as_needed"
        : regDays.length >= 6 ? "daily"
        : regDays.length === 3 ? "3x_week"
        : regDays.length === 2 ? "2x_week"
        : "weekly";

      let product: UserCatalogProduct;
      if (isEditMode && editingProductId && !editingProductId.startsWith("up::")) {
        product = await updateMyProduct(editingProductId, {
          name: regName.trim(),
          brand: regBrand || undefined,
          category: selectedCategory?.label,
          imageUrl,
        });
      } else {
        product = await createMyProduct({
          name: regName.trim(),
          brand: regBrand || undefined,
          category: selectedCategory?.label,
          imageUrl,
          defaultPeriod: period === "both" ? "morning" : period,
        });
      }
      setSelectedProduct({ name: product.name, imageUrl: product.imageUrl });
      setSelectedSource(isEditMode ? "my_product" : "new");
      setIsEditMode(false);
      setEditingProductId(null);
      goTo("period");
    } catch { /* silencia */ } finally {
      setRegSaving(false);
      setRegUploading(false);
    }
  };

  const calcRecurrence = () =>
    regIsDaily ? "daily"
    : regDays.length === 0 ? "as_needed"
    : regDays.length >= 6 ? "daily"
    : regDays.length === 3 ? "3x_week"
    : regDays.length === 2 ? "2x_week"
    : "weekly";

  // Confirma apenas a frequência, mantendo o produto atual intacto
  const handleConfirmFrequency = () => {
    onConfirm({
      productName:   currentProductName ?? "",
      imageUrl:      currentProductImage ?? undefined,
      category:      selectedCategory?.key ?? initialCategory ?? "",
      categoryLabel: selectedCategory?.label ?? initialStepLabel ?? "",
      stepLabel:     initialStepLabel ?? selectedCategory?.label ?? "",
      recurrence:    calcRecurrence(),
      scheduledDays: !regIsDaily && regDays.length > 0 ? regDays : undefined,
      period,
      source:        "recommendation",
    });
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedProduct || !selectedCategory) return;
    const recurrence = calcRecurrence();

    onConfirm({
      productName:   selectedProduct.name,
      imageUrl:      selectedProduct.imageUrl,
      category:      selectedCategory.key,
      categoryLabel: selectedCategory.label,
      stepLabel:     initialStepLabel ?? selectedCategory.label,
      recurrence:    recurrence,
      scheduledDays: !regIsDaily && regDays.length > 0 ? regDays : undefined,
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
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[999] flex items-end justify-center"
      style={{ backgroundColor: "rgba(15,10,30,0.5)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="wizard-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 360 }}
        className="w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: "linear-gradient(170deg,#f4f2ff 0%,#f8f5ff 40%,#fff0f8 100%)",
          height: "92svh",
          maxHeight: "92svh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300/60" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-2 pb-3 flex-shrink-0">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0"
          >
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 13, color: "#374151" }} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {mode === "swap" ? "Trocar produto" : "Adicionar passo"}
            </p>
            <p className="text-sm font-bold text-slate-800 leading-tight truncate">
              {isEditMode ? "Editar produto" : STEP_TITLES[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0"
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13, color: "#374151" }} />
          </button>
        </div>

        {/* Separador */}
        <div className="h-px bg-white/50 flex-shrink-0 mx-4" />

        {/* Body */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step + (isEditMode ? "_edit" : "")}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.7 }}
              className="h-full overflow-y-auto px-4 pb-8 pt-3"
              style={{ scrollbarWidth: "none" }}
            >
              {/* ── Mascote + balão de fala ─── */}
              {(() => {
                const meta = isEditMode
                  ? { text: "Vamos editar esse produto?", highlight: "editar", mood: "thinking" as MascotMood }
                  : STEP_MASCOT[step];
                return (
                  <div className="flex items-start gap-3 mb-5">
                    <Mascot mood={meta.mood} size={60} />
                    <SpeechBubble
                      text={meta.text}
                      highlight={meta.highlight}
                      subtitle={
                        step === "source" && mode === "swap" ? "Como prefere substituir o produto?" :
                        step === "source" && mode === "add" ? "Escolha a origem do produto" :
                        undefined
                      }
                    />
                  </div>
                );
              })()}

              {/* ── AÇÃO (entrada do swap) ────────────────────────────────── */}
              {step === "action" && (
                <div className="space-y-3">
                  {/* Card do produto atual */}
                  {currentProductName && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 mb-1">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center"
                        style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        {currentProductImage
                          ? <img src={currentProductImage} alt={currentProductName} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                          : <StepIcon stepTypeKey={selectedCategory?.key} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Produto atual</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{currentProductName}</p>
                      </div>
                    </div>
                  )}

                  <SourceOption
                    faIcon={faArrowRightArrowLeft}
                    iconBg="linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)"
                    iconColor="white"
                    title="Trocar produto"
                    sub="Substituir por outro produto ou da IA"
                    onClick={() => goTo("source")}
                    highlight
                  />
                  <SourceOption
                    faIcon={faCalendarDays}
                    iconBg="rgba(99,102,241,0.1)"
                    iconColor="#6366f1"
                    title="Editar frequência"
                    sub="Mudar quando e quantas vezes usar"
                    onClick={() => goTo("frequency")}
                  />
                  {isCurrentUserProduct && (
                    <SourceOption
                      faIcon={faPenToSquare}
                      iconBg="rgba(245,158,11,0.1)"
                      iconColor="#d97706"
                      title="Editar produto"
                      sub="Alterar nome, marca ou foto"
                      onClick={() => { startEditCurrentProduct(); }}
                    />
                  )}
                </div>
              )}

              {/* ── FREQUÊNCIA (sem trocar produto) ───────────────────────── */}
              {step === "frequency" && (
                <div className="space-y-5">
                  {/* Card produto atual */}
                  {currentProductName && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50"
                        style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        {currentProductImage
                          ? <img src={currentProductImage} alt={currentProductName} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                          : <StepIcon stepTypeKey={selectedCategory?.key} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{selectedCategory?.label}</p>
                        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{currentProductName}</p>
                      </div>
                    </div>
                  )}

                  {/* Período */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-3">Para qual rotina?</p>
                    <PeriodSelector size="sm" value={period} onChange={(v) => setPeriod(v)} />
                  </div>

                  {/* Toggle diário */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-3">Quando usar?</p>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14, color: "#94a3b8" }} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Uso diário</p>
                        </div>
                      </div>
                      <button onClick={() => { setRegIsDaily(v => !v); if (!regIsDaily) setRegDays(WEEK_DAYS.map(d => d.key)); }}>
                        <FontAwesomeIcon
                          icon={regIsDaily ? faToggleOn : faToggleOff}
                          style={{ fontSize: 28, color: regIsDaily ? "#E8547A" : "#cbd5e1" }}
                        />
                      </button>
                    </div>

                    {!regIsDaily && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                        <div className="mt-3 space-y-3">
                          <p className="text-xs font-semibold text-slate-700">Quais dias da semana?</p>
                          <div className="flex gap-1.5">
                            {WEEK_DAYS.map(d => (
                              <button key={d.key} onClick={() => toggleDay(d.key)}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                style={regDays.includes(d.key)
                                  ? { background: "var(--grad-coral)", color: "#fff", boxShadow: "0 2px 8px rgba(232,84,122,0.3)" }
                                  : { background: "rgba(255,255,255,0.9)", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                {d.label}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setRegDays([])}
                            className="w-full py-2.5 rounded-xl bg-white/70 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 11 }} />
                            Quando necessário (sem dias fixos)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button onClick={handleConfirmFrequency} className={BTN_PRIMARY}>
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: 14 }} />
                    Confirmar frequência
                  </button>
                </div>
              )}

              {/* ── CATEGORIA ─────────────────────────────────────────────── */}
              {step === "category" && (
                <div className="grid grid-cols-3 gap-2.5">
                    {WIZARD_CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => pickCategory(cat)}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border-2 text-center transition-all active:scale-95"
                        style={selectedCategory?.key === cat.key ? {
                          borderColor: "#e8a9c2",
                          boxShadow: "0 0 0 3px rgba(232,169,194,0.18)",
                        } : { borderColor: "rgba(255,255,255,0.9)" }}
                      >
                        <div className="w-9 h-9 flex items-center justify-center">
                          <StepIcon stepTypeKey={cat.key} size={32} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight">{cat.label}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* ── FONTE ─────────────────────────────────────────────────── */}
              {step === "source" && (
                <div className="space-y-3">
                  {/* Produto atual (swap) */}
                  {mode === "swap" && currentProductName && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 mb-1">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center"
                        style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        {currentProductImage
                          ? <img src={currentProductImage} alt={currentProductName} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                          : <StepIcon stepTypeKey={selectedCategory?.key} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Produto atual</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{currentProductName}</p>
                      </div>
                    </div>
                  )}

                  {/* Editar este produto — destaque no topo quando é produto do usuário */}
                  {isCurrentUserProduct && mode === "swap" && (
                    <button
                      onClick={startEditCurrentProduct}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left bg-amber-50 border-2 border-amber-200 shadow-sm active:scale-[0.98] transition-transform"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fef3c7" }}>
                        <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 16, color: "#d97706" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800 leading-tight">Editar este produto</p>
                        <p className="text-xs text-amber-600 mt-0.5">Atualizar nome, categoria, marca ou foto</p>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11, color: "#d97706", flexShrink: 0 }} />
                    </button>
                  )}

                  {recommendations.length > 0 && (
                    <SourceOption
                      faIcon={faWandMagicSparkles}
                      iconBg="#fff0f6"
                      iconColor="#E8547A"
                      title="Recomendações para você"
                      sub="Produtos selecionados pela IA"
                      highlight
                      onClick={() => goTo("recommendations")}
                    />
                  )}

                  <SourceOption
                    faIcon={faMagnifyingGlass}
                    iconBg="#f0f9ff"
                    iconColor="#0ea5e9"
                    title="Buscar no catálogo"
                    sub="Pesquisar produtos disponíveis"
                    onClick={() => { setCatalogQuery(""); goTo("catalog"); }}
                  />

                  <SourceOption
                    faIcon={faLayerGroup}
                    iconBg="#f5f3ff"
                    iconColor="#8b5cf6"
                    title="Meus produtos"
                    sub="Produtos que você já cadastrou"
                    onClick={() => goTo("my_products")}
                  />

                  {mode === "swap" && (
                    <SourceOption
                      faIcon={faArrowRightArrowLeft}
                      iconBg="#f0fdf4"
                      iconColor="#16a34a"
                      title="Trocar categoria do passo"
                      sub="Mudar para outra categoria"
                      onClick={() => goTo("category")}
                    />
                  )}
                </div>
              )}

              {/* ── RECOMENDAÇÕES ─────────────────────────────────────────── */}
              {step === "recommendations" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {recommendations.map(opt => (
                      <ProductCard
                        key={opt.key}
                        name={opt.productName}
                        sub={opt.label}
                        imageUrl={opt.imageUrl}
                        stepTypeKey={selectedCategory?.key}
                        onClick={() => pickRecommendation(opt)}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => goTo("catalog")}
                    className={BTN_SECONDARY}
                  >
                    Quero outro produto
                    <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11 }} />
                  </button>
                </div>
              )}

              {/* ── CATÁLOGO ──────────────────────────────────────────────── */}
              {step === "catalog" && (
                <div className="space-y-3">
                  {/* Filtro por marca — só para categorias não-medicamentos */}
                  {!isMedicalCategory && brandLogos.length > 0 && (
                    <BrandLogoFilter
                      brands={brandLogos}
                      selected={catalogQuery || null}
                      onSelect={(name) => setCatalogQuery(name)}
                      label="Filtrar por marca"
                    />
                  )}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }} />
                    <input
                      autoFocus
                      value={catalogQuery}
                      onChange={e => setCatalogQuery(e.target.value)}
                      placeholder={`Buscar ${selectedCategory?.label ?? "produto"}...`}
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    {isCatalogLoading && <Loader2 size={14} className="animate-spin text-slate-400 flex-shrink-0" />}
                  </div>

                  {catalogResults.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {catalogResults.map(p => (
                        <ProductCard
                          key={p.id}
                          name={p.name}
                          sub={p.brand}
                          imageUrl={p.imageUrl ?? undefined}
                          stepTypeKey={selectedCategory?.key ?? p.stepTypeKey}
                          onClick={() => pickCatalogProduct(p)}
                        />
                      ))}
                    </div>
                  )}

                  {noResults && (
                    <div className="flex flex-col items-center py-8 gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                        <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 20, color: "#E8547A" }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-1">Produto não encontrado</p>
                        <p className="text-xs text-slate-500 max-w-[220px]">
                          Não achamos "{catalogQuery}" no catálogo. Quer cadastrá-lo?
                        </p>
                      </div>
                      <button
                        onClick={() => { setRegName(catalogQuery); goTo("register"); }}
                        className="coral-button px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} />
                        Cadastrar este produto
                      </button>
                    </div>
                  )}

                  {!isCatalogLoading && !noResults && catalogResults.length === 0 && !catalogSearched && (
                    <p className="text-xs text-slate-400 text-center py-6">Carregando produtos...</p>
                  )}
                </div>
              )}

              {/* ── MEUS PRODUTOS ─────────────────────────────────────────── */}
              {step === "my_products" && (
                <div className="space-y-3">
                  {myProductsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                  ) : matchingMyProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {matchingMyProducts.map(p => (
                        <ProductCard
                          key={p.id}
                          name={p.name}
                          sub={p.brand}
                          imageUrl={p.imageUrl}
                          stepTypeKey={selectedCategory?.key}
                          onClick={() => pickMyProduct(p)}
                          onEdit={() => startEditProduct(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">
                      Você não possui nenhum produto cadastrado na categoria {selectedCategory?.label ?? "selecionada"}.
                    </p>
                  )}

                  <button
                    onClick={() => { setIsEditMode(false); setEditingProductId(null); goTo("register"); }}
                    className={BTN_PRIMARY}
                  >
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} />
                    Cadastrar novo produto
                  </button>
                </div>
              )}

              {/* ── CADASTRAR / EDITAR ────────────────────────────────────── */}
              {step === "register" && (
                <div className="space-y-4">
                  {/* Foto */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-colors overflow-hidden"
                    >
                      {regImageUrl ? (
                        <img src={regImageUrl} alt="preview" className="absolute inset-0 w-full h-full object-contain p-1" />
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCamera} style={{ fontSize: 22, color: "#94a3b8" }} />
                          <span className="text-[10px] text-slate-400 font-medium">Foto</span>
                        </>
                      )}
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </div>

                  {/* Nome */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Nome do produto *</p>
                    <input
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Ex: Sérum Vitamina C"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  {/* Marca */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faBuilding} style={{ fontSize: 11, color: "#94a3b8" }} />
                      Marca
                    </p>
                    <select
                      value={regBrand}
                      onChange={e => setRegBrand(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 outline-none appearance-none"
                    >
                      <option value="">Selecionar marca...</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                      <option value="__other">Outra marca</option>
                    </select>
                    {regBrand === "__other" && (
                      <input
                        autoFocus
                        placeholder="Digite o nome da marca"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none mt-2"
                        onChange={e => setRegBrand(e.target.value === "" ? "__other" : e.target.value)}
                      />
                    )}
                  </div>

                  {/* Categoria (info) */}
                  {selectedCategory && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 border border-slate-100">
                      <FontAwesomeIcon icon={faTag} style={{ fontSize: 11, color: "#94a3b8" }} />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Categoria</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedCategory.label}</p>
                      </div>
                    </div>
                  )}

                  {/* Frequência */}
                  {!isEditMode && (
                    <div>
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14, color: "#94a3b8" }} />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Uso diário</p>
                            <p className="text-[11px] text-slate-400">Todo dia, manhã e/ou noite</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setRegIsDaily(v => !v); if (regIsDaily) setRegDays(WEEK_DAYS.map(d => d.key)); }}
                          className="flex-shrink-0 ml-3"
                        >
                          <FontAwesomeIcon
                            icon={regIsDaily ? faToggleOn : faToggleOff}
                            style={{ fontSize: 28, color: regIsDaily ? "#E8547A" : "#cbd5e1" }}
                          />
                        </button>
                      </div>

                      {!regIsDaily && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                          <div className="mt-3 space-y-3">
                            <p className="text-xs font-semibold text-slate-700">Quais dias da semana?</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {WEEK_DAYS.map(d => (
                                <button
                                  key={d.key}
                                  onClick={() => toggleDay(d.key)}
                                  className="flex-1 min-w-[38px] py-2 rounded-xl text-xs font-bold transition-all"
                                  style={regDays.includes(d.key) ? {
                                    background: "var(--grad-coral)", color: "#fff",
                                    boxShadow: "0 2px 8px rgba(232,84,122,0.3)",
                                  } : { background: "rgba(255,255,255,0.9)", color: "#64748b", border: "1px solid #e2e8f0" }}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setRegDays([])}
                              className="w-full py-2.5 rounded-xl bg-white/70 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-center gap-2"
                            >
                              <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 11 }} />
                              Quando necessário (sem dias fixos)
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={!regName.trim() || regSaving}
                    className={`${BTN_PRIMARY} disabled:opacity-50`}
                  >
                    {regSaving
                      ? <Loader2 size={16} className="animate-spin" />
                      : <FontAwesomeIcon icon={faCheck} style={{ fontSize: 14 }} />}
                    {regUploading ? "Enviando foto..." : regSaving ? "Salvando..." : isEditMode ? "Salvar alterações" : "Continuar"}
                  </button>
                </div>
              )}

              {/* ── EDITAR: NOME ─────────────────────────────────────────── */}
              {step === "edit_name" && (
                <div className="space-y-4">
                  <input
                    autoFocus
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Nome do produto"
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 text-base font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    onClick={() => goTo("edit_category")}
                    disabled={!regName.trim()}
                    className={`${BTN_PRIMARY} disabled:opacity-40`}
                  >
                    Confirmar nome
                    <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 13 }} />
                  </button>
                </div>
              )}

              {/* ── EDITAR: CATEGORIA ────────────────────────────────────── */}
              {step === "edit_category" && (
                <div className="grid grid-cols-3 gap-2.5">
                  {WIZARD_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => { setSelectedCategory(cat); goTo("edit_brand"); }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border-2 text-center transition-all active:scale-95"
                      style={selectedCategory?.key === cat.key ? {
                        borderColor: "#e8a9c2",
                        boxShadow: "0 0 0 3px rgba(232,169,194,0.18)",
                      } : { borderColor: "rgba(255,255,255,0.9)" }}
                    >
                      <div className="w-9 h-9 flex items-center justify-center">
                        <StepIcon stepTypeKey={cat.key} size={32} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── EDITAR: MARCA ────────────────────────────────────────── */}
              {step === "edit_brand" && (
                <div className="space-y-4">
                  {/* Logos de marcas — substituem os pills de texto */}
                  {brandLogos.length > 0 ? (
                    <div className="space-y-3">
                      <BrandLogoFilter
                        brands={brandLogos}
                        selected={regBrand || null}
                        onSelect={(name) => {
                          setRegBrand(name);
                          setCustomBrandInput("");
                          if (name) goTo("edit_photo");
                        }}
                        label="Selecione a marca"
                      />
                      {/* Nenhuma */}
                      <button
                        onClick={() => { setRegBrand(""); setCustomBrandInput(""); goTo("edit_photo"); }}
                        className="px-4 py-2 rounded-full text-xs font-semibold border bg-white border-slate-200 text-slate-400 active:scale-95"
                      >
                        Nenhuma / Outra
                      </button>
                    </div>
                  ) : (
                    /* Fallback: pills de texto se logos não carregaram */
                    <div className="flex flex-wrap gap-2">
                      {brands.map(b => (
                        <button
                          key={b}
                          onClick={() => { setRegBrand(b); setCustomBrandInput(""); goTo("edit_photo"); }}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border active:scale-95 ${
                            regBrand === b ? "coral-button border-transparent" : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                      <button
                        onClick={() => { setRegBrand(""); setCustomBrandInput(""); goTo("edit_photo"); }}
                        className="px-4 py-2 rounded-full text-sm font-semibold border bg-white border-slate-200 text-slate-500 active:scale-95"
                      >
                        Nenhuma
                      </button>
                    </div>
                  )}

                  {/* Adicionar marca customizada */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">Adicionar marca:</p>
                    <div className="flex gap-2">
                      <input
                        value={customBrandInput}
                        onChange={e => setCustomBrandInput(e.target.value)}
                        placeholder="Nome da marca"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                      <button
                        onClick={() => {
                          if (customBrandInput.trim()) {
                            setRegBrand(customBrandInput.trim());
                            goTo("edit_photo");
                          }
                        }}
                        disabled={!customBrandInput.trim()}
                        className="px-4 py-2.5 rounded-xl coral-button text-sm font-bold disabled:opacity-40"
                      >
                        Usar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── EDITAR: FOTO ─────────────────────────────────────────── */}
              {step === "edit_photo" && (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32 rounded-3xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {regImageUrl ? (
                        <>
                          <img src={regImageUrl} alt="preview" className="w-full h-full object-contain p-2" />
                          <button
                            onClick={() => { setRegImageUrl(undefined); setRegImageFile(null); }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800/60 flex items-center justify-center"
                          >
                            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 10, color: "white" }} />
                          </button>
                        </>
                      ) : (
                        <StepIcon stepTypeKey={selectedCategory?.key} size={48} />
                      )}
                    </div>
                  </div>

                  {/* Selecionar */}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className={BTN_SECONDARY}
                  >
                    <FontAwesomeIcon icon={faCamera} style={{ fontSize: 14 }} />
                    {regImageUrl ? "Trocar foto" : "Selecionar da galeria"}
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

                  {/* Pular */}
                  <button
                    onClick={handleRegister}
                    disabled={regSaving}
                    className={`${BTN_PRIMARY} disabled:opacity-50`}
                  >
                    {regSaving
                      ? <Loader2 size={16} className="animate-spin" />
                      : <FontAwesomeIcon icon={faCheck} style={{ fontSize: 14 }} />}
                    {regUploading ? "Enviando…" : regSaving ? "Salvando…" : regImageUrl ? "Salvar e continuar" : "Continuar sem foto"}
                  </button>
                </div>
              )}

              {/* ── PERÍODO ───────────────────────────────────────────────── */}
              {step === "period" && (
                <div className="space-y-5">
                  {selectedProduct && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50"
                        style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                        {selectedProduct.imageUrl
                          ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                          : <StepIcon stepTypeKey={selectedCategory?.key} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{selectedCategory?.label}</p>
                        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{selectedProduct.name}</p>
                      </div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--grad-coral)" }}>
                        <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10, color: "white" }} />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-3">Aplicar em qual rotina?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: "morning" as const, label: "Manhã",  Icon: Sun,      activeGrad: "linear-gradient(135deg,#fde68a 0%,#fdba74 100%)", iconColor: "#92400e" },
                        { key: "night"   as const, label: "Noite",  Icon: Moon,     activeGrad: "linear-gradient(135deg,#c7d2fe 0%,#ddd6fe 100%)", iconColor: "#3730a3" },
                        { key: "both"    as const, label: "Ambos",  Icon: Sparkles, activeGrad: "linear-gradient(135deg,#fde68a 0%,#f9a8d4 45%,#c4b5fd 100%)", iconColor: "#6d28d9" },
                      ]).map(p => {
                        const isActive = period === p.key;
                        return (
                          <button
                            key={p.key}
                            onClick={() => setPeriod(p.key)}
                            className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all"
                            style={isActive ? {
                              background: p.activeGrad,
                              borderColor: "transparent",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                            } : { background: "rgba(255,255,255,0.8)", borderColor: "#e2e8f0" }}
                          >
                            <p.Icon size={20} style={{ color: p.iconColor }} />
                            <span className="text-xs font-bold text-slate-700">{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quando usar */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-3">Quando usar?</p>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14, color: "#94a3b8" }} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Uso diário</p>
                          <p className="text-[11px] text-slate-400">
                            {period === "morning" ? "Toda manhã" : period === "night" ? "Toda noite" : "Manhã e noite"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setRegIsDaily(v => !v);
                          if (!regIsDaily) setRegDays(WEEK_DAYS.map(d => d.key));
                        }}
                        className="flex-shrink-0 ml-3"
                      >
                        <FontAwesomeIcon
                          icon={regIsDaily ? faToggleOn : faToggleOff}
                          style={{ fontSize: 28, color: regIsDaily ? "#E8547A" : "#cbd5e1" }}
                        />
                      </button>
                    </div>

                    {!regIsDaily && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-3">
                          <p className="text-xs font-semibold text-slate-700">Quais dias da semana?</p>
                          <div className="flex gap-1.5">
                            {WEEK_DAYS.map(d => (
                              <button
                                key={d.key}
                                onClick={() => toggleDay(d.key)}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                style={regDays.includes(d.key) ? {
                                  background: "var(--grad-coral)", color: "#fff",
                                  boxShadow: "0 2px 8px rgba(232,84,122,0.3)",
                                } : { background: "rgba(255,255,255,0.9)", color: "#64748b", border: "1px solid #e2e8f0" }}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setRegDays([])}
                            className="w-full py-2.5 rounded-xl bg-white/70 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-center gap-2"
                          >
                            <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 11 }} />
                            Quando necessário (sem dias fixos)
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button onClick={handleConfirm} className={`${BTN_PRIMARY} shadow-glow`}>
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: 15 }} />
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

function SourceOption({
  faIcon, iconBg, iconColor, title, sub, onClick, highlight,
}: {
  faIcon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={CARD_BASE}
      style={highlight ? { borderColor: "#f9a8d4", boxShadow: "0 0 0 3px rgba(249,168,212,0.15)" } : undefined}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <FontAwesomeIcon icon={faIcon} style={{ fontSize: 16, color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-tight">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
      <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }} />
    </button>
  );
}

function ProductCard({
  name, sub, imageUrl, stepTypeKey, onClick, onEdit,
}: {
  name: string;
  sub?: string | null;
  imageUrl?: string;
  stepTypeKey?: string;
  onClick: () => void;
  onEdit?: () => void;
}) {
  const [imgErrored, setImgErrored] = useState(false);

  return (
    <div className="relative flex flex-col rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {/* Imagem */}
      <button
        onClick={onClick}
        className="w-full h-[120px] flex items-center justify-center bg-slate-50 active:scale-95 transition-transform"
      >
        {imageUrl && !imgErrored ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-contain p-2"
            referrerPolicy="no-referrer"
            onError={() => setImgErrored(true)}
          />
        ) : (
          <StepIcon stepTypeKey={stepTypeKey} />
        )}
      </button>

      {/* Info */}
      <button onClick={onClick} className="px-2.5 py-2 text-left flex-1">
        <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{name}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </button>

      {/* Editar (meus produtos) */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center"
        >
          <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 9, color: "#94a3b8" }} />
        </button>
      )}
    </div>
  );
}
