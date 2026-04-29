import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { fetchAnalysisStatus } from "@/lib/analysisClient";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { AnalysisResponse } from "@/lib/analysis";
import { getSkinProfile, saveSkinProfile, SEX_LABELS, SKIN_TYPE_LABELS, GOAL_LABELS } from "@/lib/skinProfile";
import type { SkinProfile } from "@/lib/skinProfile";

type LoadingAnalysisViewProps = {
  imageUrl: string;
  analysisId: string;
  isDone: boolean;
  onComplete: () => void;
  onResult: (result: AnalysisResponse) => void;
  onError: (message: string) => void;
};

const loadingMessages = [
  "Iniciando a análise da sua pele...",
  "Analisando os níveis de oleosidade na zona T...",
  "Sua pele já apresenta pontos positivos — vamos potencializar ainda mais!",
  "Dica: até peles oleosas precisam de hidratação para se equilibrar.",
  "Detectando textura, poros e uniformidade...",
  "Sua pele tem características únicas que vamos valorizar.",
  "Peles secas costumam ter maior tendência à sensibilidade.",
  "Comparando seu perfil com milhares de padrões de pele...",
  "Boa notícia: sua pele já mostra sinais de equilíbrio em várias áreas.",
  "Quase lá. Estamos avaliando possíveis sinais de acne ou irritação.",
  "Dica: lavar o rosto em excesso pode aumentar a oleosidade.",
  "Identificando os ativos ideais para sua rotina...",
  "Sua pele tem um ótimo potencial de evolução com os cuidados certos.",
  "A barreira cutânea é essencial para manter sua pele saudável.",
  "Montando sua rotina personalizada de cuidados com a pele...",
  "Selecionando os melhores produtos para você...",
  "Dica: o protetor solar é o passo mais importante da rotina.",
  "Finalizando seu diagnóstico com base nos dados analisados...",
  "Pronto. Seu plano personalizado está quase chegando.",
];

const MESSAGE_INTERVAL_MS = 1600;
// 60 polls × 2s = 120s max before we give up
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2_000;
const FIRST_POLL_DELAY_MS = 1_500;
const QUESTIONNAIRE_DELAY_MS = 3_500;

// ─── Questionnaire steps ─────────────────────────────────────────────────────

type AgeOption = { label: string; value: string };
const AGE_OPTIONS: AgeOption[] = [
  { label: "Menos de 18", value: "< 18" },
  { label: "18 – 24", value: "18-24" },
  { label: "25 – 34", value: "25-34" },
  { label: "35 – 44", value: "35-44" },
  { label: "45 – 54", value: "45-54" },
  { label: "55+", value: "55+" },
];

type QStep = 0 | 1 | 2 | 3; // 4 steps (0-3)

const LoadingAnalysisView = ({ imageUrl, analysisId, isDone, onComplete, onResult, onError }: LoadingAnalysisViewProps) => {
  const [index, setIndex] = useState(0);
  const [questionStep, setQuestionStep] = useState<QStep | null>(null);

  const currentMessage = useMemo(() => loadingMessages[index] ?? loadingMessages[0], [index]);
  const baseProgress = Math.round(((index + 1) / loadingMessages.length) * 100);
  const progress = isDone ? 100 : Math.min(98, baseProgress);

  // Wrap onResult to also persist analyzedSkinType from AI
  const handleResult = useCallback(
    (result: AnalysisResponse) => {
      if (result.skinType && result.skinType !== "unknown") {
        saveSkinProfile({ analyzedSkinType: result.skinType });
      }
      onResult(result);
    },
    [onResult],
  );

  // Show questionnaire after delay if not already fully filled
  useEffect(() => {
    const profile = getSkinProfile();
    const alreadyFilled = profile.ageRange && profile.sex && profile.selfSkinType && profile.skinGoal;
    if (alreadyFilled) return;
    const timer = setTimeout(() => setQuestionStep(0), QUESTIONNAIRE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const advanceStep = (step: QStep) => {
    let next = step + 1;
    // Pula step 2 (tipo de pele) se já existe resultado de análise da IA
    if (next === 2 && getSkinProfile().analyzedSkinType) next = 3;
    if (next > 3) {
      setQuestionStep(null);
    } else {
      setQuestionStep(next as QStep);
    }
  };

  const handleAge = (value: string) => {
    saveSkinProfile({ ageRange: value });
    advanceStep(0);
  };

  const handleSex = (value: SkinProfile["sex"]) => {
    saveSkinProfile({ sex: value });
    advanceStep(1);
  };

  const handleSkinType = (value: SkinProfile["selfSkinType"]) => {
    saveSkinProfile({ selfSkinType: value });
    advanceStep(2);
  };

  const handleGoal = (value: SkinProfile["skinGoal"]) => {
    saveSkinProfile({ skinGoal: value });
    advanceStep(3);
  };

  // Rotate loading messages
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((previous) => {
        if (previous >= loadingMessages.length - 1) return previous;
        return previous + 1;
      });
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // Navigate to results once isDone flips and the final animation settles
  useEffect(() => {
    if (isDone) {
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(finishTimer);
    }
    return undefined;
  }, [isDone, onComplete]);

  // Poll backend for analysis completion
  useEffect(() => {
    if (!analysisId) return;

    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const schedulePoll = (delayMs: number) => {
      if (!mounted) return;
      pollTimer = setTimeout(doPoll, delayMs);
    };

    const doPoll = async () => {
      if (!mounted) return;
      attempts += 1;

      try {
        const status = await fetchAnalysisStatus(analysisId);
        if (!mounted) return;

        if (status.status === "completed" && status.result) {
          handleResult(status.result);
          return;
        }

        if (status.status === "failed") {
          onError(status.error ?? "Análise falhou. Tente novamente.");
          return;
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          onError("A análise demorou mais que o esperado. Tente novamente.");
          return;
        }

        schedulePoll(POLL_INTERVAL_MS);
      } catch {
        if (!mounted) return;
        if (attempts < MAX_POLL_ATTEMPTS) {
          schedulePoll(POLL_INTERVAL_MS);
        } else {
          onError("Erro ao verificar o status da análise. Tente novamente.");
        }
      }
    };

    schedulePoll(FIRST_POLL_DELAY_MS);

    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [analysisId, handleResult, onError]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <img
        src={imageUrl}
        alt="Analise em andamento"
        className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl"
      />
      <div className="absolute inset-0 bg-slate-950/60" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8 text-center">
        <LoadingSpinner size={112} progress={progress} />

        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45 }}
            className="mt-8 max-w-sm text-base font-medium leading-7 text-white/95"
          >
            {currentMessage}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Questionnaire overlay */}
      <AnimatePresence>
        {questionStep !== null && (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl bg-white/95 backdrop-blur-md px-5 pt-5 pb-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
                  Enquanto aguarda…
                </p>
                <p className="text-sm font-bold text-foreground">
                  {questionStep === 0 && "Qual é a sua faixa etária?"}
                  {questionStep === 1 && "Qual é o seu sexo?"}
                  {questionStep === 2 && "Como você descreveria sua pele?"}
                  {questionStep === 3 && "Qual é a sua meta para a pele?"}
                </p>
              </div>
              <button
                onClick={() => setQuestionStep(null)}
                className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={14} className="text-foreground" />
              </button>
            </div>

            {/* Step dots */}
            <div className="flex gap-1 mb-4">
              {[0, 1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full flex-1 transition-colors ${s <= questionStep ? "bg-primary" : "bg-black/10"}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {questionStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-3 gap-2"
                >
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleAge(opt.value)}
                      className="py-2.5 px-3 rounded-xl border border-border text-sm font-semibold text-foreground active:scale-95 transition-all hover:border-primary hover:bg-primary/5"
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}

              {questionStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-2"
                >
                  {(Object.keys(SEX_LABELS) as Array<keyof typeof SEX_LABELS>).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSex(key)}
                      className="py-3 px-4 rounded-xl border border-border text-sm font-semibold text-foreground text-left active:scale-[0.98] transition-all hover:border-primary hover:bg-primary/5"
                    >
                      {SEX_LABELS[key]}
                    </button>
                  ))}
                </motion.div>
              )}

              {questionStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {(Object.keys(SKIN_TYPE_LABELS) as Array<keyof typeof SKIN_TYPE_LABELS>).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSkinType(key)}
                      className="py-2.5 px-3 rounded-xl border border-border text-sm font-semibold text-foreground active:scale-95 transition-all hover:border-primary hover:bg-primary/5"
                    >
                      {SKIN_TYPE_LABELS[key]}
                    </button>
                  ))}
                </motion.div>
              )}

              {questionStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {(Object.keys(GOAL_LABELS) as Array<keyof typeof GOAL_LABELS>).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleGoal(key)}
                      className="py-2.5 px-3 rounded-xl border border-border text-sm font-semibold text-foreground active:scale-95 transition-all hover:border-primary hover:bg-primary/5"
                    >
                      {GOAL_LABELS[key]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoadingAnalysisView;
