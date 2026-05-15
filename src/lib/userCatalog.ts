export type UserCatalogProduct = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  imageUrl?: string;
  note?: string;
  defaultPeriod?: "morning" | "night" | "both";
  skinTypes?: string[];
  treatments?: string[];
  productType?: string;
  createdAt: string;
};

const STORAGE_KEY = (userId: string) => `faceglow-user-catalog-${userId}`;

export const getUserCatalog = (userId?: string): UserCatalogProduct[] => {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    return raw ? (JSON.parse(raw) as UserCatalogProduct[]) : [];
  } catch {
    return [];
  }
};

export const saveUserCatalog = (products: UserCatalogProduct[], userId?: string) => {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(products));
};
