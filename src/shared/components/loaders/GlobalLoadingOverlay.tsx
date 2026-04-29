import { motion, AnimatePresence } from "framer-motion";
import { useLoadingStore } from "@/shared/hooks";
import { LoadingSpinner } from "./LoadingSpinner";

/**
 * Componente Global de Loading
 * Deve ser adicionado ao App.tsx para funcionar em toda a aplica��o
 * 
 * Uso: <GlobalLoadingOverlay />
 */
export const GlobalLoadingOverlay = () => {
  const { isLoading, message } = useLoadingStore();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <LoadingSpinner size="large" message={message} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingOverlay;
