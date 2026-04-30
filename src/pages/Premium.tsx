import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Sparkles, Zap, Lock, RotateCw, QrCode, CreditCard, CheckCircle2, Calendar, Zap as ZapIcon } from "lucide-react";
import logoFaceglow from "@/assets/logo-faceglow.svg";
import { createBillingCheckout, type BillingPlanKey, type BillingStatusResponse, fetchBillingStatus } from "@/lib/billing";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLatestAnalysis } from "@/lib/analysisClient";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import { AuroraBackdrop } from "@/components/shared";

type Plan = {
  key: BillingPlanKey;
  name: string;
  price: number;
  analysisCount: number;
  period: string;
  badge: string | null;
  description: string;
};

type Feature = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  label: string;
  color: string;
};

const PLANS: Plan[] = [
  {
    key: "monthly",
    name: "Premium",
    price: 2990,
    analysisCount: 6,
    period: "por mês",
    badge: "MELHOR OFERTA",
    description: "Acesso completo com rotinas e comparativos",
  },
  {
    key: "credits",
    name: "Análise Avulsa",
    price: 500,
    analysisCount: 1,
    period: "por análise",
    badge: null,
    description: "1 análise sem assinatura",
  },
];

const FEATURES: Feature[] = [
  { icon: Sparkles, label: "6 análises por mês", color: "text-blue-500" },
  { icon: Heart, label: "Rotinas personalizadas", color: "text-pink-500" },
  { icon: Zap, label: "Comparativos de evolução", color: "text-amber-500" },
  { icon: Lock, label: "Acesso completo", color: "text-emerald-500" },
];

const getPlanFeatures = (planKey: BillingPlanKey): string[] => {
  const featuresByPlan: Record<BillingPlanKey, string[]> = {
    monthly: [
      "6 análises por mês",
      "Diagnóstico completo do tipo de pele",
      "Rotinas personalizadas pela IA",
      "Produtos recomendados",
      "Comparativos de evolução",
      "Acesso completo à plataforma",
      "Histórico de análises",
    ],
    quarterly: [
      "Até 18 análises por trimestre",
      "Rotinas personalizadas de IA",
      "Produtos recomendados",
      "Histórico completo",
    ],
    annual: [
      "Até 72 análises por ano",
      "Rotinas personalizadas de IA",
      "Produtos recomendados",
      "Histórico completo",
      "Descontos exclusivos",
    ],
    credits: [
      "1 análise avulsa",
      "Diagnóstico do tipo de pele",
      "Resultado parcial (sem rotinas)",
      "Sem comparativos de evolução",
    ],
    test: ["Acesso de teste"],
  };
  return featuresByPlan[planKey] || [];
};

const getPaymentMethodLabel = (gateway?: string): string => {
  if (gateway?.includes("pix")) return "PIX";
  if (gateway?.includes("mercadopago")) return "MercadoPago";
  if (gateway?.includes("stripe")) return "Cartão de Crédito";
  return "Indefinido";
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const Premium = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanKey>("monthly");
  const [selectedPayment, setSelectedPayment] = useState<"stripe-card" | "mercadopago-pix">("stripe-card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadUserAndStatus = async () => {
    setIsCheckingStatus(true);
    setStatusError(null);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      console.log("[Premium] Current user:", currentUser?.email);

      // Always force-refresh billing status (no cache) to get latest subscription state
      const status = await fetchBillingStatus({ forceRefresh: true });
      console.log("[Premium] Billing status fetched:", {
        status: status?.status,
        isActive: status?.isActive,
        planName: status?.planName,
        expiresAtUtc: status?.expiresAtUtc,
        provider: status?.provider,
      });
      setBillingStatus(status);
      const isPremiumActive = status?.isActive ?? false;
      console.log("[Premium] Setting isPremium to:", isPremiumActive);
      setIsPremium(isPremiumActive);
      setRetryCount(0);
    } catch (err) {
      console.error("[Premium] Erro ao carregar dados:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Premium] Erro details:", {
        message: errorMsg,
        stack: err instanceof Error ? err.stack : undefined,
      });
      // Apenas mostrar erro se não for 404 (sem assinatura é normal)
      if (!errorMsg.includes("404")) {
        setStatusError(errorMsg);
      }
      setIsPremium(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadUserAndStatus();
  }, []);

  const plan = PLANS.find((p) => p.key === selectedPlan) ?? PLANS[0];

  const handleCheckout = async () => {
    setError("");
    
    if (!user) {
      setError("Você precisa estar autenticado para continuar");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await createBillingCheckout({
        planKey: selectedPlan,
        gateway: selectedPayment,
      });

      if (selectedPayment === "mercadopago-pix") {
        if (!result.pixQrCodeBase64 || !result.pixQrCode) {
          throw new Error("Não foi possível gerar o QR Code PIX");
        }
        navigate("/pix-checkout", {
          state: {
            qrCodeBase64: result.pixQrCodeBase64,
            qrCode: result.pixQrCode,
            amount: result.amountCents / 100,
            externalReference: result.externalReference,
            plan: plan.name,
          },
        });
      } else if (selectedPayment === "stripe-card") {
        if (!result.checkoutUrl) {
          throw new Error("Não foi possível gerar o link de pagamento");
        }
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar pagamento";
      console.error("Erro:", message);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* Loading state */}
      {isCheckingStatus && <LoadingSpinnerFullScreen message="Carregando seu plano..." />}

      <div className="relative z-10 mx-auto max-w-md px-6 py-4">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 hover:bg-card/40 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        {/* Error loading status */}
        {!isCheckingStatus && statusError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30"
          >
            <p className="text-sm text-destructive font-medium">⚠️ Erro ao carregar status: {statusError}</p>
            <button
              onClick={() => {
                setRetryCount(retryCount + 1);
                loadUserAndStatus();
              }}
              disabled={isCheckingStatus}
              className="mt-2 text-xs text-destructive underline font-semibold disabled:opacity-50"
            >
              {isCheckingStatus ? "Carregando..." : "Tentar novamente"}
            </button>
          </motion.div>
        )}

        {/* Premium Already Active */}
        {!isCheckingStatus && isPremium && billingStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>

              <h1 className="text-3xl font-black text-foreground mb-3 leading-tight">
                Você é Premium! 🎉
              </h1>
              <p className="text-muted-foreground text-base max-w-sm mx-auto">
                Explore todos os recursos e acessos do seu plano
              </p>
            </div>

            {/* Plan Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Plano Ativo</p>
                  <p className="text-lg font-bold text-foreground mt-1">{billingStatus.planName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Forma de Pagamento</p>
                  <p className="text-lg font-bold text-foreground mt-1">{getPaymentMethodLabel(billingStatus.gateway)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Ativado em</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {formatDate(billingStatus.activatedAtUtc)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Próxima Renovação</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {formatDate(billingStatus.expiresAtUtc)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2">
                  <ZapIcon size={16} className="text-accent" />
                  <span className="text-sm font-semibold text-foreground">Valor Mensal</span>
                </div>
                <p className="text-lg font-black text-accent">
                  R$ {(billingStatus.amountCents / 100).toFixed(2).replace(".", ",")}
                </p>
              </div>
            </motion.div>

            {/* Features/Resources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-3"
            >
              <p className="text-sm font-semibold text-foreground">Seus Recursos e Acessos</p>
              <div className="grid gap-2">
                {getPlanFeatures(billingStatus.planKey).map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/70 border border-border hover:border-primary/30 transition-colors"
                  >
                    <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3 pt-4"
            >
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.97] transition-transform"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  const latestAnalysis = getCachedLatestAnalysis();
                  navigate("/routine", latestAnalysis ? { state: { analysis: latestAnalysis } } : undefined);
                }}
                className="px-4 py-3 rounded-xl bg-card border border-border text-foreground font-bold text-sm active:scale-[0.97] transition-transform hover:border-primary/30"
              >
                Rotina
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-center pt-4"
            >
              <p className="text-xs text-muted-foreground mb-3">
                📅 Renovação automática. Você pode cancelar seu plano a qualquer momento.
              </p>
              <button
                onClick={() => alert("Funcionalidade de cancelamento em desenvolvimento")}
                className="inline-block text-xs text-destructive font-semibold hover:underline"
              >
                Cancelar meu plano
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Premium Checkout (shown only if not premium) */}
        {!isCheckingStatus && !isPremium && (
          <>
            {console.log("[Premium] Rendering checkout section - DEBUG STATE:", {
              isCheckingStatus,
              isPremium,
              billingStatus,
              hasStatus: !!billingStatus,
            })}

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-4"
            >
              <img src={logoFaceglow} alt="FaceGlow" className="h-36 mx-auto mb-3" />
              <h1 className="text-2xl font-black text-foreground leading-tight">
                Desbloqueie sua melhor pele com{" "}
                <span className="text-primary">FaceGlow Premium</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Análises faciais e rotinas personalizadas para sua pele
              </p>
            </motion.div>

            {/* Features — lista de benefícios centralizada */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-4 flex flex-col items-center gap-2"
            >
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon size={15} className={feature.color} />
                    <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                  </div>
                );
              })}
            </motion.div>

            {/* Plans */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2 mb-4"
            >
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlan(p.key)}
                  className={`relative w-full p-3.5 rounded-2xl border-2 transition-all text-left ${
                    selectedPlan === p.key
                      ? "border-primary lg-surface-strong shadow-lg"
                      : "border-white/80 lg-surface hover:border-primary/30"
                  }`}
                >
                  {p.badge && (
                    <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full shadow-md">
                      {p.badge}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-foreground text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-foreground">
                        R$ {(p.price / 100).toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{p.period}</p>
                    </div>
                  </div>
                  {selectedPlan === p.key && (
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <div className="w-1.5 h-1.5 bg-card rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <p className="text-xs font-semibold text-foreground mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "stripe-card" as const, label: "Cartão", icon: CreditCard },
                  { id: "mercadopago-pix" as const, label: "PIX", icon: QrCode },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`p-2.5 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedPayment === method.id
                        ? "border-primary lg-surface-strong text-primary"
                        : "border-white/80 lg-surface text-foreground hover:border-primary/30"
                    }`}
                  >
                    <method.icon size={18} />
                    <p className="text-sm">{method.label}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={handleCheckout}
              disabled={isProcessing}
              className="coral-button w-full py-3.5 rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {selectedPayment === "stripe-card" ? "Abrindo checkout..." : "Gerando PIX..."}
                </span>
              ) : (
                selectedPayment === "stripe-card" ? "Pagar com Cartão" : "Pagar com PIX"
              )}
            </motion.button>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <RotateCw size={12} />
                <p>Renovação automática. Cancele a qualquer hora.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <a href="#" className="underline">Termos de Uso</a>
                <span className="opacity-40">|</span>
                <a href="#" className="underline">Privacidade</a>
                <span className="opacity-40">|</span>
                <a href="#" className="underline">Restaurar</a>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Premium;
