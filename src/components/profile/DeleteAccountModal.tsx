import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldAlert, Trash2, X } from "lucide-react";
import { deleteAccount, signOut } from "@/lib/auth";
import { invalidateAnalysisCache } from "@/lib/analysisClient";

const CONFIRM_WORD = "EXCLUIR";

const CONSEQUENCES = [
  "Toda a sua análise de pele e histórico serão removidos",
  "Sua rotina personalizada e produtos salvos serão apagados",
  "Créditos e assinatura ativa serão perdidos sem reembolso",
  "Não será possível recuperar seus dados após a exclusão",
];

const LOCAL_KEYS = [
  "faceglow-last-analysis",
  "faceglow-quiz-answers",
  "faceglow-quiz-completed",
  "faceglow-pending-analyze-image",
  "faceglow-pending-analyze-face-validation",
  "faceglow-pending-analyze-at",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DeleteAccountModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"warn" | "confirm">("warn");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleClose = () => {
    if (deleting) return;
    setStep("warn");
    setConfirmText("");
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);

    const result = await deleteAccount();
    if (!result.ok) {
      setError(result.error ?? "Não foi possível excluir a conta.");
      setDeleting(false);
      return;
    }

    invalidateAnalysisCache();
    LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(40,10,20,0.45)", backdropFilter: "blur(12px)" }}
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: "linear-gradient(180deg,#FDF8F6 0%,#FAFAF8 100%)",
              borderRadius: "28px 28px 0 0",
              border: "1px solid rgba(255,255,255,0.95)",
              borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(220,60,80,0.15), inset 0 1px 0 rgba(255,255,255,1)",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(200,100,120,0.2)" }} />
            </div>

            <div className="px-5 pb-safe-bottom pb-10 pt-2">
              <AnimatePresence mode="wait">
                {step === "warn" ? (
                  <motion.div
                    key="warn"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col items-center pt-4 pb-2 text-center">
                      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <ShieldAlert size={32} className="text-red-500" />
                      </div>
                      <h2 className="text-xl font-extrabold text-foreground">Ação irreversível</h2>
                      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                        Excluir sua conta apaga permanentemente todos os seus dados. Esta ação não pode ser desfeita.
                      </p>
                    </div>

                    <div
                      className="rounded-2xl p-4 space-y-3"
                      style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,210,220,0.6)" }}
                    >
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide">O que será removido:</p>
                      {CONSEQUENCES.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X size={10} className="text-red-600" strokeWidth={3} />
                          </div>
                          <p className="text-sm text-foreground leading-tight">{c}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                      <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Conforme a LGPD, você tem o direito de solicitar a exclusão dos seus dados pessoais. Sua solicitação será processada em até 15 dias úteis.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleClose}
                        className="flex-1 h-12 rounded-2xl border border-border/60 bg-background font-semibold text-sm text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setStep("confirm")}
                        className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 size={15} />
                        Continuar
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4 pt-2"
                  >
                    <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
                      <Trash2 size={28} className="text-red-500 mx-auto" />
                      <p className="text-sm font-bold text-red-800">Confirmação final</p>
                      <p className="text-xs text-red-700 leading-relaxed">
                        Para confirmar a exclusão, digite <strong>EXCLUIR</strong> no campo abaixo.
                      </p>
                    </div>

                    <div
                      className="rounded-2xl p-4 space-y-4"
                      style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,210,220,0.5)" }}
                    >
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Digite EXCLUIR"
                        autoCapitalize="characters"
                        className="w-full h-12 rounded-xl border border-border/70 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 uppercase tracking-widest font-bold text-center"
                      />

                      {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-700">{error}</p>
                        </div>
                      )}

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDelete}
                        disabled={!canDelete || deleting}
                        className="w-full h-12 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                      >
                        <Trash2 size={15} />
                        {deleting ? "Excluindo conta…" : "Excluir conta definitivamente"}
                      </motion.button>

                      <button
                        onClick={() => { setStep("warn"); setConfirmText(""); setError(null); }}
                        disabled={deleting}
                        className="w-full h-10 rounded-xl text-sm text-muted-foreground font-semibold disabled:opacity-40"
                      >
                        Voltar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
