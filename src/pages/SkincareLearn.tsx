import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { LearnCard } from "@/components/LearnCard";
import { LEARN_CARDS, CATEGORIES, CATEGORY_LABELS, type LearnCategory } from "@/data/skincareLearn";
import logoFaceglow from "@/assets/logo-faceglow.svg";

export default function SkincareLearn() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<LearnCategory>("tipos-de-pele");

  const filtered = LEARN_CARDS.filter(c => c.category === activeCategory);

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--grad-aurora)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl liquiglass-button flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <img src={logoFaceglow} alt="FaceGlow" className="h-7 w-auto" />
      </div>

      <div className="px-5">
        <h1 className="text-2xl font-extrabold text-foreground mb-1" style={{ letterSpacing: "-0.4px" }}>
          Aprenda sobre Skincare
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          Guias práticos sobre pele, ingredientes e rotina
        </p>

        {/* Tabs de categoria */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-5" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={activeCategory === cat ? {
                background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
                color: "white",
                boxShadow: "0 4px 12px rgba(232,116,138,0.3)",
                border: "none",
              } : {
                background: "rgba(255,255,255,0.6)",
                color: "var(--fg-ink-3)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {filtered.map((card, i) => (
            <LearnCard key={card.id} card={card} delay={i * 0.06} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
