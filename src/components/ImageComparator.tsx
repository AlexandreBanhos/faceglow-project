import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface ImageComparatorProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeScore?: number;
  afterScore?: number;
  fallbackImage?: string;
}

export function ImageComparator({
  beforeImage,
  afterImage,
  beforeLabel = "Antes",
  afterLabel = "Depois",
  beforeScore,
  afterScore,
  fallbackImage,
}: ImageComparatorProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const position = ((touch.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-6 mb-6 glass-card overflow-hidden rounded-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Comparador Antes e Depois</h2>
          {beforeScore !== undefined && afterScore !== undefined && (
            <span className="text-xs font-bold text-primary">
              {afterScore - beforeScore > 0 ? "+" : ""}
              {afterScore - beforeScore} pontos
            </span>
          )}
        </div>
      </div>

      {/* Comparador */}
      <div className="relative w-full">
        <div
          ref={containerRef}
          className="relative w-full aspect-square md:aspect-[16/10] cursor-col-resize overflow-hidden bg-slate-100 select-none"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          role="slider"
          aria-label="Comparador de imagens"
        >
          {/* Imagem Depois (fundo) */}
          <img
            src={afterImage || fallbackImage}
            alt={afterLabel}
            loading="eager"
            onError={(e) => {
              if (fallbackImage) {
                e.currentTarget.src = fallbackImage;
              }
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Imagem Antes — clip-path garante que a imagem não redimensiona */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={beforeImage || fallbackImage}
              alt={beforeLabel}
              loading="eager"
              onError={(e) => {
                if (fallbackImage) e.currentTarget.src = fallbackImage;
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Divisor slider */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-none"
            style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-md p-2">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-slate-400 rounded-sm" />
                <div className="w-1 h-4 bg-slate-400 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute inset-0 flex items-end justify-between p-3 pointer-events-none">
            {/* Label Antes */}
            <div
              className="text-left"
              style={{
                opacity: Math.max(0.3, sliderPosition / 100),
              }}
            >
              <p className="text-xs font-bold text-white drop-shadow-lg">{beforeLabel}</p>
              {beforeScore !== undefined && (
                <p className="text-xs font-semibold text-white drop-shadow-lg">Score {beforeScore}</p>
              )}
            </div>

            {/* Label Depois */}
            <div
              className="text-right"
              style={{
                opacity: Math.max(0.3, (100 - sliderPosition) / 100),
              }}
            >
              <p className="text-xs font-bold text-white drop-shadow-lg">{afterLabel}</p>
              {afterScore !== undefined && (
                <p className="text-xs font-semibold text-white drop-shadow-lg">Score {afterScore}</p>
              )}
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-600 text-center">
            Arraste o slider para comparar antes e depois
          </p>
        </div>
      </div>
    </motion.div>
  );
}
