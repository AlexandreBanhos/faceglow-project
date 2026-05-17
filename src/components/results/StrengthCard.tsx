import type { SkinInsight } from "@/data/skinTypeInsights";

export function StrengthCard({ insight }: { insight: SkinInsight }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      borderRadius: "20px",
      padding: "16px",
      border: "1px solid #bbf7d0",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
      <span style={{ fontSize: "26px", lineHeight: 1 }}>{insight.icon}</span>
      <p style={{ fontSize: "13px", fontWeight: 700, color: "#166534", margin: 0, lineHeight: "1.3" }}>
        {insight.title}
      </p>
      <p style={{ fontSize: "11px", color: "#15803d", lineHeight: "1.55", margin: 0, opacity: 0.85 }}>
        {insight.description}
      </p>
    </div>
  );
}
