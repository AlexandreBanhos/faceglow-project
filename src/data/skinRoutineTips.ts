export interface RoutineStep {
  step: string;
  icon: string;
  guidance: string;
  detail: string;
}

export interface SkinTypeTips {
  description: string;
  routine: RoutineStep[];
}

const DATA: Record<string, SkinTypeTips> = {
  oleosa: {
    description: "Sua pele produz mais sebo do que o necessário. O foco é controlar o brilho sem eliminar a hidratação.",
    routine: [
      {
        step: "Limpeza",
        icon: "🫧",
        guidance: "Gel ou espuma suave, 2× ao dia",
        detail: "A limpeza dupla (manhã e noite) remove o excesso de sebo sem agredir a barreira. Evite esfregar com força.",
      },
      {
        step: "Hidratação",
        icon: "💧",
        guidance: "Gel-creme ou fluido oil-free",
        detail: "Mesmo oleosa, a pele precisa de hidratação. Texturas leves e sem óleo evitam o brilho excessivo e não entopem os poros.",
      },
      {
        step: "Proteção solar",
        icon: "☀️",
        guidance: "Protetor toque seco FPS 50+",
        detail: "Fórmulas 'toque seco' ou 'oil control' protegem sem pesar e controlam o brilho ao longo do dia. Use diariamente.",
      },
    ],
  },
  seca: {
    description: "Sua pele tem dificuldade em reter hidratação. O objetivo é reforçar a barreira e manter a umidade.",
    routine: [
      {
        step: "Limpeza",
        icon: "🫧",
        guidance: "Creme ou leite de limpeza suave",
        detail: "Evite sabonetes com muito detergente. Fórmulas cremosas limpam sem ressecar ainda mais a pele ou alterar o pH.",
      },
      {
        step: "Hidratação",
        icon: "💧",
        guidance: "Creme ou loção rica, 2× ao dia",
        detail: "Aplique logo após lavar o rosto, com a pele ainda ligeiramente úmida, para selar a hidratação e fortalecer a barreira.",
      },
      {
        step: "Proteção solar",
        icon: "☀️",
        guidance: "Protetor em creme FPS 30+",
        detail: "Prefira protetores em textura creme — hidratam e reforçam a barreira ao mesmo tempo que protegem contra o sol.",
      },
    ],
  },
  mista: {
    description: "Sua pele tem comportamentos diferentes por zona: oleosa no centro e mais seca nas laterais. Trate cada área adequadamente.",
    routine: [
      {
        step: "Limpeza",
        icon: "🫧",
        guidance: "Gel suave ou espuma delicada, 2× ao dia",
        detail: "Use produtos equilibrantes que tratam a zona T oleosa sem ressecar as bochechas. Não exagere nas partes mais secas.",
      },
      {
        step: "Hidratação",
        icon: "💧",
        guidance: "Gel-creme na zona T, creme leve nas bochechas",
        detail: "Você pode usar texturas diferentes por região: leve e oil-free na testa/nariz, mais nutritiva nas laterais do rosto.",
      },
      {
        step: "Proteção solar",
        icon: "☀️",
        guidance: "Fluido ou gel FPS 50",
        detail: "Texturas leves que não pesam nas partes oleosas nem ressecam as partes mais sensíveis. Reaplique na zona T ao longo do dia.",
      },
    ],
  },
  normal: {
    description: "Sua pele tem equilíbrio natural entre hidratação e sebo. O objetivo é manter essa harmonia com uma rotina simples e consistente.",
    routine: [
      {
        step: "Limpeza",
        icon: "🫧",
        guidance: "Sabonete facial suave, 1–2× ao dia",
        detail: "Sua pele já é equilibrada. Uma limpeza gentil preserva o pH natural sem ressecar ou estimular excesso de sebo.",
      },
      {
        step: "Hidratação",
        icon: "💧",
        guidance: "Loção ou creme leve, 1× ao dia",
        detail: "Manutenção é a chave. Hidratação diária preserva a barreira e mantém o aspecto saudável e uniforme da pele.",
      },
      {
        step: "Proteção solar",
        icon: "☀️",
        guidance: "Qualquer protetor FPS 30+",
        detail: "Você tem liberdade de escolha de textura e formulação. O importante é usar todos os dias, mesmo em dias nublados.",
      },
    ],
  },
  sensivel: {
    description: "Sua pele reage facilmente a estímulos externos. O cuidado é evitar ingredientes irritantes e fortalecer a barreira cutânea.",
    routine: [
      {
        step: "Limpeza",
        icon: "🫧",
        guidance: "Produto sem perfume, hipoalergênico, 1× ao dia",
        detail: "Evite esfoliantes agressivos, água muito quente e álcool. Menos ingredientes = menos risco de reação.",
      },
      {
        step: "Hidratação",
        icon: "💧",
        guidance: "Creme calmante com aloe vera, aveia ou niacinamida",
        detail: "Ingredientes como aloe vera, aveia coloidal e niacinamida acalmam a vermelhidão e fortalecem a barreira sem irritar.",
      },
      {
        step: "Proteção solar",
        icon: "☀️",
        guidance: "Filtro físico (zinco ou titânio) FPS 30+",
        detail: "Filtros minerais são muito menos irritantes que os químicos e são ideais para peles reativas e sensíveis.",
      },
    ],
  },
};

export interface ConditionTip {
  icon: string;
  tip: string;
}

export const CONDITION_TIPS: Record<string, ConditionTip> = {
  acne: {
    icon: "😤",
    tip: "Evite espremer. Use produtos com ácido salicílico ou niacinamida para controlar inflamação e oleosidade local.",
  },
  olheiras: {
    icon: "👁️",
    tip: "Durma pelo menos 7h, mantenha-se bem hidratado e evite esfregar a região dos olhos.",
  },
  poros: {
    icon: "🔍",
    tip: "Limpeza regular sem agressão e protetor solar diário reduzem progressivamente a aparência dos poros.",
  },
  manchas: {
    icon: "🔶",
    tip: "O sol é o principal agravante de manchas. Protetor solar diário — mesmo em dias nublados — é essencial para conter o escurecimento.",
  },
  linhasFinas: {
    icon: "⏳",
    tip: "Hidratação constante e proteção solar são os melhores aliados para suavizar linhas de expressão ao longo do tempo.",
  },
  vermelhidao: {
    icon: "🔴",
    tip: "Evite produtos com álcool e água quente no rosto. Ingredientes calmantes como aloe vera e centella asiática ajudam.",
  },
  espinhasAtivas: {
    icon: "🔥",
    tip: "Não toque o rosto com as mãos sujas. Use produtos não comedogênicos e troque a fronha ao menos 1× por semana.",
  },
  cravos: {
    icon: "⚫",
    tip: "Limpeza facial regular e esfoliação suave 1× por semana ajudam a desobstruir os poros e reduzir os cravos visíveis.",
  },
  ressecamento: {
    icon: "💧",
    tip: "Aplique hidratante logo após lavar o rosto, com a pele ainda úmida, para selar a água e evitar a perda transepidérmica.",
  },
  labiosRessecados: {
    icon: "💋",
    tip: "Hidrate os lábios com balm diariamente e esfolie suavemente com açúcar 1× por semana para remover a pele morta.",
  },
};

const CONDITION_KEY_MAP: Record<string, string> = {
  acne: "acne",
  olheiras: "olheiras",
  poros: "poros",
  manchas: "manchas",
  labios: "labiosRessecados",
  linhas_finas: "linhasFinas",
  vermelhidao: "vermelhidao",
  espinhas_ativas: "espinhasAtivas",
  cravos: "cravos",
  ressecamento: "ressecamento",
};

export function getSkinTypeTips(skinType: string): SkinTypeTips {
  const key = skinType
    .toLowerCase()
    .trim()
    .replace(/^pele\s+/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  return DATA[key] ?? DATA.normal;
}

export function getConditionTips(
  conditions: Array<{ key: string; label: string }>
): Array<{ label: string; icon: string; tip: string }> {
  return conditions
    .map((c) => {
      const tipKey = CONDITION_KEY_MAP[c.key];
      const tip = tipKey ? CONDITION_TIPS[tipKey] : null;
      return tip ? { label: c.label, ...tip } : null;
    })
    .filter(Boolean) as Array<{ label: string; icon: string; tip: string }>;
}
