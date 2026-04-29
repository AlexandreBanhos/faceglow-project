import { motion } from "framer-motion";
import { LoadingSpinner } from "./LoadingSpinner";

interface PageLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  spinnerMessage?: string;
}

export const PageLoading = ({ isLoading, children, spinnerMessage = "Preparando sua experiência..." }: PageLoadingProps) => {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-8"
        >
          <LoadingSpinner size="large" message={spinnerMessage} />
          
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-muted-foreground text-center max-w-xs"
          >
            Verificando credenciais de pagamento seguras...
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PageLoading;
