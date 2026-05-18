import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Mascot, useFloatAnimation } from "@/components/quiz/Mascot";

// ─── Types ───────────────────────────────────────────────────────────────────

export type { MascotMood } from "@/components/quiz/Mascot";

export interface QuizOption {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  faIcon?: IconDefinition;
}

export interface QuizQuestion {
  id: string;
  question: string;
  highlight?: string;
  subtitle?: string;
  mascotMood?: import("@/components/quiz/Mascot").MascotMood;
  type: "single" | "multi";
  columns?: 1 | 2;
  options: QuizOption[];
}

export interface SkinQuizProps {
  questions: QuizQuestion[];
  onComplete: (answers: Record<string, string[]>) => void;
  onBack?: () => void;
  /** Mostra banner de análise em andamento (quiz durante loading) */
  analysisInProgress?: boolean;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: "4px", flex: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: "4px",
            borderRadius: "2px",
            background: i < current ? "#f472b6" : "#e0ddf4",
            transition: "background 350ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Checkmark SVG ───────────────────────────────────────────────────────────

function Checkmark() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── OptionCard ──────────────────────────────────────────────────────────────

interface OptionCardProps {
  option: QuizOption;
  selected: boolean;
  onClick: () => void;
  columns?: 1 | 2;
}

const TRANSITION = "all 180ms cubic-bezier(0.4,0,0.2,1)";

// Badge gradiente coral→rosa com ícone Font Awesome branco
function IconBadge({ icon, selected, size = 38 }: { icon: IconDefinition; selected: boolean; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "10px",
      background: selected
        ? "linear-gradient(135deg, #f97316, #f472b6)"
        : "linear-gradient(135deg, #fde8d8, #fce7f3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: TRANSITION,
    }}>
      <FontAwesomeIcon
        icon={icon}
        style={{
          fontSize: size * 0.42,
          color: selected ? "white" : "#f97316",
          transition: TRANSITION,
        }}
      />
    </div>
  );
}

function OptionCard({ option, selected, onClick, columns = 1 }: OptionCardProps) {
  const baseCard: React.CSSProperties = {
    borderRadius: "20px",
    border: selected ? "2px solid #f472b6" : "2px solid #e8e5f5",
    background: "white",
    cursor: "pointer",
    transform: selected ? "scale(1.01)" : "scale(1)",
    boxShadow: selected
      ? "0 0 0 4px rgba(244,114,182,0.12), 0 2px 8px rgba(0,0,0,0.06)"
      : "0 1px 4px rgba(0,0,0,0.06)",
    transition: TRANSITION,
    textAlign: "left",
    width: "100%",
  };

  const indicator = (
    <div
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: selected ? "#f472b6" : "transparent",
        border: selected ? "2px solid #f472b6" : "2px solid #d1d5db",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: TRANSITION,
      }}
    >
      {selected && <Checkmark />}
    </div>
  );

  if (columns === 2) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ ...baseCard, display: "flex", flexDirection: "column", padding: "16px", position: "relative", minHeight: option.faIcon ? "100px" : "auto" }}
      >
        <div style={{ position: "absolute", top: "12px", right: "12px" }}>{indicator}</div>
        {option.faIcon && (
          <div style={{ marginBottom: "10px" }}>
            <IconBadge icon={option.faIcon} selected={selected} size={40} />
          </div>
        )}
        {!option.faIcon && option.icon && (
          <div style={{ fontSize: "26px", marginBottom: "10px", lineHeight: 1 }}>{option.icon}</div>
        )}
        <div style={{
          fontSize: "14px",
          fontWeight: 700,
          color: selected ? "#1e1b4b" : "#374151",
          lineHeight: "1.3",
          paddingRight: "28px",
        }}>
          {option.label}
        </div>
        {option.sublabel && (
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "3px", fontWeight: 400 }}>
            {option.sublabel}
          </div>
        )}
      </button>
    );
  }

  // columns === 1
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...baseCard, display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}
    >
      {option.faIcon && <IconBadge icon={option.faIcon} selected={selected} size={38} />}
      {!option.faIcon && option.icon && (
        <div style={{ fontSize: "22px", flexShrink: 0, lineHeight: 1 }}>{option.icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "15px",
          fontWeight: 600,
          color: selected ? "#1e1b4b" : "#374151",
          lineHeight: "1.3",
        }}>
          {option.label}
        </div>
        {option.sublabel && (
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px", fontWeight: 400 }}>
            {option.sublabel}
          </div>
        )}
      </div>
      {indicator}
    </button>
  );
}

// ─── Question text with highlight ────────────────────────────────────────────

function QuestionText({ question, highlight }: { question: string; highlight?: string }) {
  if (!highlight) {
    return <>{question}</>;
  }
  const idx = question.indexOf(highlight);
  if (idx === -1) return <>{question}</>;
  return (
    <>
      {question.slice(0, idx)}
      <span style={{ color: "#6366f1" }}>{highlight}</span>
      {question.slice(idx + highlight.length)}
    </>
  );
}

// ─── QuizPage ────────────────────────────────────────────────────────────────

interface QuizPageProps {
  question: QuizQuestion;
  currentAnswers: string[];
  onAnswer: (optionId: string) => void;
}

function QuizPage({ question, currentAnswers, onAnswer }: QuizPageProps) {
  const cols = question.columns ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Mascot + speech bubble */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
        <Mascot mood={question.mascotMood ?? "happy"} />
        <div style={{
          flex: 1,
          background: "white",
          borderRadius: "20px 20px 20px 6px",
          padding: "16px 18px",
          boxShadow: "0 2px 14px rgba(99,102,241,0.08)",
        }}>
          <p style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: 800,
            color: "#1e1b4b",
            letterSpacing: "-0.025em",
            lineHeight: "1.3",
          }}>
            <QuestionText question={question.question} highlight={question.highlight} />
          </p>
          {question.subtitle && (
            <p style={{
              margin: "6px 0 0",
              fontSize: "14px",
              color: "#6b7280",
              fontWeight: 400,
              lineHeight: "1.4",
            }}>
              {question.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Multi hint */}
      {question.type === "multi" && (
        <p style={{
          margin: 0,
          fontSize: "13px",
          color: "#a78bfa",
          textAlign: "center",
          fontWeight: 500,
        }}>
          Selecione todos que se aplicam
        </p>
      )}

      {/* Options grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr",
        gap: cols === 2 ? "10px" : "8px",
      }}>
        {question.options.map((opt) => (
          <OptionCard
            key={opt.id}
            option={opt}
            selected={currentAnswers.includes(opt.id)}
            onClick={() => onAnswer(opt.id)}
            columns={cols}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SkinQuiz (main) ─────────────────────────────────────────────────────────

export default function SkinQuiz({ questions, onComplete, onBack, analysisInProgress }: SkinQuizProps) {
  useFloatAnimation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [allAnswers, setAllAnswers] = useState<Record<string, string[]>>({});

  const question = questions[currentIndex];
  const currentAnswers = allAnswers[question.id] ?? [];
  const isLast = currentIndex === questions.length - 1;
  const canContinue = currentAnswers.length > 0;

  function handleAnswer(optionId: string) {
    setAllAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.type === "single") {
        return { ...prev, [question.id]: [optionId] };
      }
      const already = current.includes(optionId);
      return {
        ...prev,
        [question.id]: already
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  function advance() {
    if (!canContinue) return;
    if (isLast) {
      onComplete({ ...allAnswers, [question.id]: allAnswers[question.id] ?? [] });
    } else {
      setCurrentIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      onBack?.();
    } else {
      setCurrentIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div style={{
      minHeight: "100svh",
      background: "linear-gradient(160deg, #f4f2ff 0%, #ede8ff 30%, #f8f4ff 60%, #fff0f8 100%)",
      fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Banner: análise em andamento ── */}
      {analysisInProgress && (
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "linear-gradient(135deg, #f97316, #f472b6)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "white", opacity: 0.9,
            animation: "_quiz_float 1.2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>
            Analisando sua pele em paralelo — responda enquanto aguarda
          </span>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        position: "sticky",
        top: analysisInProgress ? 38 : 0,
        zIndex: 20,
        background: "rgba(244,242,255,0.88)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(224,221,244,0.5)",
      }}>
        <div style={{
          maxWidth: "430px",
          margin: "0 auto",
          padding: "12px 20px 14px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          {/* Back circle button */}
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "none",
              background: "white",
              boxShadow: "0 1px 5px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "box-shadow 150ms ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8L10 13" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <ProgressBar current={currentIndex + 1} total={questions.length} />

          <span style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#a78bfa",
            flexShrink: 0,
            minWidth: "32px",
            textAlign: "right",
          }}>
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* ── Content — scroll vertical para opções longas ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{
          maxWidth: "430px",
          margin: "0 auto",
          width: "100%",
          padding: "28px 20px 160px",
        }}>
          <QuizPage
            question={question}
            currentAnswers={currentAnswers}
            onAnswer={handleAnswer}
          />
        </div>
      </div>

      {/* ── Sticky footer — padding extra para safe-area e navbar ── */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 20px",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(to top, rgba(248,244,255,1) 65%, rgba(248,244,255,0) 100%)",
        pointerEvents: "none",
      }}>
        <div style={{ maxWidth: "430px", margin: "0 auto", pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={advance}
            disabled={!canContinue}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "999px",
              border: "none",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "white",
              cursor: canContinue ? "pointer" : "not-allowed",
              background: canContinue
                ? "linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)"
                : "#d1d5db",
              boxShadow: canContinue
                ? "0 6px 22px rgba(244,114,182,0.45)"
                : "none",
              transform: canContinue ? "translateY(0)" : "translateY(0)",
              transition: "background 200ms ease, box-shadow 200ms ease, opacity 200ms ease",
              opacity: canContinue ? 1 : 0.7,
            }}
          >
            {isLast ? "Finalizar ✓" : "Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
