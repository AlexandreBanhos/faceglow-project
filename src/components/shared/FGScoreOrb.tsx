import React from "react";

interface FGScoreOrbProps {
  score?: number;
  size?: number;
  label?: string;
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Score Orb - Circular score/health display with liquid glass effect
 * Recurring visual metaphor across the FaceGlow brand
 */
export const FGScoreOrb: React.FC<FGScoreOrbProps> = ({
  score = 84,
  size = 320,
  label = "Saúde da pele",
  variant = "default",
  className = "",
}) => {
  const isCompact = variant === "compact";
  const displaySize = isCompact ? 120 : size;
  const r = displaySize / 2 - 12;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);

  // Rating text based on score
  const getRating = (s: number) => {
    if (s >= 80) return "ótimo";
    if (s >= 60) return "bom";
    if (s >= 40) return "médio";
    return "precisa atenção";
  };

  return (
    <div
      style={{
        position: "relative",
        width: displaySize,
        height: displaySize,
      }}
      className={className}
    >
      {/* Outer glow */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: "var(--grad-orb)",
          filter: "blur(40px)",
          opacity: 0.55,
        }}
      />

      {/* Glass capsule */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(40px) saturate(160%)",
          WebkitBackdropFilter: "blur(40px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow:
            "inset 0 2px 8px rgba(255,255,255,0.6), 0 30px 80px -20px rgba(180,80,120,0.4)",
        }}
      />

      {/* SVG Progress Ring */}
      <svg
        width={displaySize}
        height={displaySize}
        style={{
          position: "absolute",
          inset: 0,
          transform: "rotate(-90deg)",
        }}
      >
        <defs>
          <linearGradient
            id={`grad-${displaySize}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ddb693" />
            <stop offset="55%" stopColor="#e8a9c2" />
            <stop offset="100%" stopColor="#ef8fb8" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={displaySize / 2}
          cy={displaySize / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="3"
        />

        {/* Progress circle */}
        <circle
          cx={displaySize / 2}
          cy={displaySize / 2}
          r={r}
          fill="none"
          stroke={`url(#grad-${displaySize})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s ease-out",
          }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-ink)",
        }}
      >
        {!isCompact && (
          <div
            className="fg-mono"
            style={{
              fontSize: 11,
              color: "var(--fg-ink-3)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
        )}

        <div
          style={{
            fontSize: displaySize * 0.28,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginTop: isCompact ? 0 : 6,
          }}
        >
          {score}
        </div>

        {!isCompact && (
          <div
            style={{
              fontSize: 13,
              color: "var(--fg-ink-3)",
              marginTop: 6,
            }}
          >
            de 100 · {getRating(score)}
          </div>
        )}
      </div>
    </div>
  );
};
