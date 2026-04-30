import { useEffect, useState } from "react";
import { checkAdminAccess } from "@/lib/admin-products";
import { getAdminCache, setAdminCache } from "@/lib/adminCache";

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(getAdminCache() ?? false);
  const [isLoading, setIsLoading] = useState<boolean>(getAdminCache() === null);

  useEffect(() => {
    const cached = getAdminCache();
    if (cached !== null) {
      setIsAdmin(cached);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    checkAdminAccess(controller.signal)
      .then((result) => {
        setAdminCache(result.isAdmin);
        setIsAdmin(result.isAdmin);
      })
      .catch(() => {
        setAdminCache(false);
        setIsAdmin(false);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  return { isAdmin, isLoading };
};
