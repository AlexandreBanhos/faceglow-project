import { useState, useCallback, ReactNode } from "react";
import { UserContext, UserContextType, DEFAULT_USER_STATUS, UserStatus } from "@/contexts/UserContextTypes";

const CACHE_KEY = "fg_ustatus_v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 min

export const readUserStatusCache = (): UserStatus | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: UserStatus; ts: number };
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

export const writeUserStatusCache = (status: UserStatus) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: status, ts: Date.now() }));
  } catch {}
};

export const clearUserStatusCache = () => {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userStatus, setUserStatus] = useState<UserStatus>(() => {
    const cached = readUserStatusCache();
    // Cache hit → usa imediatamente sem isLoading (stale-while-revalidate)
    if (cached) return { ...cached, isLoading: false };
    return DEFAULT_USER_STATUS;
  });

  const refreshPremiumStatus = useCallback(async () => {
    // Será preenchido no hook useUserStatus
  }, []);

  const value: UserContextType = {
    userStatus,
    setUserStatus,
    refreshPremiumStatus,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
