import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, Check, X as XIcon } from "lucide-react";
import { sendPasswordReset, signInWithEmail, signInWithGoogle, signInWithApple, signUpWithEmail, updatePassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AuroraBackdrop, FGGradientText } from "@/components/shared";
import logoFaceglow from "@/assets/logo-faceglow.svg";

function getPasswordChecks(pwd: string) {
  return [
    { label: "Mínimo 8 caracteres",   ok: pwd.length >= 8 },
    { label: "Letra maiúscula (A-Z)", ok: /[A-Z]/.test(pwd) },
    { label: "Letra minúscula (a-z)", ok: /[a-z]/.test(pwd) },
    { label: "Número (0-9)",          ok: /\d/.test(pwd) },
    { label: "Caractere especial",    ok: /[^a-zA-Z0-9]/.test(pwd) },
  ];
}
function getPasswordStrength(score: number) {
  if (score <= 1) return { label: "fraca",      color: "#ef4444" };
  if (score <= 2) return { label: "média",      color: "#f59e0b" };
  if (score <= 3) return { label: "forte",      color: "#3b82f6" };
  return              { label: "muito forte", color: "#22c55e" };
}
function PasswordStrengthCard({ password }: { password: string }) {
  const checks   = getPasswordChecks(password);
  const score    = checks.filter((c) => c.ok).length;
  const strength = getPasswordStrength(score);
  return (
    <AnimatePresence>
      {password.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-border/40 bg-white/70 p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Força da senha</p>
                <span className="text-xs font-bold capitalize" style={{ color: strength.color }}>{strength.label}</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i <= score ? strength.color : "#e2e8f0" }} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: c.ok ? "#22c55e" : "#e2e8f0" }}>
                    {c.ok
                      ? <Check size={9} className="text-white" strokeWidth={3} />
                      : <XIcon size={8} className="text-slate-400" strokeWidth={3} />}
                  </div>
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PASSWORD_RESET_COOLDOWN_KEY = "faceglow-password-reset-next-at";
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

const getFriendlyAuthMessage = (error: unknown, fallback: string) => {
  const raw = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : fallback;

  const message = raw.toLowerCase();

  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Seu e-mail ainda nao foi confirmado. Verifique sua caixa de entrada.";
  }

  // Checar rate limit ANTES do check genérico de "email" — o Supabase retorna
  // "Email rate limit exceeded" no 429, que contém "email" e causaria falso positivo.
  if (
    message.includes("rate limit") ||
    message.includes("too many request") ||
    message.includes("for security purposes") ||
    message.includes("after 60 seconds") ||
    message.includes("after 1 hour") ||
    message.includes("over_email")
  ) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Este e-mail ja esta cadastrado. Tente entrar ou recuperar sua senha.";
  }

  if (message.includes("invalid email") || message.includes("email address")) {
    return "E-mail invalido. Revise o endereco digitado.";
  }

  if (message.includes("password") && message.includes("weak")) {
    return "Senha fraca. Use pelo menos 6 caracteres com letras e numeros.";
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("timeout") || message.includes("connection")) {
    return "Nao foi possivel conectar agora. Verifique sua internet e tente novamente.";
  }

  return fallback;
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const isConfirmedEmail = searchParams.get("confirmed") === "1";
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo;
  const [isRecoveryMode, setIsRecoveryMode] = useState(mode === "reset");
  const [isLogin, setIsLogin] = useState(mode === "login" && !redirectTo);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const hashType = useMemo(() => {
    if (!window.location.hash) {
      return "";
    }

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return params.get("type")?.toLowerCase() ?? "";
  }, []);

  useEffect(() => {
    const queryType = searchParams.get("type")?.toLowerCase() ?? "";
    const shouldRecover = mode === "reset" || queryType === "recovery" || hashType === "recovery";

    if (shouldRecover) {
      setIsRecoveryMode(true);
      setIsLogin(false);
    }
  }, [hashType, mode, searchParams]);

  useEffect(() => {
    if (!isConfirmedEmail) {
      return;
    }

    setIsLogin(true);
    setIsRecoveryMode(false);
    setErrorMessage(null);
    setSuccessMessage("E-mail confirmado com sucesso. Agora voce pode fazer login.");

    // Não remover o redirectTo aqui — handleSubmit vai usar e remover após login
  }, [isConfirmedEmail]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setIsLogin(false);
        setErrorMessage(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Scroll to top whenever switching to signup mode
  useEffect(() => {
    if (!isLogin && !isRecoveryMode) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isLogin, isRecoveryMode]);

  useEffect(() => {
    const readCooldown = () => {
      const raw = localStorage.getItem(PASSWORD_RESET_COOLDOWN_KEY);
      const nextAt = raw ? Number(raw) : 0;
      if (!nextAt || Number.isNaN(nextAt)) {
        setCooldownSeconds(0);
        return;
      }

      const remaining = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
      setCooldownSeconds(remaining);
    };

    readCooldown();
    const intervalId = window.setInterval(readCooldown, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const startPasswordResetCooldown = (seconds: number) => {
    const nextAt = Date.now() + seconds * 1000;
    localStorage.setItem(PASSWORD_RESET_COOLDOWN_KEY, String(nextAt));
    setCooldownSeconds(seconds);
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setErrorMessage(null);
    setSocialLoading(provider);
    try {
      const fn = provider === "google" ? signInWithGoogle : signInWithApple;
      const { error } = await fn();
      if (error) throw new Error(error.message);
      // Supabase redireciona para o provider — a página será substituída
    } catch (err) {
      setErrorMessage(getFriendlyAuthMessage(err, "Não foi possível iniciar o login social. Tente novamente."));
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailAlreadyExists(false);

    const email = form.email.trim();
    const password = form.password;
    const name = form.name.trim();

    if (isRecoveryMode) {
      if (!password || !confirmPassword) {
        setErrorMessage("Informe e confirme sua nova senha.");
        return;
      }

      if (password.length < 6) {
        setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("As senhas nao conferem.");
        return;
      }
    }

    if (!isRecoveryMode && (!email || !password || (!isLogin && !name))) {
      setErrorMessage("Preencha os campos obrigatorios para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRecoveryMode) {
        const { error } = await updatePassword(password);
        if (error) {
          throw new Error(error.message);
        }

        setSuccessMessage("Senha atualizada com sucesso. Faca login para continuar.");
        setIsLogin(true);
        setConfirmPassword("");
        setForm((current) => ({ ...current, password: "" }));
        return;
      }

      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          throw new Error(error.message);
        }

        // Verificar redirect_to: firstly from localStorage (post-email-confirmation), then from state
        const savedRedirectTo = localStorage.getItem("faceglow-auth-redirect-to");
        const finalRedirectTo = savedRedirectTo || redirectTo || "/dashboard";
        
        if (savedRedirectTo) {
          localStorage.removeItem("faceglow-auth-redirect-to");
        }

        navigate(finalRedirectTo, { replace: true });
      } else {
        const signupRedirectTo =
          (import.meta.env.VITE_SUPABASE_EMAIL_REDIRECT_URL as string | undefined)?.trim() ||
          `${window.location.origin}/email-confirmed`;

        // Guardar redirectTo no localStorage para recuperar após confirmação de email
        if (redirectTo) {
          localStorage.setItem("faceglow-auth-redirect-to", redirectTo);
        }

        const { error } = await signUpWithEmail(email, password, name, signupRedirectTo);
        if (error) {
          throw new Error(error.message);
        }

        navigate("/verify-email", {
          state: { email, redirectTo: redirectTo || "/analyze" },
          replace: true,
        });
        return;
      }
    } catch (error) {
      const message = getFriendlyAuthMessage(error, "Nao foi possivel autenticar agora. Tente novamente em instantes.");
      setErrorMessage(message);
      // E-mail já cadastrado — oferece recuperação de senha
      const isAlreadyRegistered =
        message.toLowerCase().includes("já está cadastrado") ||
        message.toLowerCase().includes("ja esta cadastrado") ||
        (error instanceof Error && (
          error.message.toLowerCase().includes("user already registered") ||
          error.message.toLowerCase().includes("already registered")
        ));
      if (!isLogin && isAlreadyRegistered) {
        setEmailAlreadyExists(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (cooldownSeconds > 0) {
      setErrorMessage(`Aguarde ${cooldownSeconds}s para tentar novamente.`);
      return;
    }

    const email = form.email.trim();
    if (!email) {
      setErrorMessage("Informe seu e-mail para receber o link de recuperacao.");
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth?mode=reset`;
      const { error } = await sendPasswordReset(email, redirectTo);
      if (error) {
        throw new Error(error.message);
      }

      startPasswordResetCooldown(PASSWORD_RESET_COOLDOWN_SECONDS);
      setSuccessMessage("Enviamos um link para recuperar sua senha. Verifique seu e-mail.");
    } catch (error) {
      const message = getFriendlyAuthMessage(error, "Nao foi possivel enviar o e-mail de recuperacao.");
      const normalized = message.toLowerCase();
      if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
        startPasswordResetCooldown(PASSWORD_RESET_COOLDOWN_SECONDS);
        setErrorMessage("Limite de envios atingido temporariamente. Aguarde 1 minuto e tente novamente.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex flex-col"
         style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" />

      <div className="relative z-10 px-6 pt-4 pb-8 flex flex-col">
        {/* Back Button */}
        <div className="relative mb-8 flex items-center justify-center min-h-10">
          <button
            onClick={() => navigate("/")}
            className="liquiglass-button w-10 h-10 rounded-xl flex items-center justify-center absolute left-0"
          >
            <ArrowLeft size={18} className="text-[var(--fg-ink)]" />
          </button>
          
          <img src={logoFaceglow} alt="FaceGlow" className="h-9 w-auto" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 max-w-md mx-auto w-full"
        >
          <h1 className="text-3xl font-bold text-[var(--fg-ink)] mb-2">
            {isRecoveryMode ? (
              <>Defina sua <FGGradientText>nova senha</FGGradientText></>
            ) : isLogin ? (
              <>Bem-vinda de <FGGradientText>volta</FGGradientText></>
            ) : (
              <>Criar sua <FGGradientText>conta</FGGradientText></>
            )}
          </h1>
          <p className="text-[var(--fg-ink-3)] mb-8 text-base">
            {isRecoveryMode
              ? "Digite uma nova senha para sua conta"
              : isLogin
              ? "Entre para continuar sua jornada de cuidados com a pele"
              : "Comece sua jornada personalizada de cuidados"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isRecoveryMode && (
              <div className="lg-surface px-4 py-3 rounded-2xl text-sm text-[var(--fg-ink-3)]">
                Após criar sua conta, confirme o e-mail para liberar o login.
              </div>
            )}

            {!isLogin && !isRecoveryMode && (
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-ink-3)]" />
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full py-3 pl-12 pr-4 lg-surface rounded-2xl text-[var(--fg-ink)] 
                           placeholder:text-[var(--fg-ink-4)] focus:outline-none transition"
                />
              </div>
            )}

            {!isRecoveryMode && (
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-ink-3)]" />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full py-3 pl-12 pr-4 lg-surface rounded-2xl text-[var(--fg-ink)] 
                           placeholder:text-[var(--fg-ink-4)] focus:outline-none transition"
                />
              </div>
            )}

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-ink-3)]" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full py-3 pl-12 pr-12 lg-surface rounded-2xl text-[var(--fg-ink)] 
                         placeholder:text-[var(--fg-ink-4)] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fg-ink-3)] hover:text-[var(--fg-ink)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {isRecoveryMode && <PasswordStrengthCard password={form.password} />}

            {isRecoveryMode && (
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-ink-3)]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-3 pl-12 pr-12 lg-surface rounded-2xl text-[var(--fg-ink)]
                           placeholder:text-[var(--fg-ink-4)] focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fg-ink-3)] hover:text-[var(--fg-ink)]"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {isLogin && !isRecoveryMode && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSubmitting || cooldownSeconds > 0}
                className="text-sm text-[var(--fg-ink-2)] font-semibold hover:text-[var(--fg-ink)] 
                         disabled:opacity-50 transition"
              >
                {cooldownSeconds > 0 ? `Tente novamente em ${cooldownSeconds}s` : "Esqueceu a senha?"}
              </button>
            )}

            {successMessage && (
              <div className="lg-surface px-4 py-3 rounded-2xl flex items-start gap-3 border border-green-200/50">
                <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--fg-ink)] font-medium leading-relaxed">{successMessage}</p>
              </div>
            )}

            {errorMessage && (
              <div className="lg-surface px-4 py-3 rounded-2xl flex flex-col gap-2 border border-red-200/50">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-semibold leading-relaxed">{errorMessage}</p>
                </div>
                {emailAlreadyExists && (
                  <div className="flex gap-2 pl-7 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setEmailAlreadyExists(false); setErrorMessage(null); }}
                      className="text-xs font-bold text-primary underline bg-transparent border-none cursor-pointer"
                    >
                      Fazer login com este e-mail
                    </button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailAlreadyExists(false);
                        setErrorMessage(null);
                        setIsLogin(true);
                        void handleForgotPassword();
                      }}
                      className="text-xs font-bold text-primary underline bg-transparent border-none cursor-pointer"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="coral-button w-full py-3 rounded-2xl font-bold text-base mt-6 
                       disabled:opacity-60 transition"
            >
              {isSubmitting ? "Aguarde..." : isRecoveryMode ? "Atualizar senha" : isLogin ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          {/* Social login — Google e Apple */}
          {!isRecoveryMode && (
            <div className="mt-6 space-y-3">
              {/* Divisor */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--glass-border)" }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--fg-ink-3)" }}>ou continue com</span>
                <div className="flex-1 h-px" style={{ background: "var(--glass-border)" }} />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => void handleSocialSignIn("google")}
                  disabled={!!socialLoading}
                  className="flex-1 flex items-center justify-center gap-2.5 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.09)", color: "var(--fg-ink-2)", backdropFilter: "blur(8px)" }}
                >
                  {socialLoading === "google" ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Google
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={() => void handleSocialSignIn("apple")}
                  disabled={!!socialLoading}
                  className="flex-1 flex items-center justify-center gap-2.5 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.09)", color: "var(--fg-ink-2)", backdropFilter: "blur(8px)" }}
                >
                  {socialLoading === "apple" ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  )}
                  Apple
                </button>
              </div>
            </div>
          )}

          {!isRecoveryMode && (
            <p className="text-center text-[var(--fg-ink-3)] mt-6 text-sm">
              {isLogin ? "Não tem conta? " : "Já tem uma conta? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[var(--fg-ink-2)] font-bold hover:text-[var(--fg-ink)] transition"
              >
                {isLogin ? "Cadastre-se" : "Entre"}
              </button>
            </p>
          )}

          {!isLogin && !isRecoveryMode && (
            <p className="text-center text-[var(--fg-ink-3)] mt-4 text-xs leading-relaxed">
              Ao criar sua conta, você concorda com nossos{" "}
              <a href="/termos" className="underline hover:text-[var(--fg-ink-2)] transition">Termos de Uso</a>
              {" "}e nossa{" "}
              <a href="/privacidade" className="underline hover:text-[var(--fg-ink-2)] transition">Política de Privacidade</a>.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
