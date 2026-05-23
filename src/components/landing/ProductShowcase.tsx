import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanFace, History, Sliders, CheckSquare2, Layers } from "lucide-react";

import imgAnalise   from "@/assets/landing-page/resultado resumo.webp";
import imgRotina    from "@/assets/landing-page/rotina.webp";
import imgHistorico from "@/assets/landing-page/historico.webp";
import imgPersonal  from "@/assets/landing-page/personalizar passo.webp";
import imgChecklist from "@/assets/landing-page/checklist rotina.webp";

// ── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "analise",
    icon: ScanFace,
    title: "Análise da pele",
    description: "Saiba exatamente a situação atual da sua pele — pontos fortes, melhorias e métricas detalhadas de oleosidade, hidratação, manchas e mais.",
    image: imgAnalise,
    accent: "linear-gradient(145deg, #fce7f3 0%, #fdf4ff 50%, #fef3c7 100%)",
    blob1: "rgba(232,116,138,0.18)",
    blob2: "rgba(244,168,199,0.15)",
  },
  {
    id: "rotina",
    icon: Layers,
    title: "Rotina personalizada",
    description: "Do básico ao avançado. Passo a passo diário para iniciar no cuidado pessoal, com rotinas exclusivas para o seu tipo de pele e sua realidade.",
    image: imgRotina,
    accent: "linear-gradient(145deg, #fff0f7 0%, #fce4ec 50%, #fdf6e3 100%)",
    blob1: "rgba(221,182,147,0.2)",
    blob2: "rgba(232,116,138,0.12)",
  },
  {
    id: "historico",
    icon: History,
    title: "Histórico de evolução",
    description: "Acompanhe como sua pele melhora ao longo do tempo. Compare análises anteriores e veja cada conquista.",
    image: imgHistorico,
    accent: "linear-gradient(145deg, #fce7f3 0%, #fdf0fa 50%, #f5f0ff 100%)",
    blob1: "rgba(168,148,220,0.15)",
    blob2: "rgba(232,116,138,0.12)",
  },
  {
    id: "personalizavel",
    icon: Sliders,
    title: "Totalmente personalizável",
    description: "Edite passos, adicione seus produtos favoritos e adapte a rotina à sua realidade — tornando o cuidado um hábito que dura.",
    image: imgPersonal,
    accent: "linear-gradient(145deg, #f5f0ff 0%, #fce4ec 50%, #fdf6e3 100%)",
    blob1: "rgba(192,132,252,0.15)",
    blob2: "rgba(244,168,199,0.18)",
  },
  {
    id: "checklist",
    icon: CheckSquare2,
    title: "Checklist diário",
    description: "Siga sua rotina passo a passo, marque cada produto usado e garanta a saúde da sua pele todos os dias.",
    image: imgChecklist,
    accent: "linear-gradient(145deg, #fff0f7 0%, #fce7f3 50%, #f0fdf4 100%)",
    blob1: "rgba(232,116,138,0.15)",
    blob2: "rgba(134,239,172,0.12)",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductShowcase() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActive((prev) => (prev + 1) % FEATURES.length);
    }, 4500);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (i: number) => {
    setActive(i);
    resetTimer();
  };

  const feat = FEATURES[active];

  return (
    <section className="relative z-10 py-20 px-4 md:px-8 overflow-hidden">
      {/* Fundo exclusivo desta seção */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(160deg, #fff8f5 0%, #fce8f0 30%, #fff4ec 60%, #fdf0f8 100%)",
        }}
      />
      {/* Blobs da seção — reativos à feature ativa */}
      <div
        className="absolute pointer-events-none transition-all duration-500"
        style={{ top: "8%", right: "8%", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${feat.blob1} 0%, transparent 70%)`, zIndex: 0 }}
      />
      <div
        className="absolute pointer-events-none transition-all duration-500"
        style={{ bottom: "10%", left: "6%", width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${feat.blob2} 0%, transparent 70%)`, zIndex: 0 }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ top: "55%", right: "3%", width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${feat.blob1} 0%, transparent 70%)`, opacity: 0.5, zIndex: 0 }}
      />
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 max-w-2xl mx-auto"
        >
          <p className="fg-eyebrow mb-3">
            <span className="mr-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: "var(--grad-coral)" }} />
            O que está incluído
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Tudo para elevar{" "}
            <span style={{
              background: "var(--grad-coral)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              o cuidado com a pele
            </span>
          </h2>
        </motion.div>

        {/* Showcase layout */}
        <div className="grid md:grid-cols-5 gap-6 md:gap-8 items-center">

          {/* Left: feature tabs */}
          <div className="md:col-span-2 space-y-2 order-2 md:order-1">
            {FEATURES.map((f, i) => {
              const isActive = i === active;
              return (
                <motion.button
                  key={f.id}
                  onClick={() => handleSelect(i)}
                  whileHover={{ x: isActive ? 0 : 4 }}
                  className="w-full text-left rounded-2xl px-4 py-4 transition-all flex items-start gap-3.5 relative overflow-hidden"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.35)",
                    backdropFilter: isActive ? "blur(20px)" : "blur(8px)",
                    boxShadow: isActive ? "0 4px 24px -8px rgba(221,182,147,0.4), 0 0 0 1.5px rgba(221,182,147,0.5)" : "none",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.45)",
                  }}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="active-bar"
                      className="absolute left-0 inset-y-0 w-[3px] rounded-r-full"
                      style={{ background: "var(--grad-coral)" }}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{
                      background: isActive ? "var(--grad-coral)" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    <f.icon
                      size={16}
                      strokeWidth={2}
                      style={{ color: isActive ? "white" : "var(--fg-ink-3)" }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold leading-tight mb-1 transition-colors"
                      style={{ color: isActive ? "var(--fg-ink)" : "var(--fg-ink-2)" }}
                    >
                      {f.title}
                    </p>
                    <AnimatePresence>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs leading-relaxed overflow-hidden"
                          style={{ color: "var(--fg-ink-3)" }}
                        >
                          {f.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Progress bar for auto-advance */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-[2px] rounded-full"
                      style={{ background: "var(--grad-coral)", opacity: 0.45 }}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 4.5, ease: "linear" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Right: screenshot direto na seção, sem card */}
          <div className="md:col-span-3 order-1 md:order-2 flex flex-col items-center gap-5 relative z-10">
            <AnimatePresence mode="wait">
              <motion.img
                key={feat.id}
                src={feat.image}
                alt={feat.title}
                className="h-72 sm:h-96 md:h-[580px]"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                style={{
                  width: "auto",
                  display: "block",
                  filter: "drop-shadow(0 32px 64px rgba(40,10,40,0.20)) drop-shadow(0 10px 24px rgba(40,10,40,0.10))",
                }}
              />
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className="transition-all rounded-full"
                  style={{
                    width: i === active ? 20 : 6,
                    height: 6,
                    background: i === active ? "var(--grad-coral)" : "rgba(0,0,0,0.18)",
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
