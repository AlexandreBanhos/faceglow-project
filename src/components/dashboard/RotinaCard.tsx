import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { StepIcon } from "@/components/routine/StepIcon";

export interface RoutineThumb {
  id: string;
  productName: string;
  imageUrl?: string;
  stepTypeKey?: string;
}

interface RotinaCardProps {
  morningSteps: RoutineThumb[];
  nightSteps: RoutineThumb[];
  onViewAll: () => void;
  delay?: number;
}

const MAX_THUMBS = 4;

function ThumbImg({ step }: { step: RoutineThumb }) {
  const [errored, setErrored] = useState(false);
  return (
    <div
      className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ border: "1px solid rgba(255,255,255,0.8)", background: "#f5f1ff" }}
      title={step.productName}
    >
      {step.imageUrl && !errored ? (
        <img
          src={step.imageUrl}
          alt={step.productName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
        />
      ) : (
        <StepIcon stepTypeKey={step.stepTypeKey} />
      )}
    </div>
  );
}

function ThumbRow({ steps }: { steps: RoutineThumb[] }) {
  const visible = steps.slice(0, MAX_THUMBS);
  const overflow = steps.length - MAX_THUMBS;

  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      {visible.map((s) => (
        <ThumbImg key={s.id} step={s} />
      ))}
      {overflow > 0 && (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
          style={{ background: "rgba(232,84,122,0.15)", color: "#E8547A", border: "1px solid rgba(232,84,122,0.2)" }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

export const RotinaCard = ({ morningSteps, nightSteps, onViewAll, delay = 0.42 }: RotinaCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="mx-6 mt-5"
    style={{
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      border: "1px solid rgba(255,255,255,0.70)",
      borderRadius: 20,
      overflow: "hidden",
    }}
  >
    {/* Header */}
    <div className="flex items-center justify-between px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(232,84,122,0.08)" }}>
      <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: "#2D1B2E" }}>Sua Rotina</p>
      <button
        onClick={onViewAll}
        className="flex items-center gap-0.5"
        style={{ fontSize: 12, fontWeight: 600, color: "#E8547A" }}
      >
        Ver tudo <ChevronRight size={13} />
      </button>
    </div>

    {/* Panels */}
    <div className="flex">
      {/* Manhã */}
      <div
        className="flex-1 p-3"
        style={{ background: "linear-gradient(135deg, #FFFDE7, #FFF8E1, #FFF3C4)" }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, color: "#5D4037", letterSpacing: 0.4 }}>
          ☀️ Manhã · {morningSteps.length} passo{morningSteps.length !== 1 ? "s" : ""}
        </p>
        {morningSteps.length > 0 ? (
          <ThumbRow steps={morningSteps} />
        ) : (
          <p className="mt-2" style={{ fontSize: 10, color: "#9b7b8a" }}>Sem passos hoje</p>
        )}
      </div>

      {/* Separador */}
      <div style={{ width: 1, background: "rgba(232,84,122,0.12)" }} />

      {/* Noite */}
      <div
        className="flex-1 p-3"
        style={{ background: "linear-gradient(135deg, #EDE7F6, #E8EAF6, #D1C4E9)" }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, color: "#4527A0", letterSpacing: 0.4 }}>
          🌙 Noite · {nightSteps.length} passo{nightSteps.length !== 1 ? "s" : ""}
        </p>
        {nightSteps.length > 0 ? (
          <ThumbRow steps={nightSteps} />
        ) : (
          <p className="mt-2" style={{ fontSize: 10, color: "#9b7b8a" }}>Sem passos hoje</p>
        )}
      </div>
    </div>
  </motion.div>
);
