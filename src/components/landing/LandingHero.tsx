import { ChevronRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLandingContent } from "@/shared/providers/LandingContext";

interface HeroProps {
  onCTAPrimary?: () => void;
  onCTASecondary?: () => void;
}

const AVATARS = ["A", "B", "C", "D", "E", "+"];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
};
const ITEM_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ITEM_EASE } },
};

const SPARKLE_KEYFRAMES = `
  @keyframes heroSparkleFloat {
    0%   { transform: translateY(0px) scale(1); opacity: 0; }
    20%  { opacity: 1; }
    50%  { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
    80%  { opacity: 0.6; }
    100% { transform: translateY(-40px) scale(0.8); opacity: 0; }
  }
`;

const SPARKLES = [
  { w: 6, h: 6,  bg: "rgba(244,131,107,0.4)", top: "20%", left: "15%", dur: "6s", del: "0s"  },
  { w: 4, h: 4,  bg: "rgba(232,151,196,0.4)", top: "40%", left: "25%", dur: "8s", del: "-2s" },
  { w: 8, h: 8,  bg: "rgba(201,166,245,0.4)", top: "60%", left: "10%", dur: "7s", del: "-4s" },
  { w: 5, h: 5,  bg: "rgba(244,131,107,0.4)", top: "75%", left: "35%", dur: "9s", del: "-1s" },
];

export const LandingHero = ({ onCTAPrimary, onCTASecondary }: HeroProps) => {
  const service = useLandingContent();
  const navigate = useNavigate();
  const socialProof = service.getSocialProof();

  const videoRef   = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Synchronous init avoids flash; matchMedia fires only at the breakpoint crossing
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(window.innerWidth < 768);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const target = videoRef.current;
    const section = sectionRef.current;
    if (!target || !section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) target.play().catch(() => {});
        else target.pause();
      },
      { threshold: 0.1 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [isMobile]);

  const handlePrimary = onCTAPrimary ?? (() => navigate("/analyze"));
  const handleSecondary = onCTASecondary ?? (() => {
    document.getElementById("why-section")?.scrollIntoView({ behavior: "smooth" });
  });

  const totalAnalyses = socialProof?.totalAnalyses ?? 12400;

  // ─── MOBILE ──────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        style={{
          position: "relative",
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingTop: 72,
          background: "linear-gradient(180deg, rgba(255,235,228,1) 0%, rgba(255,225,232,0.95) 50%, rgba(255,235,228,1) 100%)",
          overflow: "hidden",
        }}
      >
        {/* 1. H1 — acima do vídeo, z-index 2 para flutuar sobre o gradiente superior */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0 }}
          style={{
            fontSize: "clamp(1.1rem, 8vw, 3.4rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            color: "#1A0E0A",
            margin: "8px",
            padding: "10px 32px 0",
            position: "relative",
            zIndex: 2,
          }}
        >
          Análise de pele<br />personalizada em 60s
        </motion.h1>

        {/* 2. Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "3px 34px",
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(8px)",
            fontSize: 12,
            color: "#1A0E0A",
            margin: "0 24px 0",
            alignSelf: "flex-start",
            position: "relative",
            zIndex: 2,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50", flexShrink: 0 }} />
          IA de análise dermatológica em tempo real
        </motion.div>

        {/* 3. Vídeo — proporção vertical, gradiente espelhado em cima e em baixo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            marginTop: -52,        /* puxa o vídeo pra trás do badge/título */
            width: "100%",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/videos/hero-face-poster.jpg"
            style={{
              display: "block",
              width: "100%",
              height: "130vw",       /* proporção vertical (portrait) */
              maxHeight: "62vh",
              objectFit: "cover",
              objectPosition: "50% 25%",
              pointerEvents: "none",
            }}
          >
            <source src="/videos/hero-face.webm" type="video/webm" />
            <source src="/videos/hero-face.mp4" type="video/mp4" />
          </video>

          {/* Fade SUPERIOR — cobre a transição atrás dos textos (título/badge) */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "45%",
            background: "linear-gradient(to bottom, rgba(255,235,228,1) 0%, rgba(255,235,228,0.85) 30%, rgba(255,235,228,0.4) 65%, transparent 100%)",
            pointerEvents: "none",
          }} />

        </motion.div>

        {/* Névoa branca — da base até ~20% do vídeo, atrás dos elementos */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "68vh",
          background: "linear-gradient(to top, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.88) 20%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.2) 65%, transparent 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }} />

        {/* 4. Parágrafo — sobreposto à base do vídeo */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            fontSize: "0.95rem",
            lineHeight: 1.55,
            color: "#3D2018",
            margin: "0 24px 0",
            marginTop: -64,
            position: "relative",
            zIndex: 2,
            textAlign: "center",
          }}
        >
          Tire uma selfie. Nossa IA identifica seu tipo de pele, condições e
          monta sua rotina personalizada — sem filas, sem consulta cara.
        </motion.p>

        {/* 5 + 6. Botões — centralizados abaixo do parágrafo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            margin: "16px 24px 0",
            position: "relative",
            zIndex: 2,
          }}
        >
          <button
            onClick={handlePrimary}
            style={{
              flexShrink: 0,
              borderRadius: 999,
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#F4836B",
              background: "rgba(244,131,107,0.15)",
              border: "1.5px solid rgba(244,131,107,0.4)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Analisar minha pele grátis
          </button>
          <button
            onClick={handleSecondary}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#1A0E0A",
              background: "rgba(255,255,255,0.8)",
              border: "1.5px solid rgba(0,0,0,0.12)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Ver como funciona <ChevronRight size={14} />
          </button>
        </motion.div>

        {/* 8. Stats — 2×2 grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.64 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            margin: "16px 24px 0",
            position: "relative",
            zIndex: 2,
          }}
        >
          {[
            { value: "600+",   label: "produtos curados no catálogo" },
            { value: "12+",    label: "parâmetros de pele analisados" },
            { value: "60s",    label: "para o resultado completo" },
            { value: "Grátis", label: "sua primeira análise" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", padding: "10px 8px",
                background: "rgba(255,255,255,0.52)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            >
              <span style={{
                fontSize: "1.3rem", fontWeight: 800, lineHeight: 1,
                background: "linear-gradient(135deg, #ddb693 0%, #ef8fb8 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{stat.value}</span>
              <span style={{ fontSize: 10.5, color: "#7a6060", marginTop: 4, lineHeight: 1.35 }}>{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Fade inferior — mescla com próxima seção */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 200,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          maskImage: "linear-gradient(to top, black 0%, black 15%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 0%, black 15%, transparent 100%)",
          background: "linear-gradient(to top, rgba(255,255,255,0.5) 0%, transparent 70%)",
          zIndex: 1, pointerEvents: "none",
        }} />

        {/* Spacer final */}
        <div style={{ height: 48 }} />
      </section>
    );
  }

  // ─── DESKTOP (inalterado) ─────────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}
    >
      <style>{SPARKLE_KEYFRAMES}</style>

      <video
        ref={videoRef}
        autoPlay loop muted playsInline preload="metadata"
        poster="/videos/hero-face-poster.jpg"
        className="absolute top-0 left-0 w-full object-cover pointer-events-none md:h-full md:object-[65%_top] md:scale-[0.90] lg:object-[72%_top] lg:scale-[0.92] lg:origin-[right_top] xl:object-[70%_top] xl:scale-[0.95]"
        style={{ zIndex: 0 }}
      >
        <source src="/videos/hero-face.webm" type="video/webm" />
        <source src="/videos/hero-face.mp4" type="video/mp4" />
      </video>

      {/* Gradiente lateral esquerdo */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "55%", height: "100%",
        background: "linear-gradient(to right, rgba(253,221,213,0.97) 0%, rgba(253,221,213,0.90) 30%, rgba(253,221,213,0.60) 65%, transparent 100%)",
        zIndex: 1, pointerEvents: "none",
      }} />



      {/* Stats — base do hero desktop */}
      <div style={{
        position: "absolute", bottom: 28, left: 0, right: 0,
        zIndex: 2, pointerEvents: "none",
        display: "flex", justifyContent: "center",
        padding: "0 clamp(16px, 6vw, 80px)",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          width: "100%", maxWidth: 720,
          background: "rgba(255,255,255,0.52)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 4px 24px rgba(80,40,60,0.08)",
          padding: "12px 0",
        }}>
          {[
            { value: "600+",   label: "produtos curados no catálogo" },
            { value: "12+",    label: "parâmetros de pele analisados" },
            { value: "60s",    label: "para o resultado completo" },
            { value: "Grátis", label: "sua primeira análise" },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              padding: "4px 12px",
              borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}>
              <span style={{
                fontSize: "clamp(1.1rem, 2vw, 1.5rem)", fontWeight: 800, lineHeight: 1,
                background: "linear-gradient(135deg, #ddb693 0%, #ef8fb8 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{stat.value}</span>
              <span style={{ fontSize: 11, color: "#7a6060", marginTop: 4, lineHeight: 1.35 }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fade inferior — mescla hero com próxima seção */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 280,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        maskImage: "linear-gradient(to top, black 0%, black 15%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 0%, black 15%, transparent 100%)",
        background: "linear-gradient(to top, rgba(255,255,255,0.55) 0%, transparent 70%)",
        zIndex: 1, pointerEvents: "none",
      }} />

      {/* Sparkles */}
      {SPARKLES.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          width: s.w, height: s.h,
          borderRadius: "50%",
          background: s.bg,
          top: s.top, left: s.left,
          zIndex: 1, pointerEvents: "none",
          animation: `heroSparkleFloat ${s.dur} linear ${s.del} infinite`,
        }} />
      ))}


{/* Content */}
      <div className="absolute bottom-8 z-[2] flex flex-col md:top-1/2 md:-translate-y-1/2 md:left-[clamp(24px,6vw,80px)] md:right-auto md:bottom-auto md:max-w-[480px]">
        <motion.div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={itemVariants}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              borderRadius: 999, padding: "8px 16px",
              background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)",
              fontSize: 13, color: "#1A0E0A", marginBottom: 16,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", flexShrink: 0 }} />
            IA de análise dermatológica em tempo real
          </motion.div>

          <motion.h1
            variants={itemVariants}
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", fontWeight: 800, lineHeight: 1.1, color: "#1A0E0A", margin: 0 }}
          >
            Análise de pele<br />personalizada em 60s
          </motion.h1>

          <motion.p
            variants={itemVariants}
            style={{ marginTop: 16, fontSize: "1rem", lineHeight: 1.6, color: "#3D2018", maxWidth: 400 }}
          >
            Tire uma selfie. Nossa IA identifica seu tipo de pele, condições e
            monta sua rotina personalizada — sem filas, sem consulta cara.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-7 flex flex-row flex-wrap items-center gap-3">
            <button
              onClick={handlePrimary}
              style={{
                whiteSpace: "nowrap", borderRadius: 999, padding: "12px 24px",
                fontSize: 14, fontWeight: 600, color: "#F4836B",
                background: "rgba(244,131,107,0.15)", border: "1.5px solid rgba(244,131,107,0.4)",
                backdropFilter: "blur(8px)", cursor: "pointer",
              }}
            >
              Analisar minha pele grátis
            </button>
            <button
              onClick={handleSecondary}
              style={{
                whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
                borderRadius: 999, padding: "12px 24px",
                fontSize: 14, fontWeight: 600, color: "#1A0E0A",
                background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(0,0,0,0.12)",
                backdropFilter: "blur(8px)", cursor: "pointer",
              }}
            >
              Ver como funciona <ChevronRight size={15} />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
