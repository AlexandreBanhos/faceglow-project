import { apiRoutes, apiBaseUrl } from "@/lib/api";
import { normalizeAnalysis, type AnalysisResponse } from "@/lib/analysis";
import { getAccessTokenWithWait } from "@/lib/auth";

export type AnalysisJobStatus = {
  id: string;
  status: "processing" | "completed" | "failed";
  result?: AnalysisResponse;
  error?: string;
};

export type AnalysisStatsResponse = {
  totalAnalyses: number;
  bestScore: number;
  streakDays: number;
};

export type DashboardSummary = {
  latest: AnalysisResponse | null;
  previousOverallScore: number | null;
};

type FetchUserAnalysesOptions = {
  includeRecommendations?: boolean;
  forceRefresh?: boolean;
};

type FetchAnalysisByIdOptions = {
  includeRecommendations?: boolean;
  timeoutMs?: number;
};

const ANALYSES_CACHE_TTL_MS = 180_000;
const READ_REQUEST_TIMEOUT_MS = 12_000;
const DASHBOARD_LS_KEY = "fg-dashboard-v1";
const DASHBOARD_LS_TTL_MS = 10 * 60_000; // 10 min — sobrevive entre aberturas do PWA
const analysesCache = new Map<string, { cachedAt: number; data: AnalysisResponse[] }>();
let dashboardCache: { cachedAt: number; data: DashboardSummary } | null = null;

function loadDashboardFromStorage(): DashboardSummary | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_LS_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: DashboardSummary };
    if (Date.now() - ts > DASHBOARD_LS_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function saveDashboardToStorage(data: DashboardSummary): void {
  try {
    localStorage.setItem(DASHBOARD_LS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* sem espaço em disco — silencioso */ }
}

/** Lê o cache do dashboard (in-memory > localStorage) para init síncrono no componente. */
export const readDashboardCache = (): DashboardSummary | null => {
  if (dashboardCache) return dashboardCache.data;
  return loadDashboardFromStorage();
};

/** Call this after a new analysis is created so Dashboard and History show fresh data. */
export const invalidateAnalysisCache = () => {
  dashboardCache = null;
  analysesCache.clear();
  try { localStorage.removeItem(DASHBOARD_LS_KEY); } catch { /* sem acesso ao storage */ }
};

/** Returns the latest analysis from in-memory dashboard cache (no network call). */
export const getCachedLatestAnalysis = (): AnalysisResponse | null => {
  return dashboardCache?.data?.latest ?? null;
};

/** Manually set the latest analysis in cache (call after loading a new analysis in Results page). */
export const setCachedLatestAnalysis = (analysis: AnalysisResponse | null) => {
  if (analysis) {
    dashboardCache = {
      cachedAt: Date.now(),
      data: {
        latest: analysis,
        previousOverallScore: null,
      },
    };
  }
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = READ_REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort("read-request-timeout"), timeoutMs);

  try {
    // Ensure absolute URL for fetch - if relative path, add base URL
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
    
    return await fetch(fullUrl, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    const abortedByTimeout = controller.signal.aborted && controller.signal.reason === "read-request-timeout";
    if (abortedByTimeout) {
      throw new Error(`A leitura dos dados excedeu ${Math.round(timeoutMs / 1000)}s.`);
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A leitura dos dados foi interrompida.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const fetchUserAnalyses = async (
  limit = 20,
  offset = 0,
  options?: FetchUserAnalysesOptions,
): Promise<AnalysisResponse[]> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return [];
  }

  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), 50));
  const normalizedOffset = Math.max(0, Math.floor(offset));
  const includeRecommendations = Boolean(options?.includeRecommendations);
  const cacheKey = `${normalizedLimit}:${normalizedOffset}:${includeRecommendations}`;

  if (!options?.forceRefresh) {
    const cached = analysesCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt <= ANALYSES_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const params = new URLSearchParams({ limit: String(normalizedLimit) });
  if (normalizedOffset > 0) {
    params.set("offset", String(normalizedOffset));
  }
  if (includeRecommendations) {
    params.set("includeRecommendations", "true");
  }

  const endpoint = includeRecommendations ? apiRoutes.analysis : `${apiRoutes.analysis}/summary`;
  const url = `${endpoint}?${params.toString()}`;
  const headers = { Authorization: `Bearer ${token}` };

  const response = await fetchWithTimeout(url, { headers }, READ_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Falha ao carregar analises (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    return [];
  }

  const normalized = payload
    .map((item) => normalizeAnalysis(item))
    .filter((item): item is AnalysisResponse => Boolean(item));

  analysesCache.set(cacheKey, {
    cachedAt: Date.now(),
    data: normalized,
  });

  return normalized;
};

export const fetchAnalysisById = async (id: string, options?: FetchAnalysisByIdOptions): Promise<AnalysisResponse | null> => {
  if (!id) {
    return null;
  }

  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return null;
  }

  const params = new URLSearchParams();
  if (options?.includeRecommendations === false) {
    params.set("includeRecommendations", "false");
  }

  const endpoint = params.size > 0
    ? `${apiRoutes.analysis}/${encodeURIComponent(id)}?${params.toString()}`
    : `${apiRoutes.analysis}/${encodeURIComponent(id)}`;

  const response = await fetchWithTimeout(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, options?.timeoutMs ?? READ_REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    return null;
  }

  return normalizeAnalysis((await response.json()) as unknown);
};

export const fetchAnalysisStatus = async (id: string): Promise<AnalysisJobStatus> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) throw new Error("Not authenticated");

  const response = await fetchWithTimeout(
    `${apiRoutes.analysis}/${encodeURIComponent(id)}/status`,
    { headers: { Authorization: `Bearer ${token}` } },
    8_000,
  );

  if (!response.ok) {
    throw new Error(`Status check failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    id: string;
    status: string;
    result?: unknown;
    error?: string;
  };

  return {
    id: payload.id ?? id,
    status: payload.status as AnalysisJobStatus["status"],
    result: payload.result ? (normalizeAnalysis(payload.result) ?? undefined) : undefined,
    error: payload.error,
  };
};

export const fetchAnalysisStats = async (): Promise<AnalysisStatsResponse | null> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return null;
  }

  const response = await fetchWithTimeout(`${apiRoutes.analysis}/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar estatisticas (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as Partial<AnalysisStatsResponse>;

  return {
    totalAnalyses: Number(payload.totalAnalyses ?? 0),
    bestScore: Number(payload.bestScore ?? 0),
    streakDays: Number(payload.streakDays ?? 0),
  };
};

export const fetchDashboardSummary = async (forceRefresh = false): Promise<DashboardSummary> => {
  if (!forceRefresh && dashboardCache && Date.now() - dashboardCache.cachedAt <= ANALYSES_CACHE_TTL_MS) {
    return dashboardCache.data;
  }

  // Cache persistente entre sessões — retorna imediatamente enquanto revalida em background
  if (!forceRefresh) {
    const fromStorage = loadDashboardFromStorage();
    if (fromStorage) {
      dashboardCache = { cachedAt: Date.now(), data: fromStorage };
      return fromStorage;
    }
  }

  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return {
      latest: null,
      previousOverallScore: null,
    };
  }

  const attemptFetch = () =>
    fetchWithTimeout(
      apiRoutes.analysisDashboard,
      { headers: { Authorization: `Bearer ${token}` } },
      20_000,
    );

  let response: Response;
  let lastError: Error | null = null;
  
  // Try up to 2 times with 500ms delay (faster than 2.5s cold-start delay)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await attemptFetch();
      break; // Success - exit retry loop
    } catch (error) {
      lastError = error as Error;
      if (attempt === 0) {
        // Only wait if retrying
        await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
      }
    }
  }

  if (!response || !response.ok) {
    if (lastError) throw lastError;
    throw new Error(`Falha ao carregar dashboard (HTTP ${response?.status ?? 'unknown'}).`);
  }

  const payload = (await response.json()) as {
    latest?: unknown;
    previous?: { overallScore?: number } | null;
  };

  const data: DashboardSummary = {
    latest: normalizeAnalysis(payload.latest),
    previousOverallScore: typeof payload.previous?.overallScore === "number" ? payload.previous.overallScore : null,
  };

  dashboardCache = {
    cachedAt: Date.now(),
    data,
  };
  saveDashboardToStorage(data);

  return data;
};

export type ProfileSummaryResponse = {
  stats: AnalysisStatsResponse;
  credits: { creditsRemaining: number };
};

export const fetchProfileSummary = async (): Promise<ProfileSummaryResponse | null> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    console.error("[fetchProfileSummary] Sem token de autenticacao");
    return null;
  }

  const url = `${apiRoutes.analysis}/profile-summary`;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }, 10_000); // 10s timeout

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} - ${errorText || response.statusText}`);
      }

      const payload = (await response.json()) as Partial<ProfileSummaryResponse>;

      return {
        stats: {
          totalAnalyses: Number(payload.stats?.totalAnalyses ?? 0),
          bestScore: Number(payload.stats?.bestScore ?? 0),
          streakDays: Number(payload.stats?.streakDays ?? 0),
        },
        credits: {
          creditsRemaining: Number(payload.credits?.creditsRemaining ?? 0),
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const waitTime = 500 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  return null;
};

/** Fetch análise completa com recomendações para navegação na Rotina */
export const fetchAnalysisWithRecommendations = async (analysisId: string): Promise<AnalysisResponse | null> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    console.error("[fetchAnalysisWithRecommendations] Sem token");
    return null;
  }

  try {
    const url = `${apiRoutes.analysis}/${encodeURIComponent(analysisId)}?includeRecommendations=true`;
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }, 15_000);

    if (!response.ok) {
      console.warn(`[fetchAnalysisWithRecommendations] HTTP ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as unknown;
    const normalized = normalizeAnalysis(payload);
    return normalized;
  } catch (error) {
    console.error("[fetchAnalysisWithRecommendations] Error:", error);
    return null;
  }
};

/**
 * Salva customizações de rotina no backend
 * @param analysisId - ID da análise
 * @param customizationsJson - JSON string com customizações (selectedByItem, customSteps, routineOrder, schedule, myProducts)
 */
export const saveRoutineCustomizations = async (
  analysisId: string,
  customizationsJson: string,
): Promise<{ success: boolean; routineId?: string; error?: string }> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    const response = await fetchWithTimeout(
      `${apiRoutes.analysis}/${encodeURIComponent(analysisId)}/routine/save`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customizationsJson }),
      },
      10_000,
    );

    if (!response.ok) {
      console.warn(`[saveRoutineCustomizations] HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const payload = (await response.json()) as { routineId?: string; message?: string };
    return { success: true, routineId: payload.routineId };
  } catch (error) {
    console.error("[saveRoutineCustomizations] Error:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Delete a custom routine step
 */
export const deleteRoutineStep = async (
  analysisId: string,
  stepId: string,
): Promise<{ success: boolean; error?: string }> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    const response = await fetchWithTimeout(
      `${apiRoutes.analysis}/${encodeURIComponent(analysisId)}/routine/step/${encodeURIComponent(stepId)}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
      10_000,
    );

    if (!response.ok) {
      console.warn(`[deleteRoutineStep] HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[deleteRoutineStep] Error:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Carrega customizações de rotina salvas no backend
 * @param analysisId - ID da análise
 */
export const loadRoutineCustomizations = async (
  analysisId: string,
): Promise<{ customizations: unknown; updatedAtUtc?: string } | null> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `${apiRoutes.analysis}/${encodeURIComponent(analysisId)}/routine/custom`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      },
      10_000,
    );

    if (!response.ok) {
      // 404 is expected if no custom routine exists
      if (response.status === 404) {
        return null;
      }
      console.warn(`[loadRoutineCustomizations] HTTP ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as { customizations: unknown; updatedAtUtc?: string };
    return payload;
  } catch (error) {
    console.error("[loadRoutineCustomizations] Error:", error);
    return null;
  }
};

// ============================================================
// STRUCTURED ROUTINE STEPS — nova API com imagens via produto ID
// ============================================================

export type SlotTier = "primary" | "alt_budget" | "alt_rated" | "user_custom";

export type RoutineSlot = {
  id: string;
  tier: SlotTier;
  isSelected: boolean;
  productId: string | null;
  productName: string | null;
  imageUrl: string | null;
  recommendationReason: string | null;
  score: number | null;
};

export type RoutineStep = {
  id: string;
  analysisId: string;
  period: "morning" | "night";
  stepOrder: number;
  category: string;              // step_type_key (cleanser, serum, etc.)
  categoryDisplayName?: string;  // "Limpeza", "Sérum", etc.
  stepTypeKey: string;           // same as category (v2 alias)
  productId: string | null;
  productName: string;
  imageUrl: string | null;
  recurrence: string;
  isExtra: boolean;
  isUserAdded: boolean;
  selectedTier: SlotTier | null;
  overrideProductName: string | null;
  overrideImageUrl: string | null;
  scheduleDays: string;
  routineId?: string;
  slots?: RoutineSlot[];
};

export const fetchRoutineSteps = async (analysisId: string): Promise<RoutineStep[]> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return [];

  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps`,
      { headers: { Authorization: `Bearer ${token}` } },
      10_000,
    );
    if (!response.ok) return [];
    return (await response.json()) as RoutineStep[];
  } catch {
    return [];
  }
};

export const addCatalogSlot = async (
  analysisId: string,
  stepId: string,
  payload: { productId?: string; productName?: string; imageUrl?: string },
): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps/${encodeURIComponent(stepId)}/add-catalog-slot`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      10_000,
    );
    return response.ok;
  } catch { return false; }
};

export const addRoutineStep = async (
  analysisId: string,
  data: { period: string; productName: string; category?: string; imageUrl?: string; recurrence?: string; productId?: string },
): Promise<{ id: string } | null> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
      10_000,
    );
    if (!response.ok) return null;
    return (await response.json()) as { id: string };
  } catch {
    return null;
  }
};

export const reorderRoutineSteps = async (
  analysisId: string,
  period: "morning" | "night",
  stepIds: string[],
): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps/reorder`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ period, stepIds }),
      },
      10_000,
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const migrateRoutineFromCustomizations = async (analysisId: string): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps/migrate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
      10_000,
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const updateRoutineStep = async (
  analysisId: string,
  stepId: string,
  patch: {
    selectedTier?: string | null;
    overrideProductName?: string | null;
    overrideImageUrl?: string | null;
    productId?: string | null;
    scheduleDays?: string | null;
    period?: "morning" | "night" | null;
  },
): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;

  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps/${encodeURIComponent(stepId)}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
      10_000,
    );
    return response.ok;
  } catch {
    return false;
  }
};

/** Select a specific product slot (primary / alt_budget / alt_rated / user_custom) */
export const selectRoutineSlot = async (
  analysisId: string,
  stepId: string,
  tier: SlotTier,
  slotId?: string,
): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps/${encodeURIComponent(stepId)}/select-slot`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tier, slotId }),
      },
      10_000,
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const removeRoutineStep = async (analysisId: string, stepId: string): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;

  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/analysis/${encodeURIComponent(analysisId)}/steps/${encodeURIComponent(stepId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
      10_000,
    );
    return response.ok;
  } catch {
    return false;
  }
};

// ── Product Catalog Search ─────────────────────────────────────────────────

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  stepTypeKey: string;
  description?: string | null;
  tagline?: string | null;
  priceRange?: string | null;
  priceAvg?: number | null;
  compatibleSkinTypes?: string[] | null;
  targetsConcerns?: string[] | null;
  curationScore: number;
  isStaffPick: boolean;
  imageUrl?: string | null;
};

export const fetchCatalogProducts = async (
  stepType: string,
  search?: string,
): Promise<CatalogProduct[]> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return [];
  try {
    const params = new URLSearchParams({ stepType });
    if (search) params.set("search", search);
    const response = await fetch(`${apiBaseUrl}/products/catalog?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return (await response.json()) as CatalogProduct[];
  } catch { return []; }
};

// ── Routine Change Suggestions ─────────────────────────────────────────────

export type SuggestionType = "add_step" | "remove_step" | "swap_product";

export type RoutineSuggestion = {
  id: string;
  suggestionType: SuggestionType;
  stepTypeKey: string;
  stepDisplayName: string;
  stepPeriod: "morning" | "night" | "both" | null;
  currentProductName: string | null;
  suggestedProductId: string | null;
  suggestedProductName: string | null;
  suggestedImageUrl: string | null;
  reason: string;
  priority: number;
  analysisId: string;
};

export const fetchRoutineSuggestions = async (): Promise<RoutineSuggestion[]> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return [];
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/routine/suggestions`,
      { headers: { Authorization: `Bearer ${token}` } },
      10_000,
    );
    if (!response.ok) return [];
    return (await response.json()) as RoutineSuggestion[];
  } catch { return []; }
};

export const acceptRoutineSuggestion = async (id: string): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/routine/suggestions/${encodeURIComponent(id)}/accept`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
      10_000,
    );
    return response.ok;
  } catch { return false; }
};

export const rejectRoutineSuggestion = async (id: string): Promise<boolean> => {
  const token = await getAccessTokenWithWait(5000);
  if (!token) return false;
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/routine/suggestions/${encodeURIComponent(id)}/reject`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
      10_000,
    );
    return response.ok;
  } catch { return false; }
};
