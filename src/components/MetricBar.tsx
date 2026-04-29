import { motion } from "framer-motion";

interface MetricBarProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  delay?: number;
}

const MetricBar = ({ label, value, icon, delay = 0 }: MetricBarProps) => {
  const getGradient = (v: number) => {
    if (v <= 30) return "from-lavender to-primary";
    if (v <= 60) return "from-primary to-coral";
    if (v <= 80) return "from-coral to-warm-orange";
    return "from-warm-orange to-destructive";
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-lavender-light flex items-center justify-center">
              <span className="text-primary">{icon}</span>
            </div>
          )}
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        {value === 0 ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
            Não identificado
          </span>
        ) : (
          <span className="text-sm font-bold text-foreground">{value}%</span>
        )}
      </div>
      {value === 0 ? (
        <div className="h-2.5 rounded-full bg-muted/50 opacity-30 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">-</span>
        </div>
      ) : (
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${getGradient(value)}`}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: delay }}
          />
        </div>
      )}
    </div>
  );
};

export default MetricBar;
