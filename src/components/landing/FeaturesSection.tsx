import { motion } from "framer-motion";
import { ScanFace, Sparkles, Package, TrendingUp, ShieldCheck, Users } from "lucide-react";
import skinOileosa from "@/assets/pele-oleosa.png";
import skinNormal from "@/assets/pele-normal.png";

// Bento grid layout
// [  Main (AI Analysis) — col 7  ] [ Routine — col 5 ]
// [  Main (AI Analysis) — col 7  ] [ Products — col 5]
// [ Track — col 4 ] [ Privacy — col 4 ] [ Community — col 4]

const SECONDARY = [
  {
    icon: Sparkles,
    title: "Rotina personalizada",
    description: "Manhã e noite com ingredientes ideais na ordem certa — montada para sua pele, não para todas.",
  },
  {
    icon: Package,
    title: "Produtos reais",
    description: "Curadoria por faixa de preço, alinhada ao diagnóstico. Sem indicações genéricas.",
  },
  {
    icon: TrendingUp,
    title: "Rastreio de evolução",
    description: "Compare antes e depois. Métricas reais: hidratação, oleosidade, firmeza.",
  },
  {
    icon: ShieldCheck,
    title: "Privacidade total",
    description: "Seus dados são seus. Anonimato completo, sem compartilhamento. LGPD.",
  },
  {
    icon: Users,
    title: "Comunidade",
    description: "Compartilhe progresso e receba dicas de especialistas e outras usuárias.",
  },
];

const cardBase = "lg-surface rounded-[1.75rem] p-5 md:p-6 overflow-hidden relative";

export function FeaturesSection() {
  return (
    <section id="offers" className="relative z-10 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center max-w-2xl mx-auto"
        >
          <p className="fg-eyebrow mb-3">
            <span className="mr-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: "var(--grad-coral)" }} />
            O que o FaceGlow oferece
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Tudo que sua pele precisa,{" "}
            <span style={{
              background: "var(--grad-coral)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              em um único app
            </span>
          </h2>
          <p className="text-base" style={{ color: "var(--fg-ink-3)" }}>
            Do diagnóstico ao produto certo. Da rotina ao rastreio de evolução.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

          {/* Main card — AI Analysis (spans 2 rows on md) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`${cardBase} md:col-span-7 md:row-span-2 flex flex-col min-h-[320px] md:min-h-[420px]`}
          >
            {/* Background photo */}
            <div className="absolute inset-0">
              <img
                src={skinOileosa}
                alt="Análise de pele"
                className="w-full h-full object-cover saturate-[0.85]"
              />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(135deg, rgba(221,182,147,0.55) 0%, rgba(232,169,194,0.45) 55%, rgba(239,143,184,0.38) 100%)",
              }} />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                  style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
                >
                  <ScanFace size={13} className="text-white" />
                  <span className="text-white text-[11px] font-semibold uppercase tracking-widest">IA Vision</span>
                </div>
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3 leading-tight">
                  Análise por selfie<br />com inteligência artificial
                </h3>
                <p className="text-white/80 text-sm leading-relaxed max-w-xs">
                  Tire uma foto. A IA detecta acne, oleosidade, manchas, poros e linhas finas — em 60 segundos.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Secondary cards — top right row */}
          {SECONDARY.slice(0, 2).map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className={`${cardBase} md:col-span-5`}
            >
              {i === 0 && (
                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.06] overflow-hidden rounded-[1.75rem]">
                  <img src={skinNormal} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--grad-coral-soft)" }}
              >
                <feat.icon size={18} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-sm mb-2" style={{ color: "var(--fg-ink)" }}>{feat.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--fg-ink-3)" }}>{feat.description}</p>
            </motion.div>
          ))}

          {/* Bottom row — 3 equal cards */}
          {SECONDARY.slice(2).map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className={`${cardBase} md:col-span-4`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--grad-coral-soft)" }}
              >
                <feat.icon size={18} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-sm mb-2" style={{ color: "var(--fg-ink)" }}>{feat.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--fg-ink-3)" }}>{feat.description}</p>
            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}
