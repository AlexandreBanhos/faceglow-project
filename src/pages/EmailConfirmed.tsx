import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ScanFace, LayoutDashboard, ListChecks } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { attachReferralAfterSignup } from "@/lib/affiliate";
import logoFaceglow from "@/assets/logos/logo-faceglow-escrito-escura.webp";

const AUTO_REDIRECT_DELAY_MS = 5000;

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
        void attachReferralAfterSignup(); // grava referral após confirmar e-mail
        onConfirmed();
      }
    });

    tryAutoLogin();

    return () => {
      clearTimeout(timeout);
      listener?.data.subscription.unsubscribe();
    };
  }, [navigate]);

  const ACTIONS = [
    {
      icon: <ScanFace size={20} />,
      label: "Iniciar análise de pele",
      desc: "Faça sua análise agora",
      path: "/analyze",
      primary: true,
    },
    {
      icon: <LayoutDashboard size={18} />,
      label: "Ir para o início",
      desc: "Ver meu dashboard",
      path: "/dashboard",
      primary: false,
    },
    {
      icon: <ListChecks size={18} />,
      label: "Ver minha rotina",
      desc: "Acessar rotina de skincare",
      path: "/routine",
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex items-center justify-center px-5 pt-5 pb-3">
        <img src={logoFaceglow} alt="FaceGlow" className="h-7 w-auto" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
        {status === "checking" && (
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-6" />
        )}

        {(status === "confirmed" || status === "manual") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto"
              style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.2)" }}
            >
              <CheckCircle2 size={40} className="text-green-500" />
            </motion.div>

            <h1 className="text-2xl font-extrabold text-foreground mb-3 text-center">
              E-mail confirmado!
            </h1>
            <p className="text-muted-foreground text-[15px] leading-relaxed max-w-xs mb-6 text-center mx-auto">
              {status === "confirmed"
                ? "Sua conta está ativa. Para onde deseja ir?"
                : "Sua conta está ativa. Faça login para continuar."}
            </p>

            {status === "confirmed" ? (
              <div className="space-y-3">
                {ACTIONS.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path, { replace: true })}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={action.primary ? {
                      background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
                      boxShadow: "0 8px 24px rgba(232,116,138,0.3)",
                      border: "none",
                    } : {
                      background: "var(--glass-bg)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={action.primary ? {
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                      } : {
                        background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)",
                        color: "white",
                        boxShadow: "0 4px 12px rgba(232,116,138,0.25)",
                      }}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: action.primary ? "white" : "var(--fg-ink)" }}>
                        {action.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: action.primary ? "rgba(255,255,255,0.75)" : "var(--fg-ink-3)" }}>
                        {action.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => navigate("/auth?mode=login", { replace: true })}
                className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-glow"
              >
                Fazer login para continuar
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmailConfirmed;
