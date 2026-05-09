import { motion } from "framer-motion";

type MetricGlassCardProps = {
  label: string;
  value: number;
  featured?: boolean;
  size?: "sm" | "md" | "lg";
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const MetricGlassCard = ({ label, value, featured = false, size = "md" }: MetricGlassCardProps) => {
  const normalized = clamp(value);
  
  let displaySize = 100;
  if (featured) {
    displaySize = size === "sm" ? 68 : size === "lg" ? 104 : 88;
  } else {
    displaySize = size === "sm" ? 52 : size === "lg" ? 88 : 72;
  }
  const r = displaySize / 2 - 10;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - normalized / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        position: "relative",
        width: displaySize,
        height: displaySize,
      }}
    >
      {/* Outer glow sutil */}
      <div
        style={{
          position: "absolute",
          inset: -12,
          borderRadius: "50%",
          background: "rgba(232, 169, 194, 0.2)",
          filter: "blur(24px)",
          opacity: 0.3,
        }}
      />

      {/* Glass capsule */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(32px) saturate(140%)",
          WebkitBackdropFilter: "blur(32px) saturate(140%)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "inset 0 2px 8px rgba(255,255,255,0.6), 0 20px 60px -16px rgba(180,80,120,0.3)",
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
          <linearGradient id="metric-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={displaySize <= 80 ? 1.8 : 2.5}
        />

        {/* Progress circle com gradiente coral */}
        <motion.circle
          cx={displaySize / 2}
          cy={displaySize / 2}
          r={r}
          fill="none"
          stroke="url(#metric-gradient)"
          strokeWidth={displaySize <= 80 ? 2.8 : 4}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
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
        }}
      >
        <div
          style={{
            fontSize: displaySize <= 80 ? 14 : displaySize <= 100 ? 16 : featured ? 20 : 18,
            fontWeight: "800",
            color: "#3d3d3d",
            lineHeight: "1",
          }}
        >
          {normalized}%
        </div>
        <div
          style={{
            fontSize: displaySize <= 80 ? "6px" : displaySize <= 100 ? "7px" : featured ? "8px" : "7px",
            fontWeight: "700",
            color: "#666",
            marginTop: "2px",
            textAlign: "center",
            maxWidth: "90%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingX: "2px",
          }}
          title={label}
        >
          {label}
        </div>
      </div>
    </motion.div>
  );
};

export default MetricGlassCard;
