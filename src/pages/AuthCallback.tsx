import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import logoFaceglow from "@/assets/logos/logo-faceglow-escrito-escura.webp";

/**
 * Página de retorno do OAuth (Google / Apple).
 * Supabase com detectSessionInUrl:true processa o hash/query automaticamente.
 * Esta página apenas aguarda a sessão ser estabelecida e redireciona.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      navigate("/auth", { replace: true });
      return;
    }

    // Verifica se sessão já existe (detectSessionInUrl já processou o hash)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/dashboard", { replace: true });
      }
    });

    // Escuta evento de login (caso chegue depois do getSession)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard", { replace: true });
      } else if (event === "SIGNED_OUT") {
        navigate("/auth", { replace: true });
      }
    });

    // Timeout de segurança — se após 12s não houver sessão, mostra erro
    const timeout = setTimeout(() => {
      setError("Não foi possível completar o login. Tente novamente.");
    }, 12000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6"
        style={{ background: "var(--grad-aurora)" }}>
        <img src={logoFaceglow} alt="FaceGlow" className="h-7 opacity-80" />
        <p className="text-sm text-[var(--fg-ink-2)] font-medium text-center max-w-xs">{error}</p>
        <button
          onClick={() => navigate("/auth")}
          className="coral-button px-6 py-3 rounded-2xl font-bold text-sm"
        >
          Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: "var(--grad-aurora)" }}>
      <img src={logoFaceglow} alt="FaceGlow" className="h-7 opacity-80" />
      <motion.div
        className="flex gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--grad-coral)" }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
      <p className="text-xs text-[var(--fg-ink-3)] font-medium">Finalizando login…</p>
    </div>
  );
};

export default AuthCallback;
