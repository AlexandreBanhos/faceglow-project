import React from "react";

interface AuroraBackdropProps {
  tone?: "warm" | "cool";
  className?: string;
}

/**
 * Aurora animated background blobs - liquid glass aesthetic
 * Creates a dreamy backdrop effect with radial gradients
 */
export const AuroraBackdrop: React.FC<AuroraBackdropProps> = ({
  tone = "warm",
  className = "",
}) => {
  const palettes = {
    warm: ["#f6c8a8", "#f1a8c5", "#d9b4e2", "#fbe4cf"],
    cool: ["#cfd6f6", "#e0bef0", "#f5b8d0", "#fce0cf"],
  };

  const colors = palettes[tone] || palettes.warm;

  return (
    <div
      className={`aurora-bg absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div
        className="aurora-blob"
        style={{
          width: 620,
          height: 620,
          top: -180,
          left: -120,
          background: colors[0],
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 540,
          height: 540,
          top: 80,
          right: -160,
          background: colors[1],
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 460,
          height: 460,
          bottom: -140,
          left: "30%",
          background: colors[2],
          opacity: 0.5,
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: 380,
          height: 380,
          bottom: 80,
          right: 120,
          background: colors[3],
          opacity: 0.55,
        }}
      />
    </div>
  );
};
