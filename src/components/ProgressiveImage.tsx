import { useState } from "react";

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Cor de fundo exibida enquanto a imagem carrega. Aceita qualquer valor CSS de cor. */
  placeholderColor?: string;
  /** Classes do container wrapper */
  containerClassName?: string;
  objectFit?: "cover" | "contain";
  loading?: "lazy" | "eager";
}

/**
 * Exibe um fundo colorido imediatamente e faz fade-in da imagem quando carregada.
 * Elimina o efeito de "imagem surgindo aos poucos" (progressive JPEG rendering visível).
 */
export function ProgressiveImage({
  src,
  alt,
  className = "",
  containerClassName = "",
  placeholderColor = "#f3e8ff",
  objectFit = "cover",
  loading = "lazy",
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ backgroundColor: errored ? placeholderColor : (loaded ? undefined : placeholderColor) }}
    >
      {/* Shimmer skeleton enquanto carrega */}
      {!loaded && !errored && (
        <div
          className="absolute inset-0 skeleton-shimmer"
          style={{ opacity: 0.6 }}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`${className} transition-opacity duration-300`}
        style={{ objectFit, opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = "/product-placeholder.svg";
          setLoaded(true);
          setErrored(true);
        }}
      />
    </div>
  );
}
