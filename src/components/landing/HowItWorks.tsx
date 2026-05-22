import { motion } from "framer-motion";
import { Camera, Cpu, FileText, Sparkles } from "lucide-react";
import rotinaManha from "@/assets/skincare-edu/rotina-limpeza.jpg";
import rotinaHidratante from "@/assets/skincare-edu/rotina-hidratante.jpg";

const STEPS = [
  {
    number: "01",
    icon: Camera,
    title: "Tire uma selfie",
    description: "Com boa iluminação, a câmera captura os detalhes da sua pele. Sem filtro, sem maquiagem.",
    image: null,
  },
  {
    number: "02",
    icon: Cpu,
    title: "IA analisa em segundos",
    description: "Detecta tipo de pele, nível de hidratação, poros, manchas e condições. Precisão de grau clínico.",
    image: null,
  },
  {
    number: "03",
    icon: FileText,
    title: "Receba seu diagnóstico",
    description: "Resultado detalhado com nome da sua condição, métricas e score geral da saúde da pele.",
    image: rotinaManha,
  },
  {
    number: "04",
    icon: Sparkles,
    title: "Sua rotina personalizada",
    description: "Passos específicos e produtos curados para o seu tipo de pele. Manhã e noite, na ordem certa.",
    image: rotinaHidratante,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative z-10 py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center max-w-2xl mx-auto"
        >
          <p className="fg-eyebrow mb-3">
            <span className="mr-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: "var(--grad-coral)" }} />
            Como funciona
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Do zero ao diagnóstico{" "}
            <span style={{
              background: "var(--grad-coral)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              em 4 passos
            </span>
          </h2>
        </motion.div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-3">

          {/* Connector line — desktop only */}
          <div
            className="hidden md:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent 0%, var(--grad-coral) 15%, var(--grad-coral) 85%, transparent 100%)", opacity: 0.25 }}
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="lg-surface rounded-[1.75rem] p-5 relative z-10 overflow-hidden"
            >
              {/* Background image for steps 03/04 */}
              {step.image && (
                <div className="absolute inset-0 opacity-[0.07]">
                  <img src={step.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Number + Icon */}
              <div className="relative z-10 flex items-center gap-3 mb-4">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--grad-coral)", boxShadow: "var(--shadow-glow)" }}
                >
                  <step.icon size={20} color="white" strokeWidth={2} />
                </motion.div>
                <span
                  className="font-extrabold text-3xl leading-none"
                  style={{
                    background: "var(--grad-coral)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    opacity: 0.25,
                  }}
                >
                  {step.number}
                </span>
              </div>

              <div className="relative z-10">
                <h3 className="font-bold text-sm mb-2" style={{ color: "var(--fg-ink)" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg-ink-3)" }}>{step.description}</p>
              </div>
            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}
