import { motion } from "framer-motion";
import logoFaceglow from "@/assets/logo-faceglow.svg";

export const LoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-coral via-pink to-lavender flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Fundo com gradiente animado - overlay claro */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 animate-pulse" />
      
      {/* Blobs animados de fundo - cores claras */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-blob animation-delay-4000" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo com animação de entrada */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <img 
            src={logoFaceglow} 
            alt="FaceGlow" 
            className="h-40 object-contain"
          />
        </motion.div>

        {/* Texto de loading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <p className="text-white/80 text-sm tracking-wide font-medium">
            Preparando sua análise...
          </p>
        </motion.div>

        {/* Loader animado - 3 dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex gap-3 mt-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 rounded-full bg-white/70"
            />
          ))}
        </motion.div>

        {/* Barra de progresso com gradiente */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-64 h-1 bg-white/20 rounded-full overflow-hidden mt-8"
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent"
          />
        </motion.div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </motion.div>
  );
};
