import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, ShieldCheck, QrCode, CreditCard } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar, faChartLine, faListCheck, faBottleDroplet,
  faArrowsLeftRight, faLayerGroup, faMicroscope,
  faChevronRight, faCrown, faCheckDouble,
} from "@fortawesome/free-solid-svg-icons";
import logoFaceglow from "@/assets/logos/logo-faceglow-escrito-escura.webp";
import logoIcon from "@/assets/logos/logo-faceglow.svg";
import { createBillingCheckout, type BillingPlanKey, type BillingStatusResponse, fetchBillingStatus } from "@/lib/billing";
import { apiClient } from "@/shared/services/api/ApiClient";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLatestAnalysis } from "@/lib/analysisClient";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import { AuroraBackdrop } from "@/components/shared";

// ── Planos ────────────────────────────────────────────────────────────────────

type PlanTier = "credits" | "monthly" | "annual";

interface Plan {
  key: PlanTier;
  name: string;
  priceCents: number;
  monthlyEquiv?: number;
  period: string;
  badge: string | null;
  savings?: string;
}

const PLANS: Record<PlanTier, Plan> = {
  credits: {
    key: "credits",
    name: "Análise Avulsa",
    priceCents: 490,
    period: "pagamento único",
    badge: null,
  },
  monthly: {
    key: "monthly",
    name: "Acesso 30 dias",
    priceCents: 2490,
    period: "pagamento único · 30 dias",
    badge: null,
  },
  annual: {
    key: "annual",
    name: "Acesso 365 dias",
    priceCents: 19790,
    monthlyEquiv: 1649,
    period: "pagamento único · 365 dias",
    badge: "MELHOR VALOR",
    savings: "Equivale a R$ 16,49/mês",
  },
};

// ── Features por tier ────────────────────────────────────────────────────────

interface FeatureDef {
  icon: Parameters<typeof FontAwesomeIcon>[0]["icon"];
  label: string;
  free: boolean;
  avulsa: boolean;
  premium: boolean;
}

const FEATURES: FeatureDef[] = [
  { icon: faMicroscope,     label: "Análise facial completa",           free: true,  avulsa: true,  premium: true  },
  { icon: faLayerGroup,     label: "Resultado detalhado por categoria",  free: true,  avulsa: true,  premium: true  },
  { icon: faListCheck,      label: "Rotina personalizada pela IA",       free: false, avulsa: false, premium: true  },
  { icon: faCheckDouble,    label: "Checklist diário de rotina",         free: false, avulsa: false, premium: true  },
  { icon: faChartLine,      label: "Histórico e evolução da pele",       free: false, avulsa: false, premium: true  },
  { icon: faArrowsLeftRight,label: "Comparativo entre análises",         free: false, avulsa: false, premium: true  },
  { icon: faBottleDroplet,  label: "Adicionar produtos próprios",        free: false, avulsa: false, premium: true  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

const formatDate = (s?: string) => {
  if (!s) return "N/A";
  try {
    return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return s; }
};

const isAdminGranted = (planKey?: string, gateway?: string) =>
  planKey === "test" || !gateway || gateway === "admin";

const getPaymentLabel = (planKey?: string, gateway?: string) => {
  if (isAdminGranted(planKey, gateway)) return "Autorizado";
  if (gateway?.includes("pix")) return "PIX";
  if (gateway?.includes("stripe")) return "Cartão de Crédito";
  return gateway ?? "—";
};

const getPlanName = (planKey?: string, planName?: string, gateway?: string) => {
  if (isAdminGranted(planKey, gateway)) return "Cortesia";
  return planName ?? "—";
};

const ACTIVE_PLAN_FEATURES: Record<BillingPlanKey, string[]> = {
  monthly: [
    "6 créditos de análise facial",
    "Rotina personalizada pela IA",
    "Checklist diário de rotina",
    "Histórico completo de análises",
    "Comparativo de evolução da pele",
    "Biblioteca de produtos próprios",
    "Acesso válido por 30 dias",
  ],
  annual: [
    "Créditos de análise facial",
    "Rotina personalizada pela IA",
    "Checklist diário de rotina",
    "Histórico completo de análises",
    "Comparativo de evolução da pele",
    "Biblioteca de produtos próprios",
    "Acesso válido por 365 dias",
  ],
  credits: [
    "1 crédito de análise avulsa",
    "Resultado facial completo",
    "Diagnóstico de tipo de pele",
    "Condições e pontos de melhoria",
  ],
  test: ["Acesso de teste"],
};

// ── Componente principal ──────────────────────────────────────────────────────

const Premium = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("annual");
  const [selectedPayment, setSelectedPayment] = useState<"stripe-card" | "mercadopago-pix">("stripe-card");
  const [billingType, setBillingType] = useState<"subscription" | "avulsa">("subscription");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<unknown>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      try {
        const [u, status] = await Promise.all([getCurrentUser(), fetchBillingStatus({ forceRefresh: true })]);
        setUser(u);
        setBillingStatus(status);
        setIsPremium(status?.isActive ?? false);
      } catch {
        setIsPremium(false);
      } finally {
        setIsCheckingStatus(false);
      }
    })();
  }, []);

  // Sincroniza o plano selecionado com o modo assinatura/avulsa
  useEffect(() => {
    if (billingType === "avulsa") setSelectedPlan("credits");
    else setSelectedPlan("annual");
  }, [billingType]);

  const activePlan = PLANS[selectedPlan];

  const handleCheckout = async () => {
    setError("");
    if (!user) { setError("Você precisa estar autenticado para continuar"); return; }
    setIsProcessing(true);
    try {
      const result = await createBillingCheckout({ planKey: selectedPlan, gateway: selectedPayment });
      if (selectedPayment === "mercadopago-pix") {
        if (!result.pixQrCodeBase64 || !result.pixQrCode) throw new Error("Não foi possível gerar o QR Code PIX");
        navigate("/pix-checkout", {
          state: {
            qrCodeBase64: result.pixQrCodeBase64,
            qrCode: result.pixQrCode,
            amount: result.amountCents / 100,
            externalReference: result.externalReference,
            plan: activePlan.name,
          },
        });
      } else {
        if (!result.checkoutUrl) throw new Error("Não foi possível gerar o link de pagamento");
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCheckingStatus) return <LoadingSpinnerFullScreen message="Carregando seu plano..." />;

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10 mx-auto max-w-md px-5 pt-4 pb-24">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="mb-5 w-10 h-10 rounded-2xl liquiglass-button flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>

        {/* ── ESTADO: JÁ É PREMIUM ── */}
        {isPremium && billingStatus && (
          <ActivePremiumView
            billingStatus={billingStatus}
            onDashboard={() => navigate("/dashboard")}
            onRoutine={() => {
              const a = getCachedLatestAnalysis();
              navigate("/routine", a ? { state: { analysis: a } } : undefined);
            }}
          />
        )}

        {/* ── ESTADO: PRECISA ASSINAR ── */}
        {!isPremium && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Logo + headline */}
            <div className="text-center">
              <img src={logoFaceglow} alt="FaceGlow" className="h-12 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-foreground leading-tight mb-1">
                Cuide da sua pele com <span className="text-primary">inteligência</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Análises personalizadas, rotina diária e evolução real da sua pele
              </p>
            </div>

            {/* Toggle: Assinatura / Avulsa */}
            <div
              className="flex rounded-2xl p-1 gap-1"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              {(["subscription", "avulsa"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBillingType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    billingType === t
                      ? "coral-button text-white shadow-glow"
                      : "text-muted-foreground"
                  }`}
                >
                  {t === "subscription" ? "Acesso Premium" : "Análise Avulsa"}
                </button>
              ))}
            </div>

            {/* ── Planos de assinatura ── */}
            <AnimatePresence mode="wait">
              {billingType === "subscription" && (
                <motion.div
                  key="subscription"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-3"
                >
                  {(["annual", "monthly"] as PlanTier[]).map((key) => {
                    const p = PLANS[key];
                    const isSelected = selectedPlan === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedPlan(key)}
                        className={`relative w-full p-4 rounded-2xl text-left transition-all ${
                          isSelected
                            ? "lg-surface-strong"
                            : "lg-surface opacity-80"
                        }`}
                        style={{
                          border: isSelected
                            ? "2px solid var(--primary, #e8a9c2)"
                            : "2px solid var(--glass-border)",
                          boxShadow: isSelected ? "0 0 0 4px rgba(232,169,194,0.15)" : undefined,
                        }}
                      >
                        {p.badge && (
                          <span
                            className="absolute -top-2.5 right-4 px-2.5 py-0.5 text-[10px] font-black text-white rounded-full"
                            style={{ background: "var(--grad-coral)" }}
                          >
                            {p.badge}
                          </span>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-foreground text-sm">{p.name}</p>
                            {p.savings && (
                              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "#81c1a7" }}>{p.savings}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-black text-foreground">
                              {fmt(p.priceCents)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.period}
                            </p>
                            {p.monthlyEquiv && (
                              <p className="text-[10px] text-primary/70 font-semibold mt-0.5">
                                ≈ {fmt(p.monthlyEquiv)}/mês
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "var(--grad-coral)", boxShadow: "0 2px 8px rgba(220,100,140,0.5)" }}
                          >
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* ── Avulsa ── */}
              {billingType === "avulsa" && (
                <motion.div
                  key="avulsa"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="lg-surface-strong p-5 rounded-2xl"
                  style={{ border: "2px solid var(--primary, #e8a9c2)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-extrabold text-foreground">Análise Avulsa</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Resultado completo, sem assinatura</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-foreground">R$ 4,90</p>
                      <p className="text-[10px] text-muted-foreground">por análise</p>
                    </div>
                  </div>
                  <div className="text-xs rounded-xl px-3 py-2 font-medium" style={{ background: "#fdf8f0", color: "#c0a060", border: "1px solid rgba(245,217,160,0.5)" }}>
                    Inclui análise completa, mas não dá acesso à rotina personalizada nem ao histórico.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Tabela de features ── */}
            <div className="lg-surface rounded-2xl overflow-hidden">
              {/* Header */}
              <div
                className="grid gap-0 text-center py-2"
                style={{
                  gridTemplateColumns: "1fr 64px 64px 72px",
                  borderBottom: "1px solid var(--glass-border)",
                  padding: "10px 12px",
                }}
              >
                <span className="text-[11px] font-bold text-muted-foreground text-left">Recurso</span>
                <span className="text-[11px] font-bold text-muted-foreground">Free</span>
                <span className="text-[11px] font-bold text-muted-foreground">Avulsa</span>
                <span className="text-[11px] font-extrabold text-primary">Premium</span>
              </div>

              {/* Rows */}
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: "1fr 64px 64px 72px",
                    padding: "9px 12px",
                    borderBottom: i < FEATURES.length - 1 ? "1px solid var(--glass-border-soft)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--glass-bg-soft)" }}
                    >
                      <FontAwesomeIcon icon={f.icon} style={{ fontSize: "10px", color: "var(--fg-ink-3)" }} />
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">{f.label}</span>
                  </div>
                  <FeatureTick ok={f.free} />
                  <FeatureTick ok={f.avulsa} />
                  <FeatureTick ok={f.premium} highlight />
                </div>
              ))}
            </div>

            {/* ── Forma de pagamento ── */}
            <div>
              <p className="text-xs font-bold text-foreground mb-2">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "stripe-card" as const, label: "Cartão", icon: CreditCard },
                  { id: "mercadopago-pix" as const, label: "PIX", icon: QrCode },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPayment(m.id)}
                    className={`p-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      selectedPayment === m.id
                        ? "border-primary lg-surface-strong text-primary"
                        : "lg-surface text-foreground"
                    }`}
                    style={{
                      borderColor: selectedPayment === m.id ? "var(--primary, #e8a9c2)" : "var(--glass-border)",
                    }}
                  >
                    <m.icon size={16} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Erro */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm rounded-xl px-4 py-3" style={{ color: "#c87090", background: "#fdf0f4", border: "1px solid #f5c0d0" }}
              >
                {error}
              </motion.p>
            )}

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCheckout}
              disabled={isProcessing}
              className="coral-button w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 shadow-glow disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {selectedPayment === "stripe-card" ? "Abrindo checkout..." : "Gerando PIX..."}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCrown} className="text-sm" />
                  {billingType === "avulsa"
                    ? "Obter 1 Análise · R$ 4,90"
                    : selectedPlan === "annual"
                    ? `Ativar 365 dias · ${fmt(19790)}`
                    : `Ativar 30 dias · ${fmt(2490)}`}
                  <FontAwesomeIcon icon={faChevronRight} className="text-xs opacity-75" />
                </>
              )}
            </motion.button>

            {/* Rodapé legal */}
            <div className="text-center space-y-1.5 pb-4">
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck size={12} style={{ color: "#81c1a7" }} className="" />
                <span>Pagamento único · Sem renovação automática · Sem cobranças futuras</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <a href="#" className="underline">Termos de Uso</a>
                <span className="opacity-40">|</span>
                <a href="#" className="underline">Privacidade</a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

const FeatureTick = ({ ok, highlight }: { ok: boolean; highlight?: boolean }) => (
  <div className="flex justify-center">
    {ok ? (
      <CheckCircle2
        size={16}
        className={highlight ? "text-primary" : ""}
        style={!highlight ? { color: "#81c1a7" } : undefined}
        style={highlight ? { filter: "drop-shadow(0 0 4px rgba(220,100,140,0.4))" } : undefined}
      />
    ) : (
      <XCircle size={16} className="text-muted-foreground opacity-30" />
    )}
  </div>
);

const ActivePremiumView = ({
  billingStatus,
  onDashboard,
  onRoutine,
}: {
  billingStatus: BillingStatusResponse;
  onDashboard: () => void;
  onRoutine: () => void;
}) => {
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const navigate = useNavigate();

  const handleCancel = async () => {
    if (!window.confirm("Tem certeza? Seu acesso premium será encerrado imediatamente e não poderá ser desfeito.")) return;
    setCanceling(true);
    try {
      await apiClient.post("/billing/cancel", {});
      setCanceled(true);
    } catch {
      alert("Não foi possível cancelar. Tente novamente.");
    } finally {
      setCanceling(false);
    }
  };

  if (canceled) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-12">
        <p className="text-2xl font-black text-foreground">Acesso encerrado</p>
        <p className="text-sm text-muted-foreground">Seu plano foi cancelado. Você pode adquirir um novo acesso a qualquer momento.</p>
        <button onClick={() => navigate("/dashboard")} className="coral-button px-6 py-3 rounded-2xl font-bold text-sm">
          Voltar ao início
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div style={{
            width: 96,
            height: 96,
            maskImage: `url(${logoIcon})`,
            WebkitMaskImage: `url(${logoIcon})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            background: "var(--grad-coral)",
            filter: "drop-shadow(0 6px 18px rgba(220,100,140,0.45))",
          }} />
          <div
            className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2D1B2E, #3d2440)",
              border: "2px solid rgba(245,230,160,0.5)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <FontAwesomeIcon icon={faCrown} style={{ fontSize: 11, color: "#f5d9a0" }} />
          </div>
        </div>
        <h1 className="text-2xl font-black text-foreground mb-1">Você é Premium!</h1>
        <p className="text-sm text-muted-foreground">Explore todos os recursos do seu plano</p>
      </div>

      {/* Detalhes do plano */}
      <div
        className="lg-surface-strong p-5 rounded-2xl space-y-4"
        style={{ border: "1px solid var(--primary, #e8a9c2)" }}
      >
        <div className="grid grid-cols-2 gap-4">
          <InfoCell label="Plano Ativo" value={getPlanName(billingStatus.planKey, billingStatus.planName, billingStatus.gateway)} />
          <InfoCell label="Pagamento" value={getPaymentLabel(billingStatus.planKey, billingStatus.gateway)} />
          <InfoCell label="Ativado em" value={formatDate(billingStatus.activatedAtUtc)} small />
          <InfoCell label="Acesso válido até" value={formatDate(billingStatus.expiresAtUtc)} small />
        </div>
        <div
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ background: "var(--glass-bg-soft)", border: "1px solid var(--glass-border-soft)" }}
        >
          <span className="text-sm font-semibold text-foreground">Valor pago</span>
          <span className="text-lg font-black text-primary">
            {fmt(billingStatus.amountCents)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
          <span>Pagamento único realizado — sem cobranças futuras automáticas</span>
        </div>
      </div>

      {/* Features ativas */}
      <div>
        <p className="text-sm font-bold text-foreground mb-2">O que está incluído</p>
        <div className="space-y-2">
          {(ACTIVE_PLAN_FEATURES[billingStatus.planKey] ?? []).map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl lg-surface"
            >
              <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: "#81c1a7" }} />
              <span className="text-sm font-medium text-foreground">{feat}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onDashboard} className="coral-button py-3 rounded-xl font-bold text-sm">
          Dashboard
        </button>
        <button onClick={onRoutine} className="liquiglass-button py-3 rounded-xl font-bold text-sm">
          Minha Rotina
        </button>
      </div>

      <div className="text-center pb-4">
        <button
          onClick={handleCancel}
          disabled={canceling}
          className="text-xs font-semibold underline disabled:opacity-50" style={{ color: "#e8829a" }}
        >
          {canceling ? "Cancelando..." : "Encerrar acesso antecipadamente"}
        </button>
      </div>
    </motion.div>
  );
};

const InfoCell = ({ label, value, small }: { label: string; value: string; small?: boolean }) => (
  <div>
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={`font-bold text-foreground mt-0.5 ${small ? "text-sm" : "text-base"}`}>{value}</p>
  </div>
);

export default Premium;
