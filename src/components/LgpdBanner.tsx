import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "faceglow-lgpd-consent-v1";

export function LgpdBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Aviso de privacidade e cookies"
          aria-live="polite"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-0 pointer-events-none"
        >
          <div className="max-w-lg mx-auto pointer-events-auto rounded-2xl shadow-2xl border border-border/40 bg-white/95 backdrop-blur-md px-5 py-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed">
                Usamos armazenamento local para manter sua sessão e preferências.
                Não utilizamos cookies de rastreamento. Ao continuar, você concorda com nossa{" "}
                <Link to="/privacidade" className="font-semibold underline underline-offset-2 text-primary">
                  Política de Privacidade
                </Link>{" "}
                e{" "}
                <Link to="/termos" className="font-semibold underline underline-offset-2 text-primary">
                  Termos de Uso
                </Link>
                .
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Link
                to="/privacidade"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground border border-border/60 hover:bg-muted/40 transition-colors"
              >
                Saiba mais
              </Link>
              <button
                onClick={accept}
                className="px-5 py-2 rounded-xl text-xs font-bold coral-button"
              >
                Entendi e aceito
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
