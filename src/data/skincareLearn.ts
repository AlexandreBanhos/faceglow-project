// ─── Imports de imagem — todos em src/assets/skincare-edu/ ───────────────────
import imgPeleNormal    from "@/assets/skincare-edu/pele-normal.png";
import imgPeleOleosa    from "@/assets/skincare-edu/pele-oleosa.png";
import imgPeleSeca      from "@/assets/skincare-edu/pele-seca.jpg";
import imgPeleMista     from "@/assets/skincare-edu/pele-mista.png";
import imgPeleSensivel  from "@/assets/skincare-edu/pele-sensivel.png";

import imgProbAcne        from "@/assets/skincare-edu/prob-acne.png";
import imgProbManchas     from "@/assets/skincare-edu/prob-manchas.jpg";
import imgProbPoros       from "@/assets/skincare-edu/prob-poros.jpg";
import imgProbOlheiras    from "@/assets/skincare-edu/prob-olheiras.jpg";
import imgProbRugas       from "@/assets/skincare-edu/prob-rugas.jpg";
import imgProbVermelhidao from "@/assets/skincare-edu/prob-vermelhidao.jpg";
import imgProbOleosidade  from "@/assets/skincare-edu/prob-oleosidade.jpg";
import imgProbRessecamento from "@/assets/skincare-edu/prob-ressecamento.jpg";

import imgAtivoSpf        from "@/assets/skincare-edu/ativo-spf.jpg";
import imgAtivoVitaminaC  from "@/assets/skincare-edu/ativo-vitamina-c.jpg";
import imgAtivoRetinol    from "@/assets/skincare-edu/ativo-retinol.jpg";
import imgAtivoHialuronico from "@/assets/skincare-edu/ativo-hialuronico.jpg";
import imgAtivoNiacinamida from "@/assets/skincare-edu/ativo-niacinamida.jpg";
import imgAtivoAha        from "@/assets/skincare-edu/ativo-aha.jpg";
import imgAtivoBha        from "@/assets/skincare-edu/ativo-bha.jpg";
import imgAtivoCeramidas  from "@/assets/skincare-edu/ativo-ceramidas.jpg";

import imgRotinaLimpeza      from "@/assets/skincare-edu/rotina-limpeza.jpg";
import imgRotinaHidratante   from "@/assets/skincare-edu/rotina-hidratante.jpg";
import imgRotinaProtetor     from "@/assets/skincare-edu/rotina-protetor.jpg";
import imgRotinaEsfoliacao   from "@/assets/skincare-edu/rotina-esfoliacao.jpg";
import imgRotinaDoubleCleanse from "@/assets/skincare-edu/rotina-double-cleanse.jpg";
import imgRotinaManhaNoite   from "@/assets/skincare-edu/rotina-manha-noite.jpg";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LearnCategory =
  | "tipos-de-pele"
  | "problemas"
  | "ingredientes"
  | "rotina"
  | "mitos";

export interface MythItem {
  myth: string;
  truth: string;
}

export interface LearnCard {
  id: string;
  category: LearnCategory;
  title: string;
  /** Exibido truncado no card */
  description: string;
  /** Conteúdo completo do modal (categorias padrão) */
  fullDescription: string;
  focus: string;
  tip: string;
  /** Passos numerados para categoria "rotina" — renderizados como timeline */
  steps?: string[];
  /** Pares mito/verdade para categoria "mitos" */
  myths?: MythItem[];
  imageUrl: string;
  fallbackColor: string;
}

// ─── Dados ────────────────────────────────────────────────────────────────────

export const LEARN_CARDS: LearnCard[] = [

  // ── TIPOS DE PELE ───────────────────────────────────────────────────────────

  {
    id: "tipo-normal",
    category: "tipos-de-pele",
    title: "Pele Normal",
    description: "Equilibrada, sem excessos. Poros pequenos, textura suave e poucas irritações.",
    fullDescription: "A pele normal é o tipo mais raro e equilibrado. Produz sebo na medida certa, mantém boa hidratação naturalmente e raramente apresenta sensibilidade ou oleosidade excessiva. Poros são pouco visíveis e a tez tem aspecto saudável e luminoso.",
    focus: "Mesmo sendo equilibrada, a pele normal pode se deteriorar com rotinas erradas, estresse e mudanças climáticas bruscas.",
    tip: "Mantenha uma rotina simples: limpeza suave + hidratante leve + protetor solar FPS 30+. Não exagere em ativos — menos é mais.",
    imageUrl: imgPeleNormal,
    fallbackColor: "#fce7f3",
  },
  {
    id: "tipo-oleosa",
    category: "tipos-de-pele",
    title: "Pele Oleosa",
    description: "Brilho excessivo, poros dilatados e tendência a cravos e acne.",
    fullDescription: "A pele oleosa produz mais sebo do que o necessário, deixando a pele com aspecto brilhoso — especialmente na zona T (testa, nariz e queixo). Poros são mais visíveis e há maior propensão a cravos, acne e espinhas. Mas há um lado bom: tende a envelhecer mais lentamente.",
    focus: "Lavar o rosto em excesso estimula ainda mais a produção de sebo. O efeito rebote é real e pode piorar a oleosidade.",
    tip: "Use produtos oil-free e não comedogênicos. Gel de limpeza + hidratante leve em gel + protetor solar fluido são a combinação ideal.",
    imageUrl: imgPeleOleosa,
    fallbackColor: "#fef3c7",
  },
  {
    id: "tipo-seca",
    category: "tipos-de-pele",
    title: "Pele Seca",
    description: "Sensação de repuxamento, descamação e aspecto opaco sem hidratação adequada.",
    fullDescription: "A pele seca produz pouco sebo e tem dificuldade em reter umidade. Isso resulta em sensação de repuxamento, descamação, aspereza e aspecto sem vida. É mais propensa a vermelhidão, irritação e ao aparecimento precoce de linhas finas por falta de hidratação.",
    focus: "Produtos com álcool, sabonetes comuns e banhos quentes prolongados destroem o que resta da barreira cutânea.",
    tip: "Aplique hidratante rico (ceramidas, manteiga de karité, esqualano) imediatamente após o banho, ainda com a pele levemente úmida.",
    imageUrl: imgPeleSeca,
    fallbackColor: "#fed7aa",
  },
  {
    id: "tipo-mista",
    category: "tipos-de-pele",
    title: "Pele Mista",
    description: "Oleosa na zona T e seca nas bochechas — dois tipos numa só pele.",
    fullDescription: "A pele mista é a mais comum. A zona T (testa, nariz e queixo) tende à oleosidade e poros dilatados, enquanto as bochechas ficam mais secas ou normais. Isso exige produtos que equilibrem as duas regiões sem piorar nenhuma delas.",
    focus: "Usar o mesmo produto para toda a face pode secar as bochechas ou aumentar a oleosidade da zona T — um problema atrás do outro.",
    tip: "Considere o multimask (máscaras diferentes em cada região) e produtos de textura gel-creme que hidratam sem pesar.",
    imageUrl: imgPeleMista,
    fallbackColor: "#f3e8ff",
  },
  {
    id: "tipo-sensivel",
    category: "tipos-de-pele",
    title: "Pele Sensível",
    description: "Reage com facilidade — vermelhidão, ardência e coceira são sinais comuns.",
    fullDescription: "A pele sensível tem a barreira cutânea comprometida, o que permite que irritantes entrem com mais facilidade. Pode ser uma característica genética ou resultado de produtos inadequados. Reage com vermelhidão, ardência, coceira ou descamação mesmo a produtos suaves.",
    focus: "Fragrâncias, álcool, sulfatos, óleos essenciais e mudanças bruscas de temperatura são gatilhos frequentes.",
    tip: "Introduza um produto novo por vez e aguarde 2 semanas antes do próximo. Prefira fórmulas com menos ingredientes.",
    imageUrl: imgPeleSensivel,
    fallbackColor: "#ffe4e6",
  },

  // ── PROBLEMAS ───────────────────────────────────────────────────────────────

  {
    id: "prob-acne",
    category: "problemas",
    title: "Acne",
    description: "Espinhas, cravos e inflamações causadas por poros obstruídos e bactérias.",
    fullDescription: "A acne ocorre quando os poros ficam obstruídos com sebo, células mortas e bactérias (Cutibacterium acnes). Pode ser superficial (cravos) ou profunda (nódulos e cistos). Fatores como hormônios, estresse, dieta e produtos inadequados agravam o quadro.",
    focus: "Espremer espinhas leva a cicatrizes, manchas pós-inflamatórias e pode espalhar as bactérias para outras regiões.",
    tip: "Ácido salicílico (BHA) é o melhor ativo para acne leve a moderada. Consulte um dermatologista para casos graves.",
    imageUrl: imgProbAcne,
    fallbackColor: "#fee2e2",
  },
  {
    id: "prob-manchas",
    category: "problemas",
    title: "Manchas",
    description: "Hiperpigmentação causada por sol, acne, hormônios ou envelhecimento.",
    fullDescription: "As manchas resultam da produção excessiva de melanina em pontos específicos. As causas mais comuns são exposição solar sem proteção, inflamação pós-acne (manchas vermelhas ou roxas), alterações hormonais (melasma) e envelhecimento (manchas senis).",
    focus: "Sem protetor solar diário, qualquer tratamento para manchas é ineficaz — o sol continua estimulando a melanina.",
    tip: "Vitamina C de manhã + niacinamida à noite + SPF todo dia. É a combinação mais eficaz para manchas.",
    imageUrl: imgProbManchas,
    fallbackColor: "#fef9c3",
  },
  {
    id: "prob-poros",
    category: "problemas",
    title: "Poros Dilatados",
    description: "Poros visíveis, especialmente na zona T, causados por sebo e cravos.",
    fullDescription: "Poros dilatados são mais visíveis quando estão obstruídos com sebo oxidado (cravos) ou quando a pele perde elasticidade. Não existe como 'fechar' os poros — eles não têm músculo — mas é possível minimizar a aparência desobstruindo-os e mantendo a pele firme.",
    focus: "Produtos com álcool parecem diminuir os poros momentaneamente, mas ressecam a pele e estimulam mais sebo — piorando a situação.",
    tip: "Esfoliação química com BHA 2–3× por semana dissolve o sebo dentro do poro. Retinol à noite ajuda a firmar a pele ao redor.",
    imageUrl: imgProbPoros,
    fallbackColor: "#f0fdf4",
  },
  {
    id: "prob-olheiras",
    category: "problemas",
    title: "Olheiras",
    description: "Escurecimento abaixo dos olhos por vasos visíveis, volume ou pigmentação.",
    fullDescription: "As olheiras têm três causas principais: vasos sanguíneos visíveis através da pele fina (azuladas/roxas), perda de volume e gordura (fundas, com sombra) e hiperpigmentação local (marrons). Cada tipo responde a tratamentos diferentes.",
    focus: "Privação de sono piora a circulação e a aparência das olheiras, mas raramente é a causa principal — muitas vezes é genética.",
    tip: "Cafeína em creme reduz inchaço e melhora olheiras vasculares. Vitamina C e retinol ajudam na pigmentação. SPF é essencial — o sol escurece a região.",
    imageUrl: imgProbOlheiras,
    fallbackColor: "#ede9fe",
  },
  {
    id: "prob-rugas",
    category: "problemas",
    title: "Rugas e Linhas Finas",
    description: "Sinais de envelhecimento causados pela perda de colágeno e elastina.",
    fullDescription: "Rugas se formam quando a pele perde colágeno, elastina e a capacidade de reter água. 80–90% do envelhecimento visível é causado pelo sol (foto-envelhecimento). Expressões repetitivas, tabagismo, açúcar em excesso e privação de sono aceleram o processo.",
    focus: "Qualquer creme antirrugas sem protetor solar é ineficaz — o sol desfaz o que o tratamento faz enquanto você dorme.",
    tip: "Retinol é o ativo mais estudado para rugas. Comece com 0,025%, use à noite, e combine com SPF 50 pela manhã.",
    imageUrl: imgProbRugas,
    fallbackColor: "#fdf4ff",
  },
  {
    id: "prob-vermelhidao",
    category: "problemas",
    title: "Vermelhidão",
    description: "Vasos dilatados, rosácea ou sensibilidade — inflamação na superfície.",
    fullDescription: "A vermelhidão pode ser pontual (reação a produto ou temperatura) ou crônica (rosácea). A rosácea é uma condição inflamatória que causa vermelhidão persistente, vasos visíveis e, em casos graves, pústulas. Gatilhos comuns: álcool, alimentos picantes, calor, estresse e sol.",
    focus: "Esfoliantes físicos agressivos, produtos com álcool e vapor quente pioram a vermelhidão e a rosácea significativamente.",
    tip: "Centella asiatica, azuleno e niacinamida acalmam a pele vermelha. Protetor solar mineral (óxido de zinco) é o mais indicado para rosácea.",
    imageUrl: imgProbVermelhidao,
    fallbackColor: "#fff1f2",
  },
  {
    id: "prob-oleosidade",
    category: "problemas",
    title: "Oleosidade",
    description: "Excesso de sebo que deixa a pele brilhosa e propensa a cravos.",
    fullDescription: "A oleosidade excessiva é causada pela hiperprodução das glândulas sebáceas, estimulada por hormônios, genética, calor, estresse e até pela falta de hidratação. Paradoxalmente, pele ressecada produz mais sebo como mecanismo de defesa.",
    focus: "Lavar o rosto mais de 2× ao dia e usar produtos muito adstringentes remove a barreira protetora e aumenta a produção de sebo.",
    tip: "Niacinamida (5–10%) é o ativo mais eficaz para controlar a oleosidade sem ressecar. Mesmo pele oleosa precisa de hidratante leve.",
    imageUrl: imgProbOleosidade,
    fallbackColor: "#fefce8",
  },
  {
    id: "prob-ressecamento",
    category: "problemas",
    title: "Ressecamento",
    description: "Barreira cutânea comprometida que não retém umidade suficiente.",
    fullDescription: "O ressecamento ocorre quando a barreira cutânea está comprometida. A pele perde água mais rapidamente (TEWL), resultando em sensação de repuxamento, descamação, opacidade e maior sensibilidade.",
    focus: "Banhos quentes prolongados, sabonetes com sulfato e ar-condicionado intenso destroem a barreira e pioram o ressecamento.",
    tip: "Ceramidas e ácido hialurônico repõem a barreira. Aplique hidratante ainda com a pele úmida para selar a água — antes que evapore.",
    imageUrl: imgProbRessecamento,
    fallbackColor: "#fff7ed",
  },

  // ── INGREDIENTES ATIVOS ─────────────────────────────────────────────────────

  {
    id: "ativo-spf",
    category: "ingredientes",
    title: "Protetor Solar",
    description: "O ativo mais importante do skincare. Previne 90% do envelhecimento visível.",
    fullDescription: "O protetor solar filtra radiação UVA (envelhecimento, manchas) e UVB (queimaduras, câncer de pele). FPS mede a proteção UVB — use FPS 30+ no mínimo. PPD ou PA mede UVA — busque PA+++ ou superior. É o produto mais estudado e eficaz contra envelhecimento precoce.",
    focus: "Não reaplicar a cada 2h em exposição solar direta reduz drasticamente a eficácia — especialmente filtros químicos.",
    tip: "Use 1/4 de colher de chá para o rosto. Filtros físicos (óxido de zinco) para pele sensível. Filtros químicos têm textura mais leve.",
    imageUrl: imgAtivoSpf,
    fallbackColor: "#fef9c3",
  },
  {
    id: "ativo-vitamina-c",
    category: "ingredientes",
    title: "Vitamina C",
    description: "Antioxidante potente que ilumina, unifica o tom e protege contra radicais livres.",
    fullDescription: "A vitamina C (ácido L-ascórbico) neutraliza radicais livres causados pelo sol e poluição, inibe a produção de melanina (clareia manchas) e estimula a síntese de colágeno. Mais eficaz em concentrações de 10–20%.",
    focus: "Vitamina C pura oxida com facilidade — a solução fica amarelada e perde eficácia. Guarde na geladeira e troque quando mudar de cor.",
    tip: "Use pela manhã, antes do protetor solar. A combinação vitamina C + SPF é mais eficaz que cada um isolado — efeito sinérgico comprovado.",
    imageUrl: imgAtivoVitaminaC,
    fallbackColor: "#fef3c7",
  },
  {
    id: "ativo-retinol",
    category: "ingredientes",
    title: "Retinol",
    description: "O padrão ouro do antienvelhecimento. Acelera renovação e estimula colágeno.",
    fullDescription: "O retinol (vitamina A) acelera a renovação celular, estimula colágeno, reduz rugas, manchas e poros. Leva 3 a 6 meses para resultados visíveis. Pode causar descamação e vermelhidão nas primeiras semanas — é o período de adaptação normal.",
    focus: "Retinol + ácidos (AHA/BHA) na mesma noite pode irritar demais. Use em noites alternadas. Nunca use de dia sem SPF 50+.",
    tip: "Comece com 0,025% 2× por semana. Aumente gradualmente. O método sandwich (hidratante → retinol → hidratante) reduz irritação.",
    imageUrl: imgAtivoRetinol,
    fallbackColor: "#fff1f2",
  },
  {
    id: "ativo-hialuronico",
    category: "ingredientes",
    title: "Ácido Hialurônico",
    description: "Captura água e mantém a pele hidratada — segura 1.000× seu peso em água.",
    fullDescription: "O ácido hialurônico é uma molécula que atrai e retém água. Em sérum ou creme, repõe a hidratação das camadas superficiais. Diferentes pesos moleculares penetram em profundidades distintas — produtos com múltiplos pesos são mais completos.",
    focus: "Aplicar em ambiente muito seco pode puxar água das camadas mais profundas para a superfície — e depois evaporar, ressecando mais.",
    tip: "Aplique sobre pele levemente úmida e sele imediatamente com hidratante. Em climas muito secos, use sempre com um oclusivo por cima.",
    imageUrl: imgAtivoHialuronico,
    fallbackColor: "#eff6ff",
  },
  {
    id: "ativo-niacinamida",
    category: "ingredientes",
    title: "Niacinamida",
    description: "Vitamina B3 multibenefícios: poros, oleosidade, manchas e barreira cutânea.",
    fullDescription: "A niacinamida (vitamina B3) reduz poros visíveis, controla oleosidade, inibe a transferência de melanina, fortalece a barreira cutânea, melhora textura e tem ação anti-inflamatória. Tolerada por praticamente todos os tipos de pele.",
    focus: "O mito de que niacinamida e vitamina C não combinam é desatualizado. Em concentrações moderadas e formulações modernas, são compatíveis.",
    tip: "Concentração ideal: 5% para resultados gerais, até 10% para oleosidade e poros. Um dos ativos mais seguros para iniciantes.",
    imageUrl: imgAtivoNiacinamida,
    fallbackColor: "#f0fdf4",
  },
  {
    id: "ativo-aha",
    category: "ingredientes",
    title: "AHA — Ácidos",
    description: "Esfoliação química que renova, ilumina e melhora textura da pele.",
    fullDescription: "AHA (alfa-hidroxi ácidos) esfoliam a superfície da pele removendo células mortas. Os mais usados: ácido glicólico (potente), lático (suave, hidratante), mandélico (suave, para pele sensível). Melhoram textura, manchas e luminosidade.",
    focus: "AHA aumentam a fotossensibilidade — use sempre à noite e aplique SPF no dia seguinte. Não combine com retinol na mesma noite.",
    tip: "Comece com 5–8% e 1–2× por semana. Aumente gradualmente. pH ideal abaixo de 4 para ação esfoliante real.",
    imageUrl: imgAtivoAha,
    fallbackColor: "#fdf4ff",
  },
  {
    id: "ativo-bha",
    category: "ingredientes",
    title: "BHA — Salicílico",
    description: "Ácido lipossolúvel que penetra no poro e dissolve cravos por dentro.",
    fullDescription: "O ácido salicílico é lipossolúvel, o que lhe permite penetrar nas glândulas sebáceas e dentro dos poros para dissolver o sebo acumulado. É o melhor ativo para pele oleosa, acne e cravos. Tem também ação anti-inflamatória e antibacteriana.",
    focus: "BHA pode ressecar em excesso se usado com muita frequência. Comece com 1× por semana e observe como a pele responde.",
    tip: "Concentração eficaz: 0,5–2%. Deixe agir por pelo menos 20 minutos antes de aplicar outros produtos para máxima eficácia.",
    imageUrl: imgAtivoBha,
    fallbackColor: "#ecfdf5",
  },
  {
    id: "ativo-ceramidas",
    category: "ingredientes",
    title: "Ceramidas",
    description: "Lipídios que formam e reparam a barreira cutânea — essenciais para pele seca.",
    fullDescription: "Ceramidas são lipídios naturais que compõem 50% da barreira cutânea. Com envelhecimento e produtos agressivos, os níveis diminuem — deixando a pele mais permeável e sensível. Produtos com ceramidas repõem esses lipídios e restauram a função de barreira.",
    focus: "Ceramidas não são um ativo 'rápido' — os resultados aparecem gradualmente com uso consistente. Não espere mágica em 3 dias.",
    tip: "Combine ceramidas com ácido hialurônico e colesterol para o efeito reparador máximo. Ideal para pele seca, sensível e pós-procedimento.",
    imageUrl: imgAtivoCeramidas,
    fallbackColor: "#f0f9ff",
  },

  // ── PASSOS DA ROTINA ────────────────────────────────────────────────────────

  {
    id: "rotina-limpeza",
    category: "rotina",
    title: "Limpeza Facial",
    description: "A base de tudo. Remove sujeira, sebo e resíduos antes de qualquer produto.",
    fullDescription: "A limpeza remove suor, poluição, protetor solar, sebo e células mortas acumuladas. Sem ela, nenhum produto consegue penetrar corretamente. O ideal é limpar 2× ao dia.",
    focus: "Lavar mais de 2× ao dia ou usar sabonetes agressivos destrói a barreira cutânea e pode aumentar a produção de sebo.",
    tip: "Gel (oleosa/mista), espuma cremosa (normal), leite ou óleo (seca). 60 segundos de massagem são suficientes.",
    steps: [
      "Molhe o rosto com água morna — nunca quente.",
      "Aplique o limpador nas mãos úmidas e faça espuma.",
      "Massageie o rosto por 30–60 segundos com movimentos circulares suaves.",
      "Enxágue completamente até não restar produto.",
      "Seque levemente com toalha limpa — sem esfregar.",
      "Siga imediatamente para o próximo passo da rotina.",
    ],
    imageUrl: imgRotinaLimpeza,
    fallbackColor: "#f0f9ff",
  },
  {
    id: "rotina-hidratante",
    category: "rotina",
    title: "Hidratação",
    description: "Repõe água, sela a umidade e fortalece a barreira cutânea.",
    fullDescription: "O hidratante cumpre três funções: umectantes (atraem água), emolientes (suavizam) e oclusivos (selam e impedem evaporação). O ideal é ter as três na fórmula.",
    focus: "Pele desidratada produz mais sebo como mecanismo de defesa — a oleosidade piora sem hidratante.",
    tip: "Aplique sempre após a limpeza, com a pele ligeiramente úmida. Gel-creme no verão, creme rico no inverno.",
    steps: [
      "Aplique logo após a limpeza, enquanto a pele ainda está levemente úmida.",
      "Coloque uma quantidade do tamanho de uma ervilha nas pontas dos dedos.",
      "Aqueça o produto entre as palmas por 2 segundos.",
      "Pressione suavemente no centro do rosto e espraia para as bordas.",
      "Inclua pescoço e colo — estas áreas envelhecem primeiro.",
      "Aguarde 1–2 minutos antes de aplicar o próximo produto.",
    ],
    imageUrl: imgRotinaHidratante,
    fallbackColor: "#eff6ff",
  },
  {
    id: "rotina-protetor",
    category: "rotina",
    title: "Como Usar Protetor Solar",
    description: "Último passo da manhã. Quantidade certa é fundamental para a proteção real.",
    fullDescription: "O protetor solar deve ser o último produto da rotina da manhã. A quantidade certa é fundamental: 1/4 de colher de chá para o rosto. Menos do que isso reduz o FPS real.",
    focus: "O protetor solar não substitui hidratante, e hidratante com FPS não oferece proteção suficiente — a quantidade aplicada normalmente é insuficiente.",
    tip: "Teste texturas até encontrar uma que você goste de usar todo dia. A melhor proteção é a que você usa consistentemente.",
    steps: [
      "Aplique como último passo, após hidratante e antes de maquiagem.",
      "Use 1/4 de colher de chá (≈ 2 ml) para o rosto — não economize.",
      "Aplique por todo o rosto, incluindo orelhas e pescoço.",
      "Aguarde 2–3 minutos para firmar antes de maquiar.",
      "Em exposição solar direta: reaplicar a cada 2 horas.",
      "Em dias nublados: proteção UVA continua presente — use sempre.",
    ],
    imageUrl: imgRotinaProtetor,
    fallbackColor: "#fefce8",
  },
  {
    id: "rotina-esfoliacao",
    category: "rotina",
    title: "Esfoliação",
    description: "Remove células mortas e revela pele mais lisa, luminosa e uniforme.",
    fullDescription: "Existem dois tipos: física (partículas, buchas) e química (AHA, BHA, PHA). A esfoliação química é mais uniforme, controlada e segura. Frequência ideal: 1–3× por semana.",
    focus: "Esfoliar em excesso destrói a barreira cutânea e deixa a pele vermelha, sensível e inflamada.",
    tip: "Iniciantes: PHA (o mais suave). Pele oleosa/cravos: BHA. Manchas e textura: AHA. Nunca misture dois ácidos no mesmo dia.",
    steps: [
      "Use apenas à noite — AHA e BHA aumentam a fotossensibilidade.",
      "Aplique após a limpeza em pele limpa e seca.",
      "Esfoliante químico: aplique com algodão ou dedos e deixe agir — sem esfregar.",
      "Esfoliante físico: movimentos circulares suaves por 30 segundos e enxágue.",
      "Aguarde 20–30 minutos antes de aplicar retinol ou outros ativos.",
      "Hidrate bem em seguida — a pele estará mais receptiva.",
    ],
    imageUrl: imgRotinaEsfoliacao,
    fallbackColor: "#fdf4ff",
  },
  {
    id: "rotina-double-cleanse",
    category: "rotina",
    title: "Double Cleansing",
    description: "Dupla limpeza que garante remoção total de maquiagem e protetor solar.",
    fullDescription: "O double cleansing usa primeiro um produto oleoso para dissolver maquiagem e protetor solar, e depois um limpador aquoso para remover os resíduos. Origem na rotina coreana.",
    focus: "Fazer double cleansing de manhã é desnecessário — à noite é onde faz diferença.",
    tip: "Pele oleosa também se beneficia — óleos leves têm afinidade com o sebo e limpam sem irritar.",
    steps: [
      "1ª Limpeza: aplique óleo, bálsamo ou água micelar bifásica em pele SECA.",
      "Massageie por 1 minuto para dissolver maquiagem e protetor solar.",
      "Enxágue ou remova com algodão úmido.",
      "2ª Limpeza: aplique seu limpador aquoso convencional normalmente.",
      "Massageie por 30–60 segundos e enxágue com água morna.",
      "Siga para o restante da rotina noturna.",
    ],
    imageUrl: imgRotinaDoubleCleanse,
    fallbackColor: "#f0fdf4",
  },
  {
    id: "rotina-manha-noite",
    category: "rotina",
    title: "Manhã vs Noite",
    description: "Proteção de dia, reparação à noite — cada período tem um objetivo diferente.",
    fullDescription: "A rotina da manhã foca em proteção contra UV, poluição e oxidação. A rotina noturna foca em reparação com ativos de tratamento que não combinam com exposição solar.",
    focus: "Usar retinol, AHA ou BHA pela manhã sem SPF 50+ potencializa a fotossensibilidade e pode gerar manchas.",
    tip: "Antioxidantes (vitamina C, niacinamida) de manhã + renovação (retinol, ácidos) à noite. Protetor solar só de manhã, hidratante sempre.",
    steps: [
      "MANHÃ: Limpeza leve → Tônico (opcional) → Sérum vitamina C → Hidratante → Protetor solar.",
      "NOITE: Double cleanse → Tônico → Esfoliante (2–3×/sem) → Sérum tratamento → Retinol → Hidratante.",
      "Vitamina C e retinol não precisam ser usados juntos — separe por período.",
      "Ácidos AHA/BHA e retinol: use em noites alternadas para não irritar.",
      "Sempre hidrate bem após qualquer ativo de renovação.",
      "Reavalie sua rotina a cada 3 meses conforme a pele responde.",
    ],
    imageUrl: imgRotinaManhaNoite,
    fallbackColor: "#fdf2f8",
  },

  // ── MITOS E VERDADES ────────────────────────────────────────────────────────

  {
    id: "mitos-limpeza",
    category: "mitos",
    title: "Mitos da Limpeza",
    description: "Lavar mais vezes limpa melhor? Sensação de repuxamento é sinal de limpeza? Descubra.",
    fullDescription: "Muitas crenças sobre limpeza facial são passadas de geração em geração — e a maioria faz mais mal do que bem.",
    focus: "Seguir mitos de limpeza é uma das principais causas de barreira cutânea comprometida.",
    tip: "Menos é mais. Uma limpeza suave 2× ao dia é suficiente para a maioria das peles.",
    myths: [
      { myth: "Lavar o rosto mais vezes remove mais oleosidade e deixa a pele mais limpa.", truth: "Lavar mais de 2× ao dia destrói a barreira cutânea e estimula ainda mais a produção de sebo — o efeito rebote é real." },
      { myth: "Sensação de repuxamento após a limpeza significa que está limpo de verdade.", truth: "Repuxamento é sinal de que o pH da pele foi alterado e a barreira está comprometida. Um bom limpador deixa a pele confortável." },
      { myth: "Água quente abre os poros e limpa melhor.", truth: "Poros não têm músculo e não abrem ou fecham. Água quente remove lipídios protetores e irrita a pele. Água morna é sempre melhor." },
      { myth: "Sabonete em barra comum é suficiente para limpar o rosto.", truth: "Sabonetes corporais têm pH alcalino (9–10) que desestrutura a barreira ácida da pele (pH 4,5–5,5). Use sempre um limpador facial específico." },
    ],
    imageUrl: imgRotinaLimpeza,
    fallbackColor: "#f0f9ff",
  },
  {
    id: "mitos-protetor",
    category: "mitos",
    title: "Mitos do Protetor Solar",
    description: "Em dia nublado não precisa? Pele negra não queima? Desmistificando o SPF.",
    fullDescription: "O protetor solar é o produto com mais mitos no skincare — e também o mais importante. Acreditar nas mentiras pode ter consequências sérias para a saúde da pele.",
    focus: "Mitos sobre protetor solar levam à exposição desprotegida e aceleram o envelhecimento e o risco de câncer.",
    tip: "Use protetor solar todo dia, o ano todo, em qualquer tom de pele — sem exceções.",
    myths: [
      { myth: "Em dias nublados ou dentro de casa não é necessário usar protetor.", truth: "A radiação UVA atravessa nuvens e vidros. Até 80% da radiação UV chega à pele em dias nublados. E janelas bloqueiam UVB, mas não UVA." },
      { myth: "Pele negra não queima e não precisa de protetor solar.", truth: "Pele negra produz mais melanina e queima menos, mas ainda sofre dano UV acumulativo — manchas, envelhecimento e risco de câncer de pele existem em todos os tons." },
      { myth: "Se tiver vitamina C e antioxidantes, o protetor solar não é necessário.", truth: "Antioxidantes complementam a proteção solar mas não a substituem. Eles neutralizam radicais livres que 'passam' pelo filtro — são aliados, não substitutos." },
      { myth: "Reaplicar protetor solar por cima da maquiagem estraga a maquiagem.", truth: "Existem protetores solares em pó, spray e mousse desenvolvidos para reaplicação sem estragar a maquiagem. A reaplicação é inegociável." },
    ],
    imageUrl: imgAtivoSpf,
    fallbackColor: "#fef9c3",
  },
  {
    id: "mitos-ingredientes",
    category: "mitos",
    title: "Mitos de Ingredientes",
    description: "Natural é sempre melhor? Mais ingredientes = produto mais eficaz? Entenda.",
    fullDescription: "O marketing de skincare cria muitos mitos sobre ingredientes — natural vs sintético, mais vs menos, caro vs barato. A ciência costuma contar uma história bem diferente.",
    focus: "Acreditar em mitos de ingredientes leva a escolhas erradas e produtos inadequados para seu tipo de pele.",
    tip: "Confie em evidências científicas e não em marketing. Um produto com 3 ingredientes certos supera um com 30 ingredientes errados.",
    myths: [
      { myth: "Ingredientes naturais são sempre melhores e mais seguros que sintéticos.", truth: "Naturalidade não é sinônimo de segurança. Muitos ingredientes naturais causam alergias (óleos essenciais, extratos). Muitos sintéticos são mais estáveis e eficazes." },
      { myth: "Quanto mais ingredientes na fórmula, mais benefícios o produto oferece.", truth: "Produtos com muitos ingredientes têm cada um em concentrações muito baixas para ser eficaz. Fórmulas focadas com 5–10 ingredientes funcionam melhor." },
      { myth: "Vitamina C e niacinamida não podem ser usadas juntas — formam ácido nicotínico.", truth: "Esta reação requer concentrações altas e temperaturas elevadas — condições que não ocorrem na pele. Hoje são amplamente consideradas compatíveis." },
      { myth: "Óleos faciais entopem os poros e causam acne.", truth: "Depende do óleo. Alguns como jojoba, argan e esqualano são não-comedogênicos e até ajudam a regular o sebo. Coco e linhaça têm maior risco comedogênico." },
    ],
    imageUrl: imgAtivoNiacinamida,
    fallbackColor: "#f0fdf4",
  },
  {
    id: "mitos-acne",
    category: "mitos",
    title: "Mitos da Acne",
    description: "Chocolate causa acne? Espremer resolve? Pele oleosa não precisa de hidratante?",
    fullDescription: "A acne é rodeada de mitos — muitos passados de geração em geração. Seguir conselhos equivocados pode piorar o quadro e deixar cicatrizes permanentes.",
    focus: "Tratar acne com base em mitos leva a cicatrizes, manchas e piora do quadro.",
    tip: "Consulte um dermatologista para casos moderados a graves — o tratamento correto existe e funciona.",
    myths: [
      { myth: "Espremer espinhas acelera a cura e desobstrui o poro.", truth: "Esprimir empurra a inflamação para as camadas mais profundas, piora a inflamação, espalha bactérias e cria cicatrizes e manchas pós-inflamatórias que duram meses." },
      { myth: "Chocolate e alimentos gordurosos causam acne diretamente.", truth: "A relação é indireta: alimentos com alto índice glicêmico (açúcar, farinhas refinadas) estimulam insulina e IGF-1, que aumentam a produção de sebo. Chocolate amargo tem menos impacto que latte." },
      { myth: "Pele oleosa com acne não precisa de hidratante.", truth: "Pele oleosa desidratada produz ainda mais sebo. Hidratantes oil-free e não-comedogênicos são essenciais — hidratação não é oleosidade." },
      { myth: "Secar ao máximo a pele com álcool mata as bactérias da acne.", truth: "Álcool resseca, irrita e destrói a barreira cutânea, gerando mais inflamação. BHA (ácido salicílico) penetra no poro e é muito mais eficaz e seguro." },
    ],
    imageUrl: imgProbAcne,
    fallbackColor: "#fee2e2",
  },
];

// ─── Labels por categoria ─────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<LearnCategory, string> = {
  "tipos-de-pele": "Tipos de Pele",
  "problemas":     "Problemas",
  "ingredientes":  "Ingredientes",
  "mitos":         "Mitos e Verdades",
  "rotina":        "Rotina",
};

export const CATEGORIES: LearnCategory[] = [
  "tipos-de-pele",
  "problemas",
  "ingredientes",
  "rotina",
  "mitos",
];
