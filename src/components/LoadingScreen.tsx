import { motion } from "framer-motion";
import logoFaceglow from "@/assets/logos/logo-faceglow-escrito-color.webp";

export const LoadingScreen = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{
        background: "linear-gradient(-45deg, #fce7f3, #f9ede7, #f5e6db, #f5e1ec, #fce7f3)",
        backgroundSize: "400% 400%",
        animation: "fgFluidWave 12s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes fgFluidWave {
          0% {
            background-position: 0% 50%;
            background-image: linear-gradient(-45deg, #fce7f3, #f9ede7, #f5e6db, #f5e1ec, #fce7f3);
          }
          25% {
            background-position: 50% 50%;
            background-image: linear-gradient(45deg, #f5e1ec, #fce7f3, #f9ede7, #f5e6db, #f5e1ec);
          }
          50% {
            background-position: 100% 50%;
            background-image: linear-gradient(135deg, #f5e6db, #f5e1ec, #fce7f3, #f9ede7, #f5e6db);
          }
          75% {
            background-position: 50% 50%;
            background-image: linear-gradient(-135deg, #f9ede7, #f5e6db, #f5e1ec, #fce7f3, #f9ede7);
          }
          100% {
            background-position: 0% 50%;
            background-image: linear-gradient(-45deg, #fce7f3, #f9ede7, #f5e6db, #f5e1ec, #fce7f3);
          }
        }

        @keyframes fgLogoBreathe {
          0% {
            filter: drop-shadow(0 8px 16px rgba(221, 182, 147, 0.2));
            opacity: 0.9;
          }
          50% {
            filter: drop-shadow(0 12px 28px rgba(232, 169, 194, 0.35));
            opacity: 1;
          }
          100% {
            filter: drop-shadow(0 8px 16px rgba(221, 182, 147, 0.2));
            opacity: 0.9;
          }
        }

        @keyframes fgLogoGradientShift {
          0% {
            filter: drop-shadow(0 12px 28px rgba(221, 182, 147, 0.3)) brightness(1);
          }
          33% {
            filter: drop-shadow(0 12px 28px rgba(232, 169, 194, 0.4)) brightness(1.05);
          }
          66% {
            filter: drop-shadow(0 12px 28px rgba(239, 143, 184, 0.35)) brightness(1.02);
          }
          100% {
            filter: drop-shadow(0 12px 28px rgba(221, 182, 147, 0.3)) brightness(1);
          }
        }

        @keyframes fgLogoReveal {
          0% {
            clip-path: inset(0 100% 0 0);
            opacity: 0;
          }
          70% {
            opacity: 0.95;
          }
          100% {
            clip-path: inset(0 0% 0 0);
            opacity: 1;
          }
        }
      `}</style>

      <motion.img
        src={logoFaceglow}
        alt="FaceGlow"
        initial={{ opacity: 0, scale: 0.75, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          height: 100,
          objectFit: "contain",
          animation: "fgLogoReveal 1.2s cubic-bezier(0.65,0,0.35,1) 0.1s both, fgLogoGradientShift 4s ease-in-out infinite 0.5s",
        }}
      />
    </div>
  );
};

export default LoadingScreen;
