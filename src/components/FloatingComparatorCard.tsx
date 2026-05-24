import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface FloatingComparatorCardProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
  beforeScore: number;
  afterScore: number;
  fallbackImage?: string;
}

export const FloatingComparatorCard = ({
  isOpen,
  onClose,
  beforeImage,
  afterImage,
  beforeLabel,
  afterLabel,
  beforeScore,
  afterScore,
  fallbackImage = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
}: FloatingComparatorCardProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    if (!modal) return;
    const focusables = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables[0]?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); prev?.focus(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // Não chama preventDefault() — touchmove é passive no React/Chrome
    // O modal fixed já impede scroll da página
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const position = ((touch.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const scoreChange = afterScore - beforeScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparator-title"
      className="fixed inset-0 z-[999] flex items-end justify-center px-4 pb-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        className="relative w-full max-w-4xl h-[80vh] max-h-screen rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar comparador"
          className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/45 backdrop-blur-md border border-white/35 text-white hover:bg-black/60 transition-colors"
        >
          <X size={20} className="text-white" />
        </button>

        {/* Header with Score Change */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 id="comparator-title" className="text-lg font-bold text-foreground">Comparador Antes e Depois</h2>
            {scoreChange !== 0 && (
              <span className={`text-sm font-bold ${scoreChange > 0 ? "text-green-500" : "text-orange-500"}`}>
                {scoreChange > 0 ? "+" : ""}
                {scoreChange} pontos
              </span>
            )}
          </div>
        </div>

        {/* Comparator Content - Flexible */}
        <div className="flex-1 overflow-hidden">
          <div
            className="relative w-full h-full cursor-col-resize overflow-hidden bg-slate-100 select-none"
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
            <div className="absolute inset-0 flex items-end justify-between p-4 pointer-events-none">
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
        </div>

        {/* Info Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3">
          <p className="text-xs text-slate-600 text-center">
            Arraste o slider para comparar antes e depois
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
