/**
 * Tracking de conclusão de passos para usuários free.
 * Usa localStorage com chave compartilhada entre Dashboard e Routine page.
 * Não depende de UUIDs do backend — usa data + período + rótulo do passo.
 */

const key = (analysisId: string) => `faceglow-free-steps-${analysisId}`;

type FreeStepsState = Record<string, Record<string, boolean>>;
// { "2026-05-21": { "morning::limpeza": true, "night::hidratante": false } }

const load = (analysisId: string): FreeStepsState => {
  try {
    const raw = localStorage.getItem(key(analysisId));
    return raw ? (JSON.parse(raw) as FreeStepsState) : {};
  } catch {
    return {};
  }
};

const save = (analysisId: string, state: FreeStepsState) => {
  try {
    localStorage.setItem(key(analysisId), JSON.stringify(state));
  } catch { /* quota */ }
};

const stepKey = (period: string, label: string) =>
  `${period}::${label.toLowerCase().trim()}`;

export function isFreeStepDone(
  analysisId: string,
  dateStr: string,
  period: string,
  label: string,
): boolean {
  const state = load(analysisId);
  return Boolean(state[dateStr]?.[stepKey(period, label)]);
}

export function toggleFreeStep(
  analysisId: string,
  dateStr: string,
  period: string,
  label: string,
): boolean {
  const state = load(analysisId);
  if (!state[dateStr]) state[dateStr] = {};
  const k = stepKey(period, label);
  const next = !state[dateStr][k];
  state[dateStr][k] = next;
  save(analysisId, state);
  return next;
}

export function getFreeStepsForDay(
  analysisId: string,
  dateStr: string,
): Record<string, boolean> {
  return load(analysisId)[dateStr] ?? {};
}
