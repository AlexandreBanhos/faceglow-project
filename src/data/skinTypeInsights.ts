export interface SkinInsight {
  title: string;
  description: string;
  icon: string;
}

const DATA: Record<string, SkinInsight[]> = {
  oleosa: [
    { icon: "⏳", title: "Menos propensa a rugas precoces", description: "O sebo natural cria uma barreira que retarda o aparecimento de linhas finas." },
    { icon: "💧", title: "Alta hidratação natural",        description: "Sua pele produz sebo suficiente para manter a umidade sem muitos produtos." },
    { icon: "🌟", title: "Boa cicatrização",               description: "Peles oleosas tendem a se recuperar rapidamente de pequenas agressões." },
  ],
  seca: [
    { icon: "✨", title: "Textura fina e suave",           description: "Peles secas costumam ter uma textura mais refinada e delicada ao toque." },
    { icon: "🔍", title: "Poros naturalmente fechados",    description: "A menor produção de sebo mantém os poros reduzidos e imperceptíveis." },
    { icon: "💄", title: "Maquiagem mais duradoura",       description: "A pele seca tende a fixar melhor a base e o pó ao longo do dia." },
  ],
  mista: [
    { icon: "⚖️", title: "Equilíbrio natural",            description: "Sua pele combina o melhor dos dois tipos: zonas secas hidratadas e zona T controlada." },
    { icon: "💪", title: "Boa resiliência",                description: "Peles mistas adaptam-se bem a mudanças de clima e de rotina." },
    { icon: "🎯", title: "Versatilidade de produtos",      description: "Você pode usar produtos específicos em cada zona para otimizar os resultados." },
  ],
  normal: [
    { icon: "🛡️", title: "Barreira cutânea saudável",     description: "Sua pele mantém equilíbrio ideal entre hidratação e produção de sebo." },
    { icon: "✅", title: "Boa tolerância a produtos",      description: "Peles normais reagem bem à maioria dos ingredientes e formulações." },
    { icon: "🌿", title: "Baixa sensibilidade",            description: "Menor probabilidade de reações adversas a produtos e fatores ambientais." },
  ],
  sensivel: [
    { icon: "🎯", title: "Alta percepção corporal",        description: "Você detecta rapidamente o que funciona e o que agride sua pele." },
    { icon: "⚡", title: "Resposta rápida ao tratamento",  description: "Peles sensíveis reagem rapidamente a produtos adequados, com resultados visíveis." },
    { icon: "💬", title: "Pele comunicativa",              description: "Sua pele sinaliza claramente suas necessidades, facilitando o cuidado correto." },
  ],
};

export function getSkinTypeInsights(skinType: string): SkinInsight[] {
  const key = skinType
    .toLowerCase()
    .trim()
    .replace(/^pele\s+/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  return DATA[key] ?? DATA.normal;
}
