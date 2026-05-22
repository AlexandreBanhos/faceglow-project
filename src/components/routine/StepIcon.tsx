import serumUrl from "@/assets/icones/serum-svg.svg";
import cleanserUrl from "@/assets/icones/limpezador.svg";
import moisturizerUrl from "@/assets/icones/hidratante.svg";
import maskUrl from "@/assets/icones/mascara.svg";
import exfoliantUrl from "@/assets/icones/Esfoliante.svg";
import eyeUrl from "@/assets/icones/Contorno dos Olhos.svg";
import acidUrl from "@/assets/icones/Ácido.svg";
import demaquilanteUrl from "@/assets/icones/Demaquilante.svg";
import treatmentUrl from "@/assets/icones/tratamento.svg";
import tonerUrl from "@/assets/icones/limpeza.svg";
import productUrl from "@/assets/icones/produto.svg";
import sunscreenUrl from "@/assets/icones/protetor-solar.svg";

const ICON_MAP: Record<string, string> = {
  cleanser:        cleanserUrl,
  toner:           tonerUrl,
  serum:           serumUrl,
  moisturizer:     moisturizerUrl,
  sunscreen:       sunscreenUrl,
  retinoid:        serumUrl,
  exfoliant:       exfoliantUrl,
  exfoliante:      exfoliantUrl,
  mask:            maskUrl,
  mascara:         maskUrl,
  eye_cream:       eyeUrl,
  acid:            acidUrl,
  acido:           acidUrl,
  oil:             treatmentUrl,
  spot_treatment:  treatmentUrl,
  treatment:       treatmentUrl,
  tratamento:      treatmentUrl,
  demaquilante:    demaquilanteUrl,
  makeup_remover:  demaquilanteUrl,
};

// Gradiente do sistema aplicado diretamente ao SVG via CSS mask
const GRAD = "linear-gradient(135deg, #ddb693 0%, #e8a9c2 55%, #ef8fb8 100%)";

const maskStyle = (url: string) => ({
  WebkitMaskImage: `url(${url})`,
  maskImage: `url(${url})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const);

interface StepIconProps {
  stepTypeKey?: string;
  /** Tamanho fixo em px. Se omitido, usa modo fill: ícone em 50% do container pai */
  size?: number;
  /** Cor/gradiente da máscara. Padrão: gradiente do sistema */
  background?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renderiza o ícone SVG do tipo de passo com o gradiente do sistema aplicado
 * diretamente via CSS mask — sem caixa colorida ao redor.
 * O container pai é responsável por fornecer background e border-radius.
 */
export function StepIcon({ stepTypeKey, size, background = GRAD, className = "", style }: StepIconProps) {
  const iconUrl = (stepTypeKey ? ICON_MAP[stepTypeKey.toLowerCase()] : undefined) ?? productUrl;
  const mask = maskStyle(iconUrl);

  if (size !== undefined) {
    return (
      <div className={`flex-shrink-0 ${className}`} style={{ width: size, height: size, ...style }}>
        <div style={{ width: "100%", height: "100%", background, ...mask }} />
      </div>
    );
  }

  // Modo fill: ícone ocupa 50% do container, centralizado
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`} style={style}>
      <div
        className="aspect-square"
        style={{ width: "50%", background, ...mask }}
      />
    </div>
  );
}
