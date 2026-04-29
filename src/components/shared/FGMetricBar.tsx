import React from "react";

interface FGMetricBarProps {
  label: string;
  value: string | number;
  max?: number;
  accent?: string;
  className?: string;
}

/**
 * Metric Bar - Compact metric row with progress indicator
 * Used in glass cards throughout the app
 */
export const FGMetricBar: React.FC<FGMetricBarProps> = ({
  label,
  value,
  max = 100,
  accent = "#ef8fb8",
  className = "",
}) => {
  const numValue = typeof value === "string" ? parseInt(value) : value;
  const pct = Math.max(4, Math.min(100, (numValue / max) * 100));

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-[var(--fg-ink-2)] font-medium">
          {label}
        </span>
        <span className="fg-mono text-xs text-[var(--fg-ink-3)]">
          {value}
        </span>
      </div>

      <div className="h-1.5 bg-[rgba(80,40,60,0.08)] rounded-full overflow-hidden">
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${accent}aa, ${accent})`,
            borderRadius: 999,
          }}
          className="transition-all duration-300"
        />
      </div>
    </div>
  );
};
