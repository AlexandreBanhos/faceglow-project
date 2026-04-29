import { motion } from "framer-motion";

interface ServerErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const ServerErrorScreen = ({ message, onRetry }: ServerErrorProps) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Fundo com gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-red-500/5 to-transparent animate-pulse" />

      {/* Blob animado */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-blob" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
        {/* Ícone de erro */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center"
        >
          <span className="text-red-400 text-3xl">⚠️</span>
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-2xl font-bold text-center text-white"
        >
          Servidor Indisponível
        </motion.h1>

        {/* Mensagem */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-gray-400 text-sm leading-relaxed"
        >
          {message || "Não conseguimos conectar ao servidor. Verifique sua conexão e tente novamente."}
        </motion.p>

        {/* Botão de tentar novamente */}
        {onRetry && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={onRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-6 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg text-white font-semibold transition-all"
          >
            Tentar Novamente
          </motion.button>
        )}
      </div>
    </div>
  );
};
