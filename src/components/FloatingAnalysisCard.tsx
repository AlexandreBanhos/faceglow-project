import { motion } from "framer-motion";
import { X } from "lucide-react";
import MetricGlassCard from "@/components/analyze/MetricGlassCard";
import type { AnalysisPoints, FacialPoint } from "@/lib/analysis";

type LandmarkPoint = { x: number; y: number };

interface FloatingAnalysisCardProps {
  imageUrl: string;
  onClose: () => void;
  isOpen: boolean;
  landmarkPoints: LandmarkPoint[];
  metricCards: Array<{ label: string; value: number }>;
  facialPoints?: AnalysisPoints;
}

// Color map for different skin factors
const FACTOR_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  acne: { fill: "#FBBF24", stroke: "#D97706", label: "Acne" },
  oleosidade: { fill: "#F59E0B", stroke: "#D97706", label: "Oleosidade" },
  oiliness: { fill: "#F59E0B", stroke: "#D97706", label: "Oleosidade" },
  poros: { fill: "#EC4899", stroke: "#BE185D", label: "Poros" },
  olheiras: { fill: "#8B5CF6", stroke: "#6D28D9", label: "Olheiras" },
  linhas_finas: { fill: "#06B6D4", stroke: "#0891B2", label: "Linhas finas" },
  linhasFinas: { fill: "#06B6D4", stroke: "#0891B2", label: "Linhas finas" },
  vermelhidao: { fill: "#EF4444", stroke: "#991B1B", label: "Vermelhidão" },
  manchas: { fill: "#F97316", stroke: "#92400E", label: "Manchas" },
  dark_spots: { fill: "#F97316", stroke: "#92400E", label: "Manchas" },
  espinhas_ativas: { fill: "#FBBF24", stroke: "#D97706", label: "Espinhas ativas" },
  espinhasAtivas: { fill: "#FBBF24", stroke: "#D97706", label: "Espinhas ativas" },
  cravos: { fill: "#78716C", stroke: "#292524", label: "Cravos" },
  hidratacao: { fill: "#3B82F6", stroke: "#1E40AF", label: "Hidratação" },
  hydration: { fill: "#3B82F6", stroke: "#1E40AF", label: "Hidratação" },
  sensibilidade: { fill: "#F43F5E", stroke: "#BE185D", label: "Sensibilidade" },
  sensitivity: { fill: "#F43F5E", stroke: "#BE185D", label: "Sensibilidade" },
  ressecamento: { fill: "#A16207", stroke: "#78350F", label: "Ressecamento" },
};

export const FloatingAnalysisCard = ({ 
  imageUrl, 
  onClose, 
  isOpen, 
  landmarkPoints,
  metricCards,
  facialPoints
}: FloatingAnalysisCardProps) => {
  if (!isOpen) return null;

  const viewBoxWidth = facialPoints?.imageWidth ?? 100;
  const viewBoxHeight = facialPoints?.imageHeight ?? 140;
  const detectedPoints = facialPoints?.detectedPoints ?? [];
  const top3Factors = new Set(facialPoints?.top3Factors ?? []);

  // Helper to get color, prioritizing top 3 factors
  const getPointColor = (point: FacialPoint) => {
    const factor = point.factor.toLowerCase().replace(/ /g, "_");
    const isTopFactor = top3Factors.has(factor) || top3Factors.has(point.factor);
    
    const colorData = FACTOR_COLORS[factor] ?? FACTOR_COLORS.acne;
    
    // Make top 3 factors brighter and more visible
    if (isTopFactor) {
      return { 
        fill: colorData.fill, 
        stroke: colorData.stroke,
        opacity: 0.95,
        strokeWidth: 1.2,
        radius: 3.5
      };
    }
    
    return { 
      fill: colorData.fill, 
      stroke: colorData.stroke,
      opacity: 0.6,
      strokeWidth: 0.8,
      radius: 2.5
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[999] flex items-end justify-center px-4 pb-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-4xl h-[80vh] max-h-screen rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/45 backdrop-blur-md border border-white/35 text-white hover:bg-black/60 transition-colors"
        >
          <X size={20} className="text-white" />
        </button>

        <div
          className="absolute inset-0 w-full h-full overflow-hidden cursor-pointer"
          onClick={onClose}
        >
          <img
            src={imageUrl}
            alt="Análise"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1600&fit=crop";
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-black/24" />

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid slice"
          >
            {detectedPoints.map((point, idx) => {
                const color = getPointColor(point);
                return (
                  <g key={`point-${idx}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={color.radius + 1.5}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth={color.strokeWidth * 0.5}
                      opacity={color.opacity * 0.4}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={color.radius}
                      fill={color.fill}
                      opacity={color.opacity}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={color.radius}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth={color.strokeWidth}
                      opacity={color.opacity}
                    />
                  </g>
                );
              })}
          </svg>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl border border-white/20 bg-white/8 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.24)] p-2 sm:p-3 space-y-2">
            {facialPoints && facialPoints.top3Factors.length > 0 && (
              <div className="rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                <p className="text-[11px] font-semibold text-white/85 mb-1">
                  Top 3 Fatores:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {facialPoints.top3Factors.slice(0, 3).map((factor, idx) => {
                    const color = FACTOR_COLORS[factor.toLowerCase().replace(/ /g, "_")] ?? FACTOR_COLORS.acne;
                    return (
                      <div
                        key={`top-${idx}`}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 border border-white/18 backdrop-blur-sm"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full border"
                          style={{ backgroundColor: color.fill, borderColor: color.stroke }}
                        />
                        <span className="text-white">{color.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-stretch gap-2">
              {metricCards.map((metric) => (
                <MetricGlassCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>

            <div className="px-1 text-center">
              <p className="text-[11px] text-white/75">
                Toque na imagem ou clique em X para fechar
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
