import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { resendConfirmationEmail } from "@/lib/auth";
import logoFaceglow from "@/assets/logo-faceglow.svg";

const RESEND_COOLDOWN_KEY = "faceglow-verify-resend-next-at";
const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; redirectTo?: string } | null;
  const email = state?.email ?? "";
  const redirectTo = state?.redirectTo ?? "/analyze";

  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(() => {
    const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
    const nextAt = raw ? Number(raw) : 0;
    return Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = window.setInterval(() => {
      const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
      const nextAt = raw ? Number(raw) : 0;
      const remaining = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const startCooldown = () => {
    const nextAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    localStorage.setItem(RESEND_COOLDOWN_KEY, String(nextAt));
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || !email) return;
    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (redirectTo) {
        localStorage.setItem("faceglow-auth-redirect-to", redirectTo);
      }
      const emailRedirectTo =
        (import.meta.env.VITE_SUPABASE_EMAIL_REDIRECT_URL as string | undefined)?.trim() ||
        `${window.location.origin}/email-confirmed`;
      const { error } = await resendConfirmationEmail(email, emailRedirectTo);
      if (error) throw new Error(error.message);
      startCooldown();
      setSuccessMessage("E-mail reenviado! Verifique sua caixa de entrada.");
    } catch {
      setErrorMessage("Não foi possível reenviar. Tente novamente em instantes.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-4 pb-8 flex flex-col">
      <div className="relative mb-8 flex items-center justify-center min-h-10">
        <button
          onClick={() => navigate("/auth")}
          className="w-10 h-10 rounded-2xl glass flex items-center justify-center absolute left-0"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <img src={logoFaceglow} alt="FaceGlow" className="h-8 w-auto" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <Mail size={36} className="text-primary" />
        </motion.div>

        <h1 className="text-2xl font-extrabold text-foreground mb-3">
          Verifique seu e-mail
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed mb-2 max-w-xs">
          Enviamos um link de confirmação para
        </p>
        {email && (
          <p className="text-foreground font-bold text-base mb-6 break-all">{email}</p>
        )}
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-8">
          Clique no link do e-mail para ativar sua conta e continuar sua análise de pele.
        </p>

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-start gap-3 mb-4"
          >
            <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground font-medium leading-relaxed">{successMessage}</p>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 flex items-start gap-3 mb-4"
          >
            <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-semibold leading-relaxed">{errorMessage}</p>
          </motion.div>
        )}

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={handleResend}
            disabled={isSending || cooldownSeconds > 0 || !email}
            className="w-full py-3.5 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isSending ? "animate-spin" : ""} />
            {isSending
              ? "Reenviando..."
              : cooldownSeconds > 0
              ? `Reenviar em ${cooldownSeconds}s`
              : "Reenviar e-mail"}
          </button>

          <button
            onClick={() => navigate("/auth?mode=login")}
            className="w-full py-3.5 rounded-2xl glass text-muted-foreground font-semibold text-sm"
          >
            Já confirmei — fazer login
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-8 max-w-xs">
          Não encontrou o e-mail? Verifique a pasta de spam ou lixo eletrônico.
        </p>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
