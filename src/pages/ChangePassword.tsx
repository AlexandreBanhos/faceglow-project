import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, Save, Check, X } from "lucide-react";
import { getCurrentUser, signInWithEmail, updatePassword } from "@/lib/auth";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";

// ── Requisitos de senha ───────────────────────────────────────────────────────

interface PasswordCheck {
  label: string;
  ok: boolean;
}

function getChecks(pwd: string): PasswordCheck[] {
  return [
    { label: "Mínimo 8 caracteres",    ok: pwd.length >= 8 },
    { label: "Letra maiúscula (A-Z)",  ok: /[A-Z]/.test(pwd) },
    { label: "Letra minúscula (a-z)",  ok: /[a-z]/.test(pwd) },
    { label: "Número (0-9)",           ok: /\d/.test(pwd) },
    { label: "Caractere especial",     ok: /[^a-zA-Z0-9]/.test(pwd) },
  ];
}

type Strength = "fraca" | "média" | "forte" | "muito forte";

function getStrength(checks: PasswordCheck[]): { level: Strength; score: number; color: string } {
  const score = checks.filter(c => c.ok).length;
  if (score <= 1) return { level: "fraca",      score, color: "#ef4444" };
  if (score <= 2) return { level: "média",      score, color: "#f59e0b" };
  if (score <= 3) return { level: "forte",      score, color: "#3b82f6" };
  return              { level: "muito forte", score, color: "#22c55e" };
}

function StrengthCard({ password }: { password: string }) {
  const checks   = getChecks(password);
  const strength = getStrength(checks);

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
            {/* Barra de força */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Força da senha</p>
                <span className="text-xs font-bold capitalize" style={{ color: strength.color }}>
                  {strength.level}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i <= strength.score ? strength.color : "#e2e8f0" }}
                  />
                ))}
              </div>
            </div>

            {/* Requisitos */}
            <div className="grid grid-cols-1 gap-1.5">
              {checks.map(c => (
                <div key={c.label} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: c.ok ? "#22c55e" : "#e2e8f0" }}
                  >
                    {c.ok
                      ? <Check size={9} className="text-white" strokeWidth={3} />
                      : <X size={8} className="text-slate-400" strokeWidth={3} />}
                  </div>
                  <span className={`text-xs transition-colors ${c.ok ? "text-slate-700 font-medium" : "text-muted-foreground"}`}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const ChangePassword = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrent, setShowCurrent]         = useState(false);
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [message, setMessage]                 = useState<string | null>(null);
  const [success, setSuccess]                 = useState(false);
  const [userEmail, setUserEmail]             = useState("");

  useEffect(() => {
    getCurrentUser().then((user) => { if (user?.email) setUserEmail(user.email); }).catch(() => {});
  }, []);

  const checks   = getChecks(password);
  const strength = getStrength(checks);
  const meetsMin = checks[0].ok; // >= 8 chars

  const handleSavePassword = async () => {
    setMessage(null);

    if (!currentPassword.trim()) { setMessage("Informe a senha atual."); return; }
    if (!password.trim())        { setMessage("Defina a nova senha."); return; }
    if (!meetsMin)               { setMessage("A senha deve ter pelo menos 8 caracteres."); return; }
    if (password !== confirmPassword) { setMessage("As senhas não conferem."); return; }

    setIsSaving(true);
    try {
      const { error: signInError } = await signInWithEmail(userEmail, currentPassword.trim());
      if (signInError) { setMessage("Senha atual incorreta."); return; }

      const result = await updatePassword(password.trim());
      if (result.error) throw new Error(result.error.message);

      setCurrentPassword(""); setPassword(""); setConfirmPassword("");
      setSuccess(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a senha.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) return <LoadingSpinnerFullScreen message="Atualizando sua senha..." />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--grad-aurora)" }}>
      <div className="flex items-center gap-3 px-4 pt-safe pt-6 pb-4">
        <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Alterar senha</h1>
      </div>

      <div className="flex-1 px-5 pb-8">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 rounded-3xl lg-surface text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Check size={32} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Senha atualizada!</p>
              <p className="text-sm text-muted-foreground mt-1">Sua senha foi alterada com sucesso.</p>
            </div>
            <button onClick={() => navigate("/profile")} className="w-full h-12 rounded-2xl coral-button font-bold text-sm">
              Voltar ao perfil
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4">

            <div className="lg-surface rounded-2xl p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Defina uma nova senha segura para sua conta.</p>

              {/* Senha atual */}
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Senha atual"
                  aria-label="Senha atual"
                  className="w-full h-12 rounded-xl border border-border/70 bg-background pl-10 pr-11 text-sm text-foreground"
                />
                <button type="button" aria-label={showCurrent ? "Esconder senha atual" : "Mostrar senha atual"}
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="h-px bg-border/30" />

              {/* Nova senha */}
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nova senha"
                  aria-label="Nova senha"
                  className="w-full h-12 rounded-xl border border-border/70 bg-background pl-10 pr-11 text-sm text-foreground"
                />
                <button type="button" aria-label={showPassword ? "Esconder nova senha" : "Mostrar nova senha"}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Card de força */}
              <StrengthCard password={password} />

              {/* Confirmar */}
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                  aria-label="Confirmar nova senha"
                  className={`w-full h-12 rounded-xl border bg-background pl-10 pr-11 text-sm text-foreground ${
                    confirmPassword && confirmPassword !== password
                      ? "border-red-300 focus:border-red-400"
                      : "border-border/70"
                  }`}
                />
                <button type="button" aria-label={showConfirm ? "Esconder confirmação de senha" : "Mostrar confirmação de senha"}
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 mt-1 ml-1">As senhas não conferem</p>
                )}
              </div>

              {/* Indicador de força na barra lateral */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex gap-0.5 flex-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: i <= getStrength(getChecks(password)).score ? getStrength(getChecks(password)).color : "#e2e8f0" }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold capitalize" style={{ color: strength.color, minWidth: 56 }}>
                    {strength.level}
                  </span>
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                  <X size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{message}</p>
                </div>
              )}

              <button
                onClick={handleSavePassword}
                disabled={!meetsMin || password !== confirmPassword || !currentPassword}
                className="w-full h-12 rounded-2xl coral-button font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Save size={15} />
                Salvar nova senha
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
