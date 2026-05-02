import { apiClient } from "@/shared/services/api/ApiClient";
import { apiRoutes } from "@/lib/api";
import { type UserCatalogProduct, getUserCatalog, saveUserCatalog } from "@/lib/userCatalog";

export type { UserCatalogProduct };

type ApiProduct = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  createdAt?: string;
};

const toLocal = (p: ApiProduct): UserCatalogProduct => ({
  id: p.id,
  name: p.name,
  category: p.category ?? "",
  imageUrl: p.imageUrl || undefined,
  createdAt: p.createdAt ?? new Date().toISOString(),
});

export const fetchMyProducts = async (userId?: string): Promise<UserCatalogProduct[]> => {
  try {
    const res = await apiClient.get<ApiProduct[]>(apiRoutes.myProducts);
    if (res.ok && res.data) {
      const products = res.data.map(toLocal);
      if (userId) saveUserCatalog(products, userId);

      // Sincronizar produtos locais não persistidos (IDs temporários)
      const localOnly = getUserCatalog(userId).filter((p) => p.id.startsWith("up::"));
      for (const p of localOnly) {
        try {
          await createMyProduct({ name: p.name, category: p.category, imageUrl: p.imageUrl }, userId);
        } catch { /* ignora — tentará novamente no próximo carregamento */ }
      }

      return products;
    }
  } catch { /* usa fallback */ }

  return getUserCatalog(userId);
};

export const createMyProduct = async (
  data: { name: string; category?: string; imageUrl?: string },
  userId?: string,
): Promise<UserCatalogProduct> => {
  try {
    const res = await apiClient.post<ApiProduct>(apiRoutes.myProducts, data);
    if (res.ok && res.data) return toLocal(res.data);
  } catch { /* usa fallback */ }

  const fallback: UserCatalogProduct = {
    id: `up::${Date.now()}`,
    name: data.name,
    category: data.category ?? "",
    imageUrl: data.imageUrl,
    createdAt: new Date().toISOString(),
  };
  const existing = getUserCatalog(userId);
  saveUserCatalog([fallback, ...existing], userId);
  return fallback;
};

export const updateMyProduct = async (
  id: string,
  data: { name?: string; category?: string; imageUrl?: string },
): Promise<UserCatalogProduct> => {
  const res = await apiClient.patch<ApiProduct>(`${apiRoutes.myProducts}/${id}`, data);
  if (res.ok && res.data) return toLocal(res.data);
  throw new Error("Failed to update product");
};

export const deleteMyProduct = async (id: string): Promise<void> => {
  await apiClient.delete(`${apiRoutes.myProducts}/${id}`);
};
