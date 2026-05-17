import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LifestyleAnswers {
  ageRange: string;
  gender: string;
  selfReportedSkinType: string;
  skinSensitivity: string;
  primaryConcern: string;
  secondaryConcerns: string[];
  budgetRange: string;
  makeupUsage: string;
  sunscreenUsage: string;
  currentRoutineItems: string[];
  hormonalConditions: string[];
  skinConditions: string[];
  ingredientReactions: string[];
  productPreferences: string[];
  certifications: string[];
}

const EMPTY: LifestyleAnswers = {
  ageRange: "",
  gender: "",
  selfReportedSkinType: "",
  skinSensitivity: "",
  primaryConcern: "",
  secondaryConcerns: [],
  budgetRange: "",
  makeupUsage: "",
  sunscreenUsage: "",
  currentRoutineItems: [],
  hormonalConditions: [],
  skinConditions: [],
  ingredientReactions: [],
  productPreferences: [],
  certifications: [],
};

type SingleKey = "ageRange" | "gender" | "selfReportedSkinType" | "skinSensitivity" | "primaryConcern" | "budgetRange" | "makeupUsage" | "sunscreenUsage";
type MultiKey  = "secondaryConcerns" | "currentRoutineItems" | "hormonalConditions" | "skinConditions" | "ingredientReactions" | "productPreferences" | "certifications";

interface Option {
  value: string;
  label: string;
  sub?: string;
  icon?: string;
}

interface SingleQuestion {
  type: "single";
  id: SingleKey;
  question: string;
  hint?: string;
  options: Option[];
}

interface MultiQuestion {
  type: "multi";
  id: MultiKey;
  question: string;
  hint?: string;
  options: Option[];
  optional?: boolean;
}

type Question = SingleQuestion | MultiQuestion;

interface Page {
  section: string;
  icon: string;
  color: string;           // Tailwind bg colour class for header
  questions: Question[];
  skippable?: boolean;
}

const PAGES: Page[] = [
  {
    section: "Sobre você",
    icon: "👤",
    color: "bg-rose-500",
    questions: [
      {
        type: "single",
        id: "ageRange",
        question: "Qual sua faixa etária?",
        hint: "Sua pele muda bastante com o tempo — isso ajuda a indicar os cuidados ideais.",
        options: [
          { value: "under25", label: "Menos de 25 anos" },
          { value: "25to34", label: "25 a 34 anos" },
          { value: "35to44", label: "35 a 44 anos" },
          { value: "45to60", label: "45 a 60 anos" },
          { value: "over60", label: "Mais de 60 anos" },
        ],
      },
      {
        type: "single",
        id: "gender",
        question: "Com qual gênero você se identifica?",
        hint: "Os hormônios influenciam bastante no comportamento da pele.",
        options: [
          { value: "female",     label: "Feminino" },
          { value: "male",       label: "Masculino" },
          { value: "nonbinary",  label: "Não binário" },
          { value: "prefer_not", label: "Prefiro não informar" },
        ],
      },
    ],
  },
  {
    section: "Sua pele",
    icon: "🧴",
    color: "bg-blue-500",
    questions: [
      {
        type: "single",
        id: "selfReportedSkinType",
        question: "Como você definiria seu tipo de pele?",
        options: [
          { value: "oleosa", label: "Oleosa",  sub: "Brilho excessivo, poros aparentes" },
          { value: "seca",   label: "Seca",    sub: "Sensação repuxada, descamação" },
          { value: "normal", label: "Normal",  sub: "Equilibrada, sem grandes queixas" },
          { value: "mista",  label: "Mista",   sub: "Zona T oleosa, bochechas mais secas" },
        ],
      },
      {
        type: "single",
        id: "skinSensitivity",
        question: "Sua pele costuma ser sensível?",
        hint: "Alguns produtos causam ardência, vermelhidão ou irritação?",
        options: [
          { value: "sensitive",     label: "Sim, é sensível",    sub: "Reage a muitos produtos" },
          { value: "not_sensitive", label: "Não é sensível",     sub: "Tolera bem a maioria dos produtos" },
          { value: "unsure",        label: "Não tenho certeza",  sub: "Depende do produto" },
        ],
      },
    ],
  },
  {
    section: "Objetivos",
    icon: "🎯",
    color: "bg-violet-500",
    questions: [
      {
        type: "single",
        id: "primaryConcern",
        question: "Qual é seu principal objetivo agora?",
        hint: "Escolha o que mais te incomoda hoje.",
        options: [
          { value: "rugas",           label: "Rugas e linhas finas",       icon: "⏳" },
          { value: "acne",            label: "Acne e espinhas",            icon: "😤" },
          { value: "manchas",         label: "Manchas",                    icon: "🔶" },
          { value: "poros",           label: "Poros visíveis",             icon: "🔍" },
          { value: "vermelhidao",     label: "Vermelhidão",                icon: "🔴" },
          { value: "hidratacao",      label: "Pele ressecada",             icon: "💧" },
          { value: "textura",         label: "Textura irregular",          icon: "〰️" },
          { value: "oleosidade",      label: "Oleosidade excessiva",       icon: "✨" },
          { value: "firmeza",         label: "Firmeza / contorno",         icon: "💪" },
          { value: "marcas_acne",     label: "Marcas pós-acne",            icon: "🩹" },
        ],
      },
    ],
  },
  {
    section: "Objetivos",
    icon: "🔎",
    color: "bg-violet-500",
    questions: [
      {
        type: "multi",
        id: "secondaryConcerns",
        question: "Tem algo mais que te incomoda na pele?",
        hint: "Pode marcar mais de um.",
        optional: true,
        options: [
          { value: "vermelhidao",  label: "Vermelhidão / rosácea" },
          { value: "rugas",        label: "Linhas finas" },
          { value: "acne",         label: "Acne / espinhas" },
          { value: "textura",      label: "Textura áspera" },
          { value: "poros",        label: "Poros dilatados" },
          { value: "sensibilidade",label: "Sensibilidade" },
          { value: "manchas",      label: "Manchas" },
          { value: "oleosidade",   label: "Oleosidade" },
          { value: "hidratacao",   label: "Descamação / ressecamento" },
        ],
      },
    ],
  },
  {
    section: "Investimento",
    icon: "💸",
    color: "bg-emerald-500",
    questions: [
      {
        type: "single",
        id: "budgetRange",
        question: "Quanto você costuma investir em skincare?",
        hint: "Sem pressão — a ideia é encontrar algo que faça sentido pra você.",
        options: [
          { value: "low",     label: "Econômico",              sub: "Até R$ 100 por mês" },
          { value: "medium",  label: "Intermediário",          sub: "R$ 100 a R$ 250 por mês" },
          { value: "high",    label: "Premium",                sub: "R$ 250 a R$ 500 por mês" },
          { value: "premium", label: "Luxo / tratamento",      sub: "Acima de R$ 500 por mês" },
        ],
      },
    ],
  },
  {
    section: "Rotina atual",
    icon: "☀️",
    color: "bg-amber-500",
    questions: [
      {
        type: "single",
        id: "sunscreenUsage",
        question: "Você usa protetor solar?",
        options: [
          { value: "always",    label: "Sempre", icon: "✅" },
          { value: "sometimes", label: "Só quando está muito sol", icon: "⛅" },
          { value: "rarely",    label: "Às vezes", icon: "🤷" },
          { value: "never",     label: "Raramente / nunca", icon: "❌" },
        ],
      },
      {
        type: "single",
        id: "makeupUsage",
        question: "Você usa maquiagem?",
        options: [
          { value: "daily",     label: "Sim, diariamente",  icon: "💄" },
          { value: "sometimes", label: "Sim, às vezes",     icon: "✨" },
          { value: "rarely",    label: "Raramente",         icon: "🎭" },
          { value: "never",     label: "Não uso maquiagem", icon: "🌿" },
        ],
      },
    ],
  },
  {
    section: "Rotina atual",
    icon: "🧴",
    color: "bg-amber-500",
    questions: [
      {
        type: "multi",
        id: "currentRoutineItems",
        question: "O que você já usa hoje?",
        hint: "Pode marcar o que já faz parte da sua rotina.",
        optional: true,
        options: [
          { value: "none",          label: "Não tenho rotina ainda" },
          { value: "cleanser",      label: "Limpador facial" },
          { value: "moisturizer",   label: "Hidratante" },
          { value: "toner",         label: "Tônico" },
          { value: "makeup_remover",label: "Demaquilante" },
          { value: "serum",         label: "Sérum" },
          { value: "sunscreen",     label: "Protetor solar" },
          { value: "exfoliant",     label: "Esfoliante" },
        ],
      },
    ],
  },
  {
    section: "Saúde",
    icon: "🩺",
    color: "bg-teal-500",
    skippable: true,
    questions: [
      {
        type: "multi",
        id: "skinConditions",
        question: "Você possui alguma condição de pele?",
        optional: true,
        options: [
          { value: "rosacea",    label: "Rosácea" },
          { value: "dermatitis", label: "Dermatite" },
          { value: "eczema",     label: "Eczema" },
          { value: "psoriasis",  label: "Psoríase" },
          { value: "atopic",     label: "Pele atópica" },
          { value: "none",       label: "Nenhuma" },
        ],
      },
      {
        type: "multi",
        id: "hormonalConditions",
        question: "Existe alguma condição que possa afetar sua pele?",
        optional: true,
        options: [
          { value: "pregnancy",    label: "Gravidez" },
          { value: "breastfeed",   label: "Amamentação" },
          { value: "hormonal",     label: "Desequilíbrio hormonal" },
          { value: "menopause",    label: "Menopausa / perimenopausa" },
          { value: "autoimmune",   label: "Doença autoimune" },
          { value: "none",         label: "Nenhuma" },
        ],
      },
    ],
  },
  {
    section: "Ingredientes",
    icon: "⚠️",
    color: "bg-orange-500",
    skippable: true,
    questions: [
      {
        type: "multi",
        id: "ingredientReactions",
        question: "Você já teve reação a algum ingrediente?",
        hint: "Se souber, marque aqui — evitaremos esses ativos.",
        optional: true,
        options: [
          { value: "retinol",     label: "Retinol / Vitamina A" },
          { value: "niacinamide", label: "Niacinamida" },
          { value: "vitamin_c",   label: "Vitamina C" },
          { value: "salicylic",   label: "Ácido salicílico (BHA)" },
          { value: "aha",         label: "Ácidos AHA (glicólico, cítrico…)" },
          { value: "benzoyl",     label: "Peróxido de benzoíla" },
          { value: "fragrance",   label: "Fragrâncias / perfumes" },
          { value: "essentials",  label: "Óleos essenciais" },
          { value: "alcohol",     label: "Álcool" },
          { value: "sulfates",    label: "Sulfatos" },
          { value: "physical_ex", label: "Esfoliantes físicos" },
          { value: "none",        label: "Não sei / nunca percebi" },
        ],
      },
    ],
  },
  {
    section: "Preferências",
    icon: "🌱",
    color: "bg-lime-600",
    skippable: true,
    questions: [
      {
        type: "multi",
        id: "productPreferences",
        question: "O que é importante pra você nos produtos?",
        optional: true,
        options: [
          { value: "fragrance_free",  label: "Sem fragrância" },
          { value: "sulfate_free",    label: "Sem sulfatos" },
          { value: "alcohol_free",    label: "Sem álcool" },
          { value: "non_comedogenic", label: "Não comedogênico" },
          { value: "paraben_free",    label: "Livre de parabenos" },
          { value: "eo_free",         label: "Livre de óleos essenciais" },
          { value: "none",            label: "Sem preferência" },
        ],
      },
      {
        type: "multi",
        id: "certifications",
        question: "Quais selos você valoriza?",
        optional: true,
        options: [
          { value: "vegan",          label: "Vegano" },
          { value: "cruelty_free",   label: "Livre de crueldade animal" },
          { value: "clean_beauty",   label: "Beleza limpa" },
          { value: "organic",        label: "Orgânico" },
          { value: "derma_tested",   label: "Testado dermatologicamente" },
          { value: "natural",        label: "Cosméticos naturais" },
          { value: "none",           label: "Sem preferência" },
        ],
      },
    ],
  },
];

const TOTAL_PAGES = PAGES.length;

interface Props {
  onComplete: (answers: LifestyleAnswers) => void;
  onBack: () => void;
}

export default function LifestyleQuestionnaire({ onComplete, onBack }: Props) {
  const [pageIdx, setPageIdx] = useState(0);
  const [answers, setAnswers] = useState<LifestyleAnswers>({ ...EMPTY });

  const page = PAGES[pageIdx];
  const progress = ((pageIdx + 1) / TOTAL_PAGES) * 100;

  function setSingle(id: SingleKey, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: MultiKey, value: string) {
    setAnswers((prev) => {
      const current = prev[id] as string[];
      if (value === "none") return { ...prev, [id]: ["none"] };
      const without_none = current.filter((v) => v !== "none");
      const already = without_none.includes(value);
      return { ...prev, [id]: already ? without_none.filter((v) => v !== value) : [...without_none, value] };
    });
  }

  function canAdvance(): boolean {
    for (const q of page.questions) {
      if (q.type === "single" && !q.optional) {
        if (!answers[q.id]) return false;
      }
    }
    return true;
  }

  function advance() {
    if (pageIdx < TOTAL_PAGES - 1) {
      setPageIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onComplete(answers);
    }
  }

  function handleSingleSelect(id: SingleKey, value: string) {
    setSingle(id, value);
    // Check if all singles on this page are now answered → auto-advance
    const allAnswered = page.questions.every((q) => {
      if (q.type !== "single") return true;
      return q.id === id ? true : !!answers[q.id];
    });
    if (allAnswered) {
      setTimeout(() => {
        if (pageIdx < TOTAL_PAGES - 1) {
          setPageIdx((i) => i + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          onComplete({ ...answers, [id]: value });
        }
      }, 220);
    }
  }

  const isLast = pageIdx === TOTAL_PAGES - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-rose-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={pageIdx === 0 ? onBack : () => setPageIdx((i) => i - 1)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors text-sm"
          >
            <ChevronLeft size={18} />
            Voltar
          </button>
          <span className="text-xs text-slate-400 font-medium">
            {pageIdx + 1} / {TOTAL_PAGES}
          </span>
          {page.skippable && (
            <button
              type="button"
              onClick={advance}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Pular →
            </button>
          )}
          {!page.skippable && <span className="w-12" />}
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 pb-32 flex flex-col">
        {/* Section header */}
        <div className={`${page.color} px-6 pt-6 pb-8`}>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
            {page.icon}  {page.section}
          </p>
          <h1 className="text-white text-xl font-bold leading-snug">
            Vamos montar sua rotina de skincare
          </h1>
        </div>

        {/* Questions */}
        <div className="px-4 pt-6 space-y-8 flex-1">
          {page.questions.map((q) => (
            <div key={q.id} className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{q.question}</h2>
                {q.hint && <p className="text-xs text-slate-500 mt-0.5">{q.hint}</p>}
              </div>

              {q.type === "single" && (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSingleSelect(q.id, opt.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                          selected
                            ? "border-rose-400 bg-rose-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {opt.icon && <span className="text-xl flex-shrink-0">{opt.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${selected ? "text-rose-700" : "text-slate-800"}`}>
                            {opt.label}
                          </p>
                          {opt.sub && (
                            <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
                          )}
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-rose-400 flex items-center justify-center flex-shrink-0">
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "multi" && (
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => {
                    const selected = (answers[q.id] as string[]).includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleMulti(q.id, opt.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                          selected
                            ? "border-rose-400 bg-rose-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          selected ? "bg-rose-400 border-rose-400" : "border-slate-300"
                        }`}>
                          {selected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${selected ? "text-rose-700" : "text-slate-700"}`}>
                          {opt.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA — only show for multi-select pages or when can't auto-advance */}
      {(page.questions.some((q) => q.type === "multi") || !canAdvance()) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 shadow-lg">
          <Button
            onClick={advance}
            disabled={!canAdvance() && !page.skippable}
            className="w-full h-12 text-base font-semibold rounded-xl bg-rose-500 hover:bg-rose-600"
          >
            {isLast ? "Concluir e analisar pele →" : "Continuar →"}
          </Button>
        </div>
      )}
    </div>
  );
}
