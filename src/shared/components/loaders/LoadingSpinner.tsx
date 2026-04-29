import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
}

export const LoadingSpinner = ({ size = "medium", message = "Carregando..." }: LoadingSpinnerProps) => {
  const sizeMap = {
    small: { ring: 32, dot: 12 },
    medium: { ring: 64, dot: 20 },
    large: { ring: 96, dot: 28 },
  };

  const { ring, dot } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Outer rotating ring - Representa o ciclo de tratamento */}
      <motion.div
        className="relative"
        style={{ width: ring, height: ring }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary shadow-glow"
          style={{ width: ring, height: ring }}
        />
      </motion.div>

      {/* Inner pulsing circle - Representa o resultado da análise */}
      <motion.div
        className="absolute rounded-full bg-gradient-to-r from-primary to-secondary"
        style={{ width: dot, height: dot }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Loading text */}
      {message && (
        <motion.p
          className="text-sm font-semibold text-muted-foreground mt-4"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {message}
          <motion.span
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            .
          </motion.span>
        </motion.p>
      )}

      {/* Floating skincare icons */}
      <div className="flex gap-3 mt-4">
        {["?", "??", "??"].map((icon, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-xl"
          >
            {icon}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSpinner;
