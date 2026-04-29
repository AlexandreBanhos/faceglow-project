import React from "react";

interface FGOrbMarkProps {
  size?: number;
  className?: string;
}

/**
 * Tiny brand orb mark - FaceGlow logo sphere
 * Appears in navigation and headers throughout the app
 */
export const FGOrbMark: React.FC<FGOrbMarkProps> = ({ size = 28, className = "" }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--grad-orb)",
        boxShadow:
          "inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 10px -2px rgba(180,80,120,0.4)",
        flexShrink: 0,
      }}
      className={className}
    />
  );
};
