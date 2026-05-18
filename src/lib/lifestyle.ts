import { apiBaseUrl } from "@/lib/api";
import { assertSupabaseConfigured } from "@/lib/supabase";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";

export interface LifestyleUpdatePayload {
  usesMakeup: boolean;
  budgetRange: string | null;
  pregnancySafe: boolean;
  lifestyleData: LifestyleAnswers;
}

async function getFreshToken(): Promise<string | null> {
  const client = assertSupabaseConfigured();
  // refreshSession garante token válido mesmo após longa inatividade (ex: preencher questionário)
  const { data } = await client.auth.refreshSession();
  return data.session?.access_token ?? null;
}

export async function updateLifestyle(payload: LifestyleUpdatePayload): Promise<void> {
  const token = await getFreshToken();
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch(`${apiBaseUrl}/profile/lifestyle`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `Erro ${res.status}`);
  }
}

export interface LifestyleStatus {
  questionnaireCompletedAt: string | null;
}

export async function getLifestyleStatus(): Promise<LifestyleStatus> {
  const token = await getFreshToken();
  if (!token) return { questionnaireCompletedAt: null };

  const res = await fetch(`${apiBaseUrl}/profile/lifestyle`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { questionnaireCompletedAt: null };
  return res.json() as Promise<LifestyleStatus>;
}

export interface RoutineVersionItem {
  version: number;
  changedBy: string;
  changeType: string;
  changeSummary: string | null;
  createdAt: string;
}

export async function fetchRoutineVersions(routineId: string): Promise<RoutineVersionItem[]> {
  const token = await getFreshToken();
  if (!token) return [];

  const res = await fetch(`${apiBaseUrl}/routines/${routineId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<RoutineVersionItem[]>;
}

export async function restoreRoutineVersion(routineId: string, version: number): Promise<void> {
  const token = await getFreshToken();
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch(`${apiBaseUrl}/routines/${routineId}/restore/${version}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Erro ${res.status}`);
  }
}
