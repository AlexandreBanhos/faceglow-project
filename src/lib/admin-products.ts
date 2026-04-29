import { apiRoutes, apiBaseUrl } from "./api";
import { getAccessToken, getAccessTokenWithWait } from "./auth";

// Helper function for fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const timeout = options.timeout || 60000; // 60s default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
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
  console.log("[getAdminProducts] Starting fetch");
  
  try {
    const headers = await getHeaders();
    console.log("[getAdminProducts] Headers prepared, token present:", !!headers.Authorization);
    
    console.log("[getAdminProducts] Sending GET request with 30s timeout...");
    const response = await fetchWithTimeout(apiRoutes.adminProducts, {
      headers: headers,
      timeout: 60000,
    });

    console.log("[getAdminProducts] Response received, status:", response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("[getAdminProducts] Success, fetched", result.length, "products");
    return result;
  } catch (error) {
    console.error("[getAdminProducts] Exception:", error);
    throw error;
  }
}

export async function createAdminProduct(
  payload: CreateAdminProductPayload
): Promise<AdminProduct> {
  console.log("[createAdminProduct] Starting create");
  
  try {
    const headers = await getHeaders();
    console.log("[createAdminProduct] Headers prepared, token present:", !!headers.Authorization);
    
    console.log("[createAdminProduct] Sending POST request with 30s timeout...");
    const response = await fetchWithTimeout(apiRoutes.adminProducts, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      timeout: 60000,
    });

    console.log("[createAdminProduct] Response received, status:", response.status, response.statusText);

    if (!response.ok) {
      let errorMsg = `Failed to create product: ${response.statusText}`;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch {
        // If response is not JSON, use status text
      }
      console.error("[createAdminProduct] Error:", errorMsg);
      throw new Error(errorMsg);
    }

    const result = await response.json();
    console.log("[createAdminProduct] Success, created product:", result.id);
    return result;
  } catch (error) {
    console.error("[createAdminProduct] Exception:", error);
    throw error;
  }
}

export async function updateAdminProduct(
  id: string,
  payload: CreateAdminProductPayload
): Promise<AdminProduct> {
  console.log("[updateAdminProduct] Starting update for product:", id);
  
  try {
    const headers = await getHeaders();
    console.log("[updateAdminProduct] Headers prepared, token present:", !!headers.Authorization);
    
    console.log("[updateAdminProduct] Sending PUT request with 30s timeout...");
    const response = await fetchWithTimeout(`${apiRoutes.adminProducts}/${id}`, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify(payload),
      timeout: 60000,
    });

    console.log("[updateAdminProduct] Response received, status:", response.status, response.statusText);

    if (!response.ok) {
      let errorMsg = `Failed to update product: ${response.statusText}`;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch {
        // If response is not JSON, use status text
      }
      console.error("[updateAdminProduct] Error:", errorMsg);
      throw new Error(errorMsg);
    }

    const result = await response.json();
    console.log("[updateAdminProduct] Success, updated product:", result.id);
    return result;
  } catch (error) {
    console.error("[updateAdminProduct] Exception:", error);
    throw error;
  }
}

export async function deleteAdminProduct(id: string): Promise<void> {
  console.log("[deleteAdminProduct] Starting delete for product:", id);
  
  try {
    const headers = await getHeaders();
    console.log("[deleteAdminProduct] Headers prepared, token present:", !!headers.Authorization);
    
    console.log("[deleteAdminProduct] Sending DELETE request with 30s timeout...");
    const response = await fetchWithTimeout(`${apiRoutes.adminProducts}/${id}`, {
      method: "DELETE",
      headers: headers,
      timeout: 60000,
    });

    console.log("[deleteAdminProduct] Response received, status:", response.status, response.statusText);

    if (!response.ok) {
      let errorMsg = `Failed to delete product: ${response.statusText}`;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch {
        // If response is not JSON, use status text
      }
      console.error("[deleteAdminProduct] Error:", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("[deleteAdminProduct] Success, product deleted:", id);
  } catch (error) {
    console.error("[deleteAdminProduct] Exception:", error);
    throw error;
  }
}

export async function checkAdminAccess(signal?: AbortSignal): Promise<{ isAdmin: boolean }> {
  console.log("[checkAdminAccess] Starting check");
  
  try {
    const headers = await getHeaders();
    console.log("[checkAdminAccess] Headers prepared, token present:", !!headers.Authorization);
    
    console.log("[checkAdminAccess] Sending GET request with 30s timeout...");
    const response = await fetchWithTimeout(`${apiBaseUrl}/admin/me`, {
      headers: headers,
      timeout: 60000,
      signal,
    });

    console.log("[checkAdminAccess] Response received, status:", response.status, response.statusText);

    if (!response.ok) {
      console.error(`[checkAdminAccess] Check failed: ${response.status} ${response.statusText}`);
      throw new Error(`Not authorized: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("[checkAdminAccess] Success, isAdmin:", result.isAdmin);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("[checkAdminAccess] Request aborted (timeout)");
    } else {
      console.error("[checkAdminAccess] Exception:", error);
    }
    throw error;
  }
}

export async function promoteUserToAdmin(
  targetUserId: string
): Promise<{ message: string; isAdmin: boolean }> {
  console.log("[promoteUserToAdmin] Starting promote for user:", targetUserId);
  
  try {
    const headers = await getHeaders();
    console.log("[promoteUserToAdmin] Headers prepared, token present:", !!headers.Authorization);
    
    console.log("[promoteUserToAdmin] Sending POST request with 30s timeout...");
    const response = await fetchWithTimeout(`${apiBaseUrl}/admin/promote/${targetUserId}`, {
      method: "POST",
      headers: headers,
      timeout: 60000,
    });

    console.log("[promoteUserToAdmin] Response received, status:", response.status, response.statusText);

    if (!response.ok) {
      let errorMsg = `Failed to promote user: ${response.statusText}`;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch {
        // If response is not JSON, use status text
      }
      console.error("[promoteUserToAdmin] Error:", errorMsg);
      throw new Error(errorMsg);
    }

    const result = await response.json();
    console.log("[promoteUserToAdmin] Success, promoted user:", targetUserId);
    return result;
  } catch (error) {
    console.error("[promoteUserToAdmin] Exception:", error);
    throw error;
  }
}

export async function searchAdminProducts(name: string): Promise<AdminProduct[]> {
  const headers = await getHeaders();
  const response = await fetchWithTimeout(`${apiRoutes.adminProducts}?search=${encodeURIComponent(name)}`, {
    headers,
    timeout: 15000,
  });
  if (!response.ok) throw new Error("Falha ao buscar produto");
  return response.json();
}

export async function patchAdminProductImage(id: string, imageUrl: string): Promise<AdminProduct> {
  const headers = await getHeaders();
  // Fetch current product first to avoid overwriting other fields with nulls
  const getResp = await fetchWithTimeout(`${apiRoutes.adminProducts}?search=`, { headers, timeout: 15000 });
  // We only need to PATCH imageUrl — use PUT with minimal required fields pulled from a search
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

  const response = await fetchWithTimeout(`${apiRoutes.adminProducts}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
    timeout: 30000,
  });
  if (!response.ok) throw new Error("Falha ao atualizar produto");
  return response.json();
}
