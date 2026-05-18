import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface AccountItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: string;
  value?: string;
  danger?: boolean;
}

interface AccountCardProps {
  items: AccountItem[];
}

export function AccountCard({ items }: AccountCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="lg-surface rounded-2xl overflow-hidden"
    >
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`w-full flex items-center gap-4 px-5 py-4 active:bg-muted/50 transition-colors text-left ${
            i < items.length - 1 ? "border-b border-border/40" : ""
          } ${item.badge === "Admin" ? "bg-orange-500/5" : ""} ${item.danger ? "bg-red-500/5" : ""}`}
        >
          <span className="w-5 flex items-center justify-center flex-shrink-0">
            {item.icon}
          </span>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-semibold ${item.danger ? "text-red-600" : "text-foreground"}`}>{item.label}</span>
            {item.badge && !item.danger && (
              <p className="text-xs text-orange-600 font-bold mt-0.5">{item.badge}</p>
            )}
          </div>
          {item.value && (
            <span className="text-xs text-muted-foreground mr-1 truncate max-w-[35%]">{item.value}</span>
          )}
          <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </motion.div>
  );
}
