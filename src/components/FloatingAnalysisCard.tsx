import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import MetricGlassCard from "@/components/analyze/MetricGlassCard";
import type { AnalysisPoints } from "@/lib/analysis";

type LandmarkPoint = { x: number; y: number };

interface FloatingAnalysisCardProps {
  imageUrl: string;
  onClose: () => void;
  isOpen: boolean;
  landmarkPoints?: LandmarkPoint[];
  metricCards: Array<{ label: string; value: number }>;
  facialPoints?: AnalysisPoints;
  skinAge?: number;
  confidence?: number;
  skinType?: string;
}

const METRIC_LABELS_PT: Record<string, string> = {
  acne: "Acne",
  moisture: "Umidade",
  umidade: "Umidade",
  wrinkles: "Rugas",
  rugas: "Rugas",
  oiliness: "Oleosidade",
  oleosidade: "Oleosidade",
  darkspots: "Manchas",
  dark_spots: "Manchas",
  manchas: "Manchas",
  hydration: "Hidratação",
  hidratacao: "Hidratação",
  sensibilidade: "Sensibilidade",
  sensitivity: "Sensibilidade",
  poros: "Poros",
  olheiras: "Olheiras",
  linhasfinas: "Linhas finas",
  linhas_finas: "Linhas finas",
  vermelhidao: "Vermelhidão",
  espinhasativas: "Espinhas ativas",
  espinhas_ativas: "Espinhas ativas",
  cravos: "Cravos",
  ressecamento: "Ressecamento",
};

const normalizeMetricLabel = (label: string) => {
  const key = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");

  return METRIC_LABELS_PT[key] ?? label;
};

export const FloatingAnalysisCard = ({
  imageUrl,
  onClose,
  isOpen,
  metricCards,
  skinAge,
  confidence,
}: FloatingAnalysisCardProps) => {
  if (!isOpen) return null;

  const [centerIndex, setCenterIndex] = useState(2);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const featuredMetrics = metricCards
    .slice(0, 5)
    .map((metric) => ({
      ...metric,
      label: normalizeMetricLabel(metric.label),
    }))
    .sort((a, b) => b.value - a.value);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const cardWidth = 100; // tamanho md (88px) + gap (12px)
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      const newCenterIndex = Math.round(containerCenter / cardWidth);
      setCenterIndex(newCenterIndex);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <style>{`
        [data-scroll-container]::-webkit-scrollbar {
          display: none !important;
        }
        [data-scroll-container] {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-0 z-[999] bg-[#fbf6f1]"
        onClick={onClose}
      >
      <motion.div
        className="relative h-[100svh] w-full overflow-hidden bg-[#fbf6f1] pointer-events-auto"
        onClick={(event) => event.stopPropagation()}
        style={{
          overflowY: "hidden",
          overflowX: "hidden",
        }}
      >
        <img
          src={imageUrl}
          alt="Foto analisada"
          className="absolute inset-0 h-full w-full object-cover saturate-[0.96]"
          onError={(event) => {
            event.currentTarget.src =
              "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1600&fit=crop";
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fbf6f1]/82 via-[#fbf6f1]/8 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36svh] bg-[linear-gradient(0deg,rgba(251,246,241,0.98)_0%,rgba(245,236,242,0.94)_42%,rgba(248,232,238,0.62)_72%,rgba(251,246,241,0)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32svh] bg-[radial-gradient(85%_90%_at_50%_100%,rgba(232,169,194,0.54)_0%,rgba(221,182,147,0.42)_44%,rgba(251,246,241,0)_84%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30svh] backdrop-blur-[20px] [mask-image:linear-gradient(to_top,black_38%,transparent_100%)]" />
        <div className="pointer-events-none absolute -bottom-16 left-1/2 h-[34svh] w-[125vw] -translate-x-1/2 rounded-[999px] bg-[var(--grad-coral-soft)] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-[-18vw] h-[26svh] w-[70vw] rounded-[999px] bg-white/80 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-8 -top-24 h-56 rounded-full bg-white/55 blur-3xl" />

        <div className="relative z-20 grid grid-cols-[40px_1fr_40px] items-center px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7ea]/58 text-[var(--fg-ink-2)] shadow-[0_10px_30px_-22px_rgba(80,40,60,0.45)] backdrop-blur-2xl transition hover:bg-white/70"
            aria-label="Voltar"
          >
            <ArrowLeft size={17} strokeWidth={1.8} />
          </button>

          <div className="mx-auto rounded-full bg-[#fff7ea]/68 px-4 py-2 text-center text-[12px] font-semibold tracking-[-0.01em] text-[var(--fg-ink)] shadow-[0_12px_34px_-24px_rgba(80,40,60,0.42)] backdrop-blur-2xl">
            Idade da pele: {skinAge ?? "--"}
          </div>

          <div />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30 h-auto px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-4 sm:pt-6 flex flex-col items-center gap-3 sm:gap-4">
          {/* Carrossel de Metrics */}
          <motion.div
            ref={scrollContainerRef}
            data-scroll-container
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 sm:-mx-6 px-4 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none]"
            style={{
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
              scrollPaddingLeft: "max(0.5rem, calc((100vw - 110px) / 2))",
            } as any}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Padding inicial */}
            <div className="w-[max(0.5rem,calc((100vw-110px)/2))] shrink-0" />

            {featuredMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                className="snap-center shrink-0"
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                whileInView={{
                  scale: index === centerIndex ? 1.1 : 0.95,
                  opacity: 1,
                }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              >
                <MetricGlassCard
                  label={metric.label}
                  value={metric.value}
                  featured={index === centerIndex}
                  size="md"
                />
              </motion.div>
            ))}

            {/* Padding final */}
            <div className="w-[max(0.5rem,calc((100vw-110px)/2))] shrink-0" />
          </motion.div>

          {/* Info Badge */}
          <motion.div
            className="flex items-center justify-center gap-2 rounded-full bg-[#fffaf2]/72 px-3 py-2 text-[11px] font-medium text-[var(--fg-ink-3)] shadow-[0_12px_30px_-24px_rgba(80,40,60,0.35)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]"
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Analisando pele... {confidence ? `${confidence}% de confiança` : ""}
          </motion.div>

          {/* Botão Ver resultado completo */}
          <motion.button
            onClick={onClose}
            className="rounded-full bg-[linear-gradient(135deg,#ddb693_0%,#e8a9c2_55%,#ef8fb8_100%)] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_12px_34px_-24px_rgba(80,40,60,0.42)] backdrop-blur-2xl transition hover:shadow-[0_16px_40px_-20px_rgba(80,40,60,0.5)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
          >
            Ver resultado completo
          </motion.button>
        </div>
      </motion.div>
      </motion.div>
    </>
  );
};
