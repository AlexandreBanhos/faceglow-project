import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, LoaderCircle, Sparkles, XCircle, Zap, Gift, ListChecks } from "lucide-react";
import { fetchBillingStatus, fetchAnalysisCredits } from "@/lib/billing";
import { invalidateAnalysisCache } from "@/lib/analysisClient";
import { apiClient } from "@/shared/services/api/ApiClient";

type PollState = "loading" | "pending" | "active" | "timeout" | "error";
type RoutineState = "idle" | "waiting" | "ready";

// Max time to poll before showing "confirming via webhook" message
const MAX_POLL_MS = 60_000;
const POLL_INTERVAL_MS = 4_000;

const CREDITS_BY_PLAN: Record<string, number> = {
  "credits": 1,
  "monthly": 6,
  "annual": 6,
};

const BillingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<PollState>("loading");
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [routineState, setRoutineState] = useState<RoutineState>("idle");
  const pollCount = useRef(0);
  const routinePollCount = useRef(0);

  const externalReference = useMemo(
    () => searchParams.get("external_reference") ?? undefined,
    [searchParams],
  );
  const externalId = useMemo(
    () => searchParams.get("session_id") ?? searchParams.get("external_id") ?? undefined,
    [searchParams],
  );
  const planName = useMemo(() => {
    const plan = searchParams.get("plan");
    if (plan === "credits") return "Análise Avulsa";
    if (plan === "monthly") return "Premium Mensal";
    if (plan === "annual") return "Premium Anual";
    return "Plano Premium";
  }, [searchParams]);

  const planKey = useMemo(() => {
    return searchParams.get("plan") || "monthly";
  }, [searchParams]);

  const creditsToAdd = CREDITS_BY_PLAN[planKey] || 5;

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      pollCount.current += 1;

      try {
        const result = await fetchBillingStatus({ externalReference, externalId });

        if (!mounted) return;

        if (result.isActive) {
          setState("active");
          invalidateAnalysisCache();
          
          // Fetch updated credits after subscription is confirmed
          try {
            const credits = await fetchAnalysisCredits();
            if (mounted && credits !== null) {
              setCreditsRemaining(credits);
            }
          } catch {
            // Credits fetch failed, but subscription is active so continue
            console.warn("Falha ao carregar quantidade de créditos");
          }
          return;
        }

        // After MAX_POLL_MS stop insisting — webhook will confirm async
        const elapsed = pollCount.current * POLL_INTERVAL_MS;
        if (elapsed >= MAX_POLL_MS) {
          setState("timeout");
          // Still try to fetch credits
          try {
            const credits = await fetchAnalysisCredits();
            if (mounted && credits !== null) {
              setCreditsRemaining(credits);
            }
          } catch {
            console.warn("Falha ao carregar quantidade de créditos");
          }
          return;
        }

        setState("pending");
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!mounted) return;
        // If subscription not found yet (DB still processing), keep polling briefly
        const elapsed = pollCount.current * POLL_INTERVAL_MS;
        if (elapsed < MAX_POLL_MS) {
          setState("pending");
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setState("timeout");
          // Still try to fetch credits
          try {
            const credits = await fetchAnalysisCredits();
            if (mounted && credits !== null) {
              setCreditsRemaining(credits);
            }
          } catch {
            console.warn("Falha ao carregar quantidade de créditos");
          }
        }
      }
    };

    poll();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [externalId, externalReference]);

  useEffect(() => {
    if (state !== "active") return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    routinePollCount.current = 0;
    setRoutineState("waiting");

    const pollRoutine = async () => {
      routinePollCount.current += 1;
      try {
        const res = await apiClient.get<{ ready: boolean }>("/routine/ready");
        if (!mounted) return;
        if (res.data?.ready) {
          setRoutineState("ready");
          return;
        }
      } catch { /* ignora erros de rede */ }

      if (!mounted) return;
      if (routinePollCount.current < 15) {
        timer = setTimeout(pollRoutine, 2000);
      } else {
        setRoutineState("idle");
      }
    };

    pollRoutine();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  const isActive = state === "active";
  const isPending = state === "pending" || state === "loading";
  const isTimeout = state === "timeout";

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-12 pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Pagamento
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
        >
          {isActive && (
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={52} className="text-emerald-500" />
            </div>
          )}
          {isPending && (
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <LoaderCircle size={52} className="text-primary animate-spin" />
            </div>
          )}
          {isTimeout && (
            <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock size={52} className="text-amber-500" />
            </div>
          )}
          {state === "error" && (
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle size={52} className="text-destructive" />
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4 max-w-xs w-full"
        >
          {isActive && (
            <>
              <h1 className="text-2xl font-extrabold text-foreground">Pagamento confirmado! 🎉</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seu <strong>{planName}</strong> foi ativado com sucesso.
              </p>

              {/* Credits Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-accent/15 to-primary/10 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Zap size={20} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Créditos disponíveis</p>
                    <p className="text-lg font-black text-foreground">
                      {creditsRemaining !== null ? creditsRemaining : `+${creditsToAdd}`}
                    </p>
                  </div>
                  <Gift size={20} className="text-accent opacity-60" />
                </div>
              </motion.div>

              {/* Routine generation status */}
              <AnimatePresence mode="wait">
                {routineState === "waiting" && (
                  <motion.div
                    key="routine-waiting"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-2xl border border-border/60 bg-muted/30 flex items-center gap-3"
                  >
                    <LoaderCircle size={18} className="text-primary animate-spin shrink-0" />
                    <p className="text-sm text-muted-foreground text-left">Gerando sua rotina personalizada com produtos...</p>
                  </motion.div>
                )}
                {routineState === "ready" && (
                  <motion.div
                    key="routine-ready"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
                  >
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <p className="text-sm font-semibold text-foreground text-left">Rotina com produtos pronta!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          {isPending && (
            <>
              <h1 className="text-2xl font-extrabold text-foreground">Processando pagamento...</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seu pagamento foi recebido. Aguardando confirmação automática.
              </p>
            </>
          )}
          {isTimeout && (
            <>
              <h1 className="text-2xl font-extrabold text-foreground">Pagamento recebido</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O pagamento foi processado com sucesso. Os créditos serão liberados automaticamente em instantes — você receberá a confirmação e pode verificar na tela de <strong>Perfil</strong>.
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs space-y-3"
        >
          {isActive && (
            <>
              <AnimatePresence>
                {routineState === "ready" && (
                  <motion.button
                    key="routine-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate("/routine")}
                    className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-glow"
                  >
                    <ListChecks size={18} />
                    Ver minha rotina
                  </motion.button>
                )}
              </AnimatePresence>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => navigate("/analyze")}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform ${routineState === "ready" ? "border border-border/70 glass text-foreground" : "gradient-primary text-primary-foreground shadow-glow"}`}
              >
                <Sparkles size={18} />
                Iniciar análise agora
              </motion.button>
            </>
          )}

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isActive ? 0.45 : 0.35 }}
            onClick={() => navigate("/profile")}
            className={`w-full py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2 ${
              isActive
                ? "border border-border/70 glass text-foreground"
                : "gradient-primary text-primary-foreground shadow-glow"
            }`}
          >
            <Zap size={18} />
            {isActive ? "Ver meus créditos" : "Ver meus créditos"}
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isActive ? 0.5 : 0.4 }}
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 rounded-2xl border border-border/70 text-sm font-semibold text-muted-foreground active:scale-[0.97] transition-transform hover:border-border"
          >
            ← Voltar ao início
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default BillingSuccess;
