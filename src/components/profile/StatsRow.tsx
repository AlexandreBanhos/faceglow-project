import { motion } from "framer-motion";
import { TrendingUp, Trophy, Coins, Flame } from "lucide-react";

interface StatsRowProps {
  totalAnalyses: number;
  currentScore: number;
  activeProducts: number;
  streakDays: number;
}

export function StatsRow({ totalAnalyses, currentScore, activeProducts, streakDays }: StatsRowProps) {
  const stats = [
    { label: "Análises",  display: totalAnalyses > 0   ? String(totalAnalyses) : "0",  Icon: TrendingUp, color: "text-primary"    },
    { label: "Score",     display: currentScore > 0    ? String(currentScore)  : "—",  Icon: Trophy,     color: "text-amber-500"  },
    { label: "Ativos",    display: activeProducts > 0  ? String(activeProducts): "—",  Icon: Coins,      color: "text-emerald-500"},
    { label: "Concluídos", display: streakDays > 0      ? `${streakDays}d`      : "—",  Icon: Flame,      color: "text-orange-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="grid grid-cols-4 gap-2"
    >
      {stats.map(({ label, display, Icon, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.28 + i * 0.05, type: "spring", stiffness: 300, damping: 22 }}
          className="lg-surface p-3 rounded-2xl flex flex-col items-center text-center"
        >
          <Icon size={16} className={`${color} mb-1.5`} />
          <p className="text-lg font-extrabold text-foreground leading-none">{display}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide mt-1 leading-tight">{label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
