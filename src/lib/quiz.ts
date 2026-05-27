import { apiClient } from "@/shared/services/api/ApiClient";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";
import { apiRoutes } from "@/lib/api";

export async function fetchQuizAnswers(): Promise<LifestyleAnswers | null> {
  try {
    const res = await apiClient.get<LifestyleAnswers>(apiRoutes.quizAnswers, { timeout: 10000, retries: 1 });
    if (res.ok && res.data) return res.data;
    return null;
  } catch {
    return null;
  }
}

export async function saveQuizAnswers(answers: LifestyleAnswers): Promise<void> {
  try {
    await apiClient.put(apiRoutes.quizAnswers, answers, { timeout: 10000, retries: 1 });
  } catch {
    // silently fail — localStorage já tem o dado
  }
}
