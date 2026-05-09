import { createContext } from "react";

export interface UserStatus {
  userId: string;
  isPremium: boolean;
  isFullAccess: boolean;
  subscriptionType?: "credits" | "monthly" | "quarterly" | "annual";
  creditsRemaining: number;
  subscriptionStatus?: "active" | "expired" | "pending" | "failed";
  expiresAtUtc?: string;
  isLoading: boolean;
  /** true when status fetch failed — status is unknown, never show premium upsell */
  statusUnknown?: boolean;
}

export interface UserContextType {
  userStatus: UserStatus;
  setUserStatus: (status: UserStatus | ((prev: UserStatus) => UserStatus)) => void;
  refreshPremiumStatus: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const DEFAULT_USER_STATUS: UserStatus = {
  userId: "",
  isPremium: false,
  isFullAccess: false,
  subscriptionType: undefined,
  creditsRemaining: 0,
  subscriptionStatus: undefined,
  expiresAtUtc: undefined,
  isLoading: true,
};
