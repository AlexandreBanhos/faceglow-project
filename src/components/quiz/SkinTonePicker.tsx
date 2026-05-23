const TONES = [
  {
    value: "very_light",
    label: "Muito clara",
    sublabel: "Tons brancos/rosados · queima facilmente, alto risco de vermelhidão",
    color: "#FDDBB4",
    border: "#d4a870",
    checkDark: true,
  },
  {
    value: "light",
    label: "Clara",
    sublabel: "Tom bege claro · queima às vezes, bronzeia gradualmente",
    color: "#E8AC7E",
    border: "#c4854e",
    checkDark: false,
  },
  {
    value: "medium",
    label: "Média / Trigal",
    sublabel: "Tom bege-oliva · raramente queima, bronzeia bem",
    color: "#C17F4A",
    border: "#96602e",
    checkDark: false,
  },
  {
    value: "tan",
    label: "Morena",
    sublabel: "Tom marrom médio · quase nunca queima, maior risco de manchas",
    color: "#8B5A2B",
    border: "#5e3a18",
    checkDark: false,
  },
  {
    value: "dark",
    label: "Negra / Escura",
    sublabel: "Tom marrom-escuro a negra · nunca queima, atenção à hiperpigmentação",
    color: "#3D1F0E",
    border: "#1e0d06",
    checkDark: false,
  },
] as const;

const GRADIENT =
  "linear-gradient(to right, #FDDBB4 0%, #E8AC7E 25%, #C17F4A 50%, #8B5A2B 75%, #3D1F0E 100%)";

const T = "all 220ms cubic-bezier(0.4,0,0.2,1)";

interface SkinTonePickerProps {
  value: string | null;
  onChange: (value: string) => void;
}

export default function SkinTonePicker({ value, onChange }: SkinTonePickerProps) {
  const selected = TONES.find((t) => t.value === value) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Gradient bar + dots */}
      <div style={{ position: "relative", height: "60px" }}>
        {/* Bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "22px",
            right: "22px",
            height: "12px",
            borderRadius: "999px",
            background: GRADIENT,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.22)",
          }}
        />

        {/* Dots */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {TONES.map((tone) => {
            const isSelected = value === tone.value;
            const size = isSelected ? 44 : 32;
            return (
              <div
                key={tone.value}
                style={{
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => onChange(tone.value)}
                  aria-label={tone.label}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: tone.color,
                    border: isSelected ? "3px solid white" : `2px solid ${tone.border}`,
                    boxShadow: isSelected
                      ? `0 0 0 3px ${tone.color}, 0 4px 18px rgba(0,0,0,0.28)`
                      : "0 1px 5px rgba(0,0,0,0.22)",
                    cursor: "pointer",
                    transition: T,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    outline: "none",
                  }}
                >
                  {isSelected && (
                    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
                      <path
                        d="M1.5 5L5 8.5L11.5 1.5"
                        stroke={tone.checkDark ? "#5a3a1a" : "white"}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info card */}
      {selected ? (
        <div
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "18px 20px",
            boxShadow: "0 2px 14px rgba(99,102,241,0.08)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: selected.color,
              border: `3px solid ${selected.border}`,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 700,
              color: "#1e1b4b",
              lineHeight: "1.2",
            }}>
              {selected.label}
            </p>
            <p style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#6b7280",
              fontWeight: 400,
              lineHeight: "1.45",
            }}>
              {selected.sublabel}
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(167,139,250,0.08)",
            border: "1px dashed rgba(167,139,250,0.35)",
            borderRadius: "16px",
            padding: "16px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "#a78bfa", fontWeight: 500 }}>
            Toque em um tom para selecionar
          </p>
        </div>
      )}
    </div>
  );
}
