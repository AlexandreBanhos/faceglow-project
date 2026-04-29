import { useEffect, useState } from "react";
import { checkAdminAccess } from "@/lib/admin-products";

let cachedIsAdmin: boolean | null = null;

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(cachedIsAdmin ?? false);
  const [isLoading, setIsLoading] = useState<boolean>(cachedIsAdmin === null);

  useEffect(() => {
    if (cachedIsAdmin !== null) {
      setIsAdmin(cachedIsAdmin);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    checkAdminAccess(controller.signal)
      .then((result) => {
        cachedIsAdmin = result.isAdmin;
        setIsAdmin(result.isAdmin);
      })
      .catch(() => {
        cachedIsAdmin = false;
        setIsAdmin(false);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  return { isAdmin, isLoading };
};
