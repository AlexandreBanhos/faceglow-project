import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import logoFaceglow from "@/assets/logo-faceglow.svg";

const AUTO_REDIRECT_DELAY_MS = 3000;

const getRedirectTarget = () => {
  const saved = localStorage.getItem("faceglow-auth-redirect-to");
  if (saved) {
    localStorage.removeItem("faceglow-auth-redirect-to");
    return saved;
  }
  return "/analyze";
};

const EmailConfirmed = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "confirmed" | "manual">("checking");
  const redirectTarget = useRef<string>("/analyze");

  useEffect(() => {
    redirectTarget.current = getRedirectTarget();
    let timeout: ReturnType<typeof setTimeout>;

    const onConfirmed = () => {
      setStatus("confirmed");
      timeout = setTimeout(
        () => navigate(redirectTarget.current, { replace: true }),
        AUTO_REDIRECT_DELAY_MS,
      );
    };

    const tryAutoLogin = async () => {
      const user = await getSessionUser();
      if (user) {
        onConfirmed();
        return;
      }
      setStatus("manual");
    };

    const listener = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        clearTimeout(timeout);
        onConfirmed();
      }
    });

    tryAutoLogin();

    return () => {
      clearTimeout(timeout);
      listener?.data.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleContinue = () => {
    if (status === "manual") {
      navigate("/auth?mode=login", { replace: true });
    } else {
      navigate(redirectTarget.current, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-4 pb-8 flex flex-col">
      <div className="relative mb-8 flex items-center justify-center min-h-10">
        <img src={logoFaceglow} alt="FaceGlow" className="h-8 w-auto" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center text-center"
      >
        {status === "checking" && (
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-6" />
        )}

        {(status === "confirmed" || status === "manual") && (
          <>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6"
            >
              <CheckCircle2 size={40} className="text-green-500" />
            </motion.div>

            <h1 className="text-2xl font-extrabold text-foreground mb-3">
              E-mail confirmado! ✨
            </h1>
            <p className="text-muted-foreground text-[15px] leading-relaxed max-w-xs mb-8">
              {status === "confirmed"
                ? "Sua conta está ativa. Você será redirecionada em instantes..."
                : "Sua conta está ativa. Faça login para continuar sua análise."}
            </p>

            <button
              onClick={handleContinue}
              className="w-full max-w-xs py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-glow"
            >
              {status === "confirmed" ? "Continuar análise" : "Fazer login para continuar"}
              <ArrowRight size={18} />
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default EmailConfirmed;
