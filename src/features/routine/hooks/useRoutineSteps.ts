import { useState, useCallback, useEffect } from "react";
import {
  fetchRoutineSteps,
  addRoutineStep,
  updateRoutineStep,
  removeRoutineStep,
  reorderRoutineSteps,
  migrateRoutineFromCustomizations,
  invalidateAnalysisCache,
  type RoutineStep,
} from "@/lib/analysisClient";

export type UseRoutineStepsReturn = {
  steps: RoutineStep[];
  isLoading: boolean;
  reload: () => Promise<void>;
  addStep: (data: { period: string; productName: string; category?: string; imageUrl?: string }) => Promise<void>;
  patchStep: (stepId: string, patch: Parameters<typeof updateRoutineStep>[2]) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  reorder: (period: "morning" | "night", stepIds: string[]) => Promise<void>;
};

export function useRoutineSteps(analysisId: string | undefined): UseRoutineStepsReturn {
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [isLoading, setIsLoading] = useState(true); // começa carregando

  const reload = useCallback(async () => {
    if (!analysisId) return;
    setIsLoading(true);
    try {
      const fresh = await fetchRoutineSteps(analysisId);
      setSteps(fresh);

      // one-time migration from customizations_json blob
      const migKey = `faceglow-migrated-${analysisId}`;
      if (fresh.length > 0 && !localStorage.getItem(migKey)) {
        await migrateRoutineFromCustomizations(analysisId);
        localStorage.setItem(migKey, "1");
      }
    } finally {
      setIsLoading(false);
    }
  }, [analysisId]);

  const addStep = useCallback(async (data: { period: string; productName: string; category?: string; imageUrl?: string }) => {
    if (!analysisId) return;
    await addRoutineStep(analysisId, data);
    await reload();
    invalidateAnalysisCache();
  }, [analysisId, reload]);

  const patchStep = useCallback(async (stepId: string, patch: Parameters<typeof updateRoutineStep>[2]) => {
    if (!analysisId) return;
    // Optimistic update
    setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, ...patch } as RoutineStep : s));
    await updateRoutineStep(analysisId, stepId, patch);
  }, [analysisId]);

  const deleteStep = useCallback(async (stepId: string) => {
    if (!analysisId) return;
    // Optimistic update
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    await removeRoutineStep(analysisId, stepId);
    invalidateAnalysisCache();
  }, [analysisId]);

  const reorder = useCallback(async (period: "morning" | "night", stepIds: string[]) => {
    if (!analysisId) return;
    // Optimistic update: remap step_order
    setSteps((prev) => {
      const updated = prev.map((s) => {
        const idx = stepIds.indexOf(s.id);
        return s.period === period && idx >= 0 ? { ...s, stepOrder: idx } : s;
      });
      return updated;
    });
    await reorderRoutineSteps(analysisId, period, stepIds);
  }, [analysisId]);

  // Auto-load quando analysisId muda
  useEffect(() => {
    reload();
  }, [reload]);

  return { steps, isLoading, reload, addStep, patchStep, deleteStep, reorder };
}
