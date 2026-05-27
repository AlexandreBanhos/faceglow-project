import { motion } from "framer-motion";

interface ImprovementBarProps {
  label: string;
  value: number;   // 0-100
  icon?: string;   // kept for backwards compat, not displayed
  delay?: number;
}

function severityColor(v: number) {
  if (v === 0)   return { bar: "#d1d5db", bg: "#f9fafb", text: "#6b7280", label: "Não identificado", isOk: true };
  if (v >= 80)   return { bar: "#f5a8b8", bg: "#fdf0f4", text: "#c07090", label: "Crítico",          isOk: false };
  if (v >= 50)   return { bar: "#f5c0a0", bg: "#fdf5f0", text: "#c09070", label: "Moderado",          isOk: false };
  return           { bar: "#f5d9a0", bg: "#fdf8f0", text: "#c0a060", label: "Leve",              isOk: false };
}

export function ImprovementBar({ label, value, delay = 0 }: ImprovementBarProps) {
  const c = severityColor(value);
  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      padding: "14px 16px",
      border: c.isOk ? "1px solid #e5e7eb" : "1px solid #f3f4f6",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      opacity: c.isOk ? 0.75 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: c.isOk ? 0 : "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: c.bar, flexShrink: 0,
          }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>{label}</span>
          <span style={{
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.02em",
            padding: "2px 8px", borderRadius: "999px",
            background: c.isOk ? "rgba(129,193,167,0.12)" : c.bg,
            color: c.isOk ? "#2d6b52" : c.text,
          }}>
            {c.label}
          </span>
        </div>
        {!c.isOk && (
          <span style={{ fontSize: "15px", fontWeight: 800, color: c.text } as React.CSSProperties}>
            {value}%
          </span>
        )}
      </div>

      {!c.isOk && (
        <div style={{ height: "8px", borderRadius: "999px", background: "#f3f4f6", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1.1, ease: "easeOut", delay }}
            style={{ height: "100%", borderRadius: "999px", background: c.bar }}
          />
        </div>
      )}
    </div>
  );
}
