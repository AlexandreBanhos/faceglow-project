export type SkinProfile = {
  ageRange?: string;
  sex?: "male" | "female" | "other";
  selfSkinType?: "normal" | "dry" | "oily" | "combination" | "sensitive";
  skinGoal?: "hydration" | "antiaging" | "antiacne" | "uniformity" | "glow";
  analyzedSkinType?: string;
  updatedAt?: string;
};

const KEY = "faceglow-skin-profile";

export const getSkinProfile = (): SkinProfile => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SkinProfile) : {};
  } catch {
    return {};
  }
};

export const saveSkinProfile = (partial: Partial<SkinProfile>): SkinProfile => {
  const current = getSkinProfile();
  const updated: SkinProfile = { ...current, ...partial, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
};

export const SEX_LABELS: Record<NonNullable<SkinProfile["sex"]>, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Prefiro não dizer",
};

export const SKIN_TYPE_LABELS: Record<NonNullable<SkinProfile["selfSkinType"]>, string> = {
  normal: "Normal",
  dry: "Seca",
  oily: "Oleosa",
  combination: "Mista",
  sensitive: "Sensível",
};

export const GOAL_LABELS: Record<NonNullable<SkinProfile["skinGoal"]>, string> = {
  hydration: "Hidratação",
  antiaging: "Anti-idade",
  antiacne: "Anti-acne",
  uniformity: "Uniformidade",
  glow: "Luminosidade",
};
