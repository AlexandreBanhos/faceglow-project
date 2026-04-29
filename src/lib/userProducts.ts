import { apiClient } from "@/shared/services/api/ApiClient";
import { apiRoutes } from "@/lib/api";
import { type UserCatalogProduct, getUserCatalog, saveUserCatalog } from "@/lib/userCatalog";

export type { UserCatalogProduct };

type ApiProduct = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  note?: string;
  createdAt: string;
};

const toLocal = (p: ApiProduct): UserCatalogProduct => ({
  id: p.id,
  name: p.name,
  category: p.category,
  imageUrl: p.imageUrl || undefined,
  note: p.note || undefined,
  createdAt: p.createdAt,
});

export const fetchMyProducts = async (userId?: string): Promise<UserCatalogProduct[]> => {
  try {
    const res = await apiClient.get<ApiProduct[]>(apiRoutes.myProducts);
    if (res.ok && res.data) {
      const products = res.data.map(toLocal);
      console.debug("[fetchMyProducts] ✅ Produtos do backend carregados", { count: products.length });
      if (userId) saveUserCatalog(products, userId);
      
      // Tentar sincronizar produtos locais que ainda não foram salvos
      const localProducts = getUserCatalog(userId);
      const localOnlyProducts = localProducts.filter(p => p.id.startsWith('up::'));
      if (localOnlyProducts.length > 0) {
        console.warn("[fetchMyProducts] ⚠️ Encontrados produtos locais não sincronizados", {
          count: localOnlyProducts.length,
          products: localOnlyProducts.map(p => p.name)
        });
        // Tentar salvar cada um no backend
        for (const p of localOnlyProducts) {
          try {
            const saved = await createMyProduct({
              name: p.name,
              category: p.category,
              imageUrl: p.imageUrl,
              note: p.note,
            }, userId);
            console.debug("[fetchMyProducts] ✅ Produto local sincronizado", { name: p.name, newId: saved.id });
          } catch (error) {
            console.error("[fetchMyProducts] ❌ Falha ao sincronizar produto local", { name: p.name, error });
          }
        }
      }
      
      return products;
    }
    console.warn("[fetchMyProducts] ⚠️ API retornou erro", { status: res.status });
  } catch (error) {
    console.error("[fetchMyProducts] ❌ Erro ao buscar produtos", { error: String(error) });
  }
  
  const local = getUserCatalog(userId);
  console.debug("[fetchMyProducts] 📱 Usando fallback localStorage", { count: local.length });
  return local;
};

export const createMyProduct = async (
  data: { name: string; category: string; imageUrl?: string; note?: string },
  userId?: string
): Promise<UserCatalogProduct> => {
  try {
    const res = await apiClient.post<ApiProduct>(apiRoutes.myProducts, data);
    if (res.ok && res.data) {
      console.debug("[createMyProduct] ✅ Produto criado no backend", { id: res.data.id, name: res.data.name });
      return toLocal(res.data);
    }
    console.warn("[createMyProduct] ⚠️ API retornou erro", { status: res.status, ok: res.ok });
  } catch (error) {
    console.error("[createMyProduct] ❌ Erro ao criar no backend", { error: String(error), data });
  }

  // Fallback para localStorage
  const fallback: UserCatalogProduct = {
    id: `up::${Date.now()}`,
    name: data.name,
    category: data.category,
    imageUrl: data.imageUrl,
    note: data.note,
    createdAt: new Date().toISOString(),
  };
  console.warn("[createMyProduct] 📱 Usando fallback localStorage (ID local)", { fallbackId: fallback.id });
  const existing = getUserCatalog(userId);
  saveUserCatalog([fallback, ...existing], userId);
  return fallback;
};

export const updateMyProduct = async (
  id: string,
  data: { name: string; category: string; imageUrl?: string; note?: string }
): Promise<UserCatalogProduct> => {
  const res = await apiClient.put<ApiProduct>(`${apiRoutes.myProducts}/${id}`, data);
  if (res.ok && res.data) {
    return toLocal(res.data);
  }
  throw new Error("Failed to update product");
};

export const deleteMyProduct = async (id: string): Promise<void> => {
  await apiClient.delete(`${apiRoutes.myProducts}/${id}`);
};
