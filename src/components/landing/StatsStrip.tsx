import { motion } from "framer-motion";

const STATS = [
  { value: "600+",  label: "produtos curados no catálogo" },
  { value: "12+",   label: "parâmetros de pele analisados" },
  { value: "60s",   label: "para o resultado completo" },
  { value: "Grátis", label: "sua primeira análise" },
];

export function StatsStrip() {
  return (
    <section className="relative z-10 px-4 md:px-8 pt-0 pb-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg-surface rounded-[1.75rem] px-4 py-4 grid grid-cols-2 md:grid-cols-4"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="flex flex-col items-center text-center px-3 py-2 relative"
            >
              {i > 0 && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-px hidden md:block"
                  style={{ background: "var(--glass-border)" }}
                />
              )}
              <span
                className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none"
                style={{
                  background: "var(--grad-coral)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stat.value}
              </span>
              <span className="text-[11px] font-medium mt-1.5" style={{ color: "var(--fg-ink-3)" }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
