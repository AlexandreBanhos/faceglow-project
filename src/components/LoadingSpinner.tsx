interface SpinnerProps {
  size?: number;
  className?: string;
}

export const GradientSpinner = ({ size = 32, className = "" }: SpinnerProps) => (
  <>
    <style>{`
      @keyframes fgSpin { to { transform: rotate(360deg); } }
    `}</style>
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, size / 10)}px solid transparent`,
        borderTopColor: "#E8748A",
        borderRightColor: "#E8A882",
        animation: "fgSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  </>
);

interface LoadingSpinnerProps {
  message?: string;
  progress?: number;
  isComplete?: boolean;
  size?: number;
  progressLabel?: string;
  containerClassName?: string;
}

export const LoadingSpinner = ({
  message,
  progress,
  isComplete = false,
  size = 48,
  progressLabel,
  containerClassName = "",
}: LoadingSpinnerProps) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${containerClassName}`}>
    {isComplete ? (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #81c1a7, #5da888)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    ) : (
      <GradientSpinner size={size} />
    )}

    {message && (
      <p className="text-sm font-medium text-foreground/70">{message}</p>
    )}

    {progress !== undefined && (
      <div className="w-full max-w-xs">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Progresso</span>
          <span>{progressLabel ?? `${Math.round(progress)}%`}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: "linear-gradient(90deg, #E8748A, #E8A882)",
            }}
          />
        </div>
      </div>
    )}
  </div>
);

export const LoadingSpinnerFullScreen = ({
  message = "Carregando...",
  progress,
  progressLabel,
}: Omit<LoadingSpinnerProps, "size" | "containerClassName">) => (
  <div
    className="flex min-h-screen flex-col items-center justify-center px-4"
    style={{ background: "var(--grad-aurora)" }}
  >
    <LoadingSpinner size={48} message={message} progress={progress} progressLabel={progressLabel} />
  </div>
);

export default LoadingSpinner;
