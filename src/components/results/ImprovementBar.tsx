import { motion } from "framer-motion";

interface ImprovementBarProps {
  label: string;
  value: number;   // 0-100
  icon: string;
  delay?: number;
}

function severityColor(v: number) {
  if (v >= 80) return { bar: "#ef4444", bg: "#fef2f2", badge: "#fca5a5", text: "#b91c1c", label: "Crítico" };
  if (v >= 50) return { bar: "#f97316", bg: "#fff7ed", badge: "#fdba74", text: "#c2410c", label: "Moderado" };
  return           { bar: "#eab308", bg: "#fefce8", badge: "#fde047", text: "#a16207", label: "Leve" };
}

export function ImprovementBar({ label, value, icon, delay = 0 }: ImprovementBarProps) {
  const c = severityColor(value);
  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      padding: "14px 16px",
      border: "1px solid #f3f4f6",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>{label}</span>
          <span style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.02em",
            padding: "2px 8px", borderRadius: "999px",
            background: c.bg, color: c.text,
          }}>
            {c.label}
          </span>
        </div>
        <span style={{ fontSize: "15px", fontWeight: 800, color: c.text, tabularNums: "tabular-nums" } as React.CSSProperties}>
          {value}%
        </span>
      </div>

      <div style={{ height: "8px", borderRadius: "999px", background: "#f3f4f6", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay }}
          style={{ height: "100%", borderRadius: "999px", background: c.bar }}
        />
      </div>
    </div>
  );
}
