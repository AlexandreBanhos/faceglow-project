import { motion } from "framer-motion";
import pelaNormalImg from "@/assets/pele-normal.png";
import pelaOleosaImg from "@/assets/pele-oleosa.png";
import pelaSensselImg from "@/assets/pele-sensivel.png";
import pelaMistaImg from "@/assets/pele-mista.png";

interface SkinTypeInfo {
  type: string;
  title: string;
  description: string;
  focus: string;
  tips: string;
  image: string;
  emoji: string;
  gradientColor: string;
}

// Image map for proper module imports
const imageMap: Record<string, string> = {
  "pele-normal": pelaNormalImg,
  "pele-oleosa": pelaOleosaImg,
  "pele-sensivel": pelaSensselImg,
  "pele-mista": pelaMistaImg,
};

const skinTypeData: Record<string, SkinTypeInfo> = {
  normal: {
    type: "normal",
    title: "Pele Normal",
    emoji: "o",
    description: "Equilíbrio é o nome do jogo. Nem muito oleosa, nem ressecada. Tem textura suave, poros pouco visíveis e raramente apresenta irritações.",
    focus: "Mesmo sendo equilibrada, pode sofrer com clima, estresse e produtos agressivos.",
    tips: "Mantenha uma rotina simples: limpeza + hidratação + proteção solar já fazem mágica aqui.",
    image: "pele-normal",
    gradientColor: "#fce7f3",
  },
  seca: {
    type: "seca",
    title: "Pele Seca",
    emoji: "~",
    description: "Pede socorro por hidratação. Sensação de repuxamento, descamação e aspecto opaco são comuns. Pode parecer sem vida se não for bem cuidada.",
    focus: "Produtos muito agressivos ou banhos quentes só pioram a situação.",
    tips: "Invista em hidratantes mais densos e evite exagerar na limpeza. Menos agressão, mais nutrição.",
    image: "pele-normal",
    gradientColor: "#fed7aa",
  },
  oleosa: {
    type: "oleosa",
    title: "Pele Oleosa",
    emoji: "*",
    description: "Brilho em excesso e poros mais visíveis. Tendência a acne, cravos e aquele aspecto pegajoso ao longo do dia.",
    focus: "Lavar demais pode aumentar ainda mais a oleosidade (sim, o efeito rebote é real).",
    tips: "Use produtos leves, oil-free e controle — não elimine — a oleosidade.",
    image: "pele-oleosa",
    gradientColor: "#fef3c7",
  },
  sensivel: {
    type: "sensivel",
    title: "Pele Sensível",
    emoji: "+",
    description: "Reage fácil — até ao que parece inofensivo. Vermelhidão, ardência ou coceira são sinais comuns. Pode ser causada por genética ou fatores externos.",
    focus: "Fragrâncias, álcool e mudanças bruscas de temperatura.",
    tips: "Escolha produtos suaves, com menos ingredientes e foco em acalmar a pele.",
    image: "pele-sensivel",
    gradientColor: "#ffe4e6",
  },
  mista: {
    type: "mista",
    title: "Pele Mista",
    emoji: "±",
    description: "O famoso equilíbrio desequilibrado. Oleosa na zona T (testa, nariz e queixo) e mais seca nas bochechas.",
    focus: "Usar um único tipo de produto pra tudo pode não funcionar.",
    tips: "Trate cada região conforme a necessidade — sim, sua pele pede estratégia.",
    image: "pele-mista",
    gradientColor: "#f3e8ff",
  },
};

interface SkinTypeInfoCardProps {
  skinType?: string;
  delay?: number;
}

export default function SkinTypeInfoCard({ skinType = "normal", delay = 0 }: SkinTypeInfoCardProps) {
  const normalizedType = (skinType || "normal").toLowerCase().trim();
  const info = skinTypeData[normalizedType] || skinTypeData.normal;

  const imageUrl = imageMap[info.image] || imageMap["pele-normal"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-4 space-y-3"
    >
      {/* Header: avatar circle + title + description */}
      <div className="flex items-start gap-3">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden flex-shrink-0 border-2 border-border/40 bg-white">
          <img
            src={imageUrl}
            alt={info.title}
            loading="eager"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-extrabold text-foreground leading-tight">{info.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{info.description}</p>
        </div>
      </div>

      {/* Focus Warning */}
      <div className="border-l-2 border-warm-orange/60 pl-3 py-1.5 rounded-r-lg bg-warm-orange/10">
        <p className="text-[11px] font-bold text-warm-orange/90">Fique de olho:</p>
        <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{info.focus}</p>
      </div>

      {/* Practical Tips */}
      <div className="border-l-2 border-primary/60 pl-3 py-1.5 rounded-r-lg bg-primary/10">
        <p className="text-[11px] font-bold text-primary/90">Dica prática:</p>
        <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{info.tips}</p>
      </div>
    </motion.div>
  );
}
