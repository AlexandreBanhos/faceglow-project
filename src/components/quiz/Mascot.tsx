import { useEffect } from "react";

export type MascotMood = "happy" | "thinking" | "sad";

const FLOAT_KEYFRAME = `
@keyframes _quiz_float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-7px); }
}`;

export function useFloatAnimation() {
  useEffect(() => {
    if (document.getElementById("_quiz_float_style")) return;
    const el = document.createElement("style");
    el.id = "_quiz_float_style";
    el.textContent = FLOAT_KEYFRAME;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);
}

interface MascotProps {
  mood?: MascotMood;
  size?: number;
}

export function Mascot({ mood = "happy", size = 72 }: MascotProps) {
  return (
    <div style={{ flexShrink: 0, animation: "_quiz_float 3.2s ease-in-out infinite" }}>
      <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="36" cy="36" r="35" fill="white" stroke="#e0ddf4" strokeWidth="2" />

        {mood === "happy" && (
          <>
            <ellipse cx="19" cy="43" rx="6" ry="4" fill="#fda4af" opacity="0.5" />
            <ellipse cx="53" cy="43" rx="6" ry="4" fill="#fda4af" opacity="0.5" />
            <path d="M22 30 Q27 24 32 30" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M40 30 Q45 24 50 30" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M23 42 Q36 55 49 42" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {mood === "thinking" && (
          <>
            <circle cx="26" cy="32" r="5" fill="#1e1b4b" />
            <circle cx="46" cy="32" r="5" fill="#1e1b4b" />
            <circle cx="28" cy="30" r="1.8" fill="white" />
            <circle cx="48" cy="30" r="1.8" fill="white" />
            <path d="M21 25 Q26 23 31 25" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M41 23 Q46 20 51 22" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M28 46 Q36 43 44 45" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="55" cy="18" r="2.5" fill="#c4b5fd" opacity="0.6" />
            <circle cx="60" cy="12" r="3.5" fill="#c4b5fd" opacity="0.4" />
            <circle cx="65" cy="6"  r="4.5" fill="#c4b5fd" opacity="0.25" />
          </>
        )}

        {mood === "sad" && (
          <>
            <circle cx="26" cy="33" r="4.5" fill="#1e1b4b" />
            <circle cx="46" cy="33" r="4.5" fill="#1e1b4b" />
            <circle cx="28" cy="31" r="1.5" fill="white" />
            <circle cx="48" cy="31" r="1.5" fill="white" />
            <path d="M21 26 Q26 22 31 25" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M41 25 Q46 22 51 26" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M27 48 Q36 42 45 48" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <ellipse cx="23" cy="44" rx="2" ry="3.5" fill="#93c5fd" opacity="0.75" />
          </>
        )}
      </svg>
    </div>
  );
}

/** Balão de fala no estilo quiz, com highlight opcional em palavra-chave */
export function SpeechBubble({
  text,
  highlight,
  subtitle,
}: {
  text: string;
  highlight?: string;
  subtitle?: string;
}) {
  const renderText = () => {
    if (!highlight) return <span>{text}</span>;
    const idx = text.indexOf(highlight);
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{
          background: "linear-gradient(90deg, #ddb693, #e8a9c2, #ef8fb8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          {highlight}
        </span>
        {text.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        background: "white",
        borderRadius: "20px 20px 20px 6px",
        padding: "14px 16px",
        boxShadow: "0 2px 14px rgba(99,102,241,0.08)",
      }}
    >
      <p style={{
        margin: 0,
        fontSize: "18px",
        fontWeight: 800,
        color: "#1e1b4b",
        letterSpacing: "-0.02em",
        lineHeight: 1.3,
      }}>
        {renderText()}
      </p>
      {subtitle && (
        <p style={{ margin: "5px 0 0", fontSize: "13px", color: "#9090a0", fontWeight: 400 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
