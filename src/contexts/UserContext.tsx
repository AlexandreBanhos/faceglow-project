import { useState, useCallback, ReactNode } from "react";
import { UserContext, UserContextType, DEFAULT_USER_STATUS, UserStatus } from "@/contexts/UserContextTypes";

const CACHE_KEY = "fg_ustatus_v2";

// TTL inteligente baseado no tipo de plano:
// - Premium com data de expiração: expira 2h antes do fim do plano
// - Premium sem data (mensal/anual renovado): 24h
// - Free: 2h (créditos mudam após análise)
function computeCacheTTL(status: UserStatus): number {
  if (status.isPremium) {
    if (status.expiresAtUtc) {
      const expiryMs = new Date(status.expiresAtUtc).getTime();
      const safeExpiry = expiryMs - 2 * 60 * 60_000; // 2h antes de expirar
      const ttl = safeExpiry - Date.now();
      return Math.max(5 * 60_000, Math.min(ttl, 30 * 24 * 60 * 60_000));
    }
    return 24 * 60 * 60_000; // 24h
  }
  return 2 * 60 * 60_000; // 2h para free/créditos
}

interface StoredStatus { data: UserStatus; ts: number; ttl: number; }

export const readUserStatusCache = (): UserStatus | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw) as StoredStatus;
    if (Date.now() - ts > ttl) return null;
    return data;
  } catch { return null; }
};

export const writeUserStatusCache = (status: UserStatus) => {
  try {
    const ttl = computeCacheTTL(status);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: status, ts: Date.now(), ttl }));
  } catch {}
};

export const clearUserStatusCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem("fg_ustatus_v1"); // limpa chave legada
  } catch {}
};

// Ref global: permite que refreshPremiumStatus() chame o fetch real registrado por useUserStatus
let _refreshFn: (() => Promise<void>) | null = null;
export const setStatusRefreshFn = (fn: (() => Promise<void>) | null) => { _refreshFn = fn; };

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userStatus, setUserStatus] = useState<UserStatus>(() => {
    const cached = readUserStatusCache();
    if (cached) return { ...cached, isLoading: false };
    return DEFAULT_USER_STATUS;
  });

  const refreshPremiumStatus = useCallback(async () => {
    clearUserStatusCache();
    if (_refreshFn) await _refreshFn();
  }, []);

  const value: UserContextType = {
    userStatus,
    setUserStatus,
    refreshPremiumStatus,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
