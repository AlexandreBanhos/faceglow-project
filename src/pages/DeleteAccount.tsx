import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Trash2, ShieldAlert, X } from "lucide-react";
import { deactivateAccount, signOut } from "@/lib/auth";
import { invalidateAnalysisCache } from "@/lib/analysisClient";

const CONFIRM_WORD = "EXCLUIR";

const CONSEQUENCES = [
  "Toda a sua análise de pele e histórico serão removidos",
  "Sua rotina personalizada e produtos salvos serão apagados",
  "Créditos e assinatura ativa serão perdidos sem reembolso",
  "Não será possível recuperar seus dados após a exclusão",
];

const DeleteAccount = () => {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"warn" | "confirm">("warn");

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);

    const result = await deactivateAccount();
    if (!result.ok) {
      setError(result.error ?? "Não foi possível excluir a conta.");
      setDeleting(false);
      return;
    }

    // Limpa tudo e desloga
    invalidateAnalysisCache();
    [
      "faceglow-last-analysis",
      "faceglow-quiz-answers",
      "faceglow-quiz-completed",
      "faceglow-pending-analyze-image",
      "faceglow-pending-analyze-face-validation",
      "faceglow-pending-analyze-at",
    ].forEach((k) => localStorage.removeItem(k));

    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--grad-aurora)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Excluir Conta</h1>
      </div>

      <div className="flex-1 px-5 pb-10">
        {step === "warn" ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mt-4">

            {/* Warning icon */}
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <ShieldAlert size={38} className="text-red-500" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground">Ação irreversível</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                Excluir sua conta apaga permanentemente todos os seus dados do FaceGlow. Esta ação não pode ser desfeita.
              </p>
            </div>

            {/* Consequências */}
            <div className="lg-surface rounded-2xl p-4 space-y-3">
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

            {/* LGPD note */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Conforme a LGPD, você tem o direito de solicitar a exclusão dos seus dados pessoais. Sua solicitação será processada em até 15 dias úteis.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mt-4">

            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
              <Trash2 size={28} className="text-red-500 mx-auto" />
              <p className="text-sm font-bold text-red-800">Confirmação final</p>
              <p className="text-xs text-red-700 leading-relaxed">
                Para confirmar a exclusão, digite <strong>EXCLUIR</strong> no campo abaixo.
              </p>
            </div>

            <div className="lg-surface rounded-2xl p-4 space-y-4">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="w-full h-12 rounded-xl border border-border/70 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 uppercase tracking-widest font-bold text-center"
              />

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="w-full h-12 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform"
              >
                <Trash2 size={15} />
                {deleting ? "Excluindo conta…" : "Excluir conta definitivamente"}
              </button>

              <button
                onClick={() => setStep("warn")}
                className="w-full h-10 rounded-xl text-sm text-muted-foreground font-semibold"
              >
                Voltar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DeleteAccount;
