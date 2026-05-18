import { motion } from "framer-motion";

export type SkinTypeSVG =
  | "mista" | "oleosa" | "seca" | "sensivel" | "equilibrada" | "acneica" | "normal";

interface FaceSkinSVGProps {
  skinType?: string;
  size?: number;
}

interface ZoneColors {
  zonaT: string;
  zonaTOpacity: number;
  bochechas: string;
  bochechasOpacity: number;
}

const SKIN_COLOR_MAP: Record<SkinTypeSVG, ZoneColors> = {
  mista:       { zonaT: "#FFF176", zonaTOpacity: 0.50, bochechas: "#B3E5FC", bochechasOpacity: 0.40 },
  oleosa:      { zonaT: "#FFF176", zonaTOpacity: 0.60, bochechas: "#FFF176", bochechasOpacity: 0.60 },
  seca:        { zonaT: "#E1F5FE", zonaTOpacity: 0.50, bochechas: "#E1F5FE", bochechasOpacity: 0.50 },
  sensivel:    { zonaT: "transparent", zonaTOpacity: 0, bochechas: "#FCE4EC", bochechasOpacity: 0.60 },
  equilibrada: { zonaT: "#E8F5E9", zonaTOpacity: 0.30, bochechas: "#E8F5E9", bochechasOpacity: 0.30 },
  normal:      { zonaT: "#E8F5E9", zonaTOpacity: 0.30, bochechas: "#E8F5E9", bochechasOpacity: 0.30 },
  acneica:     { zonaT: "#FFCDD2", zonaTOpacity: 0.50, bochechas: "#FFCDD2", bochechasOpacity: 0.40 },
};

const ACNE_DOTS = [
  { cx: 64, cy: 32 }, { cx: 80, cy: 26 }, { cx: 96, cy: 32 },
  { cx: 74, cy: 47 }, { cx: 89, cy: 43 },
  { cx: 77, cy: 108 }, { cx: 84, cy: 118 },
  { cx: 36, cy: 110 }, { cx: 30, cy: 124 }, { cx: 44, cy: 130 },
  { cx: 124, cy: 110 }, { cx: 130, cy: 124 }, { cx: 116, cy: 130 },
];

function normalizeSkinType(raw?: string): SkinTypeSVG {
  const t = (raw ?? "").toLowerCase().trim().replace(/^pele\s+/, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (t.includes("mist") || t === "combination") return "mista";
  if (t.includes("oleo") || t === "oily")        return "oleosa";
  if (t.includes("sec")  || t === "dry")         return "seca";
  if (t.includes("sens"))                        return "sensivel";
  if (t.includes("acne") || t.includes("acnei")) return "acneica";
  if (t.includes("norm") || t === "normal")      return "normal";
  return "equilibrada";
}

export const FaceSkinSVG = ({ skinType, size = 160 }: FaceSkinSVGProps) => {
  const type = normalizeSkinType(skinType);
  const c = SKIN_COLOR_MAP[type];
  const isAcneica = type === "acneica";
  const h = Math.round(size * 1.25); // 160→200 ratio

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 160 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Layer 1: contorno facial ── */}
      <path
        d="M 80 8 C 122 8 152 44 152 94 C 152 154 118 194 80 195 C 42 194 8 154 8 94 C 8 44 38 8 80 8 Z"
        stroke="#E8A882"
        strokeWidth="1.5"
        fill="rgba(255,255,255,0.08)"
      />

      {/* ── Layer 2a: zona-T testa ── */}
      {c.zonaT !== "transparent" && (
        <path
          d="M 50 16 C 62 11 98 11 110 16 L 106 54 C 96 57 88 60 86 64 L 74 64 C 72 60 64 57 54 54 Z"
          fill={c.zonaT}
          fillOpacity={c.zonaTOpacity}
        />
      )}

      {/* ── Layer 2b: zona-T nariz ── */}
      {c.zonaT !== "transparent" && (
        <path
          d="M 74 64 L 86 64 L 89 130 C 89 140 94 150 90 160 C 88 165 80 168 80 168 C 80 168 72 165 70 160 C 66 150 71 140 71 130 Z"
          fill={c.zonaT}
          fillOpacity={c.zonaTOpacity}
        />
      )}

      {/* ── Layer 3a: bochecha esquerda ── */}
      <path
        d="M 16 90 C 9 102 9 128 20 144 C 31 156 52 164 66 163 C 64 148 60 134 56 120 C 52 106 40 94 16 90 Z"
        fill={c.bochechas}
        fillOpacity={c.bochechasOpacity}
      />

      {/* ── Layer 3b: bochecha direita ── */}
      <path
        d="M 144 90 C 151 102 151 128 140 144 C 129 156 108 164 94 163 C 96 148 100 134 104 120 C 108 106 120 94 144 90 Z"
        fill={c.bochechas}
        fillOpacity={c.bochechasOpacity}
      />

      {/* ── Layer 4: dots de acne ── */}
      {isAcneica && ACNE_DOTS.map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={3}
          fill="#E24B4A"
          style={{ transformOrigin: `${dot.cx}px ${dot.cy}px` }}
          animate={{ opacity: [0.55, 1, 0.55], scale: [0.75, 1.25, 0.75] }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
            delay: i * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
};
