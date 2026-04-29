import React from "react";

interface FGGradientTextProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

/**
 * Gradient Text - Animated coral gradient text
 * Used for emphasis on key words and headings
 */
export const FGGradientText: React.FC<FGGradientTextProps> = ({
  children,
  className = "",
  animate = false,
}) => {
  return (
    <span
      className={`fg-gradient-text ${animate ? "gradient-text-animated" : ""} ${className}`}
    >
      {children}
    </span>
  );
};
