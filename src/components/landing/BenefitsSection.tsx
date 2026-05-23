import { motion } from "framer-motion";
import { Search, TrendingDown, Clock, ArrowRight } from "lucide-react";
import headerImage from "@/assets/header-landing-page.png";

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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export function BenefitsSection() {
  return (
    <section
      id="why-section"
      className="relative z-10 overflow-hidden"
      style={{ padding: "80px 0" }}
    >
      {/* Fade superior — mescla com hero */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 280,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        maskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 15%, transparent 100%)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.55) 0%, transparent 70%)",
        zIndex: 0, pointerEvents: "none",
      }} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-stretch">

          {/* ── Esquerda: imagem direta na página, sem card ── */}
          <motion.div
            initial={{ opacity: 0, x: -48, scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center order-2 md:order-1 self-stretch"
          >
            <img
              src={headerImage}
              alt="FaceGlow — análise de pele e rotina personalizada"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                filter:
                  "drop-shadow(0 28px 56px rgba(232,116,138,0.22)) drop-shadow(0 8px 18px rgba(0,0,0,0.09))",
              }}
            />
          </motion.div>

          {/* ── Direita: título + cards ── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="order-1 md:order-2 flex flex-col gap-5"
          >
            {/* Eyebrow */}
            <motion.p variants={fadeUp} className="fg-eyebrow">
              <span
                className="mr-2 inline-block w-1.5 h-1.5 rounded-full align-middle"
                style={{ background: "var(--grad-coral)" }}
              />
              Por que FaceGlow
            </motion.p>

            {/* Headline */}
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight"
            >
              A rotina certa para{" "}
              <span
                style={{
                  background: "var(--grad-coral)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                cada pele
              </span>
              {" "}— não para todas.
            </motion.h2>

            {/* Subtítulo */}
            <motion.p
              variants={fadeUp}
              className="text-base md:text-lg leading-relaxed"
              style={{ color: "var(--fg-ink-3)" }}
            >
              Sua pele é única. As soluções genéricas não funcionam porque ignoram isso.
            </motion.p>

            {/* Problem cards */}
            <div className="flex flex-col gap-3 mt-1">
              {PROBLEMS.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  whileHover={{ x: 5 }}
                  className="lg-surface rounded-[1.4rem] p-4 flex gap-4 items-start cursor-default group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--grad-coral-soft)" }}
                  >
                    <item.icon size={17} className="text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-0.5" style={{ color: "var(--fg-ink)" }}>
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--fg-ink-3)" }}>
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity"
                    style={{ color: "var(--fg-ink-3)" }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
