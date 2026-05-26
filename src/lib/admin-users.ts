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
