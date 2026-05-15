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

const toLocal = (p: ApiProduct, local?: UserCatalogProduct): UserCatalogProduct => ({
  id: p.id,
  name: p.name,
  brand: local?.brand || p.brand || undefined,
  category: p.category ?? local?.category ?? "",
  imageUrl: p.imageUrl || local?.imageUrl || undefined,
  note: local?.note,
  defaultPeriod: local?.defaultPeriod,
  skinTypes: local?.skinTypes,
  treatments: local?.treatments,
  productType: local?.productType,
  createdAt: p.createdAt ?? new Date().toISOString(),
});

export const fetchMyProducts = async (userId?: string): Promise<UserCatalogProduct[]> => {
  try {
    const res = await apiClient.get<ApiProduct[]>(apiRoutes.myProducts);
    if (res.ok && res.data) {
      const localProducts = getUserCatalog(userId);
      const products = res.data.map(p => {
        const local = localProducts.find(lp => lp.id === p.id);
        return toLocal(p, local);
      });
      saveUserCatalog(products, userId);

      const localOnly = localProducts.filter((p) => p.id.startsWith("up::"));
      for (const p of localOnly) {
        try {
          await createMyProduct({ name: p.name, brand: p.brand, category: p.category, imageUrl: p.imageUrl }, userId);
        } catch { /* tentará novamente no próximo carregamento */ }
      }

      return products;
    }
  } catch { /* usa fallback */ }

  return getUserCatalog(userId);
};

type ProductData = {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  note?: string;
  defaultPeriod?: "morning" | "night" | "both";
  skinTypes?: string[];
  treatments?: string[];
  productType?: string;
};

export const createMyProduct = async (
  data: ProductData,
  userId?: string,
): Promise<UserCatalogProduct> => {
  try {
    const res = await apiClient.post<ApiProduct>(apiRoutes.myProducts, {
      name: data.name,
      brand: data.brand,
      category: data.category,
      imageUrl: data.imageUrl,
    });
    if (res.ok && res.data) {
      return {
        ...toLocal(res.data),
        brand: data.brand || undefined,
        note: data.note || undefined,
        defaultPeriod: data.defaultPeriod,
        skinTypes: data.skinTypes,
        treatments: data.treatments,
        productType: data.productType,
      };
    }
  } catch { /* usa fallback */ }

  const fallback: UserCatalogProduct = {
    id: `up::${Date.now()}`,
    name: data.name,
    brand: data.brand || undefined,
    category: data.category ?? "",
    imageUrl: data.imageUrl,
    note: data.note || undefined,
    defaultPeriod: data.defaultPeriod,
    skinTypes: data.skinTypes,
    treatments: data.treatments,
    productType: data.productType,
    createdAt: new Date().toISOString(),
  };
  const existing = getUserCatalog(userId);
  saveUserCatalog([fallback, ...existing], userId);
  return fallback;
};

export const updateMyProduct = async (
  id: string,
  data: ProductData,
): Promise<UserCatalogProduct> => {
  const res = await apiClient.patch<ApiProduct>(`${apiRoutes.myProducts}/${id}`, {
    name: data.name,
    brand: data.brand,
    category: data.category,
    imageUrl: data.imageUrl,
  });
  if (res.ok && res.data) {
    return {
      ...toLocal(res.data),
      brand: data.brand || res.data.brand || undefined,
      note: data.note || undefined,
      defaultPeriod: data.defaultPeriod,
      skinTypes: data.skinTypes,
      treatments: data.treatments,
      productType: data.productType,
    };
  }
  throw new Error("Failed to update product");
};

export const deleteMyProduct = async (id: string): Promise<void> => {
  await apiClient.delete(`${apiRoutes.myProducts}/${id}`);
};
