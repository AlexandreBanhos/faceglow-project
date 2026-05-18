import { useState } from "react";
import { StepIcon } from "@/components/routine/StepIcon";

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
  /** Se fornecido, exibe o ícone do tipo de passo quando a imagem falha */
  stepTypeKey?: string;
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
  stepTypeKey,
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ backgroundColor: errored ? "#f5f1ff" : (loaded ? undefined : placeholderColor) }}
    >
      {errored && stepTypeKey ? (
        <StepIcon stepTypeKey={stepTypeKey} className={className} />
      ) : (
        <>
          {!loaded && !errored && (
            <div className="absolute inset-0 skeleton-shimmer" style={{ opacity: 0.6 }} />
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
              if (!stepTypeKey) e.currentTarget.src = "/product-placeholder.svg";
              setLoaded(true);
              setErrored(true);
            }}
          />
        </>
      )}
    </div>
  );
}
