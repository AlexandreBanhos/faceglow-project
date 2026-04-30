import { Camera, ChevronRight, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLandingContent } from "@/shared/providers/LandingContext";
import headerImage from "@/assets/header-landing-page.png";
import { FGGradientText, FGMetricBar, FGScoreOrb } from "@/components/shared";

interface HeroProps {
  onCTAPrimary?: () => void;
  onCTASecondary?: () => void;
}

export const LandingHero = ({
  onCTAPrimary,
  onCTASecondary,
}: HeroProps) => {
  const service = useLandingContent();
  const navigate = useNavigate();
  const config = service.getConfig();
  const socialProof = service.getSocialProof();

  const handlePrimaryAction = onCTAPrimary ?? (() => navigate("/analyze"));
  const handleSecondaryAction = onCTASecondary ?? (() => {
    document.getElementById("why-section")?.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <motion.section
      className="relative z-10 px-4 pb-16 pt-8 md:px-8 md:pb-24"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <div className="fg-shell-wide grid min-h-[calc(100svh-112px)] items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="text-center lg:text-left">
          <motion.div
            className="fg-eyebrow mb-5"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 }}
          >
            <Sparkles size={14} />
            IA dermatologica em tempo real
          </motion.div>

          <motion.h1
            className="mx-auto max-w-4xl text-[2.85rem] font-extrabold leading-[0.96] text-[var(--fg-ink)] md:text-6xl lg:mx-0 lg:text-7xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            {config.hero?.headline ? (
              config.hero.headline.split("\n").map((line, index) => (
                <span key={line} className="block">
                  {index === 1 ? <FGGradientText>{line}</FGGradientText> : line}
                </span>
              ))
            ) : (
              <>
                Diagnostico de pele <FGGradientText>profissional em 60s</FGGradientText>
              </>
            )}
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--fg-ink-3)] md:text-xl lg:mx-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {config.hero?.subheadline ??
              "Tire uma selfie. Nossa IA identifica seu tipo de pele, condicoes e monta sua rotina personalizada sem filas e sem consulta cara."}
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
          >
            <button
              onClick={handlePrimaryAction}
              className="coral-button flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-extrabold sm:w-auto"
            >
              <Camera size={18} />
              {config.hero?.cta ?? "Analisar minha pele gratis"}
            </button>
            <button
              onClick={handleSecondaryAction}
              className="liquiglass-button flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-extrabold text-[var(--fg-ink-2)] sm:w-auto"
            >
              {config.hero?.secondaryCta ?? "Ver como funciona"}
              <ChevronRight size={17} />
            </button>
          </motion.div>

          <motion.div
            className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--fg-ink-3)] lg:justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
          >
            <span className="rounded-full bg-white/60 px-3 py-2 font-bold text-primary">
              +{(socialProof?.totalAnalyses ?? 12400).toLocaleString()} analises
            </span>
            <span className="rounded-full bg-white/60 px-3 py-2 font-bold text-[var(--fg-ink-2)]">
              Validado por dermatologistas
            </span>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[520px]"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="lg-surface-strong relative overflow-hidden rounded-[2.5rem] p-5 md:p-7">
            <div className="absolute inset-x-8 top-4 h-28 rounded-full bg-white/40 blur-3xl" />
            <div className="relative grid gap-5 md:grid-cols-[1fr_0.9fr] md:items-center">
              <div className="flex flex-col items-center">
                <FGScoreOrb score={92} size={240} variant="default" label="Skin score" />
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-extrabold text-primary shadow-soft">
                  <ShieldCheck size={14} />
                  Rotina pronta
                </div>
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-[1.5rem] bg-white/55 p-2 shadow-soft">
                  <img
                    src={headerImage}
                    alt="FaceGlow - preview de diagnostico de pele"
                    className="aspect-[4/5] w-full rounded-[1.15rem] object-cover object-top mix-blend-multiply"
                  />
                </div>
                <div className="rounded-[1.35rem] bg-white/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-primary">
                    <ScanFace size={14} />
                    Face map
                  </div>
                  <FGMetricBar label="Hidratacao" value={82} />
                  <FGMetricBar label="Textura" value={76} />
                  <FGMetricBar label="Glow" value={91} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};
