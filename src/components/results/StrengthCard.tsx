import type { LucideIcon } from "lucide-react";
import {
  Clock, Droplets, Star, Sparkles, ScanLine, Palette,
  Scale, Dumbbell, Target, Shield, CheckCircle2,
  Leaf, Zap, MessageCircle,
} from "lucide-react";
import type { SkinInsight } from "@/data/skinTypeInsights";

const EMOJI_ICON: Record<string, LucideIcon> = {
  "⏳": Clock,
  "💧": Droplets,
  "🌟": Star,
  "✨": Sparkles,
  "🔍": ScanLine,
  "💄": Palette,
  "⚖️": Scale,
  "💪": Dumbbell,
  "🎯": Target,
  "🛡️": Shield,
  "✅": CheckCircle2,
  "🌿": Leaf,
  "⚡": Zap,
  "💬": MessageCircle,
  "🌸": Sparkles,
};

export function StrengthCard({ insight }: { insight: SkinInsight }) {
  const IconComp = EMOJI_ICON[insight.icon] ?? Star;
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(129,193,167,0.28) 0%, rgba(144,210,205,0.38) 100%)",
      borderRadius: "20px",
      padding: "16px",
      border: "1px solid rgba(129,193,167,0.55)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "linear-gradient(135deg, #81c1a7, #5da888)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 3px 10px -2px rgba(125,207,201,0.4)",
      }}>
        <IconComp size={18} color="white" />
      </div>
      <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a5c59", margin: 0, lineHeight: "1.3" }}>
        {insight.title}
      </p>
      <p style={{ fontSize: "11px", color: "#2d7d79", lineHeight: "1.55", margin: 0, opacity: 0.9 }}>
        {insight.description}
      </p>
    </div>
  );
}
