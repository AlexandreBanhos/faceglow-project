import { motion } from "framer-motion";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const ScoreRing = ({ score, size = 120, strokeWidth = 8, label }: ScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "url(#gradient-excellent)";
    if (s >= 60) return "url(#gradient-good)";
    if (s >= 40) return "hsl(var(--warm-orange))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="gradient-excellent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5a8b8" />
              <stop offset="100%" stopColor="#f5c0a0" />
            </linearGradient>
            <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c8baf0" />
              <stop offset="100%" stopColor="#f5a8b8" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
            opacity={0.5}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-extrabold text-foreground"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            pontos
          </span>
        </div>
      </div>
      {label && (
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

export default ScoreRing;
