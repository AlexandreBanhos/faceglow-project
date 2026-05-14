import { apiRoutes, apiBaseUrl } from "./api";
import { getAccessTokenWithWait } from "./auth";

const adminProductsUrl = `${apiBaseUrl}${apiRoutes.adminProducts}`;

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const timeout = options.timeout || 60000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  skinTypes: string[];
  concerns: string[];
  actives: string[];
  strengthLevel: string;
  period: string[];
  priceRange: string;
  priceAvg?: number;
  priority: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface CreateAdminProductPayload {
  name: string;
  description: string;
  brand: string;
  category: string;
  skinTypes: string[];
  concerns: string[];
  actives: string[];
  strengthLevel: string;
  period: string[];
  priceRange: string;
  priceAvg?: number;
  priority: number;
  isActive: boolean;
  imageUrl?: string;
}

async function getHeaders() {
  const token = await getAccessTokenWithWait(5000);
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(adminProductsUrl, { headers, timeout: 60000 });
  if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
  return response.json();
}

export async function createAdminProduct(payload: CreateAdminProductPayload): Promise<AdminProduct> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(adminProductsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    timeout: 60000,
  });
  if (!response.ok) {
    let errorMsg = `Failed to create product: ${response.statusText}`;
    try { const e = await response.json(); errorMsg = e.error || errorMsg; } catch { /* noop */ }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function updateAdminProduct(id: string, payload: CreateAdminProductPayload): Promise<AdminProduct> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(`${adminProductsUrl}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
    timeout: 60000,
  });
  if (!response.ok) {
    let errorMsg = `Failed to update product: ${response.statusText}`;
    try { const e = await response.json(); errorMsg = e.error || errorMsg; } catch { /* noop */ }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(`${adminProductsUrl}/${id}`, {
    method: "DELETE",
    headers,
    timeout: 60000,
  });
  if (!response.ok) {
    let errorMsg = `Failed to delete product: ${response.statusText}`;
    try { const e = await response.json(); errorMsg = e.error || errorMsg; } catch { /* noop */ }
    throw new Error(errorMsg);
  }
}

export async function checkAdminAccess(signal?: AbortSignal): Promise<{ isAdmin: boolean }> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(`${apiBaseUrl}/admin/me`, {
    headers,
    timeout: 60000,
    signal,
  });
  if (!response.ok) throw new Error(`Not authorized: ${response.statusText}`);
  return response.json();
}

export async function promoteUserToAdmin(targetUserId: string): Promise<{ message: string; isAdmin: boolean }> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(`${apiBaseUrl}/admin/promote/${targetUserId}`, {
    method: "POST",
    headers,
    timeout: 60000,
  });
  if (!response.ok) {
    let errorMsg = `Failed to promote user: ${response.statusText}`;
    try { const e = await response.json(); errorMsg = e.error || errorMsg; } catch { /* noop */ }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function searchAdminProducts(name: string): Promise<AdminProduct[]> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(`${adminProductsUrl}?search=${encodeURIComponent(name)}`, {
    headers,
    timeout: 15000,
  });
  if (!response.ok) throw new Error("Falha ao buscar produto");
  return response.json();
}

export async function patchAdminProductImage(id: string, imageUrl: string): Promise<AdminProduct> {
  const headers = await getHeaders();
  const getResp = await fetchWithTimeout(`${adminProductsUrl}?search=`, { headers, timeout: 15000 });
  const allProducts: AdminProduct[] = getResp.ok ? await getResp.json() : [];
  const product = allProducts.find((p) => p.id === id);
  if (!product) throw new Error("Produto não encontrado");

  const payload = {
    name: product.name,
    description: product.description ?? "",
    brand: product.brand ?? "",
    category: product.category ?? "",
    skinTypes: product.skinTypes ?? [],
    concerns: product.concerns ?? [],
    actives: product.actives ?? [],
    strengthLevel: product.strengthLevel ?? "low",
    period: product.period ?? [],
    priceRange: product.priceRange ?? "medium",
    priceAvg: product.priceAvg,
    priority: product.priority ?? 0,
    isActive: product.isActive,
    imageUrl,
  };

  const response = await fetchWithTimeout(`${adminProductsUrl}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
    timeout: 30000,
  });
  if (!response.ok) throw new Error("Falha ao atualizar produto");
  return response.json();
}
