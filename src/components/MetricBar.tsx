import { motion } from "framer-motion";

interface MetricBarProps {
  label: string;
  value: number;   // 0-100
  icon?: React.ReactNode;
  delay?: number;
}

const getColor = (v: number) => {
  if (v <= 30) return { bar: "#c4c4f5", text: "#9090d8" };
  if (v <= 60) return { bar: "#f5d9a0", text: "#c8a060" };
  if (v <= 80) return { bar: "#f5c0a0", text: "#c89070" };
  return { bar: "#f5a8b8", text: "#c87090" };
};

const MetricBar = ({ label, value, icon, delay = 0 }: MetricBarProps) => {
  const { bar, text } = getColor(value);

  return (
    <div className="flex items-center gap-3 py-1">
      {/* Icon */}
      {icon && (
        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
          <span style={{ color: text, opacity: 0.85 }}>{icon}</span>
        </div>
      )}

      {/* Label + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-foreground/80 truncate">{label}</span>
          <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: text }}>
            {value}%
          </span>
        </div>
        {/* Track */}
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: bar }}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay }}
          />
        </div>
      </div>
    </div>
  );
};

export default MetricBar;
