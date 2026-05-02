import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sun, Moon, AlertTriangle, CalendarDays, Repeat2, Plus, ListChecks, ChevronDown, Search, CheckCircle2, Droplets, Sparkles, Beaker, Pipette, MoonStar, Shield, Edit, ChevronUp, Trash2, X, Image, GripVertical, RefreshCw, Crown, Upload, Loader2, PackageOpen } from "lucide-react";
import { normalizeAnalysis, type AnalysisRecommendation, type AnalysisResponse } from "@/lib/analysis";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  getCachedLatestAnalysis, fetchDashboardSummary, setCachedLatestAnalysis, invalidateAnalysisCache,
  addRoutineStep, updateRoutineStep,
  type RoutineStep as ApiRoutineStep,
} from "@/lib/analysisClient";
import { useRoutineSteps, useRoutineComplete } from "@/features/routine";
import { searchAdminProducts, patchAdminProductImage } from "@/lib/admin-products";
import type { AdminProduct } from "@/lib/admin-products";
import { uploadProductImage } from "@/lib/storage";
import { getCurrentUser, getAccessTokenWithWait } from "@/lib/auth";
import { getUserCatalog } from "@/lib/userCatalog";
import { createMyProduct } from "@/lib/userProducts";
import { apiBaseUrl } from "@/lib/api";
import { AuroraBackdrop } from "@/components/shared";

const weekDays = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sab" },
  { key: "sun", label: "Dom" },
] as const;

type WeekDayKey = (typeof weekDays)[number]["key"];

type ProductSchedule = {
  daysByItem: Record<string, WeekDayKey[]>;
  checkedByDayItem: Record<string, boolean>;
};

type RoutineItem = {
  key: string;
  period: "morning" | "night";
  stepNumber: number;
  stepLabel: string;
  title: string;
  type: string;
  recurrence: string;
  note: string;
  imageUrl?: string;
  isCustom?: boolean;
};

type CustomStep = {
  id: string;
  period: "morning" | "night";
  stepLabel: string;
  productName: string;
  imageUrl?: string;
  note?: string;
};

type ProductOption = {
  key: string;
  label: string;
  productName: string;
  reason: string;
  imageUrl?: string;
};

type ResolvedProduct = {
  productName: string;
  reason: string;
  imageUrl?: string;
};

type MyProduct = {
  name: string;
  imageUrl?: string;
};

const defaultRoutine = {
  morning: [
    "Limpeza: Gel/Sabonete de Limpeza",
    "Antioxidante: Serum Antioxidante",
    "Hidratante: Hidratante Facial",
    "Proteção solar: Protetor Solar",
  ],
  night: [
    "Limpeza: Gel/Sabonete de Limpeza",
    "Tônico: Tônico Facial",
    "Sérum: Serum Tratamento",
    "Retinol: Retinol/Retinoide",
    "Hidratante: Hidratante Noturno",
  ],
};

const buildRoutineFromRecommendations = (recommendations: AnalysisRecommendation[]) => {
  const morning: string[] = [];
  const night: string[] = [];
  const seen = new Set<string>();

  recommendations.forEach((item) => {
    const category = item.type?.trim() || "Passo";
    const product = item.product?.trim();
    if (!product) {
      return;
    }

    const step = `${category}: ${product}`;
    const dedupeKey = `${category.toLowerCase()}::${product.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    const normalizedCategory = normalizeCategory(category);

    // Morning-only categories
    if (normalizedCategory === "protetor") {
      morning.push(step);
      return;
    }

    // Night-only categories (retinol, retinoide, etc)
    if (normalizedCategory === "retinoide" || normalizedCategory === "retinol" || normalizedCategory.includes("retino")) {
      night.push(step);
      return;
    }

    // Morning + Night for all other categories (including extras, adicional, etc)
    morning.push(step);
    night.push(step);
  });

  return { morning, night };
};

const getScheduleStorageKey = (analysisId?: string) =>
  `faceglow-routine-schedule-${analysisId ?? "default"}`;

const getSelectionStorageKey = (analysisId?: string) =>
  `faceglow-routine-selection-${analysisId ?? "default"}`;

const getDisplayStorageKey = (analysisId?: string) =>
  `faceglow-routine-display-${analysisId ?? "default"}`;

const getCustomStepsStorageKey = (analysisId?: string) =>
  `faceglow-routine-custom-steps-${analysisId ?? "default"}`;

const getRoutineOrderStorageKey = (analysisId?: string) =>
  `faceglow-routine-order-${analysisId ?? "default"}`;

const getMyProductsStorageKey = (analysisId?: string) =>
  `faceglow-routine-my-products-${analysisId ?? "default"}`;

const allDays = weekDays.map((day) => day.key);

const fallbackCardImage = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80";

const normalizeCategory = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const humanizeRecurrence = (value: string) => {
  if (!value) return "Diário";
  if (value === "daily" || value === "morning" || value === "night") return "Diário";
  if (value === "as_needed") return "Quando necessário";
  if (value === "weekly") return "Semanal";
  if (value === "2x_week") return "2x semana";
  if (value === "3x_week") return "3x semana";
  return value;
};

const capitalizeWords = (text: string) => {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const parseRoutineStep = (
  step: string,
  period: "morning" | "night",
  stepNumber: number,
  recommendationByName: Map<string, AnalysisRecommendation>,
): RoutineItem => {
  const separatorIndex = step.indexOf(":");
  const rawType = separatorIndex > -1 ? step.slice(0, separatorIndex).trim() : period === "morning" ? "Manha" : "Noite";
  let rawTitle = separatorIndex > -1 ? step.slice(separatorIndex + 1).trim() : step.trim();

  let recurrence = "daily";
  const recurrenceMatch = rawTitle.match(/\(([^)]+)\)\s*$/);
  if (recurrenceMatch) {
    recurrence = recurrenceMatch[1].trim().toLowerCase();
    rawTitle = rawTitle.replace(/\(([^)]+)\)\s*$/, "").trim();
  }

  const titleLower = rawTitle.toLowerCase();
  const recommendation = recommendationByName.get(titleLower);

  return {
    key: `${period}::${titleLower}`,
    period,
    stepNumber,
    stepLabel: rawType || "Passo",
    title: rawTitle,
    type: recommendation?.type || rawType || "Passo",
    recurrence,
    note: recommendation?.reason || "",
    imageUrl: recommendation?.imageUrl,
  };
};

const getStepIcon = (item: RoutineItem) => {
  const normalized = normalizeCategory(item.stepLabel || item.title);

  if (normalized.includes("limpeza")) return <Droplets size={18} className="text-primary" />;
  if (normalized.includes("antioxidante")) return <Sparkles size={18} className="text-primary" />;
  if (normalized.includes("hidratante")) return <Droplets size={18} className="text-primary" />;
  if (normalized.includes("protecao") || normalized.includes("solar") || normalized.includes("protetor")) return <Shield size={18} className="text-primary" />;
  if (normalized.includes("tonico")) return <Beaker size={18} className="text-primary" />;
  if (normalized.includes("serum")) return <Pipette size={18} className="text-primary" />;
  if (normalized.includes("retinol") || normalized.includes("retino")) return <MoonStar size={18} className="text-primary" />;
  
  return <Sparkles size={18} className="text-primary" />;
};

const isExtraItem = (item: RoutineItem) => {
  const nl = normalizeCategory(item.stepLabel);
  const nt = normalizeCategory(item.type);
  const ntitle = normalizeCategory(item.title);
  // Retinol/retinoids are always core night items, never extras
  if (nl.includes("retino") || nt.includes("retino") || ntitle.includes("retino")) return false;
  return nl === "extras" || nl === "extra" || nl === "adicional" || item.recurrence === "as_needed";
};

const getRoutineTypeKey = (item: RoutineItem) => normalizeCategory(item.stepLabel || item.type);

const dedupeValidDays = (days: string[] | undefined): WeekDayKey[] => {
  const set = new Set<WeekDayKey>();
  (days ?? []).forEach((day) => {
    if (allDays.includes(day as WeekDayKey)) {
      set.add(day as WeekDayKey);
    }
  });
  return [...set];
};

const buildInitialSchedule = (itemKeys: string[]): ProductSchedule => {
  const daysByItem: Record<string, WeekDayKey[]> = {};
  itemKeys.forEach((itemKey) => {
    daysByItem[itemKey] = [...allDays];
  });

  return {
    daysByItem,
    checkedByDayItem: {},
  };
};

const normalizeSchedule = (raw: unknown, itemKeys: string[]): ProductSchedule => {
  const fallback = buildInitialSchedule(itemKeys);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const parsed = raw as Partial<ProductSchedule>;
  const parsedDays = (parsed.daysByItem ?? (parsed as { daysByProduct?: Record<string, string[]> }).daysByProduct) ?? {};
  const parsedChecks = (parsed.checkedByDayItem ?? (parsed as { checkedByDayProduct?: Record<string, boolean> }).checkedByDayProduct) ?? {};

  const daysByItem: Record<string, WeekDayKey[]> = {};
  itemKeys.forEach((itemKey) => {
    const normalized = dedupeValidDays(parsedDays[itemKey]);
    daysByItem[itemKey] = normalized.length ? normalized : [...allDays];
  });

  const checkedByDayItem: Record<string, boolean> = {};
  Object.entries(parsedChecks).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      checkedByDayItem[key] = value;
    }
  });

  return {
    daysByItem,
    checkedByDayItem,
  };
};

const Routine = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stateAnalysis = normalizeAnalysis((location.state as { analysis?: unknown } | null)?.analysis);

  let analysis = stateAnalysis;
  if (!analysis) {
    const raw = localStorage.getItem("faceglow-last-analysis");
    if (raw) {
      try {
        analysis = normalizeAnalysis(JSON.parse(raw));
      } catch {
        analysis = null;
      }
    }
  }
  if (!analysis) {
    analysis = getCachedLatestAnalysis();
  }

  const hasRoutineFromAnalysis = Boolean(analysis?.routine?.morning?.length || analysis?.routine?.night?.length);
  const recommendationFallbackRoutine = buildRoutineFromRecommendations(analysis?.recommendations ?? []);
  const hasRecommendationFallbackRoutine = Boolean(
    recommendationFallbackRoutine.morning.length || recommendationFallbackRoutine.night.length,
  );

  const routine = hasRoutineFromAnalysis
    ? analysis!.routine
    : hasRecommendationFallbackRoutine
      ? recommendationFallbackRoutine
      : defaultRoutine;


  // Declare all states FIRST before any useEffect or useMemo that use them
  const [selectedDay, setSelectedDay] = useState<string>(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<"morning" | "night">("morning");
  const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null);
  const [selectingProductItem, setSelectingProductItem] = useState<string | null>(null);
  const [editingDaysItem, setEditingDaysItem] = useState<string | null>(null);
  const [selectedOptionByItem, setSelectedOptionByItem] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(getSelectionStorageKey(analysis?.id));
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [pendingOptionByItem, setPendingOptionByItem] = useState<Record<string, string>>({});
  const [pendingScopeByItem, setPendingScopeByItem] = useState<Record<string, "both" | "morning" | "night">>({});
  const [showingCustomFormByItem, setShowingCustomFormByItem] = useState<Record<string, boolean>>({});
  const [catalogSearchByItem, setCatalogSearchByItem] = useState<Record<string, string>>({});
  const [catalogSearchOpenByItem, setCatalogSearchOpenByItem] = useState<Record<string, boolean>>({});
  const [loadedAnalysis, setLoadedAnalysis] = useState<AnalysisResponse | null>(analysis);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(!analysis);
  const [customProductByItem, setCustomProductByItem] = useState<Record<string, MyProduct>>(() => {
    try {
      const raw = localStorage.getItem(getMyProductsStorageKey(analysis?.id));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [customInputByItem, setCustomInputByItem] = useState<Record<string, string>>({});
  const [customImageInputByItem, setCustomImageInputByItem] = useState<Record<string, string>>({});
  const [uploadingImageByItem, setUploadingImageByItem] = useState<Record<string, boolean>>({});
  const [imageUploadErrorByItem, setImageUploadErrorByItem] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [shakingDay, setShakingDay] = useState<string | null>(null);
  const [stepPendingDelete, setStepPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingStep, setIsDeletingStep] = useState(false);
  const [isAdvancingToNight, setIsAdvancingToNight] = useState(false);

  const {
    steps: apiSteps,
    isLoading: stepsLoading,
    reload: reloadApiSteps,
    patchStep,
    deleteStep: deleteApiStep,
    reorder: reorderApiSteps,
  } = useRoutineSteps(analysis?.id);
  const stepsLoaded = !stepsLoading;
  const { markComplete } = useRoutineComplete();


  // Try loading analysis from API if none available from initial fallbacks
  useEffect(() => {
    getCurrentUser().then((user) => { if (user?.id) setUserId(user.id); });
  }, []);

  useEffect(() => {
    if (loadedAnalysis || !isLoadingAnalysis) {
      // Already have analysis or already attempted load
      return;
    }

    const loadAnalysisFromAPI = async () => {
      try {
        const dashboard = await fetchDashboardSummary(false);
        if (dashboard.latest) {
          setLoadedAnalysis(dashboard.latest);
          setCachedLatestAnalysis(dashboard.latest);
        }
      } catch (error) {
        console.error("[Routine] Failed to load analysis from API:", error);
      } finally {
        setIsLoadingAnalysis(false);
      }
    };

    loadAnalysisFromAPI();
  }, [loadedAnalysis, isLoadingAnalysis]);

  // Declarado cedo pois useEffects abaixo dependem dele
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Carrega progresso de hoje do DB e hidrata checkedByDayItem
  useEffect(() => {
    if (stepsLoading || apiSteps.length === 0) return;
    const loadTodayProgress = async () => {
      try {
        const token = await getAccessTokenWithWait(3000);
        if (!token) return;
        const res = await fetch(`${apiBaseUrl}/routine/progress/today?localDate=${todayStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const { completedStepIds } = await res.json() as { completedStepIds: string[] };
        if (!completedStepIds?.length) return;
        // Mapeia step IDs para itemKeys
        const stepById = new Map(apiSteps.map((s) => [s.id, s]));
        const updates: Record<string, boolean> = {};
        completedStepIds.forEach((id) => {
          const step = stepById.get(id);
          if (step) {
            const itemKey = `${step.period}::${step.productName.toLowerCase()}`;
            updates[`${todayStr}::${itemKey}`] = true;
          }
        });
        if (Object.keys(updates).length > 0) {
          setProductSchedule((prev) => ({
            ...prev,
            checkedByDayItem: { ...prev.checkedByDayItem, ...updates },
          }));
        }
      } catch { /* ignora — usa estado local */ }
    };
    loadTodayProgress();
  }, [stepsLoading, apiSteps, todayStr]);

  // Sync tiers da API para selectedOptionByItem quando steps carregam (hook gerencia o fetch)
  useEffect(() => {
    if (stepsLoading || apiSteps.length === 0) return;
    const tierMap: Record<string, string> = {};
    apiSteps.forEach((s) => {
      if (s.selectedTier) {
        const key = `${s.period}::${s.productName.toLowerCase()}`;
        tierMap[key] = `${key}::${s.selectedTier}`;
      }
    });
    if (Object.keys(tierMap).length > 0) {
      setSelectedOptionByItem((prev) => ({ ...prev, ...tierMap }));
    }
  }, [stepsLoading, apiSteps]);

  const routineItems = useMemo(() => {
    // ---- Phase 2: apiSteps is the primary data source ----
    // When structured steps are loaded from GET /analysis/{id}/steps, use them directly.
    // Fall back to string-parsing only while loading or if backend has no steps yet.

    if (stepsLoaded && apiSteps.length > 0) {
      // Build recommendation map for product options (still needed for tier selection)
      const recommendationByName = new Map<string, AnalysisRecommendation>();
      const recommendations = loadedAnalysis?.recommendations ?? analysis?.recommendations ?? [];
      recommendations.forEach((item) => {
        if (item.product) recommendationByName.set(item.product.toLowerCase(), item);
      });

      const toRoutineItem = (s: ApiRoutineStep, idx: number): RoutineItem => {
        const rec = recommendationByName.get(s.productName.toLowerCase());
        return {
          key: `${s.period}::${s.productName.toLowerCase()}`,
          period: s.period as "morning" | "night",
          stepNumber: s.stepOrder + 1,
          stepLabel: s.category,
          title: s.overrideProductName ?? s.productName,
          type: s.category,
          recurrence: s.recurrence,
          note: rec?.reason ?? "",
          imageUrl: s.overrideImageUrl ?? s.imageUrl ?? rec?.imageUrl,
          isCustom: s.isUserAdded,
        };
      };

      const morningItems = apiSteps
        .filter((s) => s.period === "morning")
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((s, idx) => toRoutineItem(s, idx));

      const nightItems = apiSteps
        .filter((s) => s.period === "night")
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((s, idx) => toRoutineItem(s, idx));

      return {
        morning: morningItems,
        night: nightItems,
        all: [...morningItems, ...nightItems],
      };
    }

    // ---- Fallback: string-parsing while loading or no steps ----
    const apiImageByKey = new Map<string, string>();
    if (apiSteps.length > 0) {
      apiSteps.forEach((s) => {
        const key = `${s.period}::${s.productName.toLowerCase()}`;
        const img = s.overrideImageUrl ?? s.imageUrl;
        if (img) apiImageByKey.set(key, img);
      });
    }

    const recommendationByName = new Map<string, AnalysisRecommendation>();
    const recommendations = loadedAnalysis?.recommendations ?? analysis?.recommendations ?? [];
    recommendations.forEach((item) => {
      if (item.product) recommendationByName.set(item.product.toLowerCase(), item);
    });

    const applyApiImage = (item: RoutineItem): RoutineItem => ({
      ...item,
      imageUrl: apiImageByKey.get(item.key) ?? item.imageUrl,
    });

    const morningItems = [
      ...routine.morning.map((step, index) =>
        applyApiImage(parseRoutineStep(step, "morning", index + 1, recommendationByName))
      ),
    ];
    const nightItems = [
      ...routine.night.map((step, index) =>
        applyApiImage(parseRoutineStep(step, "night", index + 1, recommendationByName))
      ),
    ];

    return {
      morning: morningItems,
      night: nightItems,
      all: [...morningItems, ...nightItems],
    };
  }, [analysis?.recommendations, routine.morning, routine.night, loadedAnalysis?.recommendations, apiSteps, stepsLoaded]);

  const productOptionsByItem = useMemo(() => {
    const recommendations = analysis?.recommendations ?? [];
    // Include all products (main and extras/additional)
    const recommendationGroups = new Map<string, AnalysisRecommendation[]>();

    recommendations.forEach((item) => {
      const normalized = normalizeCategory(item.type || "");
      const list = recommendationGroups.get(normalized) ?? [];
      list.push(item);
      recommendationGroups.set(normalized, list);
    });

    const result = new Map<string, ProductOption[]>();

    const buildOptions = (item: RoutineItem, candidates: AnalysisRecommendation[]) => {
      const primary = candidates[0];
      const second = candidates[1];
      const third = candidates[2];
      return [
        {
          key: `${item.key}::best`,
          label: "Melhor recomendacao",
          productName: primary?.product ?? item.title,
          reason: primary?.reason ?? item.note,
          imageUrl: primary?.imageUrl ?? item.imageUrl,
        },
        {
          key: `${item.key}::second`,
          label: "2a melhor opcao",
          productName: second?.product ?? primary?.product ?? item.title,
          reason: second?.reason ?? "Alternativa para o mesmo passo da rotina.",
          imageUrl: second?.imageUrl ?? primary?.imageUrl ?? item.imageUrl,
        },
        {
          key: `${item.key}::budget`,
          label: "3a custo-beneficio",
          productName: third?.product ?? second?.product ?? primary?.product ?? item.title,
          reason: third?.reason ?? "Opcao com bom equilibrio entre resultado e custo.",
          imageUrl: third?.imageUrl ?? second?.imageUrl ?? primary?.imageUrl ?? item.imageUrl,
        },
      ];
    };

    routineItems.morning.forEach((item) => {
      const candidates = recommendationGroups.get(normalizeCategory(item.type)) ?? [];
      result.set(item.key, buildOptions(item, candidates));
    });

    routineItems.night.forEach((item) => {
      const nightTypeKey = normalizeCategory(item.type);
      const linkedMorning = routineItems.morning.find(
        (m) => normalizeCategory(m.type) === nightTypeKey && !isExtraItem(m)
      );
      if (linkedMorning && !isExtraItem(item)) {
        const morningOpts = result.get(linkedMorning.key) ?? [];
        result.set(item.key, morningOpts.map((opt) => ({
          ...opt,
          key: `${item.key}::${opt.key.split("::").pop()}`,
        })));
      } else {
        const candidates = recommendationGroups.get(nightTypeKey) ?? [];
        result.set(item.key, buildOptions(item, candidates));
      }
    });

    return result;
  }, [analysis?.recommendations, routineItems.morning, routineItems.night]);

  // Mapa simples de recomendações por produto/tipo (como Results faz)
  const recommendationMap = useMemo(() => {
    const map = {
      byProduct: new Map<string, AnalysisRecommendation>(),
      byType: new Map<string, AnalysisRecommendation[]>(),
    };
    
    const recommendations = loadedAnalysis?.recommendations ?? analysis?.recommendations ?? [];

    recommendations.forEach((item) => {
      if (item.product) {
        map.byProduct.set(item.product.toLowerCase(), item);
      }
      if (item.type) {
        const typeList = map.byType.get(item.type.toLowerCase()) ?? [];
        typeList.push(item);
        map.byType.set(item.type.toLowerCase(), typeList);
      }
    });

    return map;
  }, [analysis?.recommendations, loadedAnalysis?.recommendations]);

  const getRecommendationForStep = (item: RoutineItem): AnalysisRecommendation | undefined => {
    // Trata por produto primeiro (como Results)
    let rec = recommendationMap.byProduct.get(item.title.toLowerCase());
    
    if (!rec) {
      const typeRecs = recommendationMap.byType.get(item.type.toLowerCase());
      if (typeRecs?.length) rec = typeRecs[0];
    }
    
    return rec;
  };

  // Admin state
  const { isAdmin } = useIsAdmin();
  const [adminEditingItem, setAdminEditingItem] = useState<string | null>(null);
  const [adminMatchedProduct, setAdminMatchedProduct] = useState<AdminProduct | null>(null);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminUploadingImage, setAdminUploadingImage] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminImagePreview, setAdminImagePreview] = useState<string | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const openAdminEdit = async (item: RoutineItem) => {
    setAdminEditingItem(item.key);
    setAdminMatchedProduct(null);
    setAdminImagePreview(null);
    setAdminSearching(true);
    try {
      const results = await searchAdminProducts(getDisplayProductName(item));
      const match = results.find(
        (p) => p.name.toLowerCase() === getDisplayProductName(item).toLowerCase()
      ) ?? results[0] ?? null;
      setAdminMatchedProduct(match);
      setAdminImagePreview(match?.imageUrl ?? null);
    } catch {
      setAdminMatchedProduct(null);
    } finally {
      setAdminSearching(false);
    }
  };

  const handleAdminFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAdminImagePreview(preview);
    setAdminUploadingImage(true);
    try {
      const currentUser = await getCurrentUser();
      const url = await uploadProductImage(file, currentUser?.id);
      setAdminImagePreview(url);
      setAdminMatchedProduct((prev) => prev ? { ...prev, imageUrl: url } : null);
    } catch {
      setAdminImagePreview(adminMatchedProduct?.imageUrl ?? null);
    } finally {
      setAdminUploadingImage(false);
    }
  };

  const handleAdminSave = async () => {
    if (!adminMatchedProduct?.id || !adminMatchedProduct.imageUrl) return;
    setAdminSaving(true);
    try {
      await patchAdminProductImage(adminMatchedProduct.id, adminMatchedProduct.imageUrl);
      setAdminEditingItem(null);
    } catch {
      // silently fail — user can retry
    } finally {
      setAdminSaving(false);
    }
  };

  const [addStepOpen, setAddStepOpen] = useState(false);
  const [newStepPeriod, setNewStepPeriod] = useState<"morning" | "night" | "both">("both");
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepLabelOpen, setNewStepLabelOpen] = useState(false);
  const [newStepProduct, setNewStepProduct] = useState("");
  const [newStepProductSearch, setNewStepProductSearch] = useState("");
  const [newStepProductOpen, setNewStepProductOpen] = useState(false);
  const [newStepProductFromCatalog, setNewStepProductFromCatalog] = useState(false);
  const [newStepImage, setNewStepImage] = useState("");
  const [newStepNote, setNewStepNote] = useState("");
  const [newStepUploadingImage, setNewStepUploadingImage] = useState(false);
  const newStepFileInputRef = useRef<HTMLInputElement>(null);
  const [catalogProductsByCategory, setCatalogProductsByCategory] = useState<AdminProduct[]>([]);

  const getCategoryDefaultPeriod = (cat: string): "morning" | "night" | "both" => {
    const n = cat.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");
    if (n.includes("protetor") || n.includes("solar") || n.includes("fps")) return "morning";
    return "both";
  };

  const handleCategorySelect = async (cat: string) => {
    setNewStepLabel(cat);
    setNewStepLabelOpen(false);
    setNewStepPeriod(getCategoryDefaultPeriod(cat));
    setNewStepProduct("");
    setNewStepProductSearch("");
    setNewStepProductFromCatalog(false);
    setNewStepImage("");
    try {
      const results = await searchAdminProducts(cat);
      setCatalogProductsByCategory(
        results.filter((p) =>
          p.category.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(p.category.toLowerCase())
        ).slice(0, 10)
      );
    } catch { setCatalogProductsByCategory([]); }
  };

  const [customSteps, setCustomSteps] = useState<CustomStep[]>(() => {
    try {
      const raw = localStorage.getItem(getCustomStepsStorageKey(analysis?.id));
      return raw ? (JSON.parse(raw) as CustomStep[]) : [];
    } catch {
      return [];
    }
  });

  const [routineOrder, setRoutineOrder] = useState<{ morning: string[]; night: string[] }>(() => {
    try {
      const raw = localStorage.getItem(getRoutineOrderStorageKey(analysis?.id));
      return raw ? JSON.parse(raw) : { morning: [], night: [] };
    } catch {
      return { morning: [], night: [] };
    }
  });

  const persistCustomSteps = (next: CustomStep[]) => {
    setCustomSteps(next);
    localStorage.setItem(getCustomStepsStorageKey(analysis?.id), JSON.stringify(next));
  };

  const persistRoutineOrder = (next: { morning: string[]; night: string[] }) => {
    setRoutineOrder(next);
    localStorage.setItem(getRoutineOrderStorageKey(analysis?.id), JSON.stringify(next));
  };

  const addCustomStep = async () => {
    if (!newStepProduct.trim() || !analysis?.id) return;
    const resolvedLabel = newStepLabel.trim() || "Passo";
    const productName = newStepProduct.trim();
    const imageUrl = newStepImage.trim() || undefined;
    const periods: Array<"morning" | "night"> =
      newStepPeriod === "both" ? ["morning", "night"] : [newStepPeriod];

    await Promise.all(periods.map((p) =>
      addRoutineStep(analysis.id, { period: p, productName, category: resolvedLabel, imageUrl, recurrence: "daily" })
    ));

    // Produto digitado manualmente → salvar em "Meus Produtos" automaticamente
    if (!newStepProductFromCatalog && productName) {
      try {
        await createMyProduct({ name: productName, category: resolvedLabel, imageUrl }, userId);
      } catch { /* ignora — passo já foi salvo */ }
    }

    await reloadApiSteps();
    invalidateAnalysisCache();

    // Reset completo — evita herdar imagem do passo anterior
    setNewStepPeriod("both");
    setNewStepLabel("");
    setNewStepLabelOpen(false);
    setNewStepProduct("");
    setNewStepProductSearch("");
    setNewStepProductFromCatalog(false);
    setNewStepImage("");
    setNewStepNote("");
    setCatalogProductsByCategory([]);
    setAddStepOpen(false);
  };

  const handleNewStepFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewStepUploadingImage(true);
    try {
      const currentUser = await getCurrentUser();
      const url = await uploadProductImage(file, currentUser?.id);
      setNewStepImage(url);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    } finally {
      setNewStepUploadingImage(false);
    }
  };

  const removeCustomStep = (id: string) => {
    persistCustomSteps(customSteps.filter((s) => s.id !== id));
  };

  const changeCustomStepPeriod = (id: string, newPeriod: "morning" | "night" | "both") => {
    const step = customSteps.find((s) => s.id === id);
    if (!step) return;
    const siblingId = step.id.replace(/^custom::(morning|night)::/, (_, p) =>
      `custom::${p === "morning" ? "night" : "morning"}`
    );
    const hasSibling = customSteps.some((s) => s.id === siblingId);
    if (newPeriod === "both") {
      if (hasSibling) return;
      const sibling: CustomStep = {
        ...step,
        id: siblingId,
        period: step.period === "morning" ? "night" : "morning",
      };
      persistCustomSteps([...customSteps, sibling]);
    } else {
      const filtered = customSteps.filter((s) => s.id !== siblingId);
      persistCustomSteps(filtered.map((s) =>
        s.id === id ? { ...s, period: newPeriod } : s
      ));
    }
  };

  const moveStep = async (period: "morning" | "night", key: string, direction: "up" | "down") => {
    const items = orderedItems[period];
    const keys = items.map((i) => i.key);
    const idx = keys.indexOf(key);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === keys.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const next = [...keys];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    // Atualiza ordem local para resposta imediata
    persistRoutineOrder({ ...routineOrder, [period]: next });
    // Persiste ordem no banco via API
    if (analysis?.id) {
      const periodSteps = apiSteps.filter((s) => s.period === period);
      const stepByKey = new Map(periodSteps.map((s) => [`${s.period}::${s.productName.toLowerCase()}`, s.id]));
      const orderedIds = next.map((k) => stepByKey.get(k)).filter((id): id is string => !!id);
      if (orderedIds.length > 0) {
        reorderApiSteps(period, orderedIds);
      }
    }
  };

  const confirmDeleteStep = async () => {
    if (!stepPendingDelete || !analysis?.id) return;

    setIsDeletingStep(true);
    try {
      // Try new structured steps API first (UUID step IDs from analysis_routine_steps)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stepPendingDelete.id);
      if (isUuid) {
        await deleteApiStep(stepPendingDelete.id);
      } else {
        // Legacy: localStorage custom step (old format `custom::period::timestamp`)
        removeCustomStep(stepPendingDelete.id);
      }
      invalidateAnalysisCache();
    } catch (error) {
      console.error("[Routine] Erro ao deletar passo:", error);
      removeCustomStep(stepPendingDelete.id);
    } finally {
      setStepPendingDelete(null);
      setIsDeletingStep(false);
    }
  };

  const orderedItems = useMemo(() => {
    const toOrdered = (period: "morning" | "night") => {
      const base = routineItems[period].filter((i) => !isExtraItem(i));
      // When API steps are loaded, custom steps are already in routineItems (via apiUserAddedByPeriod)
      // Only add localStorage customSteps if API hasn't loaded yet
      const customs: RoutineItem[] = stepsLoaded ? [] : customSteps
        .filter((s) => s.period === period)
        .map((s, idx) => ({
          key: s.id,
          period,
          stepNumber: base.length + idx + 1,
          stepLabel: s.stepLabel,
          title: s.productName,
          type: s.stepLabel,
          recurrence: "daily",
          note: s.note ?? "",
          imageUrl: s.imageUrl,
          isCustom: true,
        }));
      const all = [...base, ...customs];
      const order = routineOrder[period];
      // Deduplicate all by key before ordering
      const deduped = (() => {
        const seen = new Set<string>();
        return all.filter((i) => { if (seen.has(i.key)) return false; seen.add(i.key); return true; });
      })();
      if (!order || order.length === 0) {
        return deduped.map((item, idx) => ({ ...item, stepNumber: idx + 1 }));
      }
      const keyMap = new Map(deduped.map((i) => [i.key, i]));
      const ordered = order.filter((k) => keyMap.has(k)).map((k) => keyMap.get(k)!);
      const added = deduped.filter((i) => !order.includes(i.key));
      return [...ordered, ...added].map((item, idx) => ({ ...item, stepNumber: idx + 1 }));
    };
    return { morning: toOrdered("morning"), night: toOrdered("night") };
  }, [routineItems, customSteps, routineOrder, stepsLoaded]);

  const [extrasOpen, setExtrasOpen] = useState(false);
  const [enabledExtrasByItem, setEnabledExtrasByItem] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    routineItems.all.forEach((item) => {
      if (isExtraItem(item)) {
        initial[item.key] = false;
      }
    });
    return initial;
  });

  const [productSchedule, setProductSchedule] = useState<ProductSchedule>(() => {
    // checkedByDayItem continua em localStorage (tracking diário, Sprint 5 vai migrar para DB)
    const storageKey = getScheduleStorageKey(analysis?.id);
    const raw = localStorage.getItem(storageKey);
    const parsed = (() => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } })();
    const checkedByDayItem = (parsed?.checkedByDayItem as Record<string, boolean>) ?? {};
    // daysByItem: inicia com todos os dias (apiSteps serão a fonte após carregamento)
    const itemKeys = routineItems.all.map((item) => item.key);
    const daysByItem: Record<string, WeekDayKey[]> = {};
    itemKeys.forEach((k) => { daysByItem[k] = [...allDays]; });
    return { daysByItem, checkedByDayItem };
  });

  // Sincroniza daysByItem dos apiSteps para productSchedule quando steps carregam
  useEffect(() => {
    if (!stepsLoaded || apiSteps.length === 0) return;
    setProductSchedule((prev) => {
      const daysByItem = { ...prev.daysByItem };
      apiSteps.forEach((s) => {
        const key = `${s.period}::${s.productName.toLowerCase()}`;
        try {
          const days = JSON.parse(s.scheduleDays ?? "[]") as WeekDayKey[];
          if (days.length > 0) daysByItem[key] = days;
        } catch { /* mantém valor atual */ }
      });
      return { ...prev, daysByItem };
    });
  }, [stepsLoaded, apiSteps]);

  const persistSchedule = (next: ProductSchedule) => {
    setProductSchedule(next);
    // Persiste checkedByDayItem em localStorage (tracking diário temporário até Sprint 5)
    localStorage.setItem(getScheduleStorageKey(analysis?.id), JSON.stringify(next));
    // Persiste daysByItem nos steps estruturados via PATCH
    if (analysis?.id && apiSteps.length > 0) {
      const stepByKey = new Map(apiSteps.map((s) => [`${s.period}::${s.productName.toLowerCase()}`, s]));
      Object.entries(next.daysByItem).forEach(([itemKey, days]) => {
        const step = stepByKey.get(itemKey.toLowerCase());
        if (step) {
          updateRoutineStep(analysis.id, step.id, { scheduleDays: JSON.stringify(days) });
        }
      });
    }
  };

  const autoAdvanceRef = useRef<string | null>(null);
  const markedCompleteRef = useRef<Set<string>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekKeys: WeekDayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const shortLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        dateStr: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
        dayNum: i + 1,
        weekKey: weekKeys[d.getDay()],
        shortLabel: shortLabels[d.getDay()],
      };
    });
  }, []);

  const selectedWeekDay = useMemo<WeekDayKey>(() => {
    const found = calendarDays.find((d) => d.dateStr === selectedDay);
    return found?.weekKey ?? "mon";
  }, [selectedDay, calendarDays]);

  const completedDaysStatus = useMemo(() => {
    const result = new Map<string, "full" | "partial">();
    for (const d of calendarDays) {
      const scheduled = (itemKey: string) => (productSchedule.daysByItem[itemKey] ?? allDays).includes(d.weekKey);
      const morningItems = orderedItems.morning.filter(
        (item) => (!isExtraItem(item) || enabledExtrasByItem[item.key]) && scheduled(item.key)
      );
      const nightItems = orderedItems.night.filter(
        (item) => (!isExtraItem(item) || enabledExtrasByItem[item.key]) && scheduled(item.key)
      );
      const morningDone = morningItems.length > 0 && morningItems.every(
        (item) => productSchedule.checkedByDayItem[`${d.dateStr}::${item.key}`]
      );
      const nightDone = nightItems.length > 0 && nightItems.every(
        (item) => productSchedule.checkedByDayItem[`${d.dateStr}::${item.key}`]
      );
      if (morningDone && nightDone) {
        result.set(d.dateStr, "full");
      } else if (morningDone || nightDone) {
        result.set(d.dateStr, "partial");
      }
    }
    return result;
  }, [calendarDays, orderedItems, productSchedule, enabledExtrasByItem]);

  const isFutureDay = selectedDay > todayStr;

  // Registra conclusão de step no DB (fire-and-forget, não bloqueia UI)
  const persistStepCompletion = async (itemKey: string) => {
    const step = apiSteps.find(
      (s) => `${s.period}::${s.productName.toLowerCase()}` === itemKey.toLowerCase()
    );
    if (!step) return;
    try {
      const { getAccessTokenWithWait } = await import("@/lib/auth");
      const token = await getAccessTokenWithWait(3000);
      if (!token) return;
      fetch(`${apiBaseUrl}/routine/steps/${step.id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ localDate: todayStr }),
      });
    } catch { /* ignora — localStorage já persistiu */ }
  };

  const toggleChecklist = (itemKey: string) => {
    if (isFutureDay) return;
    const key = `${selectedDay}::${itemKey}`;
    const wasChecked = !!productSchedule.checkedByDayItem[key];
    persistSchedule({
      ...productSchedule,
      checkedByDayItem: {
        ...productSchedule.checkedByDayItem,
        [key]: !wasChecked,
      },
    });
    // Persiste no DB apenas ao marcar (não ao desmarcar)
    if (!wasChecked && selectedDay === todayStr) {
      persistStepCompletion(itemKey);
    }
  };

  const toggleProductDay = (itemKey: string, day: WeekDayKey) => {
    const current = productSchedule.daysByItem[itemKey] ?? [...allDays];
    const exists = current.includes(day);
    const nextDays = exists ? current.filter((value) => value !== day) : [...current, day];

    persistSchedule({
      ...productSchedule,
      daysByItem: {
        ...productSchedule.daysByItem,
        [itemKey]: nextDays.length ? nextDays : [day],
      },
    });
  };

  const isScheduledForDay = (itemKey: string, day: WeekDayKey) =>
    (productSchedule.daysByItem[itemKey] ?? allDays).includes(day);

  const getProductCheckKey = (itemKey: string, day: string) => `${day}::${itemKey}`;

  const getSelectedOption = useMemo(() => (item: RoutineItem): ProductOption => {
    const options = productOptionsByItem.get(item.key) ?? [];
    const selectedKey = selectedOptionByItem[item.key] ?? options[0]?.key;
    return options.find((option) => option.key === selectedKey) ?? options[0] ?? {
      key: `${item.key}::fallback`,
      label: "Melhor recomendacao",
      productName: item.title,
      reason: item.note,
      imageUrl: item.imageUrl,
    };
  }, [productOptionsByItem, selectedOptionByItem]);

  const resolvedProductByItem = useMemo(() => {
    const resolved = new Map<string, ResolvedProduct>();

    routineItems.morning.forEach((item) => {
      if (customProductByItem[item.key]) {
        resolved.set(item.key, {
          productName: customProductByItem[item.key].name,
          reason: "Meu produto cadastrado.",
          imageUrl: customProductByItem[item.key].imageUrl || item.imageUrl,
        });
        return;
      }

      const selected = getSelectedOption(item);
      resolved.set(item.key, {
        productName: selected.productName,
        reason: selected.reason || item.note,
        imageUrl: selected.imageUrl || item.imageUrl,
      });
    });

    routineItems.night.forEach((item) => {
      if (customProductByItem[item.key]) {
        resolved.set(item.key, {
          productName: customProductByItem[item.key].name,
          reason: "Meu produto cadastrado.",
          imageUrl: customProductByItem[item.key].imageUrl || item.imageUrl,
        });
        return;
      }

      const hasNightOverride = Boolean(selectedOptionByItem[item.key]);
      const nightTypeKey = getRoutineTypeKey(item);
      const linkedMorning = orderedItems.morning.find((morningItem) => getRoutineTypeKey(morningItem) === nightTypeKey);

      if (linkedMorning && !isExtraItem(item) && !hasNightOverride) {
        const linkedResolved = resolved.get(linkedMorning.key);
        if (linkedResolved) {
          resolved.set(item.key, {
            ...linkedResolved,
            reason: `${linkedResolved.reason || "Mesmo produto da manha."} Mesmo produto usado na rotina da manhã por padrao.`,
          });
          return;
        }
      }

      const selected = getSelectedOption(item);
      resolved.set(item.key, {
        productName: selected.productName,
        reason: selected.reason || item.note,
        imageUrl: selected.imageUrl || item.imageUrl,
      });
    });

    return resolved;
  }, [customProductByItem, getSelectedOption, orderedItems.morning, routineItems.morning, routineItems.night, selectedOptionByItem]);

  const selectedProductsSet = useMemo(() => {
    const set = new Set<string>();
    resolvedProductByItem.forEach((resolved) => set.add(resolved.productName.toLowerCase()));
    return set;
  }, [resolvedProductByItem]);

  const selectedProductsByPeriod = useMemo(() => {
    return {
      morning: new Set(
        orderedItems.morning
          .map((item) => resolvedProductByItem.get(item.key)?.productName.toLowerCase())
          .filter((name): name is string => !!name)
      ),
      night: new Set(
        orderedItems.night
          .map((item) => resolvedProductByItem.get(item.key)?.productName.toLowerCase())
          .filter((name): name is string => !!name)
      ),
    };
  }, [resolvedProductByItem, orderedItems]);

  useEffect(() => {
    localStorage.setItem(getSelectionStorageKey(analysis?.id), JSON.stringify(selectedOptionByItem));
    // Sync tier selections to API steps
    if (!analysis?.id || apiSteps.length === 0) return;
    Object.entries(selectedOptionByItem).forEach(([itemKey, selectionKey]) => {
      const tier = selectionKey.split("::").pop() as "best" | "second" | "budget" | undefined;
      if (!tier || !["best", "second", "budget"].includes(tier)) return;
      const step = apiSteps.find(
        (s) => `${s.period}::${s.productName.toLowerCase()}` === itemKey
      );
      if (step && step.selectedTier !== tier) {
        updateRoutineStep(analysis.id, step.id, { selectedTier: tier });
      }
    });
  }, [analysis?.id, selectedOptionByItem, apiSteps]);

  useEffect(() => {
    if (!analysis?.id) return;
    const displayNames: Record<string, string> = {};
    resolvedProductByItem.forEach((resolved, itemKey) => {
      displayNames[itemKey] = resolved.productName;
    });
    localStorage.setItem(getDisplayStorageKey(analysis.id), JSON.stringify(displayNames));
  }, [analysis?.id, resolvedProductByItem]);

  const getAvailableOptions = (item: RoutineItem, period: "morning" | "night"): ProductOption[] => {
    const options = productOptionsByItem.get(item.key) ?? [];
    const uniqueByName = new Map<string, ProductOption>();

    options.forEach((option) => {
      const nameKey = option.productName.toLowerCase();
      if (!uniqueByName.has(nameKey)) {
        uniqueByName.set(nameKey, option);
      }
    });

    const resolved = resolvedProductByItem.get(item.key);
    const currentName = resolved?.productName.toLowerCase() ?? "";
    const periodProducts = selectedProductsByPeriod[period];

    const filtered = [...uniqueByName.values()].filter((option) => {
      const nameKey = option.productName.toLowerCase();
      if (nameKey === currentName) {
        return true;
      }
      return !periodProducts.has(nameKey);
    });

    if (filtered.length > 0) {
      return filtered;
    }

    return [...uniqueByName.values()];
  };

  const activePeriodItems = selectedPeriod === "morning" ? orderedItems.morning : orderedItems.night;
  const visiblePeriodItems = activePeriodItems.filter((item) => isScheduledForDay(item.key, selectedWeekDay));
  const coreItems = visiblePeriodItems.filter((item) => !isExtraItem(item));
  // Extras: from routineItems directly (orderedItems is core-only), deduped, not overlapping with core
  const extraItems = (() => {
    const coreKeys = new Set(orderedItems[selectedPeriod].map((i) => i.key));
    const coreTitles = new Set(orderedItems[selectedPeriod].map((i) => normalizeCategory(i.title)));
    const raw = (selectedPeriod === "morning" ? routineItems.morning : routineItems.night).filter(isExtraItem);
    const seenKeys = new Set<string>();
    const seenTitles = new Set<string>();
    return raw.filter((i) => {
      const normTitle = normalizeCategory(i.title);
      if (seenKeys.has(i.key)) return false;
      if (seenTitles.has(normTitle)) return false;
      seenKeys.add(i.key);
      seenTitles.add(normTitle);
      if (coreKeys.has(i.key)) return false;
      if (coreTitles.has(normTitle)) return false;
      return true;
    }).filter((item) => isScheduledForDay(item.key, selectedWeekDay));
  })();
  const enabledExtraItems = extraItems.filter((item) => enabledExtrasByItem[item.key]);
  const activeChecklistItems = [...coreItems, ...enabledExtraItems];

  const allPeriodItems = selectedPeriod === "morning" ? orderedItems.morning : orderedItems.night;

  const completedInVisible = activeChecklistItems.filter(
    (item) => productSchedule.checkedByDayItem[getProductCheckKey(item.key, selectedDay)],
  ).length;
  const completionPercent = activeChecklistItems.length
    ? Math.round((completedInVisible / activeChecklistItems.length) * 100)
    : 0;
  const isRoutineComplete = activeChecklistItems.length > 0 && completedInVisible === activeChecklistItems.length;
  const completionBanner =
    isRoutineComplete && selectedPeriod === "morning"
      ? "Rotina da manhã concluida!"
      : isRoutineComplete && selectedPeriod === "night"
        ? "Você concluiu suas rotinas do dia! Sua pele agradece"
        : null;

  useEffect(() => {
    const total = activeChecklistItems.length;
    if (!total || completedInVisible < total) {
      autoAdvanceRef.current = null;
      return;
    }

    const flowKey = `${selectedDay}:${selectedPeriod}:${total}:${completedInVisible}`;
    if (autoAdvanceRef.current === flowKey) {
      return;
    }

    autoAdvanceRef.current = flowKey;
    return;
  }, [activeChecklistItems.length, completedInVisible, navigate, routineItems.night.length, selectedDay, selectedPeriod]);

  useEffect(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current.querySelector<HTMLElement>(`[data-date="${selectedDay}"]`);
    if (!el) return;
    const carousel = carouselRef.current;
    const elLeft = el.offsetLeft;
    const elWidth = el.offsetWidth;
    const containerWidth = carousel.clientWidth;
    carousel.scrollTo({ left: elLeft - containerWidth / 2 + elWidth / 2, behavior: "smooth" });
  }, [selectedDay, calendarDays]);

  // Marcar rotina completa no backend quando completa
  useEffect(() => {
    if (!isRoutineComplete) {
      return;
    }

    // Apenas marcar se é hoje
    if (selectedDay !== todayStr) {
      return;
    }

    // Guard: evita marcar o mesmo período 2x
    const markKey = `${selectedDay}::${selectedPeriod}`;
    if (markedCompleteRef.current.has(markKey)) {
      return;
    }
    markedCompleteRef.current.add(markKey);

    markComplete(selectedPeriod, todayStr).then((ok) => {
      if (ok && selectedPeriod === "morning") {
        setIsAdvancingToNight(true);
        setTimeout(() => {
          setSelectedPeriod("night");
          setIsAdvancingToNight(false);
        }, 1600);
      } else if (!ok) {
        markedCompleteRef.current.delete(markKey);
      }
    });
  }, [isRoutineComplete, selectedDay, selectedPeriod, todayStr]);

  const getDisplayProductName = (item: RoutineItem) => {
    // Primeiro tenta produto customizado ou selecionado (resolvedProductByItem, que fica atualizado)
    const resolved = resolvedProductByItem.get(item.key);
    if (resolved?.productName) {
      return resolved.productName;
    }
    // Fallback: recomendação ou título original
    const rec = getRecommendationForStep(item);
    return rec?.product || item.title;
  };

  const getDisplayReason = (item: RoutineItem) => {
    // Prioritize resolved product (updated when user selects different option)
    const resolved = resolvedProductByItem.get(item.key);
    if (resolved?.reason) {
      return resolved.reason;
    }
    const rec = getRecommendationForStep(item);
    return rec?.reason || item.note;
  };

  const getDisplayImage = (item: RoutineItem) => {
    // IMPORTANTE: usar resolvedProductByItem que fica atualizado quando produto é selecionado
    const resolved = resolvedProductByItem.get(item.key);
    const imageUrl = resolved?.imageUrl;
    
    return imageUrl || fallbackCardImage;
  };



  const saveCustomProduct = (itemKey: string) => {
    const name = (customInputByItem[itemKey] || "").trim();
    if (!name) return;
    const imageUrl = (customImageInputByItem[itemKey] || "").trim() || undefined;
    const next = { ...customProductByItem, [itemKey]: { name, imageUrl } };
    setCustomProductByItem(next);
    setCustomInputByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
    setCustomImageInputByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
    // Persiste override no step estruturado
    if (analysis?.id) {
      const step = apiSteps.find((s) => `${s.period}::${s.productName.toLowerCase()}` === itemKey.toLowerCase());
      if (step) {
        updateRoutineStep(analysis.id, step.id, {
          overrideProductName: name,
          overrideImageUrl: imageUrl ?? null,
        });
      }
    }
  };

  const clearCustomProduct = (itemKey: string) => {
    const next = { ...customProductByItem };
    delete next[itemKey];
    setCustomProductByItem(next);
    // Remove override do step estruturado
    if (analysis?.id) {
      const step = apiSteps.find((s) => `${s.period}::${s.productName.toLowerCase()}` === itemKey.toLowerCase());
      if (step) {
        updateRoutineStep(analysis.id, step.id, { overrideProductName: null, overrideImageUrl: null });
      }
    }
  };

  const saveCustomProductFromCatalog = (itemKey: string, productName: string, imageUrl?: string) => {
    const next = { ...customProductByItem, [itemKey]: { name: productName, imageUrl } };
    setCustomProductByItem(next);
    setCatalogSearchByItem((prev) => ({ ...prev, [itemKey]: "" }));
    setCatalogSearchOpenByItem((prev) => ({ ...prev, [itemKey]: false }));
    // Persiste override no step estruturado
    if (analysis?.id) {
      const step = apiSteps.find((s) => `${s.period}::${s.productName.toLowerCase()}` === itemKey.toLowerCase());
      if (step) {
        updateRoutineStep(analysis.id, step.id, { overrideProductName: productName, overrideImageUrl: imageUrl ?? null });
      }
    }
  };

  // Product selection: Save or Cancel
  const saveProductSelection = (itemKey: string) => {
    const optionKey = pendingOptionByItem[itemKey];
    if (optionKey) {
      const scope = pendingScopeByItem[itemKey] ?? "both";
      const currentPeriod = itemKey.startsWith("night::") ? "night" : "morning";
      const otherPeriod = currentPeriod === "morning" ? "night" : "morning";
      const currentItem = orderedItems[currentPeriod].find((i) => i.key === itemKey);
      const currentTypeKey = currentItem ? getRoutineTypeKey(currentItem) : null;
      const counterpartItem = currentTypeKey
        ? orderedItems[otherPeriod].find((i) => getRoutineTypeKey(i) === currentTypeKey && !isExtraItem(i))
        : null;
      const otherKey = counterpartItem?.key ?? null;

      setSelectedOptionByItem((prev) => {
        const suffix = optionKey.split("::").pop() ?? "best";
        const next = { ...prev, [itemKey]: optionKey };
        if (scope === "both" && otherKey) next[otherKey] = `${otherKey}::${suffix}`;
        return next;
      });
    }
    setSelectingProductItem(null);
    setPendingOptionByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
    setPendingScopeByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
  };

  const cancelProductSelection = (itemKey: string) => {
    setSelectingProductItem(null);
    setPendingOptionByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
    setPendingScopeByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
  };

  const handleCustomProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImageByItem((prev) => ({ ...prev, [itemKey]: true }));
    setImageUploadErrorByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
    
    try {
      const currentUser = await getCurrentUser();
      const url = await uploadProductImage(file, currentUser?.id);
      setCustomImageInputByItem((prev) => ({ ...prev, [itemKey]: url }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao fazer upload da imagem";
      setImageUploadErrorByItem((prev) => ({ ...prev, [itemKey]: errorMsg }));
      console.error("Erro ao fazer upload de imagem do produto:", error);
    } finally {
      setUploadingImageByItem((prev) => { const p = { ...prev }; delete p[itemKey]; return p; });
    }
  };

  const editAllItems = useMemo(() => {
    const items = selectedPeriod === "morning" ? orderedItems.morning : orderedItems.night;
    const label = selectedPeriod === "morning" ? "Manhã" as const : "Noite" as const;
    return items.map((i) => ({ ...i, _periodLabel: label }));
  }, [orderedItems.morning, orderedItems.night, selectedPeriod]);

  const pastelColors = [
    "#FEF3EE", // peach
    "#F0FDF4", // mint
    "#EFF6FF", // sky
    "#FEF9EE", // yellow
    "#F5F0FF", // lavender
    "#FFEFF7", // pink
  ];

  return (
    <div
      className="relative w-full min-h-screen pb-24 overflow-hidden"
      style={{ background: "var(--grad-aurora)" }}
    >
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* Banner de transição manhã → noite */}
      {isAdvancingToNight && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg"
          style={{ background: "linear-gradient(135deg, #9aa8dc, #6366f1)", color: "white" }}
        >
          <Moon size={15} />
          <span className="text-sm font-semibold">Ótimo! Partindo para a rotina da noite…</span>
        </motion.div>
      )}

      {stepPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-destructive" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">Deletar passo?</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tem certeza que deseja remover <span className="font-semibold text-foreground">"{stepPendingDelete.name}"</span> da sua rotina?
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStepPendingDelete(null)}
                  disabled={isDeletingStep}
                  className="flex-1 h-10 rounded-xl border border-border/60 bg-background text-foreground font-semibold text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteStep}
                  disabled={isDeletingStep}
                  className="flex-1 h-10 rounded-xl bg-destructive text-white font-semibold text-sm transition-colors hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingStep && <Loader2 size={14} className="animate-spin" />}
                  {isDeletingStep ? "Deletando..." : "Deletar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pb-4 pt-5">
        <div className="lg-surface-strong mx-auto max-w-md rounded-[1.75rem] p-3">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-[var(--fg-ink)]" />
          </button>
          <h1 className="text-lg font-bold text-[var(--fg-ink)] tracking-tight">Rotina Diaria</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/meus-produtos")}
            className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center transition-colors"
              aria-label="Meus Produtos"
            >
              <PackageOpen size={16} className="text-[var(--fg-ink)]" />
            </button>
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showCalendar ? "coral-button" : "liquiglass-button"}`}
              aria-label="Abrir calendário"
            >
              <CalendarDays size={16} className={showCalendar ? "text-white" : "text-[var(--fg-ink)]"} />
            </button>
          </div>
        </div>

        {/* Date Carousel */}
        <div ref={carouselRef} className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {calendarDays.map((day) => {
            const active = selectedDay === day.dateStr;
            const isToday = day.dateStr === todayStr;
            const dayStatus = completedDaysStatus.get(day.dateStr);
            const isMorning = selectedPeriod === "morning";
            return (
              <button
                key={day.dateStr}
                data-date={day.dateStr}
                onClick={() => {
                  if (day.dateStr > todayStr) {
                    setShakingDay(day.dateStr);
                    setTimeout(() => {
                      setShakingDay(null);
                      setSelectedDay(todayStr);
                    }, 500);
                    return;
                  }
                  setSelectedDay(day.dateStr);
                }}
                className="flex flex-col items-center gap-1 flex-shrink-0 transition-all relative"
                style={{
                  opacity: day.dateStr > todayStr ? 0.4 : 1,
                  ...(shakingDay === day.dateStr ? { animation: "shake 0.4s ease-in-out" } : {}),
                }}
              >
                <span className="text-[10px] font-medium" style={{ color: "#9CA3AF" }}>{day.shortLabel}</span>
                <span
                  className="rounded-full flex items-center justify-center font-bold transition-all"
                  style={{
                    width: active ? 52 : 44,
                    height: active ? 52 : 44,
                    fontSize: active ? 16 : 14,
                    ...(active ? {
                      background: "var(--grad-coral)",
                      color: "#fff",
                      boxShadow: "var(--shadow-glow)",
                    } : isToday ? {
                      backgroundColor: "rgba(255,255,255,0.7)",
                      color: "hsl(var(--primary))",
                      border: "1.5px solid hsl(var(--primary) / 0.45)",
                    } : {
                      backgroundColor: "#fff",
                      color: "#9CA3AF",
                      border: "1.5px solid #F0EDE8",
                    }),
                  }}
                >
                  {day.dayNum}
                </span>
                {dayStatus === "full" && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#22C55E" }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                )}
                {dayStatus === "partial" && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F59E0B" }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M4.5 2V4.5M4.5 6.5V7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* Full Calendar Modal */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCalendar(false); }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="lg-surface-strong w-full max-w-sm rounded-[1.75rem] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--fg-ink)]">
                {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase())}
              </h2>
              <button onClick={() => setShowCalendar(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F5F5F5" }}>
                <X size={14} style={{ color: "#6B7280" }} />
              </button>
            </div>
            {/* Weekday header */}
            <div className="grid grid-cols-7 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold" style={{ color: "#9CA3AF" }}>{d}</div>
              ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {/* Leading empty cells for first weekday offset */}
              {Array.from({ length: calendarDays[0]?.dateStr ? new Date(calendarDays[0].dateStr + "T00:00:00").getDay() : 0 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {calendarDays.map((day) => {
                const active = selectedDay === day.dateStr;
                const isToday = day.dateStr === todayStr;
                const calDayStatus = completedDaysStatus.get(day.dateStr);
                const isFuture = day.dateStr > todayStr;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => {
                      if (isFuture) return;
                      setSelectedDay(day.dateStr);
                      setShowCalendar(false);
                    }}
                    className="flex flex-col items-center justify-center py-1 relative"
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={active ? {
                        background: "var(--grad-coral)",
                        color: "#fff",
                        boxShadow: "var(--shadow-glow)",
                      } : isToday ? {
                        backgroundColor: "rgba(255,255,255,0.7)",
                        color: "hsl(var(--primary))",
                        border: "1.5px solid hsl(var(--primary) / 0.45)",
                      } : isFuture ? {
                        color: "#D1D5DB",
                      } : {
                        color: "var(--fg-ink)",
                      }}
                    >
                      {day.dayNum}
                    </span>
                    {calDayStatus === "full" && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />
                    )}
                    {calDayStatus === "partial" && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid #F0EDE8" }}>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22C55E" }} /><span className="text-[10px]" style={{ color: "#9CA3AF" }}>Completo</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#F59E0B" }} /><span className="text-[10px]" style={{ color: "#9CA3AF" }}>Parcial</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-primary/45" /><span className="text-[10px]" style={{ color: "#9CA3AF" }}>Hoje</span></div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mx-auto max-w-md px-5 pt-5 space-y-4">

        {!analysis && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-warm-orange/10 border border-warm-orange/20">
            <AlertTriangle size={18} className="text-warm-orange flex-shrink-0" />
            <p className="text-xs font-semibold text-foreground">
              Nenhuma análise salva foi encontrada. Esta é uma rotina genérica até você rodar uma nova análise.
            </p>
          </div>
        )}

        {analysis && !hasRoutineFromAnalysis && hasRecommendationFallbackRoutine && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/25">
            <AlertTriangle size={18} className="text-primary flex-shrink-0" />
            <p className="text-xs font-semibold text-foreground">
              Sua rotina foi montada com base nos produtos recomendados da análise mais recente.
            </p>
          </div>
        )}

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg-surface-strong rounded-[1.75rem] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--fg-ink)]">
                    {selectedPeriod === "morning" ? "Rotina da manhã" : "Rotina da noite"}
                  </h2>
                  {isRoutineComplete && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30"
                    >
                      <CheckCircle2 size={12} className="text-primary" />
                      <span className="text-xs font-semibold text-primary">Concluida</span>
                    </motion.span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: "#9CA3AF" }}>{activeChecklistItems.length} itens ativos no dia selecionado</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setSelectedPeriod(selectedPeriod === "morning" ? "night" : "morning")}
                className="relative w-14 h-8 rounded-full transition-colors"
                style={selectedPeriod === "night" ? { backgroundColor: "#9aa8dc" } : { background: "var(--grad-coral)" }}
                title={selectedPeriod === "morning" ? "Mudar para Noite" : "Mudar para Manhã"}
              >
                <motion.div
                  animate={{ x: selectedPeriod === "night" ? 24 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                >
                  {selectedPeriod === "morning" ? (
                    <Sun size={14} className="text-primary" />
                  ) : (
                    <Moon size={14} style={{ color: "#6B8FD4" }} />
                  )}
                </motion.div>
              </button>
              <div className="text-right">
                <p className="text-[11px] font-semibold" style={{ color: "#9CA3AF" }}>
                  {completedInVisible}/{activeChecklistItems.length} feitos
                </p>
              </div>
            </div>
          </div>

          {/* Progress ring + bar combinados */}
          <div className="mb-4 flex items-center gap-3">
            {/* Mini ring circular */}
            <div className="flex-shrink-0 relative">
              {(() => {
                const R = 14; const circ = 2 * Math.PI * R;
                return (
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5"/>
                    <motion.circle
                      cx="18" cy="18" r={R}
                      fill="none" strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke={isRoutineComplete ? "#22c55e" : "var(--grad-coral, #f97316)"}
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - completionPercent / 100) }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      transform="rotate(-90 18 18)"
                    />
                    <text x="18" y="18" textAnchor="middle" dominantBaseline="middle"
                      fontSize="8" fontWeight="800"
                      fill={isRoutineComplete ? "#22c55e" : "var(--fg-ink, #2D2D2D)"}>
                      {completionPercent}%
                    </text>
                  </svg>
                );
              })()}
              {isRoutineComplete && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}
            </div>
            {/* Barra linear */}
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/65">
              <motion.div
                className="h-full rounded-full"
                style={{ background: isRoutineComplete ? "#22c55e" : "var(--grad-coral)" }}
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Banner de conclusão */}
          <AnimatePresence>
            {completionBanner && (
              <motion.div
                key="completion-banner"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="mb-3 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: selectedPeriod === "night" ? "linear-gradient(135deg,#22c55e20,#16a34a15)" : "linear-gradient(135deg,#f9a8d420,#fb923c15)", border: `1px solid ${selectedPeriod === "night" ? "#22c55e40" : "#f97316-40"}` }}
              >
                <motion.span
                  animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-xl flex-shrink-0"
                >
                  {selectedPeriod === "night" ? "🌙" : "☀️"}
                </motion.span>
                <p className="text-sm font-bold text-foreground">{completionBanner}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {isFutureDay && (
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#FEF9EE", border: "1px solid #F59E0B33" }}>
              <span className="text-lg">🔒</span>
              <p className="text-xs font-semibold" style={{ color: "#92400E" }}>Rotinas futuras não podem ser marcadas.</p>
            </div>
          )}

          {activeChecklistItems.length === 0 && extraItems.length === 0 && !isEditing ? (
            <p className="text-sm text-muted-foreground">
              {selectedPeriod === "morning"
                ? "Sem itens da manha para o dia selecionado."
                : "Sem itens da noite para o dia selecionado."}
            </p>
          ) : (
            <div className="space-y-4">
              {extraItems.length > 0 && (
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3">
                  <button
                    onClick={() => setExtrasOpen((previous) => !previous)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground">Turbine sua rotina</p>
                      <p className="text-xs text-muted-foreground">Opcional, fechado por padrao.</p>
                    </div>
                    <ChevronDown size={16} className={`text-primary transition-transform ${extrasOpen ? "rotate-180" : ""}`} />
                  </button>

                  {extrasOpen && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Itens extras sugeridos para condicoes especiais da pele detectadas na analise.
                      </p>
                      {extraItems.map((item) => {
                        const enabled = Boolean(enabledExtrasByItem[item.key]);
                        return (
                          <div key={`extra-toggle-${item.key}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{getDisplayProductName(item)}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{getDisplayReason(item)}</p>
                            </div>
                            <button
                              onClick={() => setEnabledExtrasByItem((previous) => ({ ...previous, [item.key]: !enabled }))}
                              className={`px-2.5 h-8 rounded-lg text-[11px] font-semibold border ${enabled ? "border-primary/40 bg-primary/15 text-foreground" : "border-border/70 bg-background text-foreground"}`}
                            >
                              <Plus size={12} className="inline mr-1" />
                              {enabled ? "Remover" : "Adicionar"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(isEditing ? editAllItems : activeChecklistItems).map((item) => {
                const itemPeriod: "morning" | "night" = item.period;
                const options = getAvailableOptions(item, itemPeriod);
                const isChecked = productSchedule.checkedByDayItem[getProductCheckKey(item.key, selectedDay)];
                const canEditDays = item.recurrence !== "daily";
                const periodItems = orderedItems[itemPeriod];
                const itemIdx = periodItems.findIndex((i) => i.key === item.key);
                const isFirst = itemIdx === 0;
                const isLast = itemIdx === periodItems.length - 1;
                const periodLabel = (item as { _periodLabel?: string })._periodLabel;

                const cardBg = pastelColors[(item.stepNumber - 1) % pastelColors.length];
                return (
                  <div key={item.key} className={`lg-surface-step overflow-hidden ${isChecked && !isEditing ? "opacity-55" : "opacity-100"}`}>
                    <div className="flex flex-col w-full">
                      {/* Edit mode controls */}
                      {isEditing && (
                        <div className="flex items-center justify-between gap-2 px-3 pt-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveStep(itemPeriod, item.key, "up")}
                                disabled={isFirst}
                                className="w-8 h-8 rounded-lg border border-border/60 bg-background flex items-center justify-center disabled:opacity-30"
                                aria-label="Mover para cima"
                              >
                                <ChevronUp size={14} className="text-foreground" />
                              </button>
                              <button
                                onClick={() => moveStep(itemPeriod, item.key, "down")}
                                disabled={isLast}
                                className="w-8 h-8 rounded-lg border border-border/60 bg-background flex items-center justify-center disabled:opacity-30"
                                aria-label="Mover para baixo"
                              >
                                <ChevronDown size={14} className="text-foreground" />
                              </button>
                            </div>
                            {periodLabel && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">
                                {periodLabel === "Manhã" ? <Sun size={11} className="inline mr-0.5" /> : <Moon size={11} className="inline mr-0.5" />}
                                {periodLabel}
                              </span>
                            )}
                          </div>
                          {item.isCustom && (
                            <div className="flex items-center gap-1.5">
                              {(["morning", "both", "night"] as const).map((p) => {
                                const siblingId = item.key.replace(/^custom::(morning|night)::/, (_, pp) =>
                                  `custom::${pp === "morning" ? "night" : "morning"}`
                                );
                                const hasSibling = customSteps.some((s) => s.id === siblingId);
                                const isActive =
                                  p === "both" ? hasSibling :
                                  p === item.period && !hasSibling;
                                return (
                                  <button
                                    key={p}
                                    onClick={() => changeCustomStepPeriod(item.key, p)}
                                    className={`h-6 px-2 rounded-full text-[10px] font-bold flex items-center gap-0.5 transition-colors ${
                                      isActive ? "bg-primary text-white" : "border border-border/60 bg-background text-muted-foreground"
                                    }`}
                                  >
                                    {p === "morning" && <><Sun size={9} />Manhã</>}
                                    {p === "night" && <><Moon size={9} />Noite</>}
                                    {p === "both" && <><Sun size={9} /><Moon size={9} />Ambos</>}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => {
                                  const siblingId = item.key.replace(/^custom::(morning|night)::/, (_, pp) =>
                                    `custom::${pp === "morning" ? "night" : "morning"}`
                                  );
                                  removeCustomStep(item.key);
                                  removeCustomStep(siblingId);
                                }}
                                className="w-6 h-6 rounded-full border border-destructive/40 bg-destructive/10 flex items-center justify-center ml-1"
                                aria-label="Remover passo"
                              >
                                <Trash2 size={11} className="text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main card row: image + details + check */}
                      <div className="flex items-center gap-3 p-3">
                        {/* Product image - mesmo comportamento de Results */}
                        <div 
                          className="w-[120px] h-[120px] rounded-xl bg-white border border-border/40 flex-shrink-0 overflow-hidden flex items-center justify-center"
                          key={`img-container-${item.key}`}
                        >
                          <img
                            key={`img-${item.key}-${getDisplayImage(item)}`}
                            src={getDisplayImage(item)}
                            alt={getDisplayProductName(item)}
                            loading="eager"
                            referrerPolicy="no-referrer"
                            onError={(e) => { 
                              e.currentTarget.style.display = "none";
                              const icon = document.createElement("div");
                              icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/60"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
                              e.currentTarget.parentElement?.appendChild(icon);
                            }}
                            className="w-full h-full object-contain bg-white p-1.5"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                              {item.stepNumber} · {capitalizeWords(item.stepLabel)}
                            </p>
                            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold items-center gap-1" style={{ backgroundColor: "rgba(255,255,255,0.7)", color: "#9CA3AF" }}>
                              <Repeat2 size={11} />
                              {humanizeRecurrence(item.recurrence)}
                            </span>
                          </div>
                          <p className={`text-sm font-bold leading-tight ${isChecked && !isEditing ? "line-through" : ""}`} style={{ color: isChecked && !isEditing ? "#9CA3AF" : "#2D2D2D" }}>
                            {capitalizeWords(getDisplayProductName(item))}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <button
                              onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(getDisplayProductName(item))}`, "_blank", "noopener,noreferrer")}
                              className="w-6 h-6 rounded-full hover:bg-muted/40 flex items-center justify-center transition-colors"
                              aria-label="Pesquisar produto"
                            >
                              <Search size={12} className="text-muted-foreground" />
                            </button>
                            {canEditDays && (
                              <button
                                onClick={() => setEditingDaysItem(editingDaysItem === item.key ? null : item.key)}
                                className="w-6 h-6 rounded-full hover:bg-muted/40 flex items-center justify-center transition-colors"
                                aria-label="Editar dias"
                              >
                                <Edit size={12} className="text-muted-foreground" />
                              </button>
                            )}
                            {hasRoutineFromAnalysis && (
                              <button
                                onClick={() => setSelectingProductItem(selectingProductItem === item.key ? null : item.key)}
                                className="w-6 h-6 rounded-full hover:bg-muted/40 flex items-center justify-center transition-colors"
                                aria-label="Trocar produto"
                                title="Trocar produto"
                              >
                                <RefreshCw size={12} className="text-muted-foreground" />
                              </button>
                            )}
                            {isAdmin && !item.isCustom && (
                              <button
                                onClick={() => adminEditingItem === item.key ? setAdminEditingItem(null) : openAdminEdit(item)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                  adminEditingItem === item.key ? "bg-amber-500/20" : "hover:bg-amber-500/10"
                                }`}
                                aria-label="Editar produto (admin)"
                                title="Admin: editar produto no banco"
                              >
                                <Crown size={12} className="text-amber-500" />
                              </button>
                            )}
                            {item.isCustom && !isEditing && (
                              <button
                                onClick={() => setStepPendingDelete({ id: item.key, name: getDisplayProductName(item) })}
                                className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
                                aria-label="Deletar passo"
                                title="Deletar este passo"
                              >
                                <Trash2 size={12} className="text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Check button — 44px touch target, spring animation */}
                        <motion.button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!isEditing) toggleChecklist(item.key);
                          }}
                          whileTap={{ scale: 0.88 }}
                          animate={isChecked
                            ? { scale: [1, 1.18, 1], transition: { duration: 0.28, ease: "easeOut" } }
                            : { scale: 1 }
                          }
                          className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center flex-shrink-0"
                          style={isChecked
                            ? { background: "var(--grad-coral)", border: "2px solid transparent" }
                            : { backgroundColor: "rgba(255,255,255,0.8)", border: "2px solid #E0DCD6" }
                          }
                          aria-label={isChecked ? "Desmarcar item" : "Marcar item"}
                        >
                          {isChecked && (
                            <motion.svg
                              width="14" height="14" viewBox="0 0 12 12" fill="none"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              <motion.path
                                d="M2 6L5 9L10 3"
                                stroke="white"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                              />
                            </motion.svg>
                          )}
                        </motion.button>
                      </div>

                      {/* Admin Edit Panel */}
                      {isAdmin && adminEditingItem === item.key && (
                        <div className="mx-3 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Crown size={13} className="text-amber-500" />
                              <p className="text-xs font-bold text-amber-600">
                                {adminSearching ? "Buscando produto..." : adminMatchedProduct ? adminMatchedProduct.name : "Produto não encontrado no banco"}
                              </p>
                            </div>
                            <button onClick={() => setAdminEditingItem(null)} className="w-6 h-6 rounded-full hover:bg-muted/40 flex items-center justify-center">
                              <X size={12} className="text-muted-foreground" />
                            </button>
                          </div>

                          {adminSearching && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 size={20} className="animate-spin text-amber-500" />
                            </div>
                          )}

                          {!adminSearching && adminMatchedProduct && (
                            <>
                              {/* Image preview */}
                              <div className="relative w-full h-32 rounded-xl bg-white border border-border/40 overflow-hidden">
                                {adminImagePreview ? (
                                  <img
                                    src={adminImagePreview}
                                    alt="preview"
                                    className="w-full h-full object-contain p-2"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Image size={24} className="text-muted-foreground" />
                                  </div>
                                )}
                                {adminUploadingImage && (
                                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                    <Loader2 size={20} className="animate-spin text-amber-500" />
                                  </div>
                                )}
                              </div>

                              {/* Upload button */}
                              <input
                                ref={adminFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAdminFileChange}
                              />
                              <button
                                onClick={() => adminFileInputRef.current?.click()}
                                disabled={adminUploadingImage}
                                className="w-full h-9 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs font-semibold text-amber-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Upload size={13} />
                                {adminUploadingImage ? "Enviando..." : "Substituir imagem"}
                              </button>

                              <button
                                onClick={handleAdminSave}
                                disabled={adminSaving || adminUploadingImage || !adminMatchedProduct.imageUrl}
                                className="w-full h-9 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                              >
                                {adminSaving ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
                                {adminSaving ? "Salvando..." : "Salvar no banco"}
                              </button>
                            </>
                          )}

                          {!adminSearching && !adminMatchedProduct && (
                            <p className="text-[11px] text-muted-foreground">Este produto não foi encontrado no catálogo do banco.</p>
                          )}
                        </div>
                      )}

                      {/* Edit Days Section */}
                      {editingDaysItem === item.key && canEditDays && (
                        <div className="mx-3 mb-3 rounded-xl border border-border/70 bg-background p-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Editar dias desse passo</p>
                          <div className="grid grid-cols-7 gap-1.5">
                            {weekDays.map((day) => {
                              const active = isScheduledForDay(item.key, day.key);
                              return (
                                <button
                                  key={`${item.key}-${day.key}`}
                                  onClick={() => toggleProductDay(item.key, day.key)}
                                  className={`h-8 rounded-lg text-[11px] font-semibold transition-colors ${
                                    active
                                      ? "gradient-primary text-primary-foreground"
                                      : "border border-border/70 text-muted-foreground"
                                  }`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}



                      {/* Product Selection (if analyzed and selecting) */}
                      {selectingProductItem === item.key && hasRoutineFromAnalysis && (() => {
                        const current = resolvedProductByItem.get(item.key);
                        return (
                          <div className="mx-3 mb-3 rounded-xl border border-border/60 bg-background p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground">Escolha do produto para este passo</p>
                              <button onClick={() => cancelProductSelection(item.key)} className="w-6 h-6 rounded-full hover:bg-muted/40 flex items-center justify-center">
                                <X size={12} className="text-muted-foreground" />
                              </button>
                            </div>

                            {/* Current/Primary Product - DESTAQUE (Produto selecionado atualmente) */}
                            {current && (
                              <div className="rounded-xl border-2 border-primary/50 bg-primary/5 p-2.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2">● Produto Atual</p>
                                <div className="flex gap-2 items-start">
                                  {current.imageUrl && (
                                    <div className="w-14 h-14 rounded-lg bg-white border border-border/40 overflow-hidden flex-shrink-0">
                                      <img src={current.imageUrl} alt={current.productName} className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground line-clamp-2">{current.productName}</p>
                                    <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{current.reason}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Alternative Options */}
                          {options.length > 1 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Opções de troca:</p>
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {options.slice(1).map((option) => {
                                  const isPending = pendingOptionByItem[item.key] === option.key;
                                  const isSelected = selectedOptionByItem[item.key] === option.key && !customProductByItem[item.key];
                                  const active = isPending || isSelected;
                                  return (
                                    <button
                                      key={option.key}
                                      onClick={() => {
                                        setPendingOptionByItem((previous) => ({ ...previous, [item.key]: option.key }));
                                      }}
                                      className={`text-left rounded-xl border p-2 transition-colors flex gap-2 items-center ${
                                        active
                                          ? "border-primary/50 bg-primary/10"
                                          : "border-border/70 bg-background"
                                      }`}
                                    >
                                      {option.imageUrl && (
                                        <div className="w-12 h-12 rounded-lg bg-white border border-border/40 overflow-hidden flex-shrink-0">
                                          <img src={option.imageUrl} alt={option.productName} className="w-full h-full object-contain p-0.5" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{option.label}</p>
                                        <p className="text-xs font-bold text-foreground mt-0.5 line-clamp-2">{option.productName}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => setShowingCustomFormByItem((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className="w-full h-9 rounded-xl border border-border/70 bg-background text-xs font-bold text-foreground flex items-center justify-center gap-1.5 hover:bg-muted/30 transition-colors"
                          >
                            <Plus size={13} />
                            Adicionar meu produto
                          </button>

                          {/* Catalog search */}
                          <div className="relative">
                            <div className="relative">
                              <input
                                value={catalogSearchByItem[item.key] ?? ""}
                                onChange={(e) => {
                                  setCatalogSearchByItem((prev) => ({ ...prev, [item.key]: e.target.value }));
                                  setCatalogSearchOpenByItem((prev) => ({ ...prev, [item.key]: true }));
                                }}
                                onFocus={() => setCatalogSearchOpenByItem((prev) => ({ ...prev, [item.key]: true }))}
                                placeholder="Buscar produto no catálogo..."
                                className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground"
                              />
                              {catalogSearchOpenByItem[item.key] && (() => {
                                const allRecs = analysis?.recommendations ?? [];
                                const userCatalog = getUserCatalog(userId);
                                const q = (catalogSearchByItem[item.key] ?? "").toLowerCase().trim();
                                const filteredRecs = allRecs
                                  .filter((r) => r.product && r.product.toLowerCase().includes(q))
                                  .slice(0, 5);
                                const filteredCatalog = userCatalog
                                  .filter((p) => p.name.toLowerCase().includes(q))
                                  .slice(0, 5);
                                if (filteredRecs.length === 0 && filteredCatalog.length === 0) return null;
                                return (
                                  <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-xl overflow-y-auto max-h-52">
                                    {filteredCatalog.length > 0 && (
                                      <>
                                        <div className="px-3 py-1.5 bg-primary/5 border-b border-border/40">
                                          <p className="text-[10px] font-bold text-primary uppercase tracking-wide flex items-center gap-1"><PackageOpen size={10} /> Meus Produtos</p>
                                        </div>
                                        {filteredCatalog.map((p) => (
                                          <button
                                            key={p.id}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => saveCustomProductFromCatalog(item.key, p.name, p.imageUrl)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
                                          >
                                            {p.imageUrl ? (
                                              <img src={p.imageUrl} className="w-7 h-7 rounded-lg object-contain bg-white border border-border/30 shrink-0" />
                                            ) : (
                                              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0"><Image size={12} className="text-muted-foreground" /></div>
                                            )}
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                                              {p.category && <p className="text-[10px] text-muted-foreground truncate">{p.category}</p>}
                                            </div>
                                          </button>
                                        ))}
                                      </>
                                    )}
                                    {filteredRecs.length > 0 && (
                                      <>
                                        {filteredCatalog.length > 0 && (
                                          <div className="px-3 py-1.5 bg-muted/40 border-t border-border/40">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Recomendados</p>
                                          </div>
                                        )}
                                        {filteredRecs.map((r) => (
                                          <button
                                            key={r.product}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => saveCustomProductFromCatalog(item.key, r.product, r.imageUrl)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
                                          >
                                            {r.imageUrl && (
                                              <img src={r.imageUrl} className="w-7 h-7 rounded-lg object-contain bg-white border border-border/30 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-foreground truncate">{r.product}</p>
                                              {r.type && <p className="text-[10px] text-muted-foreground truncate">{r.type}</p>}
                                            </div>
                                          </button>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {showingCustomFormByItem[item.key] && (
                            <div className="rounded-xl border border-border/70 bg-background p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-foreground">Meu produto</p>
                                {customProductByItem[item.key] && (
                                  <button
                                    onClick={() => clearCustomProduct(item.key)}
                                    className="text-[11px] font-semibold text-destructive flex items-center gap-1"
                                  >
                                    <Trash2 size={11} /> Remover
                                  </button>
                                )}
                              </div>

                              {customProductByItem[item.key] ? (
                                <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/20">
                                  {customProductByItem[item.key].imageUrl ? (
                                    <div className="w-12 h-12 rounded-lg bg-white border border-border/40 overflow-hidden flex-shrink-0">
                                      <img
                                        src={customProductByItem[item.key].imageUrl}
                                        alt={customProductByItem[item.key].name}
                                        className="w-full h-full object-contain p-1"
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted border border-border/40 flex items-center justify-center flex-shrink-0">
                                      <Image size={18} className="text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{customProductByItem[item.key].name}</p>
                                    <p className="text-[11px] text-primary font-semibold">Cadastrado ✓</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome do produto *</label>
                                    <input
                                      value={customInputByItem[item.key] ?? ""}
                                      onChange={(event) =>
                                        setCustomInputByItem((previous) => ({
                                          ...previous,
                                          [item.key]: event.target.value,
                                        }))
                                      }
                                      placeholder="Ex: Gel de limpeza Cetaphil"
                                      className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
                                      <Image size={11} /> Foto / URL da imagem (opcional)
                                    </label>
                                    <div className="space-y-2">
                                      <input
                                        value={customImageInputByItem[item.key] ?? ""}
                                        onChange={(event) =>
                                          setCustomImageInputByItem((previous) => ({
                                            ...previous,
                                            [item.key]: event.target.value,
                                          }))
                                        }
                                        placeholder="https://..."
                                        className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                                      />
                                      <label className="flex items-center justify-center gap-1.5 w-full h-9 rounded-lg border border-dashed border-border/70 bg-background/50 text-xs font-semibold text-primary cursor-pointer hover:bg-muted/20 transition-colors">
                                        <Upload size={13} />
                                        Escolher arquivo
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleCustomProductImageUpload(e, item.key)}
                                          disabled={uploadingImageByItem[item.key]}
                                          className="hidden"
                                        />
                                      </label>
                                      {uploadingImageByItem[item.key] && (
                                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-primary font-semibold">
                                          <Loader2 size={11} className="animate-spin" />
                                          Enviando...
                                        </div>
                                      )}
                                      {imageUploadErrorByItem[item.key] && (
                                        <p className="text-[11px] text-destructive font-semibold">{imageUploadErrorByItem[item.key]}</p>
                                      )}
                                    </div>
                                    {customImageInputByItem[item.key] && (
                                      <div className="mt-1.5 h-16 w-full rounded-xl bg-white border border-border/30 overflow-hidden">
                                        <img
                                          src={customImageInputByItem[item.key]}
                                          alt="Preview"
                                          className="w-full h-full object-contain p-1.5"
                                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => saveCustomProduct(item.key)}
                                    disabled={!customInputByItem[item.key]?.trim()}
                                    className="w-full h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-1.5"
                                  >
                                    <Plus size={13} />
                                    Cadastrar produto
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Scope selector + Save */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-muted-foreground">Aplicar em:</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["both", "morning", "night"] as const).map((scope) => {
                                const scopeLabel = scope === "both" ? "Manhã e Noite" : scope === "morning" ? "Só Manhã" : "Só Noite";
                                const active = (pendingScopeByItem[item.key] ?? "both") === scope;
                                return (
                                  <button
                                    key={scope}
                                    onClick={() => setPendingScopeByItem((prev) => ({ ...prev, [item.key]: scope }))}
                                    className={`h-8 rounded-xl text-[11px] font-semibold transition-colors ${active ? "text-white" : "border border-border/70 text-muted-foreground bg-background"}`}
                                    style={active ? { background: "var(--grad-coral)" } : undefined}
                                  >
                                    {scopeLabel}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveProductSelection(item.key)}
                                className="coral-button flex-1 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 size={13} />
                                Salvar
                              </button>
                              <button
                                onClick={() => cancelProductSelection(item.key)}
                                className="flex-1 h-9 rounded-xl text-xs font-bold border border-border/70 text-foreground flex items-center justify-center gap-1.5 hover:bg-muted/30"
                              >
                                <X size={13} /> Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}

              {/* Add Step button (edit mode) */}
              {isEditing && (
                <div className="space-y-3">
                  <button
                    onClick={() => { setAddStepOpen((v) => !v); if (!addStepOpen) setNewStepPeriod("both"); }}
                    className="w-full h-11 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm font-bold text-primary flex items-center justify-center gap-2 transition-colors hover:bg-primary/10"
                  >
                    <Plus size={16} />
                    Adicionar passo
                  </button>

                  {addStepOpen && (
                    <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-3">
                      <p className="text-sm font-bold text-foreground">Novo passo personalizado</p>

                      {/* Period toggle */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setNewStepPeriod("morning")}
                          className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${newStepPeriod === "morning" ? "gradient-primary text-primary-foreground" : "border border-border/60 bg-background text-foreground"}`}
                        >
                          <Sun size={13} /> Manhã
                        </button>
                        <button
                          onClick={() => setNewStepPeriod("night")}
                          className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${newStepPeriod === "night" ? "gradient-primary text-primary-foreground" : "border border-border/60 bg-background text-foreground"}`}
                        >
                          <Moon size={13} /> Noite
                        </button>
                        <button
                          onClick={() => setNewStepPeriod("both")}
                          className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${newStepPeriod === "both" ? "gradient-primary text-primary-foreground" : "border border-border/60 bg-background text-foreground"}`}
                        >
                          <Sun size={11} /><Moon size={11} /> Ambos
                        </button>
                      </div>

                      {/* Category label */}
                      <div className="relative">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Categoria *</label>
                        <div className="relative">
                          <input
                            value={newStepLabel}
                            onChange={(e) => { setNewStepLabel(e.target.value); setNewStepLabelOpen(true); }}
                            onFocus={() => setNewStepLabelOpen(true)}
                            placeholder="Limpeza, Sérum, Hidratante..."
                            className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                          />
                          {newStepLabelOpen && (() => {
                            const suggestions = ["Limpeza","Hidratante","Sérum","Protetor Solar","Tônico","Esfoliante","Máscara","Contorno dos Olhos","Retinol","Ácido"];
                            const q = newStepLabel.toLowerCase().trim();
                            const filtered = suggestions.filter((s) => s.toLowerCase().includes(q));
                            const exactMatch = filtered.some((s) => s.toLowerCase() === q);
                            const showAddNew = q.length > 0 && !exactMatch;
                            if (filtered.length === 0 && !showAddNew) return null;
                            return (
                              <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-xl overflow-y-auto max-h-52">
                                {filtered.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { void handleCategorySelect(s); }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                                  >
                                    {s}
                                  </button>
                                ))}
                                {showAddNew && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setNewStepLabelOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors border-t border-border/40"
                                  >
                                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <Plus size={12} className="text-primary" />
                                    </div>
                                    <p className="text-xs font-semibold text-primary">Adicionar &quot;{newStepLabel.trim()}&quot;</p>
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Product name */}
                      <div className="relative">
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome do produto *</label>
                        <div className="relative">
                          <input
                            value={newStepProductSearch}
                            onChange={(e) => {
                              if (newStepProductFromCatalog) return;
                              setNewStepProductSearch(e.target.value);
                              setNewStepProduct(e.target.value);
                              setNewStepProductOpen(true);
                            }}
                            onFocus={() => { if (!newStepProductFromCatalog) setNewStepProductOpen(true); }}
                            readOnly={newStepProductFromCatalog}
                            placeholder="Buscar produto da análise..."
                            className={`w-full h-9 rounded-lg border border-border/70 px-3 text-xs text-foreground pr-8 ${
                              newStepProductFromCatalog
                                ? "bg-muted cursor-default select-none"
                                : "bg-background"
                            }`}
                          />
                          {newStepProductFromCatalog && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewStepProduct("");
                                setNewStepProductSearch("");
                                setNewStepProductFromCatalog(false);
                                setNewStepImage("");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              title="Limpar seleção"
                            >
                              <X size={13} />
                            </button>
                          )}
                          {newStepProductOpen && (() => {
                          const allRecs = analysis?.recommendations ?? [];
                          const q = newStepProductSearch.toLowerCase().trim();
                          const filteredRecs = allRecs
                            .filter((r) => r.product && r.product.toLowerCase().includes(q))
                            .slice(0, 5);
                          const filteredCatalog = catalogProductsByCategory
                            .filter((p) => !q || p.name.toLowerCase().includes(q))
                            .filter((p) => !filteredRecs.some((r) => r.product.toLowerCase() === p.name.toLowerCase()))
                            .slice(0, 5);
                          const combined = [
                            ...filteredRecs.map((r) => ({ name: r.product, imageUrl: r.imageUrl, type: r.type })),
                            ...filteredCatalog.map((p) => ({ name: p.name, imageUrl: p.imageUrl, type: p.category })),
                          ];
                          const exactMatch = combined.some((r) => r.name.toLowerCase() === q);
                          const showAddNew = q.length > 0 && !exactMatch;
                          if (combined.length === 0 && !showAddNew) return null;
                          return (
                            <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-background border border-border/70 rounded-xl shadow-xl overflow-y-auto max-h-52">
                              {combined.map((r) => (
                                <button
                                  key={r.name}
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); }}
                                  onClick={() => {
                                    setNewStepProduct(r.name);
                                    setNewStepProductSearch(r.name);
                                    if (r.imageUrl) setNewStepImage(r.imageUrl);
                                    setNewStepProductFromCatalog(true);
                                    setNewStepProductOpen(false);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
                                >
                                  {r.imageUrl && (
                                    <img src={r.imageUrl} className="w-7 h-7 rounded-lg object-contain bg-white border border-border/30 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                                    {r.type && <p className="text-[10px] text-muted-foreground truncate">{r.type}</p>}
                                  </div>
                                </button>
                              ))}
                              {showAddNew && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); }}
                                  onClick={() => {
                                    setNewStepProduct(newStepProductSearch.trim());
                                    setNewStepProductFromCatalog(false);
                                    setNewStepProductOpen(false);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors border-t border-border/40"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Plus size={13} className="text-primary" />
                                  </div>
                                  <p className="text-xs font-semibold text-primary">Adicionar &quot;{newStepProductSearch.trim()}&quot;</p>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        </div>
                      </div>

                      {/* Image URL */}
                      <div>
                        <label className={`text-[11px] font-semibold block mb-1 flex items-center gap-1 ${newStepProductFromCatalog ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                          <Image size={11} /> Imagem do produto (URL, opcional)
                          {newStepProductFromCatalog && <span className="ml-1 text-[10px] italic">(definida pelo catálogo)</span>}
                        </label>
                        <input
                          value={newStepImage}
                          onChange={(e) => { if (!newStepProductFromCatalog) setNewStepImage(e.target.value); }}
                          readOnly={newStepProductFromCatalog}
                          placeholder="https://..."
                          className={`w-full h-9 rounded-lg border border-border/70 px-3 text-xs text-foreground ${newStepProductFromCatalog ? "bg-muted cursor-default" : "bg-background"}`}
                        />
                      </div>

                      {/* File Upload */}
                      {!newStepProductFromCatalog && (
                      <div>
                        <button
                          type="button"
                          onClick={() => newStepFileInputRef.current?.click()}
                          disabled={newStepUploadingImage}
                          className="w-full h-9 rounded-lg border border-border/70 bg-background text-foreground text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Upload size={11} />
                          {newStepUploadingImage ? "Enviando..." : "Ou enviar imagem"}
                        </button>
                        <input
                          ref={newStepFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleNewStepFileChange}
                          className="hidden"
                        />
                      </div>
                      )}

                      {newStepImage && (
                        <div className="mt-2 h-20 w-full rounded-xl bg-white border border-border/30 overflow-hidden">
                          <img
                            src={newStepImage}
                            alt="Preview"
                            className="w-full h-full object-contain p-2"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        </div>
                      )}

                      {/* Note */}
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Observação (opcional)</label>
                        <input
                          value={newStepNote}
                          onChange={(e) => setNewStepNote(e.target.value)}
                          placeholder="Ex: Usar somente à noite"
                          className="w-full h-9 rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={addCustomStep}
                          disabled={!newStepProduct.trim()}
                          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40"
                        >
                          Salvar passo
                        </button>
                        <button
                          onClick={() => setAddStepOpen(false)}
                          className="h-10 px-4 rounded-xl border border-border/60 bg-background text-xs font-semibold text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* Editar Rotina CTA - always visible at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pb-28"
        >
          <button
            onClick={() => { setIsEditing((v) => !v); setAddStepOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`w-full h-14 rounded-full text-sm font-bold flex items-center justify-center gap-2.5 transition-all`}
            style={isEditing
              ? { backgroundColor: "rgba(255,255,255,0.65)", border: "2px solid hsl(var(--primary) / 0.45)", color: "hsl(var(--primary))", boxShadow: "none" }
              : { background: "var(--grad-coral)", color: "#fff", boxShadow: "var(--shadow-glow)" }
            }
          >
            {isEditing ? (
              <>
                <X size={18} />
                Fechar edição
              </>
            ) : (
              <>
                <Edit size={18} />
                Editar Rotina
              </>
            )}
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Routine;
