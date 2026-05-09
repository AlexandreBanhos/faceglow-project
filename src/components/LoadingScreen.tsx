import { motion } from "framer-motion";
import logoFaceglow from "@/assets/logo-faceglow.svg";

export const LoadingScreen = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FF6B9D 50%, #C471ED 75%, #FF8E53 100%)",
        backgroundSize: "300% 300%",
        animation: "fgGradientShift 5s ease infinite",
      }}
    >
      <style>{`
        @keyframes fgGradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fgLogoReveal {
          0%   { clip-path: inset(0 100% 0 0); opacity: 0.5; }
          100% { clip-path: inset(0 0% 0 0);   opacity: 1; }
        }
      `}</style>

      <motion.img
        src={logoFaceglow}
        alt="FaceGlow"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          height: 100,
          objectFit: "contain",
          filter: "drop-shadow(0 4px 24px rgba(255,255,255,0.35))",
          animation: "fgLogoReveal 0.9s cubic-bezier(0.65,0,0.35,1) 0.1s both",
        }}
      />
    </div>
  );
};

export default LoadingScreen;
