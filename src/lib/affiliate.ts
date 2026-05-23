import { apiBaseUrl } from "@/lib/api";
import { getAccessTokenWithWait } from "@/lib/auth";

const REF_KEY   = "fg_ref_code";
const REF_EXP   = "fg_ref_exp";
const TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 dias

// ── Captura e persiste o código da URL (?ref=CODIGO) ─────────────────────────

export function captureReferralFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref")?.toLowerCase().trim();
  if (!code) return;

  // Só grava se não há código já ativo
  const existing = getStoredReferral();
  if (existing) return;

  localStorage.setItem(REF_KEY, code);
  localStorage.setItem(REF_EXP, String(Date.now() + TTL_MS));
}

export function getStoredReferral(): string | null {
  const code = localStorage.getItem(REF_KEY);
  const exp  = Number(localStorage.getItem(REF_EXP) ?? 0);
  if (!code) return null;
  if (Date.now() > exp) { clearReferral(); return null; }
  return code;
}

export function clearReferral(): void {
  localStorage.removeItem(REF_KEY);
  localStorage.removeItem(REF_EXP);
}

// ── Envia o código ao backend após o cadastro ─────────────────────────────────

export async function attachReferralAfterSignup(): Promise<void> {
  const code = getStoredReferral();
  if (!code) return;

  const token = await getAccessTokenWithWait(5000);
  if (!token) return;

  try {
    await fetch(`${apiBaseUrl}/affiliates/attach`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    clearReferral(); // limpa após gravar com sucesso
  } catch { /* silencia — o código expira em 30 dias */ }
}

// ── Valida código (antes de mostrar badge) ────────────────────────────────────

export async function validateAffiliateCode(code: string): Promise<{ valid: boolean; name?: string } | null> {
  try {
    const res = await fetch(`${apiBaseUrl}/affiliates/validate/${encodeURIComponent(code)}`);
    if (!res.ok) return { valid: false };
    return await res.json() as { valid: boolean; name?: string };
  } catch {
    return null;
  }
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export interface AffiliateRow {
  id: string;
  code: string;
  name: string;
  email?: string;
  commissionRate: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  totalConversions: number;
  totalSalesCents: number;
  totalCommCents: number;
  pendingCommCents: number;
}

export interface AffiliateConversionRow {
  id: string;
  userId: string;
  planKey: string;
  amountCents: number;
  commissionCents: number;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessTokenWithWait(5000);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` };
}

export async function adminFetchAffiliates(): Promise<AffiliateRow[]> {
  const res = await fetch(`${apiBaseUrl}/admin/affiliates`, { headers: await authHeaders() });
  if (!res.ok) throw new Error("Erro ao buscar afiliados");
  return res.json() as Promise<AffiliateRow[]>;
}

export async function adminCreateAffiliate(data: {
  name: string; code: string; commissionRate: number; email?: string; notes?: string;
}): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/affiliates`, {
    method: "POST", headers: await authHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Erro ao criar afiliado");
  }
}

export async function adminUpdateAffiliate(id: string, data: {
  name?: string; commissionRate?: number; isActive?: boolean; notes?: string;
}): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/affiliates/${id}`, {
    method: "PUT", headers: await authHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar afiliado");
}

export async function adminFetchConversions(affiliateId: string): Promise<AffiliateConversionRow[]> {
  const res = await fetch(`${apiBaseUrl}/admin/affiliates/${affiliateId}/conversions`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao buscar conversões");
  return res.json() as Promise<AffiliateConversionRow[]>;
}

export async function adminPayout(affiliateId: string, conversionIds: string[], notes?: string): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/affiliates/${affiliateId}/payout`, {
    method: "POST", headers: await authHeaders(),
    body: JSON.stringify({ conversionIds, notes }),
  });
  if (!res.ok) throw new Error("Erro ao registrar pagamento");
}
