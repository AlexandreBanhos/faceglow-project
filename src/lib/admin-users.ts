import { apiBaseUrl } from "./api";
import { getTokenOrWait } from "./auth";

const base = `${apiBaseUrl}/admin/users`;

async function getHeaders() {
  const token = await getTokenOrWait(3000);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  planKey?: string;
  subscriptionStatus?: string;
  expiresAtUtc?: string;
  creditsRemaining: number;
  skinType?: string;
  lastAnalysisAt?: string;
}

export interface AdminSkinProfile {
  skinType: string;
  acneScore: number;
  oilinessScore: number;
  darkSpotsScore: number;
  hydrationScore: number;
  sensitivityScore: number;
  agingScore: number;
  rednessScore: number;
  primaryConcerns: string[];
  hasActiveAcne: boolean;
  hasDarkCircles: boolean;
  hasEnlargedPores: boolean;
  hasFineLines: boolean;
  usesMakeup: boolean;
  budgetRange?: string;
  updatedAt: string;
  lastAnalysisAt?: string;
}

export interface AdminRoutineStep {
  stepId: string;
  stepTypeKey: string;
  stepOrder: number;
  isActive: boolean;
  isSkipped: boolean;
  recurrence: string;
  productName?: string;
  productBrand?: string;
  productImage?: string;
  slotTier?: string;
}

export interface AdminRoutinePeriod {
  routineId: string;
  steps: AdminRoutineStep[];
}

export interface AdminRoutineResponse {
  latestAnalysisId?: string;
  routine: {
    morning?: AdminRoutinePeriod;
    night?: AdminRoutinePeriod;
  };
}

export interface AdminUserProduct {
  id: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  stepTypeKey?: string;
  isCatalog: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchAdminUsers(
  page = 1,
  pageSize = 20,
  search?: string
): Promise<AdminUsersResponse> {
  const headers = await getHeaders();
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search?.trim()) params.set("search", search.trim());
  const res = await fetch(`${base}?${params}`, { headers });
  if (!res.ok) throw new Error(`Erro ao listar usuários: ${res.status}`);
  return res.json();
}

export async function addUserCredits(userId: string, amount: number): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/credits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ao adicionar créditos: ${res.status}`);
  }
}

export async function activateUserPremium(
  userId: string,
  planKey: string,
  days: number
): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/premium`, {
    method: "POST",
    headers,
    body: JSON.stringify({ planKey, days }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ao ativar premium: ${res.status}`);
  }
}

export async function revokeUserPremium(userId: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/premium`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ao revogar premium: ${res.status}`);
  }
}

export async function fetchAdminUserSkinProfile(userId: string): Promise<AdminSkinProfile> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/skin-profile`, { headers });
  if (!res.ok) throw new Error(`Erro ao carregar perfil de pele: ${res.status}`);
  return res.json();
}

export async function fetchAdminUserRoutine(userId: string): Promise<AdminRoutineResponse> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/routine`, { headers });
  if (!res.ok) throw new Error(`Erro ao carregar rotina: ${res.status}`);
  return res.json();
}

export async function toggleRoutineStep(userId: string, stepId: string): Promise<{ isActive: boolean }> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps/${stepId}/toggle`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) throw new Error(`Erro ao alterar step: ${res.status}`);
  return res.json();
}

export async function regenerateUserRoutine(userId: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/routine/regenerate`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ao regenerar rotina: ${res.status}`);
  }
}

export async function fetchAdminUserProducts(userId: string): Promise<AdminUserProduct[]> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/products`, { headers });
  if (!res.ok) throw new Error(`Erro ao carregar produtos: ${res.status}`);
  return res.json();
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  stepTypeKey: string;
  imageUrl?: string;
}

export async function searchCatalogProducts(query?: string, stepType?: string): Promise<CatalogProduct[]> {
  const headers = await getHeaders();
  const params = new URLSearchParams();
  if (query?.trim()) params.set("search", query.trim());
  if (stepType?.trim()) params.set("stepType", stepType.trim());
  const res = await fetch(`${apiBaseUrl}/products/catalog?${params}`, { headers });
  if (!res.ok) throw new Error(`Erro ao buscar produtos: ${res.status}`);
  return res.json();
}

export async function updateRoutineStepType(userId: string, stepId: string, stepTypeKey: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps/${stepId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ stepTypeKey }),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar step: ${res.status}`);
}

export async function reorderRoutineStep(userId: string, stepId: string, direction: "up" | "down"): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps/${stepId}/order`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ direction }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ao reordenar: ${res.status}`);
  }
}

export async function moveRoutineStepPeriod(userId: string, stepId: string): Promise<{ newPeriod: string }> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps/${stepId}/period`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ao mover período: ${res.status}`);
  }
  return res.json();
}

export async function assignStepProduct(
  userId: string,
  stepId: string,
  productId: string | null
): Promise<{ productName?: string; productBrand?: string; productImage?: string }> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps/${stepId}/product`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) throw new Error(`Erro ao atribuir produto: ${res.status}`);
  return res.json();
}

export async function addRoutineStep(
  userId: string,
  body: { stepTypeKey: string; period: string; productId?: string }
): Promise<AdminRoutineStep & { routineId: string }> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ao adicionar step: ${res.status}`);
  }
  return res.json();
}

export async function deleteRoutineStep(userId: string, stepId: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${base}/${userId}/steps/${stepId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Erro ao remover step: ${res.status}`);
}
