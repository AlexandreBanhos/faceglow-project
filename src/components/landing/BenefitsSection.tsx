import { motion } from "framer-motion";
import { Search, TrendingDown, Clock, ScanFace, ArrowRight } from "lucide-react";
import appPreview from "@/assets/imagem_tela_inicial.png";

const PROBLEMS = [
  {
    icon: Search,
    title: "Não sei qual é meu tipo de pele",
    description: "Testes genéricos contradizem uns aos outros. Nossa IA analisa sua selfie e entrega o diagnóstico real em 60 segundos.",
  },
  {
    icon: TrendingDown,
    title: "Gasto em produtos que não funcionam",
    description: "Sem diagnóstico, a compra é por impulso. O FaceGlow indica exatamente o que sua pele precisa — e o que é desperdício.",
  },
  {
    icon: Clock,
    title: "Dermatologista é caro e demorado",
    description: "R$ 150–300 por consulta, semanas de espera. O FaceGlow entrega análise profissional, acessível, disponível 24 horas.",
  },
];

export function BenefitsSection() {
  return (
    <section id="why-section" className="relative z-10 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-2xl"
        >
          <p className="fg-eyebrow mb-3">
            <span className="mr-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: "var(--grad-coral)" }} />
            Por que FaceGlow
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            A rotina certa para{" "}
            <span style={{
              background: "var(--grad-coral)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              cada pele
            </span>
            {" "}— não para todas.
          </h2>
          <p className="text-base md:text-lg" style={{ color: "var(--fg-ink-3)" }}>
            Sua pele é única. As soluções genéricas não funcionam porque ignoram isso.
          </p>
        </motion.div>

        {/* 2-col layout */}
        <div className="grid md:grid-cols-5 gap-5 items-start">

          {/* Left: problem cards */}
          <div className="md:col-span-3 space-y-3">
            {PROBLEMS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                whileHover={{ x: 4 }}
                className="lg-surface rounded-[1.5rem] p-5 flex gap-4 items-start cursor-default group"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--grad-coral-soft)" }}
                >
                  <item.icon size={19} className="text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm mb-1" style={{ color: "var(--fg-ink)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--fg-ink-3)" }}>
                    {item.description}
                  </p>
                </div>
                <ArrowRight
                  size={15}
                  className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: "var(--fg-ink-3)" }}
                />
              </motion.div>
            ))}
          </div>

          {/* Right: app visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="md:col-span-2 sticky top-24"
          >
            <div
              className="lg-surface-strong rounded-[1.75rem] overflow-hidden relative"
              style={{ aspectRatio: "9/16", maxHeight: 520 }}
            >
              <img
                src={appPreview}
                alt="Interface FaceGlow"
                className="w-full h-full object-cover object-top"
              />
              <div
                className="absolute inset-x-0 bottom-0 p-5"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.68) 0%, transparent 100%)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ScanFace size={15} className="text-white" />
                  <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Análise em tempo real</span>
                </div>
                <p className="text-white/75 text-[11px] leading-relaxed">
                  IA identifica tipo de pele, condições e monta rotina personalizada.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
