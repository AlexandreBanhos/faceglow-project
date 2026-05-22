import { useState } from "react";
import { motion } from "framer-motion";

export interface ImageInfoCardProps {
  /** URL da imagem de capa */
  imageUrl: string;
  /** Cor de fundo enquanto a imagem carrega */
  fallbackColor?: string;
  /** Título sobreposto na imagem */
  title: string;
  /** Texto curto exibido abaixo do título (truncado em 2 linhas) */
  description?: string;
  /** Label do botão de ação. Padrão: "Ver mais" */
  actionLabel?: string;
  /** Callback do botão de ação */
  onAction?: () => void;
  /** Altura da imagem em px. Padrão: 200 */
  imageHeight?: number;
  /** Delay da animação de entrada */
  delay?: number;
  className?: string;
}

export function ImageInfoCard({
  imageUrl,
  fallbackColor = "#fce7f3",
  title,
  description,
  actionLabel = "Ver mais",
  onAction,
  imageHeight = 200,
  delay = 0,
  className = "",
}: ImageInfoCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErrored, setImgErrored] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass-card ${className}`}
      style={{ overflow: "hidden" }}
    >
      {/* Wrapper da imagem — sem padding, edge-to-edge */}
      <div style={{ position: "relative", width: "100%", height: imageHeight, backgroundColor: fallbackColor }}>

        {/* Skeleton shimmer enquanto carrega */}
        {!imgLoaded && !imgErrored && (
          <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />
        )}

        {/* Imagem */}
        {!imgErrored && (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 300ms ease",
            }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgErrored(true)}
          />
        )}

        {/* Overlay gradiente — mais escuro no bottom para legibilidade */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 50%, transparent 100%)",
          pointerEvents: "none",
        }} />

        {/* Título + descrição + botão */}
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 10,
        }}>
          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              padding: 0,
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.3px",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}>
              {title}
            </h3>

            {description && (
              <p style={{
                margin: "4px 0 0",
                padding: 0,
                color: "rgba(255,255,255,0.82)",
                fontSize: 12,
                lineHeight: 1.4,
                textShadow: "0 1px 3px rgba(0,0,0,0.35)",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}>
                {description}
              </p>
            )}
          </div>

          {/* Botão "Ver mais" */}
          {onAction && (
            <button
              onClick={onAction}
              style={{
                flexShrink: 0,
                padding: "4px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "white",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                lineHeight: 1.4,
                whiteSpace: "nowrap",
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
