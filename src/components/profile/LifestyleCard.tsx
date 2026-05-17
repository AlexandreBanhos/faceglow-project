import { motion } from "framer-motion";
import { ClipboardList, RefreshCw, ChevronRight } from "lucide-react";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";

const AGE_LABELS: Record<string, string> = {
  under25: "Menos de 25 anos",
  "25to34": "25 a 34 anos",
  "35to44": "35 a 44 anos",
  "45to60": "45 a 60 anos",
  over60: "Mais de 60 anos",
};

const GENDER_LABELS: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  nonbinary: "Não binário",
  prefer_not: "Prefiro não informar",
};

const SENSITIVITY_LABELS: Record<string, string> = {
  sensitive: "Pele sensível",
  not_sensitive: "Não sensível",
  unsure: "Às vezes reage",
};

const CONCERN_LABELS: Record<string, string> = {
  rugas: "Rugas",      acne: "Acne",          manchas: "Manchas",
  poros: "Poros",      vermelhidao: "Vermelhidão", hidratacao: "Ressecamento",
  textura: "Textura",  oleosidade: "Oleosidade",   firmeza: "Firmeza",
  marcas_acne: "Marcas pós-acne", sensibilidade: "Sensibilidade",
};

const BUDGET_LABELS: Record<string, string> = {
  low: "Econômico",  medium: "Intermediário",
  high: "Premium",   premium: "Sem restrição",
};

const MAKEUP_LABELS: Record<string, string> = {
  daily: "Diariamente", sometimes: "Às vezes",
  rarely: "Raramente",  never: "Não uso",
};

const SUNSCREEN_LABELS: Record<string, string> = {
  always: "Sempre",  sometimes: "Às vezes",
  rarely: "Raramente", never: "Nunca",
};

interface LifestyleCardProps {
  answers: LifestyleAnswers | null;
  onUpdate: () => void;
}

export function LifestyleCard({ answers, onUpdate }: LifestyleCardProps) {
  if (!answers || !answers.ageRange) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg-surface p-5 rounded-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={17} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">Meu Perfil de Pele</h2>
        </div>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <p className="text-sm text-muted-foreground">Questionário não preenchido ainda.</p>
          <button
            onClick={onUpdate}
            className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold active:scale-[0.97] transition-transform"
          >
            Responder questionário
          </button>
        </div>
      </motion.div>
    );
  }

  const concerns = [answers.primaryConcern, ...(answers.secondaryConcerns ?? [])]
    .filter(Boolean)
    .map((k) => CONCERN_LABELS[k] ?? k);

  const rows: { label: string; value: string }[] = [
    answers.ageRange       && { label: "Faixa etária",    value: AGE_LABELS[answers.ageRange] ?? answers.ageRange },
    answers.gender         && { label: "Gênero",          value: GENDER_LABELS[answers.gender] ?? answers.gender },
    answers.skinSensitivity && { label: "Sensibilidade",  value: SENSITIVITY_LABELS[answers.skinSensitivity] ?? answers.skinSensitivity },
    concerns.length > 0    && { label: "Preocupações",    value: concerns.slice(0, 3).join(", ") + (concerns.length > 3 ? `… +${concerns.length - 3}` : "") },
    answers.budgetRange    && { label: "Orçamento",       value: BUDGET_LABELS[answers.budgetRange] ?? answers.budgetRange },
    answers.makeupUsage    && { label: "Maquiagem",       value: MAKEUP_LABELS[answers.makeupUsage] ?? answers.makeupUsage },
    answers.sunscreenUsage && { label: "Protetor solar",  value: SUNSCREEN_LABELS[answers.sunscreenUsage] ?? answers.sunscreenUsage },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="lg-surface rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={17} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">Meu Perfil de Pele</h2>
        </div>
        <button
          onClick={onUpdate}
          className="flex items-center gap-1 text-xs text-primary font-semibold py-1 px-2 rounded-lg active:bg-primary/10 transition-colors"
        >
          <RefreshCw size={11} />
          Atualizar
        </button>
      </div>

      {/* Rows */}
      <div className="px-5 pb-4">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-3 ${i < rows.length - 1 ? "border-b border-border/40" : ""}`}
          >
            <span className="text-sm text-muted-foreground shrink-0">{row.label}</span>
            <span className="text-sm font-semibold text-foreground text-right ml-4 truncate max-w-[55%]">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
