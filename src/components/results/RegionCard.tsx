import type { FacialPoint } from "@/lib/analysis";

interface FactorInfo {
  label: string;
  region: string;
  description: string;
  icon: string;
  color: string;
}

const FACTOR_MAP: Record<string, FactorInfo> = {
  acne:            { label: "Acne",              region: "Zona T / Bochechas",     description: "Inflamações ativas detectadas. Evite produtos comedogênicos e prefira ativos como ácido salicílico.",  icon: "😤", color: "#f5a8b8" },
  espinhas:        { label: "Espinhas ativas",   region: "Testa / Queixo",         description: "Espinhas inflamadas na superfície. Trate com spot treatments antes de dormir.",                        icon: "🔴", color: "#f5a8b8" },
  espinhas_ativas: { label: "Espinhas ativas",   region: "Testa / Queixo",         description: "Espinhas inflamadas na superfície. Trate com spot treatments antes de dormir.",                        icon: "🔴", color: "#f5a8b8" },
  oleosidade:      { label: "Oleosidade",        region: "Zona T",                 description: "Excesso de sebo na região central. Produtos oil-free e argilosos ajudam a regular.",                    icon: "✨", color: "#f5c0a0" },
  oiliness:        { label: "Oleosidade",        region: "Zona T",                 description: "Excesso de sebo na região central. Produtos oil-free e argilosos ajudam a regular.",                    icon: "✨", color: "#f5c0a0" },
  manchas:         { label: "Manchas",           region: "Bochechas / Testa",      description: "Hiperpigmentação irregular detectada. Vitamina C e protetor solar são fundamentais.",                  icon: "🔶", color: "#f5d9a0" },
  dark_spots:      { label: "Manchas",           region: "Bochechas / Testa",      description: "Hiperpigmentação irregular detectada. Vitamina C e protetor solar são fundamentais.",                  icon: "🔶", color: "#f5d9a0" },
  darkspots:       { label: "Manchas",           region: "Bochechas / Testa",      description: "Hiperpigmentação irregular detectada. Vitamina C e protetor solar são fundamentais.",                  icon: "🔶", color: "#f5d9a0" },
  olheiras:        { label: "Olheiras",          region: "Região Periocular",      description: "Escurecimento ao redor dos olhos. Cremes com cafeína e vitamina K ajudam a amenizar.",                 icon: "👁️", color: "#b8c4f5" },
  poros:           { label: "Poros Dilatados",   region: "Nariz / Bochechas",      description: "Poros com aparência aumentada. Esfoliação e niacinamida refinam a textura visivelmente.",              icon: "🔍", color: "#c8baf0" },
  linhas_finas:    { label: "Linhas Finas",      region: "Contorno / Testa",       description: "Primeiros sinais de envelhecimento. Retinol à noite e hidratação intensa são os aliados certos.",      icon: "⏳", color: "#b8c8d8" },
  linhasfinas:     { label: "Linhas Finas",      region: "Contorno / Testa",       description: "Primeiros sinais de envelhecimento. Retinol à noite e hidratação intensa são os aliados certos.",      icon: "⏳", color: "#b8c8d8" },
  rugas:           { label: "Rugas",             region: "Testa / Contorno",       description: "Marcas de expressão detectadas. Peptídeos e retinoides promovem renovação celular.",                   icon: "⏳", color: "#b8c8d8" },
  vermelhidao:     { label: "Vermelhidão",       region: "Bochechas / Nariz",      description: "Rubor e inflamação superficial. Produtos com centella asiática e azeloglicina acalmam.",               icon: "🔴", color: "#f5a8b8" },
  cravos:          { label: "Cravos",            region: "Nariz / Queixo",         description: "Comedões abertos nos poros. AHAs e BHAs dissolvem as impurezas sem agredir.",                          icon: "⚫", color: "#b8c0cc" },
  ressecamento:    { label: "Ressecamento",      region: "Bochechas / Contorno",   description: "Pele com baixa hidratação. Ceramidas, ácido hialurônico e oclusivos são essenciais.",                  icon: "🏜️", color: "#c8a080" },
  sensibilidade:   { label: "Sensibilidade",     region: "Geral",                  description: "Alta reatividade cutânea. Prefira fórmulas minimalistas sem fragrância ou álcool.",                     icon: "🌡️", color: "#f5d9a0" },
  sensitivity:     { label: "Sensibilidade",     region: "Geral",                  description: "Alta reatividade cutânea. Prefira fórmulas minimalistas sem fragrância ou álcool.",                     icon: "🌡️", color: "#f5d9a0" },
};

function resolveInfo(factor: string): FactorInfo {
  const key = factor
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
  return FACTOR_MAP[key] ?? FACTOR_MAP[factor.toLowerCase()] ?? {
    label: factor,
    region: "Região facial",
    description: "Condição identificada pela análise de IA. Consulte sua rotina personalizada.",
    icon: "🔬",
    color: "#6b7280",
  };
}

export function RegionCard({ point }: { point: FacialPoint }) {
  const info = resolveInfo(point.factor);
  const severity = Math.min(100, Math.round(point.severity * 10));

  return (
    <div style={{
      background: "white",
      borderRadius: "20px",
      padding: "16px",
      border: "1px solid #f3f4f6",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        {/* Ícone */}
        <div style={{
          width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
          background: `${info.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "20px",
        }}>
          {info.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Linha superior: label + badge de severidade */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>{info.label}</span>
            <span style={{
              fontSize: "11px", fontWeight: 700,
              color: info.color, background: `${info.color}15`,
              padding: "2px 8px", borderRadius: "999px",
            }}>
              {severity}%
            </span>
          </div>

          {/* Região */}
          <p style={{ fontSize: "11px", fontWeight: 600, color: info.color, margin: "0 0 6px" }}>
            📍 {info.region}
          </p>

          {/* Descrição */}
          <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.55", margin: 0 }}>
            {info.description}
          </p>
        </div>
      </div>
    </div>
  );
}
