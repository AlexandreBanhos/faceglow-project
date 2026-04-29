export type AnalysisScoreBreakdown = {
  acne: number;
  oiliness: number;
  darkSpots: number;
  hydration: number;
  sensitivity: number;
  poros?: number;
  olheiras?: number;
  linhasFinas?: number;
  vermelhidao?: number;
  espinhasAtivas?: number;
  cravos?: number;
};

export type AnalysisRoutine = {
  morning: string[];
  night: string[];
};

export type AnalysisConditions = {
  acne: boolean;
  olheiras: boolean;
  poros: boolean;
  manchas: boolean;
  labiosRessecados: boolean;
  linhasFinas?: boolean;
  vermelhidao?: boolean;
  espinhasAtivas?: boolean;
  cravos?: boolean;
  ressecamento?: boolean;
};

export type FacialPoint = {
  x: number;
  y: number;
  factor: string;
  severity: number;
};

export type AnalysisPoints = {
  top3Factors: string[];
  detectedPoints: FacialPoint[];
  imageWidth: number;
  imageHeight: number;
};

export type AnalysisRecommendation = {
  type: string;
  product: string;
  reason: string;
  imageUrl?: string;
  description?: string;
};

export type AnalysisResponse = {
  id: string;
  userId: string;
  imageUrl: string;
  skinType: string;
  scores: AnalysisScoreBreakdown;
  summary: string;
  conditions: AnalysisConditions;
  additionalRecommendations: string;
  routine: AnalysisRoutine;
  recommendations: AnalysisRecommendation[];
  overallScore: number;
  createdAtUtc: string;
  /** True when the backend has saved recommendations for this analysis. */
  hasRecommendations: boolean;
  /** Facial points and top factors for visualization */
  facialPoints?: AnalysisPoints;
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeScores = (scores?: Partial<AnalysisScoreBreakdown>): AnalysisScoreBreakdown => ({
  acne: toSafeNumber(scores?.acne),
  oiliness: toSafeNumber(scores?.oiliness),
  darkSpots: toSafeNumber(scores?.darkSpots),
  hydration: toSafeNumber(scores?.hydration),
  sensitivity: toSafeNumber(scores?.sensitivity),
  poros: toSafeNumber(scores?.poros),
  olheiras: toSafeNumber(scores?.olheiras),
  linhasFinas: toSafeNumber(scores?.linhasFinas),
  vermelhidao: toSafeNumber(scores?.vermelhidao),
  espinhasAtivas: toSafeNumber(scores?.espinhasAtivas),
  cravos: toSafeNumber(scores?.cravos),
});

const normalizeConditions = (conditions: unknown): AnalysisConditions => {
  if (!conditions || typeof conditions !== "object") {
    return {
      acne: false,
      olheiras: false,
      poros: false,
      manchas: false,
      labiosRessecados: false,
      linhasFinas: false,
      vermelhidao: false,
      espinhasAtivas: false,
      cravos: false,
      ressecamento: false,
    };
  }

  const value = conditions as Partial<AnalysisConditions> & { labios_ressecados?: unknown };
  return {
    acne: Boolean(value.acne),
    olheiras: Boolean(value.olheiras),
    poros: Boolean(value.poros),
    manchas: Boolean(value.manchas),
    labiosRessecados: Boolean(value.labiosRessecados ?? value.labios_ressecados),
    linhasFinas: Boolean(value.linhasFinas),
    vermelhidao: Boolean(value.vermelhidao),
    espinhasAtivas: Boolean(value.espinhasAtivas),
    cravos: Boolean(value.cravos),
    ressecamento: Boolean(value.ressecamento),
  };
};

const normalizeFacialPoints = (points: unknown): AnalysisPoints | undefined => {
  if (!points || typeof points !== "object") {
    return undefined;
  }

  const value = points as Partial<AnalysisPoints> & { 
    top_3_factors?: string[];
    detected_points?: Array<{ x: number; y: number; factor: string; severity: number }>;
    image_width?: number;
    image_height?: number;
  };

  const top3 = Array.isArray(value.top3Factors) ? value.top3Factors : (Array.isArray(value.top_3_factors) ? value.top_3_factors : []);
  const points_arr = Array.isArray(value.detectedPoints) ? value.detectedPoints : (Array.isArray(value.detected_points) ? value.detected_points : []);

  return {
    top3Factors: top3,
    detectedPoints: points_arr.map(p => ({
      x: toSafeNumber(p.x),
      y: toSafeNumber(p.y),
      factor: String(p.factor ?? ""),
      severity: toSafeNumber(p.severity),
    })),
    imageWidth: toSafeNumber(value.imageWidth ?? value.image_width, 100),
    imageHeight: toSafeNumber(value.imageHeight ?? value.image_height, 140),
  };
};

type LegacyAnalysisResponse = {
  id: string;
  userId: string;
  imageUrl: string;
  skinType: string;
  acneScore: number;
  oilinessScore: number;
  darkSpotsScore: number;
  overallScore: number;
  createdAtUtc: string;
  recommendations: Array<{
    type: string;
    product: string;
    description?: string;
    reason?: string;
    imageUrl?: string;
  }>;
};

const fallbackImages: Record<string, string> = {
  best: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  premium: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=80",
  budget: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
};

export const resolveRecommendationImage = (product: string, type: string) => {
  const normalized = product.toLowerCase();

  if (normalized.includes("cleanser") || normalized.includes("clean") || normalized.includes("foam") || normalized.includes("wash")) {
    return "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("spf") || normalized.includes("sunscreen") || normalized.includes("protetor") || normalized.includes("sun")) {
    return "https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("serum") || normalized.includes("vitamina c") || normalized.includes("niacin") || normalized.includes("azela")) {
    return "https://images.unsplash.com/photo-1598452963314-b09f397a5c48?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("moistur") || normalized.includes("cream") || normalized.includes("hidrat") || normalized.includes("gel")) {
    return "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=80";
  }

  if (normalized.includes("retinal") || normalized.includes("retinol") || normalized.includes("night") || normalized.includes("acid")) {
    return "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?auto=format&fit=crop&w=900&q=80";
  }

  return fallbackImages[type.toLowerCase()] ?? fallbackImages.best;
};

export const normalizeAnalysis = (raw: unknown): AnalysisResponse | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Partial<AnalysisResponse> & LegacyAnalysisResponse & {
    scores?: AnalysisScoreBreakdown;
    routine?: AnalysisRoutine;
  };

  if (value.scores) {
    const normalizedScores = normalizeScores(value.scores);
    const normalizedRoutine = value.routine ?? { morning: [], night: [] };
    const normalizedRecommendations = Array.isArray(value.recommendations)
      ? value.recommendations.map((item) => ({
          type: item.type ?? "best",
          product: item.product ?? "",
          reason: item.reason ?? item.description ?? "",
          imageUrl: item.imageUrl?.trim() || resolveRecommendationImage(item.product ?? "", item.type ?? "best"),
        }))
      : [];

    return {
      id: value.id ?? crypto.randomUUID(),
      userId: value.userId ?? "",
      imageUrl: value.imageUrl ?? "",
      skinType: value.skinType ?? "unknown",
      scores: normalizedScores,
      summary: typeof value.summary === "string" ? value.summary : "",
      conditions: normalizeConditions((value as { conditions?: unknown }).conditions),
      additionalRecommendations:
        typeof (value as { additionalRecommendations?: unknown }).additionalRecommendations === "string"
          ? (value as { additionalRecommendations: string }).additionalRecommendations
          : "",
      routine: {
        morning: Array.isArray(normalizedRoutine.morning) ? normalizedRoutine.morning : [],
        night: Array.isArray(normalizedRoutine.night) ? normalizedRoutine.night : [],
      },
      recommendations: normalizedRecommendations,
      overallScore: toSafeNumber(value.overallScore),
      createdAtUtc: typeof value.createdAtUtc === "string" ? value.createdAtUtc : new Date().toISOString(),
      hasRecommendations: Boolean(
        (value as { hasRecommendations?: unknown }).hasRecommendations ??
        normalizedRecommendations.length > 0
      ),
      facialPoints: normalizeFacialPoints((value as { facialPoints?: unknown }).facialPoints),
    };
  }

  if (
    value.acneScore !== undefined ||
    value.oilinessScore !== undefined ||
    value.darkSpotsScore !== undefined
  ) {
    const scores: AnalysisScoreBreakdown = {
      acne: toSafeNumber(value.acneScore),
      oiliness: toSafeNumber(value.oilinessScore),
      darkSpots: toSafeNumber(value.darkSpotsScore),
      hydration: Math.max(0, Math.min(10, 10 - toSafeNumber(value.oilinessScore))),
      sensitivity: 0,
    };

    const overallScore =
      typeof value.overallScore === "number"
        ? value.overallScore
        : Math.max(0, Math.min(100, Math.round(100 - ((scores.acne + scores.oiliness + scores.darkSpots) / 3) * 10)));

    const legacyRecommendations = Array.isArray(value.recommendations)
      ? value.recommendations.map((item) => ({
          type: item.type ?? "best",
          product: item.product ?? "",
          reason: item.reason ?? item.description ?? "",
          imageUrl: item.imageUrl?.trim() || resolveRecommendationImage(item.product ?? "", item.type ?? "best"),
        }))
      : [];

    return {
      id: value.id ?? crypto.randomUUID(),
      userId: value.userId ?? "",
      imageUrl: value.imageUrl ?? "",
      skinType: value.skinType ?? "unknown",
      scores,
      summary: "",
      conditions: normalizeConditions((value as { conditions?: unknown }).conditions),
      additionalRecommendations:
        typeof (value as { additionalRecommendations?: unknown }).additionalRecommendations === "string"
          ? (value as { additionalRecommendations: string }).additionalRecommendations
          : "",
      routine: { morning: [], night: [] },
      recommendations: legacyRecommendations,
      overallScore,
      createdAtUtc: typeof value.createdAtUtc === "string" ? value.createdAtUtc : new Date().toISOString(),
      hasRecommendations: Boolean(
        (value as { hasRecommendations?: unknown }).hasRecommendations ??
        legacyRecommendations.length > 0
      ),
      facialPoints: normalizeFacialPoints((value as { facialPoints?: unknown }).facialPoints),
    };
  }

  return null;
};
