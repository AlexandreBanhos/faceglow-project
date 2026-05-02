import { useCallback, useRef } from "react";
import { getAccessToken } from "@/lib/auth";
import { apiBaseUrl, apiRoutes } from "@/lib/api";

export type UseRoutineCompleteReturn = {
  markComplete: (period: "morning" | "night", localDate: string) => Promise<boolean>;
};

export function useRoutineComplete(): UseRoutineCompleteReturn {
  const guardRef = useRef<Set<string>>(new Set());

  const markComplete = useCallback(async (period: "morning" | "night", localDate: string): Promise<boolean> => {
    const key = `${localDate}::${period}`;
    if (guardRef.current.has(key)) return false;
    guardRef.current.add(key);

    try {
      const token = await getAccessToken();
      if (!token) { guardRef.current.delete(key); return false; }

      const res = await fetch(`${apiBaseUrl}${apiRoutes.routineMarkComplete}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ period, localDate }),
      });

      if (!res.ok) { guardRef.current.delete(key); return false; }
      return true;
    } catch {
      guardRef.current.delete(key);
      return false;
    }
  }, []);

  return { markComplete };
}
