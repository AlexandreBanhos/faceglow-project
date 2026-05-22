import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Mail, Hash, Send } from "lucide-react";
import { resendConfirmationEmail } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import logoFaceglow from "@/assets/logo-faceglow.svg";

const RESEND_COOLDOWN_KEY = "faceglow-verify-resend-next-at";
const OTP_COOLDOWN_KEY = "faceglow-verify-otp-next-at";
const COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; redirectTo?: string } | null;
  const email = state?.email ?? "";
  const redirectTo = state?.redirectTo ?? "/analyze";

  const [isSending, setIsSending] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [cooldownSeconds, setCooldownSeconds] = useState(() => {
    const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
    const nextAt = raw ? Number(raw) : 0;
    return Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
  });
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(() => {
    const raw = localStorage.getItem(OTP_COOLDOWN_KEY);
    const nextAt = raw ? Number(raw) : 0;
    return Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = window.setInterval(() => {
      const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
      const remaining = Math.max(0, Math.ceil(((raw ? Number(raw) : 0) - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (otpCooldownSeconds <= 0) return;
    const interval = window.setInterval(() => {
      const raw = localStorage.getItem(OTP_COOLDOWN_KEY);
      const remaining = Math.max(0, Math.ceil(((raw ? Number(raw) : 0) - Date.now()) / 1000));
      setOtpCooldownSeconds(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldownSeconds]);

  const startCooldown = (key: string, setter: (n: number) => void) => {
    const nextAt = Date.now() + COOLDOWN_SECONDS * 1000;
    localStorage.setItem(key, String(nextAt));
    setter(COOLDOWN_SECONDS);
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || !email) return;
    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (redirectTo) localStorage.setItem("faceglow-auth-redirect-to", redirectTo);
      const emailRedirectTo =
        (import.meta.env.VITE_SUPABASE_EMAIL_REDIRECT_URL as string | undefined)?.trim() ||
        `${window.location.origin}/email-confirmed`;
      const { error } = await resendConfirmationEmail(email, emailRedirectTo);
      if (error) throw new Error(error.message);
      startCooldown(RESEND_COOLDOWN_KEY, setCooldownSeconds);
      setSuccessMessage("E-mail de confirmação reenviado! Verifique também a pasta de spam.");
    } catch {
      setErrorMessage("Não foi possível reenviar. Tente novamente em instantes.");
    } finally {
      setIsSending(false);
    }
  };

  // Envia um código OTP de 6 dígitos via signInWithOtp (diferente do link de confirmação)
  const handleSendOtp = async () => {
    if (otpCooldownSeconds > 0 || !email || !supabase) return;
    setIsSendingOtp(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw new Error(error.message);
      startCooldown(OTP_COOLDOWN_KEY, setOtpCooldownSeconds);
      setOtpSent(true);
      setSuccessMessage("Código de 6 dígitos enviado! Verifique sua caixa de entrada.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many")) {
        setErrorMessage("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        setErrorMessage("Não foi possível enviar o código. Use o link de confirmação do e-mail.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = otp.join("");
    if (code.length < 6 || !email || !supabase) return;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      // Tenta verificar como OTP de magic link (enviado via signInWithOtp)
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (!error) {
        navigate(redirectTo || "/analyze", { replace: true });
        return;
      }
      // Fallback: tenta tipo signup (caso Supabase esteja configurado para OTP de signup)
      const { error: error2 } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
      if (!error2) {
        navigate(redirectTo || "/analyze", { replace: true });
        return;
      }
      throw new Error(error2.message || error.message);
    } catch {
      setErrorMessage("Código inválido ou expirado. Solicite um novo código e tente novamente.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const codeComplete = otp.every(d => d !== "");

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={() => navigate("/auth")}
          className="w-10 h-10 rounded-2xl glass flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <img src={logoFaceglow} alt="FaceGlow" className="h-7 w-auto" />
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col px-6 py-6">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto"
          style={{ background: "linear-gradient(135deg, rgba(232,116,138,0.12) 0%, rgba(244,168,199,0.12) 100%)", border: "2px solid rgba(232,116,138,0.2)" }}
        >
          <Mail size={36} style={{ color: "#E8748A" }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h1 className="text-2xl font-extrabold text-foreground mb-3 text-center">
            Verifique seu e-mail
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-1 text-center">
            Enviamos um link de confirmação para
          </p>
          {email && (
            <p className="text-foreground font-bold text-base mb-4 break-all text-center">{email}</p>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed text-center mb-2">
            Clique no link do e-mail para ativar sua conta e continuar.
          </p>

          {/* Spam notice */}
          <div className="rounded-2xl px-4 py-3 mb-6 flex items-start gap-2.5"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: "#92400e" }}>
              Não encontrou o e-mail? Verifique também a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
            </p>
          </div>
        </motion.div>

        {/* Feedback messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-start gap-3 mb-4">
              <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground font-medium leading-relaxed">{successMessage}</p>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 flex items-start gap-3 mb-4">
              <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-semibold leading-relaxed">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code entry section */}
        <AnimatePresence>
          {showCodeEntry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl p-4" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <Hash size={14} /> Código de 6 dígitos
                </p>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Clique em <strong>"Enviar código"</strong> para receber um código numérico por e-mail, depois insira abaixo.
                </p>

                {/* Send OTP button */}
                <button
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || otpCooldownSeconds > 0 || !email}
                  className="w-full mb-4 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    height: 40,
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {isSendingOtp ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {isSendingOtp
                    ? "Enviando..."
                    : otpCooldownSeconds > 0
                    ? `Reenviar em ${otpCooldownSeconds}s`
                    : otpSent
                    ? "Reenviar código"
                    : "Enviar código"}
                </button>

                {/* OTP inputs */}
                <div className="flex gap-2 justify-center mb-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="text-center font-extrabold text-xl focus:outline-none transition-all"
                      style={{
                        width: 44,
                        height: 52,
                        borderRadius: 12,
                        border: digit ? "2px solid #E8748A" : "2px solid rgba(0,0,0,0.1)",
                        background: digit ? "rgba(232,116,138,0.06)" : "rgba(255,255,255,0.8)",
                        color: "#1A1A1A",
                      }}
                    />
                  ))}
                </div>

                {/* Verify button */}
                <button
                  onClick={handleVerifyCode}
                  disabled={!codeComplete || isVerifying || !otpSent}
                  className="w-full font-bold text-white flex items-center justify-center gap-2"
                  style={{
                    height: 46,
                    borderRadius: 12,
                    background: (codeComplete && otpSent) ? "linear-gradient(135deg,#E8748A 0%,#F4A8C7 100%)" : "#D1D5DB",
                    border: "none",
                    cursor: (codeComplete && otpSent) ? "pointer" : "not-allowed",
                    fontSize: 15,
                    transition: "background 200ms",
                  }}
                >
                  {isVerifying ? <RefreshCw size={16} className="animate-spin" /> : "Confirmar conta"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 mt-auto">
          <button
            onClick={handleResend}
            disabled={isSending || cooldownSeconds > 0 || !email}
            className="w-full py-3.5 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isSending ? "animate-spin" : ""} />
            {isSending ? "Reenviando..." : cooldownSeconds > 0 ? `Reenviar link em ${cooldownSeconds}s` : "Reenviar link de confirmação"}
          </button>

          <button
            onClick={() => { setShowCodeEntry(v => !v); setErrorMessage(null); setSuccessMessage(null); }}
            className="w-full py-3.5 rounded-2xl glass text-muted-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Hash size={15} />
            {showCodeEntry ? "Ocultar opção de código" : "Confirmar com código numérico"}
          </button>

          <button
            onClick={() => navigate("/auth?mode=login")}
            className="w-full py-3.5 rounded-2xl glass text-muted-foreground font-semibold text-sm"
          >
            Já confirmei — fazer login
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
