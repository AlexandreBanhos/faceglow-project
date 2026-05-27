import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronRight, Coins, ClipboardList, Tag, AlertTriangle,
  Droplets, Layers, Shield, Heart, Target, Sparkles, CalendarDays, Users,
} from "lucide-react";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";
import { saveQuizAnswers } from "@/lib/quiz";
import SkinQuiz from "@/components/quiz/SkinQuiz";
import { FULL_QUESTIONS } from "@/components/quiz/quizQuestions";
import type { QuizQuestion } from "@/components/quiz/SkinQuiz";

const QUIZ_KEY = "faceglow-quiz-answers";
const BG = "linear-gradient(160deg,#fff8f7 0%,#fdf2f5 28%,#fdf8f7 55%,#fff5f0 100%)";

const AGE_LABELS: Record<string, string> = {
  under25: "Menos de 25 anos", "25to34": "25–34 anos",
  "35to44": "35–44 anos", "45to60": "45–60 anos", over60: "Mais de 60",
};
const GENDER_LABELS: Record<string, string> = {
  female: "Feminino", male: "Masculino",
  nonbinary: "Não binário", prefer_not: "Prefiro não informar",
};
const CARD = {
  background: "rgba(255,255,255,0.65)",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 2px 14px rgba(220,100,140,0.07)",
};

const BUDGET_LABELS: Record<string, string> = {
  super_low: "Super econômico", low: "Econômico", medium: "Intermediário",
  high: "Premium", premium: "Sem restrição",
};
const SKIN_TONE_LABELS: Record<string, string> = {
  very_light: "Muito clara", light: "Clara", medium: "Média / Trigal",
  tan: "Morena", dark: "Negra / Escura",
};
const ROUTINE_LABELS: Record<string, string> = {
  none: "Sem rotina", cleanser: "Limpador", moisturizer: "Hidratante",
  toner: "Tônico", makeup_remover: "Demaquilante", serum: "Sérum",
  sunscreen: "Protetor solar", exfoliant: "Esfoliante",
};
const PREF_LABELS: Record<string, string> = {
  fragrance_free: "Sem fragrância", sulfate_free: "Sem sulfatos",
  alcohol_free: "Sem álcool", non_comedogenic: "Não comedogênico",
  paraben_free: "Sem parabenos", eo_free: "Sem óleos essenciais", none: "Sem preferência",
};
const CERT_LABELS: Record<string, string> = {
  vegan: "Vegano", cruelty_free: "Sem crueldade", clean_beauty: "Beleza limpa",
  organic: "Orgânico", derma_tested: "Testado derma.", none: "Sem preferência",
};
const ALLERGY_LABELS: Record<string, string> = {
  retinol: "Retinol", niacinamide: "Niacinamida", vitamin_c: "Vitamina C",
  salicylic: "Ácido salicílico", aha: "AHA", fragrance: "Fragrâncias",
  alcohol: "Álcool", sulfates: "Sulfatos", none: "Nunca percebi",
};
const SKIN_TYPE_LABELS: Record<string, string> = {
  oleosa: "Oleosa", seca: "Seca", mista: "Mista", normal: "Normal",
};
const MAKEUP_LABELS: Record<string, string> = {
  daily: "Diariamente", sometimes: "Às vezes", rarely: "Raramente", never: "Não uso",
};
const SUNSCREEN_LABELS: Record<string, string> = {
  always: "Sempre", sometimes: "Às vezes", rarely: "Raramente", never: "Nunca",
};
const CONDITION_LABELS: Record<string, string> = {
  rosacea: "Rosácea", dermatitis: "Dermatite", eczema: "Eczema",
  psoriasis: "Psoríase", atopic: "Pele atópica", none: "Nenhuma",
};
const HORMONAL_LABELS: Record<string, string> = {
  pregnancy: "Gravidez", breastfeed: "Amamentação", hormonal: "Hormonal",
  menopause: "Menopausa", autoimmune: "Autoimune", none: "Nenhuma",
};
const CONCERN_LABELS: Record<string, string> = {
  rugas: "Rugas", acne: "Acne", manchas: "Manchas", poros: "Poros",
  vermelhidao: "Vermelhidão", hidratacao: "Ressecamento", textura: "Textura",
  oleosidade: "Oleosidade", firmeza: "Firmeza", marcas_acne: "Marcas",
  sensibilidade: "Sensibilidade", descobrir: "Descobrir",
};

const showSingle = (val: string | undefined, map: Record<string, string>) =>
  val ? (map[val] ?? val) : "Não informado";

const showMulti = (arr: string[] | undefined, map: Record<string, string>, limit = 2): string => {
  if (!arr || arr.length === 0) return "Não informado";
  const labels = arr.filter(Boolean).map((v) => map[v] ?? v);
  if (labels.length === 0) return "Não informado";
  if (labels.length <= limit) return labels.join(", ");
  return `${labels.slice(0, limit).join(", ")} +${labels.length - limit}`;
};

const findQ = (id: string): QuizQuestion | undefined =>
  FULL_QUESTIONS.find((q) => q.id === id);

const EMPTY_ANSWERS: LifestyleAnswers = {
  ageRange: "", gender: "", skinTone: "", selfReportedSkinType: "",
  skinSensitivity: "", primaryConcern: "", secondaryConcerns: [],
  budgetRange: "", makeupUsage: "", sunscreenUsage: "",
  currentRoutineItems: [], hormonalConditions: [], skinConditions: [],
  ingredientReactions: [], productPreferences: [], certifications: [],
};

function mergeAndSave(
  raw: Record<string, string[]>,
  existing: LifestyleAnswers | null,
  onSave: (a: LifestyleAnswers) => void,
) {
  // Usa EMPTY_ANSWERS como base para garantir que campos array sempre iniciam como [],
  // evitando que Array.isArray() retorne false e salve string no lugar de array.
  const updated = { ...EMPTY_ANSWERS, ...(existing ?? {}) } as LifestyleAnswers;
  if (raw.primaryConcern !== undefined) {
    const concerns = raw.primaryConcern;
    (updated as Record<string, unknown>).primaryConcern = concerns[0] ?? "";
    (updated as Record<string, unknown>).secondaryConcerns = concerns.slice(1);
  }
  for (const [key, vals] of Object.entries(raw)) {
    if (key === "primaryConcern") continue;
    const field = key as keyof LifestyleAnswers;
    if (Array.isArray((updated as Record<string, unknown>)[field])) {
      (updated as Record<string, unknown>)[field] = vals;
    } else {
      (updated as Record<string, unknown>)[field] = vals[0] ?? "";
    }
  }
  try { localStorage.setItem(QUIZ_KEY, JSON.stringify(updated)); } catch { /* quota */ }
  saveQuizAnswers(updated);
  onSave(updated);
}

function PrefRow({
  icon, label, value, onClick,
}: {
  icon: React.ReactNode; label: string; value: string; onClick: () => void;
}) {
  const empty = value === "Não informado";
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-black/5 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(232,116,138,0.08)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className={`text-xs mt-0.5 truncate ${empty ? "text-muted-foreground/40 italic" : "text-muted-foreground"}`}>
          {value}
        </p>
      </div>
      <ChevronRight size={14} className="text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "0 16px" }} />;
}

function BottomModal({
  isOpen, onClose, title, children,
}: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl max-h-[88vh] flex flex-col"
            style={{ background: BG }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-black/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.06)" }}>
                <X size={15} className="text-foreground" />
              </button>
            </div>

            {/* Conteúdo rolável — min-h-0 necessário para o scroll funcionar em flex */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3">
              {children}
            </div>

            {/* Botão fechar na base */}
            <div className="flex-shrink-0 px-4 pt-3 pb-safe-bottom"
              style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}>
              <button
                onClick={onClose}
                className="w-full h-12 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                style={{ background: "rgba(0,0,0,0.06)", color: "var(--foreground)" }}
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizAnswers: LifestyleAnswers | null;
  onAnswersChanged: (a: LifestyleAnswers) => void;
}

interface PreferenciasProps extends ModalProps {
  routineCount?: number;
  onViewRoutine: () => void;
}

interface OutrasRespostasProps extends ModalProps {
  analyzedSkinType?: string;
}

// ── PreferenciasModal ─────────────────────────────────────────────────────────

export function PreferenciasModal({
  isOpen, onClose, quizAnswers, onAnswersChanged, routineCount, onViewRoutine,
}: PreferenciasProps) {
  const [editingQuestions, setEditingQuestions] = useState<QuizQuestion[] | null>(null);

  const handleQuizComplete = (raw: Record<string, string[]>) => {
    setEditingQuestions(null);
    mergeAndSave(raw, quizAnswers, onAnswersChanged);
  };

  const edit = (...ids: string[]) => {
    const qs = ids.map((id) => findQ(id)).filter(Boolean) as QuizQuestion[];
    if (qs.length) setEditingQuestions(qs);
  };

  const a = quizAnswers;
  const factorItems = [
    ...(a?.productPreferences ?? []).filter((v) => v !== "none"),
    ...(a?.certifications ?? []).filter((v) => v !== "none"),
  ];
  const factorLabel = factorItems.length
    ? showMulti(factorItems, { ...PREF_LABELS, ...CERT_LABELS })
    : "Sem preferência";

  const rotinaLabel = routineCount != null && routineCount > 0
    ? `${routineCount} produto${routineCount !== 1 ? "s" : ""} na rotina`
    : "Ver rotina criada";

  return (
    <>
      <BottomModal isOpen={isOpen} onClose={onClose} title="Preferências">
        <div className="rounded-2xl overflow-hidden" style={CARD}>
          <PrefRow
            icon={<Coins size={15} style={{ color: "var(--primary)" }} />}
            label="Preço"
            value={showSingle(a?.budgetRange, BUDGET_LABELS)}
            onClick={() => edit("budgetRange")}
          />
          <Divider />
          <PrefRow
            icon={<ClipboardList size={15} style={{ color: "var(--primary)" }} />}
            label="Rotina criada"
            value={rotinaLabel}
            onClick={() => { onClose(); onViewRoutine(); }}
          />
          <Divider />
          <PrefRow
            icon={<Tag size={15} style={{ color: "var(--primary)" }} />}
            label="Fatores skincare"
            value={factorLabel}
            onClick={() => edit("productPreferences", "certifications")}
          />
          <Divider />
          <PrefRow
            icon={<AlertTriangle size={15} style={{ color: "var(--primary)" }} />}
            label="Alergias"
            value={showMulti(a?.ingredientReactions, ALLERGY_LABELS)}
            onClick={() => edit("ingredientReactions")}
          />
          <Divider />
          <PrefRow
            icon={<Droplets size={15} style={{ color: "var(--primary)" }} />}
            label="Tom de pele"
            value={showSingle(a?.skinTone, SKIN_TONE_LABELS)}
            onClick={() => edit("skinTone")}
          />
        </div>
      </BottomModal>

      <AnimatePresence>
        {editingQuestions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] overflow-hidden"
          >
            <SkinQuiz
              questions={editingQuestions}
              onComplete={handleQuizComplete}
              onBack={() => setEditingQuestions(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── OutrasRespostasModal ──────────────────────────────────────────────────────

export function OutrasRespostasModal({ isOpen, onClose, quizAnswers, onAnswersChanged, analyzedSkinType }: OutrasRespostasProps) {
  const [editingQuestions, setEditingQuestions] = useState<QuizQuestion[] | null>(null);

  const handleQuizComplete = (raw: Record<string, string[]>) => {
    setEditingQuestions(null);
    mergeAndSave(raw, quizAnswers, onAnswersChanged);
  };

  const edit = (...ids: string[]) => {
    const qs = ids.map((id) => findQ(id)).filter(Boolean) as QuizQuestion[];
    if (qs.length) setEditingQuestions(qs);
  };

  const a = quizAnswers;
  const allConcerns = [a?.primaryConcern, ...(a?.secondaryConcerns ?? [])].filter(Boolean) as string[];

  return (
    <>
      <BottomModal isOpen={isOpen} onClose={onClose} title="Outras respostas">
        <div className="rounded-2xl overflow-hidden" style={CARD}>
          <PrefRow
            icon={<CalendarDays size={15} style={{ color: "var(--primary)" }} />}
            label="Idade"
            value={showSingle(a?.ageRange, AGE_LABELS)}
            onClick={() => edit("ageRange")}
          />
          <Divider />
          <PrefRow
            icon={<Users size={15} style={{ color: "var(--primary)" }} />}
            label="Gênero"
            value={showSingle(a?.gender, GENDER_LABELS)}
            onClick={() => edit("gender")}
          />
          <Divider />
          <PrefRow
            icon={<Layers size={15} style={{ color: "var(--primary)" }} />}
            label="Tipo de pele"
            value={
              analyzedSkinType
                ? `${SKIN_TYPE_LABELS[analyzedSkinType.toLowerCase()] ?? analyzedSkinType} (análise IA)`
                : showSingle(a?.selfReportedSkinType, SKIN_TYPE_LABELS)
            }
            onClick={() => edit("selfReportedSkinType")}
          />
          <Divider />
          <PrefRow
            icon={<Sparkles size={15} style={{ color: "var(--primary)" }} />}
            label="Maquiagem"
            value={showSingle(a?.makeupUsage, MAKEUP_LABELS)}
            onClick={() => edit("makeupUsage")}
          />
          <Divider />
          <PrefRow
            icon={<Shield size={15} style={{ color: "var(--primary)" }} />}
            label="Protetor solar"
            value={showSingle(a?.sunscreenUsage, SUNSCREEN_LABELS)}
            onClick={() => edit("sunscreenUsage")}
          />
          <Divider />
          <PrefRow
            icon={<Heart size={15} style={{ color: "var(--primary)" }} />}
            label="Condições de pele"
            value={showMulti(a?.skinConditions, CONDITION_LABELS)}
            onClick={() => edit("skinConditions")}
          />
          <Divider />
          <PrefRow
            icon={<Target size={15} style={{ color: "var(--primary)" }} />}
            label="Condições hormonais"
            value={showMulti(a?.hormonalConditions, HORMONAL_LABELS)}
            onClick={() => edit("hormonalConditions")}
          />
          <Divider />
          <PrefRow
            icon={<Target size={15} style={{ color: "var(--primary)" }} />}
            label="Preocupações"
            value={showMulti(allConcerns, CONCERN_LABELS)}
            onClick={() => edit("primaryConcern")}
          />
        </div>
      </BottomModal>

      <AnimatePresence>
        {editingQuestions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] overflow-hidden"
          >
            <SkinQuiz
              questions={editingQuestions}
              onComplete={handleQuizComplete}
              onBack={() => setEditingQuestions(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
