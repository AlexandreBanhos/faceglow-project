import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Camera, Cpu, FileText, Sparkles } from "lucide-react";
import passosVideo from "@/assets/passos.mp4";

const STEPS = [
  {
    number: "01",
    icon: Camera,
    title: "Tire uma selfie",
    description: "Com boa iluminação, a câmera captura os detalhes da sua pele. Sem filtros, expressão neutra.",
  },
  {
    number: "02",
    icon: Cpu,
    title: "IA analisa em segundos",
    description: "Detecta tipo de pele, hidratação, poros, manchas e mais de 12 condições com alta precisão.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Receba seu diagnóstico",
    description: "Resultado detalhado com métricas individuais e score geral da saúde da pele.",
  },
  {
    number: "04",
    icon: Sparkles,
    title: "Sua rotina personalizada",
    description: "Passos específicos para manhã e noite, na ordem certa, adaptados ao seu tipo de pele.",
  },
];

// ── iPhone frame com vídeo ────────────────────────────────────────────────────

function IPhoneVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView({ once: true });

  return (
    <div
      style={{
        position: "relative",
        width: 260,
        flexShrink: 0,
      }}
    >
      {/* Chassi do iPhone */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 48,
          background: "linear-gradient(160deg, #2C2C2E 0%, #1C1C1E 100%)",
          padding: "14px 10px 18px",
          boxShadow:
            "0 48px 96px rgba(0,0,0,0.38), 0 0 0 1.5px rgba(255,255,255,0.09), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 32,
            background: "#1C1C1E",
            borderRadius: "0 0 18px 18px",
            zIndex: 10,
          }}
        />

        {/* Botões laterais — volume */}
        <div style={{ position: "absolute", left: -3, top: 92, width: 3, height: 28, background: "#3A3A3C", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: -3, top: 128, width: 3, height: 44, background: "#3A3A3C", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: -3, top: 180, width: 3, height: 44, background: "#3A3A3C", borderRadius: 2 }} />

        {/* Botão power */}
        <div style={{ position: "absolute", right: -3, top: 136, width: 3, height: 64, background: "#3A3A3C", borderRadius: 2 }} />

        {/* Tela */}
        <div
          style={{
            borderRadius: 36,
            overflow: "hidden",
            aspectRatio: "9/19.5",
            background: "#000",
            position: "relative",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          >
            <source src={passosVideo} type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Reflexo sutil abaixo */}
      <div
        style={{
          position: "absolute",
          bottom: -16,
          left: "10%",
          right: "10%",
          height: 20,
          background: "rgba(0,0,0,0.15)",
          filter: "blur(12px)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

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
            Do zero ao resultado{" "}
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

        {/* Layout: steps (esquerda) + iPhone (direita) */}
        <div className="flex flex-col-reverse md:flex-row gap-10 md:gap-14 items-center">

          {/* Esquerda: grade 2×2 de passos */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="lg-surface rounded-[1.75rem] p-5"
              >
                {/* Número + Ícone */}
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--grad-coral)", boxShadow: "var(--shadow-glow)" }}
                  >
                    <step.icon size={19} color="white" strokeWidth={2} />
                  </motion.div>
                  <span
                    className="font-extrabold text-3xl leading-none"
                    style={{
                      background: "var(--grad-coral)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      opacity: 0.28,
                    }}
                  >
                    {step.number}
                  </span>
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: "var(--fg-ink)" }}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--fg-ink-3)" }}>{step.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Direita: vídeo no iPhone */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center flex-shrink-0"
          >
            <IPhoneVideo />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
