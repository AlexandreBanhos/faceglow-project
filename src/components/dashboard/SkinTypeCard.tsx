import { motion } from "framer-motion";
import { FaceSkinSVG } from "@/components/FaceSkinSVG";

interface SkinTypeCardProps {
  skinType: string;
  summary?: string;
  delay?: number;
}

interface SkinInfo {
  title: string;
  watchOut: string;
  tip: string;
}

const SKIN_INFO: Record<string, SkinInfo> = {
  oleosa: {
    title: "Pele Oleosa",
    watchOut: "Poros dilatados e brilho excessivo na zona T ao longo do dia.",
    tip: "Protetor toque seco FPS 50+ — controla o brilho e protege ao mesmo tempo.",
  },
  seca: {
    title: "Pele Seca",
    watchOut: "Ressecamento, descamação e sensação de pele esticada após lavar.",
    tip: "Aplique hidratante logo após lavar o rosto, com a pele ainda úmida.",
  },
  mista: {
    title: "Pele Mista",
    watchOut: "Zona T oleosa com bochechas ressecadas — trate cada área separadamente.",
    tip: "Gel leve na zona T, creme mais nutritivo nas laterais do rosto.",
  },
  sensivel: {
    title: "Pele Sensível",
    watchOut: "Vermelhidão, coceira ou reações a produtos com fragrância e álcool.",
    tip: "Prefira filtro solar mineral (zinco ou titânio) — menos irritante.",
  },
  normal: {
    title: "Pele Normal",
    watchOut: "Não negligencie hidratação e protetor solar mesmo com pele equilibrada.",
    tip: "Uma rotina simples e consistente mantém o equilíbrio natural da pele.",
  },
  acneica: {
    title: "Pele Acneica",
    watchOut: "Espremer espinhas piora a inflamação e pode causar manchas permanentes.",
    tip: "Ácido salicílico ou niacinamida reduzem oleosidade e controlam a acne.",
  },
  equilibrada: {
    title: "Pele Equilibrada",
    watchOut: "Manutenção é essencial — não pule hidratação e protetor solar.",
    tip: "Uma rotina leve e diária preserva o equilíbrio natural da pele.",
  },
};

function normalizeSkinKey(skinType: string): string {
  const t = (skinType ?? "")
    .toLowerCase()
    .trim()
    .replace(/^pele\s+/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  if (t.includes("oleo") || t === "oily")        return "oleosa";
  if (t.includes("sec")  || t === "dry")         return "seca";
  if (t.includes("mist") || t === "combination") return "mista";
  if (t.includes("sens"))                        return "sensivel";
  if (t.includes("norm") || t === "normal")      return "normal";
  if (t.includes("acne") || t.includes("acnei")) return "acneica";
  return "equilibrada";
}

export const SkinTypeCard = ({ skinType, summary, delay = 0.58 }: SkinTypeCardProps) => {
  const key = normalizeSkinKey(skinType);
  const info = SKIN_INFO[key] ?? SKIN_INFO.equilibrada;

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
        padding: 14,
      }}
    >
      <div className="flex items-start gap-4">
        {/* SVG facial */}
        <div className="flex-shrink-0">
          <FaceSkinSVG skinType={skinType} size={80} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 14, fontWeight: 700, color: "#2D1B2E", marginBottom: 4 }}>
            {info.title}
          </p>

          {summary && (
            <p style={{ fontSize: 12, color: "#9b7b8a", lineHeight: "18px", marginBottom: 8 }}
               className="line-clamp-2">
              {summary}
            </p>
          )}

          {/* Fique de olho */}
          <div
            style={{
              borderLeft: "2px solid #E8A882",
              paddingLeft: 8,
              marginBottom: 8,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: "#2D1B2E", marginBottom: 2 }}>
              Fique de olho:
            </p>
            <p style={{ fontSize: 11, color: "#9b7b8a", lineHeight: "16px" }}>
              {info.watchOut}
            </p>
          </div>

          {/* Dica prática */}
          <div
            style={{
              background: "rgba(232,168,130,0.12)",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: "#E8547A", marginBottom: 2 }}>
              Dica prática:
            </p>
            <p style={{ fontSize: 11, color: "#9b7b8a", lineHeight: "16px" }}>
              {info.tip}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
