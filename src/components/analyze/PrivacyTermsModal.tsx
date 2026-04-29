import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";

type PrivacyTermsModalProps = {
  onAccept: () => void;
};

const PrivacyTermsModal = ({ onAccept }: PrivacyTermsModalProps) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canProceed = termsAccepted && privacyAccepted;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-white/20 max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-b from-slate-800 to-transparent p-6 border-b border-white/10">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <AlertCircle size={24} className="text-pink-400" />
              Antes de Começar
            </h2>
            <p className="text-xs text-white/60 mt-2">Leia e aceite os termos abaixo</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Privacy Section */}
            <div className="rounded-2xl border border-pink-400/30 bg-gradient-to-r from-pink-500/20 to-rose-500/10 backdrop-blur-xl p-5">
              <h3 className="text-xs font-bold text-pink-300 mb-2 uppercase tracking-wide">
                Nosso Compromisso com a Privacidade
              </h3>
              <div className="space-y-2 text-xs text-white/90 leading-relaxed">
                <p>
                  Mínimo <strong>16 anos</strong>. Imagens usadas apenas para análise e <strong>excluídas logo após</strong>.
                </p>
                <p>
                  Serviço oferecido pela <strong>Soora</strong>. Caráter informativo, não substitui profissional.
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <motion.label
                whileHover={{ scale: 1.01 }}
                className="flex items-start gap-2 p-3 rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 ${
                    privacyAccepted
                      ? "bg-gradient-to-br from-pink-400 to-rose-500 border-pink-400"
                      : "border-white/30 bg-transparent"
                  }`}
                >
                  {privacyAccepted && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-white/90">
                  Concordo com a <strong>Política de Privacidade</strong>
                </span>
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="hidden"
                />
              </motion.label>

              <motion.label
                whileHover={{ scale: 1.01 }}
                className="flex items-start gap-2 p-3 rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5 ${
                    termsAccepted
                      ? "bg-gradient-to-br from-pink-400 to-rose-500 border-pink-400"
                      : "border-white/30 bg-transparent"
                  }`}
                >
                  {termsAccepted && <Check size={12} className="text-white" />}
                </div>
                <span className="text-xs text-white/90">
                  Aceito os <strong>Termos e Condições</strong>
                </span>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="hidden"
                />
              </motion.label>
            </div>

            {/* Info Text */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
              <p className="text-[11px] text-white/60 leading-relaxed">
                Clicar em "Continuar" = confirmação de 16+ anos e aceito dos termos.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gradient-to-t from-slate-800 via-slate-800 to-transparent p-6 border-t border-white/10 flex gap-3">
            <motion.button
              whileHover={{ scale: canProceed ? 1.02 : 1 }}
              whileTap={{ scale: canProceed ? 0.98 : 1 }}
              onClick={onAccept}
              disabled={!canProceed}
              className={`flex-1 py-4 rounded-xl font-bold text-base transition-all ${
                canProceed
                  ? "bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-[0_15px_40px_rgba(244,114,182,0.3)] cursor-pointer"
                  : "bg-white/10 text-white/50 cursor-not-allowed"
              }`}
            >
              Continuar
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PrivacyTermsModal;
