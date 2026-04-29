import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  /**
   * Mensagem de carregamento exibida abaixo do spinner
   */
  message?: string;

  /**
   * Porcentagem de progresso (0-100)
   * Se omitido, não exibe barra de progresso
   */
  progress?: number;

  /**
   * Se true, exibe cor de sucesso (verde com animação de conclusão)
   */
  isComplete?: boolean;

  /**
   * Tamanho do spinner em pixels
   * @default 112
   */
  size?: number;

  /**
   * Texto adicional abaixo da barra de progresso (ex: "50%")
   */
  progressLabel?: string;

  /**
   * Classe customizada para o container externo
   */
  containerClassName?: string;
}

/**
 * Componente padronizado de Loading/Spinner
 * Usa as cores primárias e accent do sistema
 * Compatível com light e dark mode
 */
export const LoadingSpinner = ({
  message,
  progress,
  isComplete = false,
  size = 112,
  progressLabel,
  containerClassName = "",
}: LoadingSpinnerProps) => {
  const innerSize = size / 4;
  const middleSize = (size * 2) / 3;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${containerClassName}`}
    >
      {/* Spinner */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer ring - branca/primária */}
        <motion.div
          className="absolute inset-0 rounded-full border border-foreground/20"
          animate={
            isComplete
              ? { scale: 1, opacity: 0.3 }
              : { scale: [1, 1.15, 1], opacity: [0.4, 0.9, 0.4] }
          }
          transition={{
            duration: isComplete ? 0.5 : 2,
            repeat: isComplete ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Middle ring - accent (rosa/pink) */}
        <motion.div
          className="absolute inset-3 rounded-full border border-accent/70"
          animate={
            isComplete
              ? { scale: 1, opacity: 0.2 }
              : { scale: [1, 0.92, 1], opacity: [0.8, 0.45, 0.8] }
          }
          transition={{
            duration: isComplete ? 0.5 : 1.6,
            repeat: isComplete ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner circle - gradiente primary to accent */}
        <motion.div
          className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/85 to-accent/85"
          animate={
            isComplete
              ? {
                  opacity: [1, 0.5],
                  scale: 1,
                }
              : {
                  opacity: [0.9, 0.45, 0.9],
                }
          }
          transition={{
            duration: isComplete ? 0.4 : 1.2,
            repeat: isComplete ? 0 : Infinity,
          }}
        />

        {/* Center dot - apenas se não está completo */}
        {!isComplete && (
          <motion.div
            className="absolute inset-10 rounded-full bg-foreground/40"
            animate={{ scale: [1, 0.8, 1], opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}

        {/* Checkmark circle - se está completo */}
        {isComplete && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-green-500/20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <motion.svg
              className="h-1/2 w-1/2 text-green-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          </motion.div>
        )}
      </div>

      {/* Mensagem */}
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-foreground/80"
        >
          {message}
        </motion.p>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Progresso</span>
            <span>{progressLabel ?? `${Math.round(progress)}%`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Variante fullscreen para uso em páginas inteiras
 */
export const LoadingSpinnerFullScreen = ({
  message = "Carregando...",
  progress,
  progressLabel,
}: Omit<LoadingSpinnerProps, "size" | "containerClassName">) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <LoadingSpinner
        size={128}
        message={message}
        progress={progress}
        progressLabel={progressLabel}
      />
    </div>
  );
};

export default LoadingSpinner;
