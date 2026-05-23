import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchAnalysisStatus } from "@/lib/analysisClient";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { AnalysisResponse } from "@/lib/analysis";

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

const MESSAGE_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2_000;
const FIRST_POLL_DELAY_MS = 1_500;

const LoadingAnalysisView = ({ imageUrl, analysisId, isDone, onComplete, onResult, onError }: LoadingAnalysisViewProps) => {
  const [index, setIndex] = useState(0);

  const currentMessage = useMemo(() => loadingMessages[index] ?? loadingMessages[0], [index]);
  const baseProgress = Math.round(((index + 1) / loadingMessages.length) * 100);
  const progress = isDone ? 100 : Math.min(98, baseProgress);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((previous) => {
        if (previous >= loadingMessages.length - 1) return previous;
        return previous + 1;
      });
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDone) {
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(finishTimer);
    }
    return undefined;
  }, [isDone, onComplete]);

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
          onResult(status.result);
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
  }, [analysisId, onResult, onError]);

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
    </div>
  );
};

export default LoadingAnalysisView;
