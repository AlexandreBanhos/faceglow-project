import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, Save } from "lucide-react";
import { getCurrentUser, signInWithEmail, updatePassword } from "@/lib/auth";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const handleSavePassword = async () => {
    setMessage(null);

    if (!currentPassword.trim()) {
      setMessage("Informe a senha atual.");
      return;
    }

    const trimmed = password.trim();
    if (!trimmed || !confirmPassword.trim()) {
      setMessage("Preencha e confirme a nova senha.");
      return;
    }

    if (trimmed.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (trimmed !== confirmPassword.trim()) {
      setMessage("A confirmacao de senha nao confere.");
      return;
    }

    setIsSaving(true);
    try {
      // Verify current password
      const { error: signInError } = await signInWithEmail(userEmail, currentPassword.trim());
      if (signInError) {
        setMessage("Senha atual incorreta.");
        setIsSaving(false);
        return;
      }

      const result = await updatePassword(trimmed);
      if (result.error) {
        throw new Error(result.error.message);
      }

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setMessage("Senha atualizada com sucesso.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Nao foi possivel atualizar a senha.";
      setMessage(text);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return <LoadingSpinnerFullScreen message="Atualizando sua senha..." />;
  }

  return (
    <div className="min-h-screen px-6 pt-4 pb-8 flex flex-col" style={{
      background: "linear-gradient(135deg, rgba(252, 231, 243, 0.6) 0%, rgba(254, 243, 199, 0.5) 50%, rgba(219, 234, 254, 0.5) 100%)",
      backgroundAttachment: "fixed"
    }}>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-2xl liquiglass-button flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Alterar Senha</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 space-y-3"
      >
        <p className="text-sm text-muted-foreground">
          Defina uma nova senha para sua conta.
        </p>

        <div className="relative">
          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Senha atual"
            className="w-full h-11 rounded-xl border border-border/70 bg-background pl-10 pr-11 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((previous) => !previous)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <div className="border-t border-border/40 pt-1" />

        <div className="relative">
          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nova senha"
            className="w-full h-11 rounded-xl border border-border/70 bg-background pl-10 pr-11 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        <div className="relative">
          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirmar nova senha"
            className="w-full h-11 rounded-xl border border-border/70 bg-background pl-10 pr-11 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((previous) => !previous)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {message && <p className="text-xs font-semibold text-muted-foreground">{message}</p>}

        <button
          onClick={handleSavePassword}
          className="w-full h-11 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
        >
          <Save size={14} />
          Salvar nova senha
        </button>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
