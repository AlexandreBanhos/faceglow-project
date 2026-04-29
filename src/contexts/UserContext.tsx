import { useState, useCallback, ReactNode } from "react";
import { UserContext, UserContextType, DEFAULT_USER_STATUS, UserStatus } from "@/contexts/UserContextTypes";

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userStatus, setUserStatus] = useState<UserStatus>(DEFAULT_USER_STATUS);

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
