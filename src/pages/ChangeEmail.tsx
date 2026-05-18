import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { getCurrentUser, updateEmail } from "@/lib/auth";

const ChangeEmail = () => {
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => { if (u?.email) setCurrentEmail(u.email); });
  }, []);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) && newEmail !== currentEmail;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const { error: err } = await updateEmail(newEmail);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--grad-aurora)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Alterar e-mail</h1>
      </div>

      <div className="flex-1 px-5 pb-8">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 rounded-3xl lg-surface text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Confirmação enviada!</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Enviamos um link de confirmação para <strong>{newEmail}</strong>. Clique no link para confirmar a troca.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Seu e-mail atual <strong>{currentEmail}</strong> permanece ativo até você confirmar o novo.
              </p>
            </div>
            <button
              onClick={() => navigate("/profile")}
              className="w-full h-12 rounded-2xl coral-button font-bold text-sm mt-2"
            >
              Voltar ao perfil
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 mt-4"
          >
            {/* Info card */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
              <Mail size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-800">Como funciona</p>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                  Você receberá um link de confirmação no novo e-mail. Seu e-mail atual continua ativo até a confirmação.
                </p>
              </div>
            </div>

            {/* E-mail atual */}
            <div className="lg-surface rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">E-mail atual</p>
                <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
                  <p className="text-sm text-foreground font-medium">{currentEmail || "Carregando…"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Novo e-mail</p>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  autoCapitalize="none"
                  className="w-full h-11 rounded-xl border border-border/70 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!valid || saving}
                className="w-full h-12 rounded-2xl coral-button font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Send size={15} />
                {saving ? "Enviando…" : "Enviar confirmação"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChangeEmail;
