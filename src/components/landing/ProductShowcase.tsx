import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanFace, ListChecks, History, Sliders, CheckSquare2,
  ChevronRight, Droplets, Sun, Layers, Activity, TrendingUp,
  Check,
} from "lucide-react";

import imgAnalise   from "@/assets/pele-mista.png";
import imgRotina    from "@/assets/face-glow-rotina.webp";
import imgHistorico from "@/assets/pele-normal.png";
import imgPersonal  from "@/assets/pele-acne.png";
import imgChecklist from "@/assets/pele-sensivel.png";

// ── Visual overlays ──────────────────────────────────────────────────────────

function VisualAnalise() {
  const metrics = [
    { label: "Oleosidade",  value: 72, color: "#f59e0b" },
    { label: "Hidratação",  value: 45, color: "#3b82f6" },
    { label: "Manchas",     value: 38, color: "#a855f7" },
    { label: "Sensibilidade", value: 55, color: "#ef4444" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5 gap-3">
      {/* Score geral */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-1"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(16px)" }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--grad-coral)", boxShadow: "0 4px 16px rgba(221,182,147,0.5)" }}>
          <span className="text-white font-extrabold text-lg">68</span>
        </div>
        <div>
          <p className="text-white text-xs font-semibold uppercase tracking-wide">Score geral</p>
          <p className="text-white/70 text-[11px]">Pele mista · atenção média</p>
        </div>
      </motion.div>
      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-white text-[11px] font-medium">{m.label}</span>
              <span className="text-white text-[11px] font-bold">{m.value}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full"
                style={{ background: m.color }}
                initial={{ width: 0 }}
                animate={{ width: `${m.value}%` }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VisualRotina() {
  const steps = ["Limpeza facial", "Sérum vitamina C", "Hidratante FPS 30", "Protetor solar"];
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sun size={14} className="text-amber-300" />
          <span className="text-white text-xs font-bold uppercase tracking-wide">Rotina da manhã</span>
          <span className="ml-auto text-white/60 text-[10px]">4 passos</span>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--grad-coral)" }}>
                <span className="text-white text-[9px] font-bold">{i + 1}</span>
              </div>
              <span className="text-white text-[12px] font-medium">{step}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function VisualHistorico() {
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-xs font-bold uppercase tracking-wide">Evolução</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.3)" }}>
            <TrendingUp size={11} className="text-green-300" />
            <span className="text-green-300 text-[10px] font-bold">+12 pts</span>
          </div>
        </div>
        {/* Mini chart bars */}
        <div className="flex items-end gap-1.5 h-10">
          {[42, 48, 52, 55, 58, 61, 68].map((v, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-sm"
              style={{ background: i === 6 ? "var(--grad-coral)" : "rgba(255,255,255,0.3)" }}
              initial={{ height: 0 }}
              animate={{ height: `${(v / 68) * 100}%` }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.4, ease: "easeOut" }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-white/50 text-[9px]">Jan</span>
          <span className="text-white/50 text-[9px]">Jul</span>
        </div>
      </motion.div>
    </div>
  );
}

function VisualPersonalizavel() {
  const itens = ["Limpeza — Bioré", "Sérum — The Ordinary", "+ Adicionar produto"];
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={13} className="text-white/80" />
          <span className="text-white text-xs font-bold uppercase tracking-wide">Personalizar rotina</span>
        </div>
        <div className="space-y-2">
          {itens.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{
                background: i === 2
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.15)",
                border: i === 2 ? "1px dashed rgba(255,255,255,0.25)" : "none",
              }}
            >
              <span className="text-white text-[11px] font-medium">{item}</span>
              {i < 2 && <ChevronRight size={12} className="text-white/50" />}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function VisualChecklist() {
  const itens = [
    { label: "Limpeza facial",   done: true  },
    { label: "Sérum antioxidante", done: true },
    { label: "Hidratante",       done: false },
    { label: "Protetor solar",   done: false },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-end p-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare2 size={13} className="text-white/80" />
            <span className="text-white text-xs font-bold uppercase tracking-wide">Hoje — manhã</span>
          </div>
          <span className="text-white/60 text-[10px]">2/4 feitos</span>
        </div>
        <div className="space-y-2">
          {itens.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: item.done ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)" }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: item.done ? "#22c55e" : "rgba(255,255,255,0.2)" }}>
                {item.done && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-white text-[11px] font-medium flex-1"
                style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.7 : 1 }}>
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--grad-coral)" }}
            initial={{ width: 0 }}
            animate={{ width: "50%" }}
            transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// ── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "analise",
    icon: ScanFace,
    title: "Análise da pele",
    description: "Saiba exatamente a situação atual da sua pele — pontos fortes, melhorias e métricas detalhadas de oleosidade, hidratação, manchas e mais.",
    image: imgAnalise,
    Visual: VisualAnalise,
  },
  {
    id: "rotina",
    icon: Layers,
    title: "Rotina personalizada",
    description: "Do básico ao avançado. Passo a passo diário para iniciar no cuidado pessoal, com rotinas exclusivas para o seu tipo de pele e sua realidade.",
    image: imgRotina,
    Visual: VisualRotina,
  },
  {
    id: "historico",
    icon: History,
    title: "Histórico de evolução",
    description: "Acompanhe como sua pele melhora ao longo do tempo. Compare análises anteriores e veja cada conquista.",
    image: imgHistorico,
    Visual: VisualHistorico,
  },
  {
    id: "personalizavel",
    icon: Sliders,
    title: "Totalmente personalizável",
    description: "Edite passos, adicione seus produtos favoritos e adapte a rotina à sua realidade — tornando o cuidado um hábito que dura.",
    image: imgPersonal,
    Visual: VisualPersonalizavel,
  },
  {
    id: "checklist",
    icon: CheckSquare2,
    title: "Checklist diário",
    description: "Siga sua rotina passo a passo, marque cada produto usado e garanta a saúde da sua pele todos os dias.",
    image: imgChecklist,
    Visual: VisualChecklist,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductShowcase() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance every 4s (pauses on interaction)
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
    <section className="relative z-10 py-20 px-4 md:px-8">
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
        <div className="grid md:grid-cols-5 gap-4 md:gap-6 items-center">

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

          {/* Right: visual panel */}
          <div className="md:col-span-3 order-1 md:order-2">
            <div className="relative" style={{ aspectRatio: "4/3" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={feat.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-[1.75rem] overflow-hidden"
                  style={{ boxShadow: "0 24px 60px -16px rgba(60,30,50,0.25)" }}
                >
                  {/* Background image */}
                  <img
                    src={feat.image}
                    alt={feat.title}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center top" }}
                  />

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(221,182,147,0.35) 0%, rgba(232,169,194,0.28) 55%, rgba(239,143,184,0.22) 100%)",
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 50%, transparent 100%)",
                    }}
                  />

                  {/* Feature-specific UI overlay */}
                  <feat.Visual />

                  {/* Feature label — top left */}
                  <div
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}
                  >
                    <feat.icon size={12} className="text-white" />
                    <span className="text-white text-[10px] font-semibold uppercase tracking-widest">
                      {feat.title}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Dot indicators */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                {FEATURES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className="transition-all rounded-full"
                    style={{
                      width: i === active ? 20 : 6,
                      height: 6,
                      background: i === active ? "var(--grad-coral)" : "rgba(0,0,0,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
