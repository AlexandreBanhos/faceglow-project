import { motion } from "framer-motion";

interface RotinaPendenteProps {
  items: Array<{ title: string; done: boolean }>;
  period: "morning" | "night";
  delay?: number;
}

export const RotinaPendente = ({ items, period, delay = 0.50 }: RotinaPendenteProps) => {
  const pending = items.filter((i) => !i.done);
  const icon = period === "morning" ? "☀️" : "🌙";
  const label = period === "morning" ? "Manhã" : "Noite";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mx-6 mt-4"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.70)",
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#2D1B2E" }}>
          {icon} Rotina da {label}
        </p>
        {pending.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full"
            style={{ background: "rgba(232,84,122,0.12)", color: "#E8547A", fontSize: 11, fontWeight: 600 }}
          >
            {pending.length} pendente{pending.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Sub-header */}
      <p style={{ fontSize: 12, color: "#9b7b8a", lineHeight: "18px", marginBottom: 10 }}>
        {pending.length > 0
          ? `Você tem ${pending.length} passo${pending.length !== 1 ? "s" : ""} pendente${pending.length !== 1 ? "s" : ""} hoje. Complete e mantenha o progresso.`
          : `Rotina da ${label.toLowerCase()} concluída! Sua pele agradece.`}
      </p>

      {/* Lista */}
      <div>
        {pending.slice(0, 4).map((item, i) => (
          <div
            key={`${item.title}-${i}`}
            className="flex items-center gap-2.5"
            style={{
              paddingTop: 8,
              paddingBottom: 8,
              borderBottom: i < Math.min(pending.length, 4) - 1 ? "1px solid rgba(232,84,122,0.08)" : "none",
            }}
          >
            <div
              style={{ width: 6, height: 6, borderRadius: 3, background: "#E8A882", flexShrink: 0 }}
            />
            <p style={{ fontSize: 13, fontWeight: 500, color: "#2D1B2E", flex: 1 }}>{item.title}</p>
            <p style={{ fontSize: 11, color: "#9b7b8a" }}>Pendente</p>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="flex items-center gap-2" style={{ paddingTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: "#22C55E", flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "#16A34A", fontWeight: 500 }}>Tudo concluído 🎉</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
