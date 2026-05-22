import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Zap, ListChecks, Clock } from "lucide-react";
import { StepIcon } from "@/components/routine/StepIcon";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface StepInfoData {
  stepTypeKey: string;
  title: string;
  about: string;
  importance: string;
  period: "morning" | "night" | "both";
  frequency: string;
  skinAdvice: Partial<Record<string, string>>;
  howTo: string[];
}

// ─── Base de dados de passos ──────────────────────────────────────────────────

const STEP_INFO: Record<string, StepInfoData> = {
  limpeza: {
    stepTypeKey: "cleanser",
    title: "Limpeza Facial",
    about:
      "Remove resíduos de suor, oleosidade, poluição e protetor solar acumulados ao longo do dia ou noite. É a base de qualquer rotina.",
    importance:
      "Sem limpeza, outros produtos não conseguem penetrar corretamente na pele — e resíduos entupem os poros, causando cravos e acne.",
    period: "both",
    frequency: "2× ao dia — manhã e noite",
    skinAdvice: {
      mista:      "Use um gel de limpeza para controlar a zona T sem ressecar as bochechas. Evite sabonetes de barra.",
      oleosa:     "Géis e espumas de limpeza com ácido salicílico ou zinco são seus melhores amigos. Não lave mais de 2× ao dia.",
      seca:       "Escolha limpadores cremosos ou em óleo que não removam a barreira natural. Evite água quente.",
      sensivel:   "Prefira fórmulas sem fragrância, sem sulfato e com pH balanceado. Água morna, nunca quente.",
      normal:     "Qualquer limpador suave funciona. Adapte à estação: gel no verão, espuma cremosa no inverno.",
    },
    howTo: [
      "Molhe o rosto com água morna (nunca quente).",
      "Aplique o limpador com movimentos circulares suaves por 30–60 segundos.",
      "Enxágue até remover todo o produto.",
      "Seque levemente com toalha limpa — sem esfregar.",
    ],
  },

  hidratante: {
    stepTypeKey: "moisturizer",
    title: "Hidratante Facial",
    about:
      "Repõe a água perdida pela pele e forma uma barreira protetora que retarda a evaporação da umidade cutânea.",
    importance:
      "Pele hidratada é pele resiliente. A falta de hidratação acelera o envelhecimento, aumenta a sensibilidade e pode piorar a oleosidade.",
    period: "both",
    frequency: "2× ao dia — após cada limpeza",
    skinAdvice: {
      mista:      "Use géis-creme leves na zona T e um creme mais rico nas bochechas — ou um hidratante balanceado para toda a face.",
      oleosa:     "Géis hidratantes oil-free com ácido hialurônico hidratam sem pesar. Mesmo pele oleosa precisa de hidratação.",
      seca:       "Cremes mais ricos com ceramidas, manteiga de karité ou esqualano são os melhores. Aplique ainda com a pele levemente úmida.",
      sensivel:   "Fórmulas sem fragrância, com centella asiatica ou aveia coloidal. Teste em pequena área antes.",
      normal:     "Loções leves ou géis-creme são suficientes. Aumente a densidade no inverno ou em ambientes com ar-condicionado.",
    },
    howTo: [
      "Aplique após a limpeza, ainda com a pele levemente úmida.",
      "Use o calor dos dedos para pressionar o produto na pele.",
      "Trabalhe do centro do rosto para as bordas.",
      "Não esqueça o pescoço e a região dos olhos (com produto adequado).",
    ],
  },

  "protetor solar": {
    stepTypeKey: "sunscreen",
    title: "Protetor Solar",
    about:
      "Filtra a radiação UVA (envelhecimento) e UVB (queimaduras). É o produto mais eficaz de anti-idade disponível — e o mais ignorado.",
    importance:
      "90% do envelhecimento cutâneo visível é causado pelo sol. Manchas, rugas e flacidez precoce são, em grande parte, evitáveis com proteção diária.",
    period: "morning",
    frequency: "Todo dia pela manhã — mesmo em dias nublados",
    skinAdvice: {
      mista:      "Protetores com textura fluida ou gel-creme são ideais. Busque fórmulas com toque seco para controlar o brilho na zona T.",
      oleosa:     "Protetores oil-free e com acabamento matte evitam o efeito brilhoso. Fluidos de cor uniforme são ótimos.",
      seca:       "Protetores com fórmula cremosa e ingredientes hidratantes (como ácido hialurônico) fazem dupla função.",
      sensivel:   "Prefira filtros físicos (dióxido de titânio, óxido de zinco) — tendem a causar menos irritação.",
      normal:     "Qualquer FPS 30+ de boa textura funciona. Experimente tinted SPF para unificar o tom.",
    },
    howTo: [
      "Aplique como último passo da rotina da manhã.",
      "Use quantidade equivalente a 1/4 de colher de chá para o rosto.",
      "Espraia uniformemente até as orelhas e o pescoço.",
      "Reaplicar a cada 2h se ficar exposto ao sol direto.",
    ],
  },

  "tônico": {
    stepTypeKey: "toner",
    title: "Tônico Facial",
    about:
      "Equilíbra o pH da pele após a limpeza e prepara para absorver melhor os próximos produtos. Pode ter ativos hidratantes, calmantes ou exfoliantes.",
    importance:
      "A limpeza eleva levemente o pH da pele. O tônico restaura o equilíbrio ácido, potencializando os resultados dos produtos seguintes.",
    period: "both",
    frequency: "1–2× ao dia, após a limpeza",
    skinAdvice: {
      mista:      "Tônicos com niacinamida ou ácido salicílico leve equilibram sem ressecar as bochechas.",
      oleosa:     "Tônicos com ácido salicílico (BHA) ajudam a controlar poros e oleosidade sem álcool.",
      seca:       "Escolha tônicos hidratantes (com glicerina ou ácido hialurônico) em vez dos adstringentes.",
      sensivel:   "Evite tônicos com álcool, mentol ou fragrância. Água termal ou tônicos com Centella funcionam bem.",
      normal:     "Tônicos multifuncionais com niacinamida e ácido hialurônico são uma boa escolha.",
    },
    howTo: [
      "Aplique com algodão ou bata suavemente com as palmas das mãos.",
      "Trabalhe do centro para as bordas do rosto.",
      "Aguarde 30 segundos antes do próximo passo.",
      "Não é necessário enxaguar.",
    ],
  },

  sérum: {
    stepTypeKey: "serum",
    title: "Sérum",
    about:
      "Concentrado de ativos em alta dose que trata condições específicas como manchas, rugas, oleosidade ou desidratação. Alta penetração na pele.",
    importance:
      "É o passo de tratamento da rotina. Cada sérum foca em um problema específico — usar o certo para seu caso faz diferença real e visível.",
    period: "both",
    frequency: "1–2× ao dia, conforme indicação do ativo",
    skinAdvice: {
      mista:      "Niacinamida (poros e oleosidade na zona T) ou vitamina C (manchas e uniformização) são excelentes escolhas.",
      oleosa:     "Séruns com niacinamida, ácido azelaico ou salicílico controlam o sebo e refinam os poros.",
      seca:       "Ácido hialurônico em sérum traz hidratação profunda. Combine com um hidratante rico por cima.",
      sensivel:   "Centella asiatica ou alantoína acalmam a pele reativa. Introduza 1 ativo por vez.",
      normal:     "Vitamina C de manhã (antioxidante + luminosidade) e ácido hialurônico à noite são clássicos.",
    },
    howTo: [
      "Aplique após o tônico, com a pele limpa e levemente úmida.",
      "Use 2–3 gotas e aplique com as pontas dos dedos.",
      "Pressione levemente — não esfregue.",
      "Aguarde absorver antes de aplicar o hidratante.",
    ],
  },

  retinol: {
    stepTypeKey: "retinoid",
    title: "Retinol / Retinoide",
    about:
      "Derivado da vitamina A, é o ativo mais estudado no combate ao envelhecimento. Acelera a renovação celular e estimula a produção de colágeno.",
    importance:
      "Reduz rugas finas, linhas de expressão, manchas e poros. Considerado o padrão ouro da dermatologia para antienvelhecimento.",
    period: "night",
    frequency: "Comece 2–3× por semana e aumente gradualmente",
    skinAdvice: {
      mista:      "Concentrações de 0,025%–0,05% para iniciar. Use no retinol buffer method (depois do hidratante) para diminuir irritação.",
      oleosa:     "Pode tolerar concentrações maiores. Combine com ácido salicílico em noites alternadas.",
      seca:       "Comece com a concentração mais baixa disponível. O método sandwich (hidratante → retinol → hidratante) é essencial.",
      sensivel:   "Prefira retinol encapsulado ou bakuchiol (alternativa vegetal mais suave). Aumente com muita cautela.",
      normal:     "Concentrações de 0,05%–0,1% são um bom ponto de partida. Progrida conforme a tolerância.",
    },
    howTo: [
      "Use apenas à noite — retinol é fotossensível.",
      "Aplique em pele limpa e SECA (aguarde 20 min após lavar).",
      "Quantidade equivalente a um grão de ervilha para todo o rosto.",
      "Sempre use protetor solar no dia seguinte.",
    ],
  },

  esfoliante: {
    stepTypeKey: "exfoliant",
    title: "Esfoliante",
    about:
      "Remove células mortas da superfície da pele (esfoliação química) ou por abrasão (esfoliação física), revelando uma pele mais lisa e luminosa.",
    importance:
      "Sem esfoliação, as células mortas se acumulam, deixando a pele opaca, com textura irregular e dificultando a absorção de outros produtos.",
    period: "both",
    frequency: "1–3× por semana — nunca todo dia",
    skinAdvice: {
      mista:      "Ácido salicílico (BHA) na zona T e ácido glicólico ou lático nas bochechas. Evite esfoliantes físicos agressivos.",
      oleosa:     "BHA (ácido salicílico) é seu aliado — penetra no poro e dissolve o sebo. Use 2–3× por semana.",
      seca:       "AHA leve (ácido lático, mandélico) esfoliam sem agredir. Evite esfoliantes físicos grosseiros.",
      sensivel:   "Ácido mandélico ou PHA são os mais suaves. Comece com 1× por semana e observe a reação.",
      normal:     "AHA ou BHA em baixa concentração 2–3× por semana. Alterne os tipos para não irritar.",
    },
    howTo: [
      "Aplique em pele limpa e seca.",
      "Esfoliantes químicos: aplique e deixe agir — sem esfregar.",
      "Esfoliantes físicos: movimentos suaves e circulares por 30 segundos.",
      "Enxágue bem e aplique hidratante em seguida.",
    ],
  },

  "removedor de maquiagem": {
    stepTypeKey: "demaquilante",
    title: "Removedor de Maquiagem",
    about:
      "Dissolve maquiagem, protetor solar e resíduos oleosos que o limpador convencional não remove completamente. Parte do método double cleanse.",
    importance:
      "Dormir com maquiagem causa entupimento dos poros, quebra as cílios e acelera o envelhecimento. Um único limpador raramente remove tudo.",
    period: "night",
    frequency: "Toda noite que usar maquiagem ou protetor solar",
    skinAdvice: {
      mista:      "Águas micelares bifásicas ou óleos leves funcionam bem — emulsificam ao contato com a água.",
      oleosa:     "Água micelar sem óleo ou gel demaquilante. O método double cleanse (óleo + gel) funciona surpreendentemente bem mesmo em peles oleosas.",
      seca:       "Bálsamos ou óleos demaquilantes são os mais nutritivos e removem tudo sem agredir.",
      sensivel:   "Água micelar sem álcool e sem fragrância — aplique com pressão mínima e algodão macio.",
      normal:     "Qualquer formato funciona — água micelar, óleo, bálsamo ou gel bifásico.",
    },
    howTo: [
      "Aplique com algodão ou diretamente nas mãos secas.",
      "Massageie suavemente para dissolver os resíduos.",
      "Enxágue ou remova com algodão úmido.",
      "Faça a limpeza convencional logo em seguida (double cleanse).",
    ],
  },

  "creme de olhos": {
    stepTypeKey: "eye_cream",
    title: "Creme de Olhos",
    about:
      "Formulado especificamente para a área periorbital (ao redor dos olhos), que é 4× mais fina que o restante do rosto e mais propensa a sinais de cansaço e envelhecimento.",
    importance:
      "Olheiras, puffiness (inchaço) e linhas finas aparecem cedo ao redor dos olhos. Produtos específicos têm ativos e texturas adaptados à delicadeza desta área.",
    period: "both",
    frequency: "Manhã e noite, após sérum",
    skinAdvice: {
      mista:      "Texturas em gel-creme equilibram hidratação sem pesar nas pálpebras.",
      oleosa:     "Géis refrescantes com cafeína são perfeitos para reduzir inchaço e controlar a oleosidade.",
      seca:       "Cremes ricos com peptídeos e retinol (em baixa concentração) nutrem sem irritar.",
      sensivel:   "Fórmulas com extrato de pepino, aloe vera ou alantoína — sem perfume.",
      normal:     "Cremes com vitamina C para iluminar olheiras e peptídeos para firmeza são boas escolhas.",
    },
    howTo: [
      "Use a quantidade de um grão de arroz para os dois olhos.",
      "Aplique com o dedo anelar — o menos forte, que exerce menos pressão.",
      "Bata suavemente no osso orbital, nunca na pálpebra.",
      "Trabalhe de dentro para fora.",
    ],
  },

  máscara: {
    stepTypeKey: "mask",
    title: "Máscara Facial",
    about:
      "Tratamento intensivo com alta concentração de ativos. Pode ser hidratante, purificante, iluminadora ou calmante — cada uma com objetivo diferente.",
    importance:
      "Oferece uma 'dose extra' de tratamento que a rotina diária não entrega. Ideal para dias em que a pele precisa de um cuidado especial.",
    period: "both",
    frequency: "1–2× por semana",
    skinAdvice: {
      mista:      "Multimask: máscara de argila na zona T e máscara hidratante nas bochechas ao mesmo tempo.",
      oleosa:     "Máscaras de argila (caulim, bentonita) absorvem o excesso de sebo e desobstruem os poros.",
      seca:       "Máscaras sleeping (leave-on noturnas) com ácido hialurônico e ceramidas são ideais.",
      sensivel:   "Máscaras com aveia coloidal, centella ou aloe vera acalmam e hidratam sem irritar.",
      normal:     "Alterne entre argila (para purificar) e hidratante (para nutrir), conforme o que a pele pedir.",
    },
    howTo: [
      "Aplique após a limpeza em pele seca.",
      "Camada uniforme, evitando contorno dos olhos e lábios.",
      "Respeite o tempo indicado — máscara de argila nunca deve secar completamente.",
      "Enxágue com água morna e aplique hidratante.",
    ],
  },
};

// Fallback genérico para passos não mapeados
const DEFAULT_INFO: StepInfoData = {
  stepTypeKey: "treatment",
  title: "Passo de Cuidado",
  about:
    "Este passo faz parte da sua rotina personalizada de skincare.",
  importance:
    "Cada passo de cuidado contribui para manter a saúde e o equilíbrio da sua pele a longo prazo.",
  period: "both",
  frequency: "Conforme indicação do produto",
  skinAdvice: {},
  howTo: [
    "Aplique após a limpeza.",
    "Use a quantidade indicada na embalagem.",
    "Aplique do centro do rosto para as bordas.",
    "Complete com hidratante e protetor solar.",
  ],
};

// ─── Normaliza o label do passo para buscar no dicionário ────────────────────

function findStepInfo(label: string): StepInfoData {
  const normalized = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  // Busca exata primeiro
  if (STEP_INFO[normalized]) return STEP_INFO[normalized];

  // Busca por substring
  for (const key of Object.keys(STEP_INFO)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return STEP_INFO[key];
    }
  }

  return DEFAULT_INFO;
}

// ─── Labels de tipo de pele ───────────────────────────────────────────────────

const SKIN_LABELS: Record<string, string> = {
  mista:    "Mista",
  oleosa:   "Oleosa",
  seca:     "Seca",
  sensivel: "Sensível",
  normal:   "Normal",
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface StepInfoModalProps {
  open: boolean;
  stepLabel: string;
  skinType?: string;
  onClose: () => void;
}

export function StepInfoModal({ open, stepLabel, skinType, onClose }: StepInfoModalProps) {
  const info = findStepInfo(stepLabel);

  const normalizedSkin = (skinType ?? "normal")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  const skinAdvice =
    info.skinAdvice[normalizedSkin] ??
    info.skinAdvice["normal"] ??
    null;

  const skinLabel = SKIN_LABELS[normalizedSkin] ?? skinType ?? "Normal";

  // Gradiente do sistema
  const GRAD = "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)";
  const CORAL = "#E8748A";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(6px)",
              zIndex: 9998,
            }}
            onClick={onClose}
          />

          {/* Sheet — flex column para separar topo fixo do scroll */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "28px 28px 0 0",
              background: "linear-gradient(180deg, #FDF8F6 0%, #FAFAF8 100%)",
              border: "1px solid rgba(255,255,255,0.9)",
              borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(244,168,199,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Handle — não scrolla ── */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(232,116,138,0.3)" }} />
            </div>

            {/* ── Área scrollável ── */}
            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ padding: "0 20px 8px" }}>

                {/* Card header gradiente */}
                <div style={{
                  borderRadius: 20,
                  background: GRAD,
                  padding: "20px",
                  marginBottom: 16,
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Bolhas decorativas */}
                  <div style={{
                    position: "absolute", top: -24, right: -24,
                    width: 96, height: 96, borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)", pointerEvents: "none",
                  }} />
                  <div style={{
                    position: "absolute", bottom: -32, right: 24,
                    width: 68, height: 68, borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)", pointerEvents: "none",
                  }} />

                  {/* Linha: texto à esquerda, ícone à direita */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        Passo da rotina
                      </p>
                      <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2 }}>
                        {info.title}
                      </h2>
                    </div>
                    {/* Ícone SVG branco à direita */}
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                      background: "rgba(255,255,255,0.18)",
                      backdropFilter: "blur(8px)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                    }}>
                      <StepIcon stepTypeKey={info.stepTypeKey} size={32} background="#ffffff" />
                    </div>
                  </div>

                  {/* Badge frequência */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 99,
                    background: "rgba(255,255,255,0.22)",
                    backdropFilter: "blur(8px)",
                  }}>
                    <Clock size={12} color="white" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{info.frequency}</span>
                  </div>
                </div>

                {/* ── Seções ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* O que é */}
                  <Section
                    icon={<BookOpen size={13} />}
                    label="O que é"
                    accentColor={CORAL}
                    grad={GRAD}
                  >
                    {info.about}
                  </Section>

                  {/* Por que é importante */}
                  <Section
                    icon={<Sparkles size={13} />}
                    label="Por que é importante"
                    accentColor={CORAL}
                    grad={GRAD}
                  >
                    {info.importance}
                  </Section>

                  {/* No seu caso — destaque em coral */}
                  {skinAdvice && (
                    <div style={{
                      borderRadius: 16,
                      background: "linear-gradient(135deg, rgba(232,116,138,0.07) 0%, rgba(244,168,199,0.06) 100%)",
                      border: "1.5px solid rgba(232,116,138,0.22)",
                      padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          background: GRAD,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(232,116,138,0.35)",
                        }}>
                          <Zap size={12} color="white" />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: CORAL, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                          No seu caso — pele {skinLabel}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: 1.65 }}>
                        {skinAdvice}
                      </p>
                    </div>
                  )}

                  {/* Como aplicar — timeline vertical */}
                  <div style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.75)",
                    border: "1px solid rgba(232,116,138,0.1)",
                    padding: "14px 16px",
                    boxShadow: "0 1px 6px rgba(232,116,138,0.06)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 2px 8px rgba(232,116,138,0.3)" }}>
                        <ListChecks size={13} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: CORAL, textTransform: "uppercase", letterSpacing: "0.09em" }}>Como aplicar</span>
                    </div>

                    {/* Timeline */}
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, rgba(232,116,138,0.4), rgba(244,168,199,0.1))" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {info.howTo.map((step, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i < info.howTo.length - 1 ? 16 : 0 }}>
                            <div style={{
                              flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
                              background: GRAD,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 800, color: "white",
                              boxShadow: "0 3px 10px rgba(232,116,138,0.35)",
                              zIndex: 1,
                            }}>
                              {i + 1}
                            </div>
                            <div style={{ flex: 1, background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "9px 12px", border: "1px solid rgba(232,116,138,0.1)", marginTop: 4 }}>
                              <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: 1.55 }}>{step}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Botão "Entendi" — fixo na base ── */}
            <div style={{
              flexShrink: 0,
              padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
              background: "linear-gradient(to top, #FAFAF8 70%, transparent)",
            }}>
              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 14,
                  background: GRAD,
                  border: "none",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(232,116,138,0.3)",
                }}
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-componente de seção ──────────────────────────────────────────────────

function Section({ icon, label, accentColor, grad, children }: {
  icon: React.ReactNode;
  label: string;
  accentColor: string;
  grad: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: 16,
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(232,116,138,0.1)",
      padding: "14px 16px",
      boxShadow: "0 1px 6px rgba(232,116,138,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
          background: grad,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
          boxShadow: "0 2px 8px rgba(232,116,138,0.3)",
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.09em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}
