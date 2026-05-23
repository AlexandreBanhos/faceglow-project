import { useRef, useState } from "react";
import type { BrandLogo } from "@/lib/brandLogos";

interface BrandLogoFilterProps {
  brands: BrandLogo[];
  selected: string | null;
  onSelect: (brandName: string) => void;
  label?: string;
}

export function BrandLogoFilter({ brands, selected, onSelect, label }: BrandLogoFilterProps) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const startX     = useRef(0);
  const startY     = useRef(0);
  const scrollLeft = useRef(0);
  const direction  = useRef<"h" | "v" | null>(null);

  if (brands.length === 0) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current    = e.touches[0].clientX;
    startY.current    = e.touches[0].clientY;
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    direction.current  = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (direction.current === null) {
      direction.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (direction.current === "h") {
      // Impede o wizard de capturar o gesto e faz o scroll nativo acontecer
      e.stopPropagation();
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollLeft.current - dx;
      }
    }
  };

  return (
    <div>
      {label && (
        <p style={{
          fontSize: 10, fontWeight: 700, color: "#94a3b8",
          letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8,
        }}>
          {label}
        </p>
      )}
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          overflowY: "hidden",
          paddingBottom: 6,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          cursor: "grab",
        }}
        className="hide-scrollbar"
      >
        {brands.map(brand => (
          <BrandChip
            key={brand.id}
            brand={brand}
            selected={selected === brand.brand_name}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ── Chip individual ───────────────────────────────────────────────────────────

function BrandChip({ brand, selected, onSelect }: {
  brand: BrandLogo;
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? "" : brand.brand_name)}
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "8px 10px",
        borderRadius: 14,
        background: selected ? "rgba(232,116,138,0.08)" : "#fff",
        border: selected ? "1.5px solid rgba(232,116,138,0.55)" : "1px solid #f0ede8",
        boxShadow: selected ? "0 0 0 2px rgba(232,116,138,0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        minWidth: 62,
        maxWidth: 80,
      }}
    >
      <div style={{ width: 44, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!imgError ? (
          <img
            src={brand.logo_url}
            alt={brand.brand_name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            draggable={false}
          />
        ) : (
          <div style={{
            width: 40, height: 24, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(232,116,138,0.12)",
            fontSize: 13, fontWeight: 800, color: "#E8748A",
          }}>
            {brand.brand_name.charAt(0)}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 9, fontWeight: 600,
        color: selected ? "#E8748A" : "#64748b",
        textAlign: "center", lineHeight: 1.25,
        maxWidth: 68, overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: "2",
        WebkitBoxOrient: "vertical" as const,
        wordBreak: "break-word",
      }}>
        {brand.brand_name}
      </span>
    </button>
  );
}
