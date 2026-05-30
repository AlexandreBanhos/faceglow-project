import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Pencil, Lock, Shield, HelpCircle,
  Mail, Instagram, Globe, ChevronRight, Bell,
  MessageCircle, FileText, Share2, Trash2,
  ScanFace, Settings2, BookOpen, ClipboardList,
  Coins, Sparkles, CreditCard, Settings, Copy, Check, XCircle, IdCard,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser, signOut } from "@/lib/auth";
import { fetchProfileSummary, fetchDashboardSummary, fetchRoutineSteps, invalidateAnalysisCache, readDashboardCache } from "@/lib/analysisClient";
import { clearUserStatusCache } from "@/contexts/UserContext";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AuroraBackdrop } from "@/components/shared";
import type { AnalysisResponse } from "@/lib/analysis";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";
import { CarteirinhaEditModal } from "@/components/profile/CarteirinhaEditModal";
import { StatsRow } from "@/components/profile/StatsRow";
import { UserProfileModal } from "@/components/profile/UserProfileModal";
import { PreferenciasModal, OutrasRespostasModal } from "@/components/profile/PreferenciasModal";
import { fetchQuizAnswers } from "@/lib/quiz";
import logoIcon from "@/assets/logos/logo-faceglow.svg";
import logoUrl from "@/assets/logos/logo-faceglow-escrito-color.webp";

const APP_VERSION = "1.0.0";

// ── Componentes de layout de seção ───────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-extrabold text-muted-foreground/70 uppercase tracking-widest px-1 mb-2">
      {title}
    </p>
  );
}

interface RowItem {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value?: string;
  badge?: string;
  danger?: boolean;
  onClick: () => void;
}

function ProfileCard({ items }: { items: RowItem[] }) {
  return (
    <div className="lg-surface rounded-2xl overflow-hidden">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-muted/40 transition-colors text-left ${
            i < items.length - 1 ? "border-b border-border/30" : ""
          }`}
          style={item.danger ? { background: "rgba(245,168,184,0.07)" } : {}}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            item.danger ? "" : "bg-muted/60"
          }`} style={item.danger ? { background: "#fdf0f4" } : {}}>
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-tight ${item.danger ? "" : "text-foreground"}`}
               style={item.danger ? { color: "#c87090" } : {}}>
              {item.label}
            </p>
            {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
            {item.badge && (
              <span className="text-[10px] font-bold text-orange-600">{item.badge}</span>
            )}
          </div>
          {item.value && (
            <span className="text-xs text-muted-foreground truncate max-w-[38%]">{item.value}</span>
          )}
          <ChevronRight size={14} className="text-muted-foreground/50 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const Profile = () => {
  const navigate = useNavigate();
  const { isPremium, isFullAccess, subscriptionType, subscriptionStatus, expiresAtUtc, creditsRemaining } = useIsPremium();
  const { isAdmin } = useIsAdmin();

  // Identidade
  const [displayName, setDisplayName]     = useState("Usuário");
  const [displayEmail, setDisplayEmail]   = useState("");
  const [avatarUrl, setAvatarUrl]         = useState("");
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [userReady, setUserReady]         = useState(false);
  const [userId, setUserId]               = useState("");
  const [copiedId, setCopiedId]           = useState(false);

  // Estatísticas
  const [totalAnalyses, setTotalAnalyses]   = useState(0);
  const [bestScore, setBestScore]           = useState(0);
  const [streakDays, setStreakDays]         = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [statsLoading, setStatsLoading]     = useState(true);

  // Análise recente — init síncrono do cache para evitar flash vazio
  const [lastSkinType, setLastSkinType]     = useState(() => readDashboardCache()?.latest?.skinType ?? "");
  const [lastScore, setLastScore]           = useState(() => readDashboardCache()?.latest?.overallScore ?? 0);
  const [lastImageUrl, setLastImageUrl]     = useState(() => readDashboardCache()?.latest?.imageUrl ?? "");
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponse | null>(() => readDashboardCache()?.latest ?? null);

  // Ref para evitar waterfall: isCustomAvatar lido de forma assíncrona pelo getCurrentUser
  const isCustomAvatarRef = useRef(false);

  // Questionário — init síncrono do localStorage para evitar flash vazio no modal
  const [quizAnswers, setQuizAnswers] = useState<LifestyleAnswers | null>(() => {
    try {
      const saved = localStorage.getItem("faceglow-quiz-answers");
      return saved ? JSON.parse(saved) as LifestyleAnswers : null;
    } catch { return null; }
  });

  // UI state
  const [showProfileModal, setShowProfileModal]       = useState(false);
  const [showPreferencias, setShowPreferencias]       = useState(false);
  const [showOutrasRespostas, setShowOutrasRespostas] = useState(false);
  const [showNotifications, setShowNotifications]       = useState(false);
  const [showCarteirinhaEdit, setShowCarteirinhaEdit]   = useState(false);
  const [showDeleteModal, setShowDeleteModal]           = useState(false);
  const [shareToast, setShareToast]                   = useState(false);
  const [cancelLoading, setCancelLoading]             = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((user) => {
      if (!mounted || !user) { setUserReady(true); return; }
      const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
      setDisplayName(name || user.email?.split("@")[0] || "Usuário");
      setDisplayEmail(user.email ?? "");
      setUserId(user.id ?? "");
      const custom = user.user_metadata?.avatar_url ?? "";
      isCustomAvatarRef.current = !!custom;
      setAvatarUrl(custom);
      setIsCustomAvatar(!!custom);
      setUserReady(true);
    }).catch(() => setUserReady(true));
    return () => { mounted = false; };
  }, []);

  // Roda em paralelo com getCurrentUser — sem waterfall de userReady
  useEffect(() => {
    let mounted = true;
    setStatsLoading(true);
    Promise.all([
      fetchProfileSummary().catch(() => null),
      fetchDashboardSummary(false).catch(() => null),
    ]).then(async ([summary, dashboard]) => {
      if (!mounted) return;
      if (summary?.stats) {
        setTotalAnalyses(summary.stats.totalAnalyses ?? 0);
        setBestScore(summary.stats.bestScore ?? 0);
        setStreakDays(summary.stats.streakDays ?? 0);
      }
      const latest = dashboard?.latest as AnalysisResponse | null | undefined;
      if (latest) {
        setLastSkinType(latest.skinType ?? "");
        setLastScore(latest.overallScore ?? 0);
        setLatestAnalysis(latest);
        if (latest.imageUrl) setLastImageUrl(latest.imageUrl);
        // isCustomAvatarRef é preenchido pelo effect getCurrentUser (que resolve antes da rede)
        if (!isCustomAvatarRef.current && latest.imageUrl) setAvatarUrl(latest.imageUrl);
        try {
          const steps = await fetchRoutineSteps(latest.id);
          if (mounted) setActiveProducts(steps.length);
        } catch { /* mantém 0 */ }
      }
      setStatsLoading(false);
    });
    return () => { mounted = false; };
  }, []); // sem userReady — paralelo ao getCurrentUser

  useEffect(() => {
    try {
      const raw = localStorage.getItem("faceglow-last-analysis");
      if (raw) {
        const parsed = JSON.parse(raw) as { imageUrl?: string };
        if (parsed.imageUrl) setLastImageUrl(parsed.imageUrl);
      }
    } catch { /* ignora */ }

    // Carrega respostas: localStorage imediato, backend em background (fonte de verdade)
    try {
      const qRaw = localStorage.getItem("faceglow-quiz-answers");
      if (qRaw) setQuizAnswers(JSON.parse(qRaw) as LifestyleAnswers);
    } catch { /* ignora */ }
    fetchQuizAnswers().then((remote) => {
      if (remote) {
        setQuizAnswers(remote);
        try {
          localStorage.setItem("faceglow-quiz-answers", JSON.stringify(remote));
          localStorage.setItem("faceglow-quiz-completed", "1");
        } catch { /* quota */ }
      }
    });
  }, []);

  const avatarLetter = useMemo(() => {
    const src = displayName.trim() || displayEmail.trim() || "U";
    return src.charAt(0).toUpperCase();
  }, [displayName, displayEmail]);

  const handleLogout = async () => {
    invalidateAnalysisCache();
    ["faceglow-last-analysis","faceglow-pending-analyze-image",
     "faceglow-pending-analyze-face-validation","faceglow-pending-analyze-at"]
      .forEach((k) => localStorage.removeItem(k));
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancelar sua assinatura encerrará o acesso premium imediatamente. Tem certeza?")) return;
    setCancelLoading(true);
    try {
      const { supabase } = await import("@/lib/auth");
      const { data: { session } } = await supabase.auth.getSession();
      const { apiBaseUrl } = await import("@/lib/api");
      const res = await fetch(`${apiBaseUrl}/billing/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as { error?: string }).error ?? "Erro ao cancelar assinatura.");
        return;
      }
      clearUserStatusCache();
      navigate("/profile");
    } catch {
      alert("Erro ao cancelar assinatura. Tente novamente.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleShare = async () => {
    const url = "https://app.faceglow-soora.me";
    const text = "Descobri um app incrível de skincare com IA! Analisa sua pele e monta uma rotina personalizada com produtos. 🌿✨";
    if (navigator.share) {
      try { await navigator.share({ title: "FaceGlow", text, url }); } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const planLabel: Record<string, string> = {
    monthly: "Acesso 30 dias", annual: "Acesso 365 dias",
    credits: "Análise Avulsa", test: "Teste",
  };
  const expiresFormatted = expiresAtUtc
    ? new Date(expiresAtUtc).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-screen pb-28 overflow-x-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center px-6 pt-8 pb-5"
      >
        <div className="relative w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-glow overflow-hidden flex-shrink-0">
          <span className="text-xl font-extrabold text-primary-foreground select-none">{avatarLetter}</span>
          {avatarUrl && (
            <motion.img
              key={avatarUrl} src={avatarUrl} alt={displayName}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }} animate={{ opacity: isImageLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => { setAvatarUrl(""); setIsImageLoaded(false); }}
            />
          )}
        </div>

        <h1 className="font-heading text-xl font-extrabold text-foreground mt-3 text-center">{displayName}</h1>
        {displayEmail && <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>}

        <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${
          isFullAccess ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"
        }`}>
          {isFullAccess ? "✦ Premium" : creditsRemaining > 0 ? `${creditsRemaining} crédito${creditsRemaining !== 1 ? "s" : ""}` : "Plano gratuito"}
        </div>
      </motion.div>

      {/* ── Conteúdo ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-5 space-y-6"
      >

        {/* Perfil de pele — card compacto */}
        <div className="lg-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-muted/40 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
              {lastImageUrl ? (
                <img src={lastImageUrl} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center">
                  <ScanFace size={17} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">
                {lastSkinType ? `Pele ${lastSkinType.charAt(0).toUpperCase() + lastSkinType.slice(1).toLowerCase()}` : "Ver meu diagnóstico"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Análise · Scores · Questionário
              </p>
            </div>
            {lastScore > 0 && (
              <span
                className="text-base font-extrabold flex-shrink-0 mr-0.5"
                style={{ color: lastScore >= 70 ? "#81c1a7" : lastScore >= 50 ? "#f5d9a0" : "#f5a8b8" }}
              >
                {lastScore}
              </span>
            )}
            <ChevronRight size={14} className="text-muted-foreground/50 flex-shrink-0" />
          </button>
        </div>

        {/* Estatísticas */}
        <StatsRow
          totalAnalyses={statsLoading ? 0 : totalAnalyses}
          currentScore={statsLoading ? 0 : bestScore}
          activeProducts={statsLoading ? 0 : activeProducts}
          streakDays={statsLoading ? 0 : streakDays}
        />

        {/* ── Seção: Conta ── */}
        <div>
          <SectionHeader title="Conta" />
          <ProfileCard items={[
            {
              icon: <Pencil size={15} className="text-foreground" />,
              label: "Editar perfil",
              sub: "Nome e foto",
              onClick: () => navigate("/profile/edit"),
            },
            {
              icon: <Mail size={15} className="text-foreground" />,
              label: "Alterar e-mail",
              value: displayEmail ? displayEmail.split("@")[0] + "@…" : undefined,
              onClick: () => navigate("/profile/email"),
            },
            {
              icon: <Lock size={15} className="text-foreground" />,
              label: "Alterar senha",
              onClick: () => navigate("/profile/password"),
            },
          ]} />
        </div>

        {/* ── Seção: Pessoal ── */}
        <div>
          <SectionHeader title="Pessoal" />
          <ProfileCard items={[
            {
              icon: <ScanFace size={15} className="text-foreground" />,
              label: "Perfil de pele",
              sub: lastSkinType ? lastSkinType.charAt(0).toUpperCase() + lastSkinType.slice(1).toLowerCase() : "Análise, scores e questionário",
              onClick: () => setShowProfileModal(true),
            },
            {
              icon: <Settings2 size={15} className="text-foreground" />,
              label: "Preferências",
              sub: "Budget, rotina, alergias, tom de pele",
              onClick: () => setShowPreferencias(true),
            },
            {
              icon: <BookOpen size={15} className="text-foreground" />,
              label: "Minha estante",
              sub: "Produtos que você usa",
              onClick: () => navigate("/meus-produtos"),
            },
            {
              icon: <ClipboardList size={15} className="text-foreground" />,
              label: "Outras respostas",
              sub: "Tipo de pele, maquiagem, condições",
              onClick: () => setShowOutrasRespostas(true),
            },
          ]} />
        </div>

        {/* ── Seção: Carteirinha ── */}
        <div>
          <SectionHeader title="Carteirinha Digital" />
          <ProfileCard items={[
            {
              icon: <IdCard size={15} className="text-foreground" />,
              label: "Minha carteirinha",
              sub: "Visualizar código e QR de membro",
              onClick: () => navigate("/carteirinha"),
            },
            {
              icon: <Pencil size={15} className="text-foreground" />,
              label: "Editar dados da carteirinha",
              sub: "Instituição, curso, CPF, foto e mais",
              onClick: () => setShowCarteirinhaEdit(true),
            },
          ]} />
        </div>

        {/* ── Seção: Assinatura ── */}
        <div>
          <SectionHeader title="Assinatura" />
          <div className="lg-surface rounded-2xl overflow-hidden">
            <button
              onClick={() => navigate("/premium")}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-muted/40 transition-colors"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isFullAccess ? "gradient-primary shadow-glow" : "bg-muted/60"
              }`} style={isPremium && !isFullAccess ? { background: "#d8f0e0" } : {}}>
                {isFullAccess ? <Sparkles size={15} className="text-white" />
                  : isPremium ? <Coins size={15} style={{ color: "#5aada0" }} />
                  : <CreditCard size={15} className="text-muted-foreground" />}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {isFullAccess
                      ? `${planLabel[subscriptionType ?? ""] ?? "Premium"}`
                      : isPremium ? "Créditos avulsos"
                      : "Plano gratuito"}
                  </p>
                  {isFullAccess && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full gradient-primary text-white">✦ ATIVO</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isFullAccess && expiresFormatted
                    ? `Acesso válido até ${expiresFormatted}`
                    : isPremium
                    ? `${creditsRemaining} crédito${creditsRemaining !== 1 ? "s" : ""} restante${creditsRemaining !== 1 ? "s" : ""}`
                    : `${creditsRemaining} crédito${creditsRemaining !== 1 ? "s" : ""} · Sem renovação automática`}
                </p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/50 flex-shrink-0" />
            </button>

            {isFullAccess && subscriptionStatus === "active" && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="w-full flex items-center gap-3.5 px-4 py-3 border-t border-border/30 transition-colors disabled:opacity-50"
                style={{ "--tw-bg-opacity": "1" } as React.CSSProperties}
                onMouseDown={(e) => (e.currentTarget.style.background = "rgba(245,168,184,0.1)")}
                onMouseUp={(e) => (e.currentTarget.style.background = "")}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fdf0f4" }}>
                  <XCircle size={15} style={{ color: "#e8829a" }} />
                </div>
                <p className="text-sm font-semibold text-left flex-1" style={{ color: "#c87090" }}>
                  {cancelLoading ? "Cancelando..." : "Cancelar assinatura"}
                </p>
              </button>
            )}
          </div>
        </div>
                {/* ── Seção: Aprenda ── */}
        <div>
          <SectionHeader title="Aprenda" />
          <ProfileCard items={[
            {
              icon: <BookOpen size={15} className="text-foreground" />,
              label: "Skincare & Educação",
              sub: "Ativos, tipos de pele, rotinas e mitos",
              onClick: () => navigate("/aprenda"),
            },
          ]} />
        </div>

        {/* ── Seção: Precisa de ajuda ── */}
        <div>
          <SectionHeader title="Precisa de ajuda" />
          <ProfileCard items={[
            {
              icon: <HelpCircle size={15} className="text-foreground" />,
              label: "Perguntas frequentes",
              sub: "Dúvidas sobre o app e análises",
              onClick: () => navigate("/support"),
            },
            {
              icon: <Bell size={15} className={showNotifications ? "text-primary" : "text-foreground"} />,
              label: "Configurar notificações",
              sub: "Lembretes de rotina e análise",
              onClick: () => setShowNotifications((v) => !v),
            },
            {
              icon: <MessageCircle size={15} className="text-foreground" />,
              label: "Fale conosco",
              sub: "contato@faceglow-soora.me",
              onClick: () => window.open("mailto:contato@faceglow-soora.me", "_blank"),
            },
          ]} />

          {/* Notificações — expansão inline */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <NotificationSettings />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Seção: Legal ── */}
        <div>
          <SectionHeader title="Legal" />
          <ProfileCard items={[
            {
              icon: <Shield size={15} className="text-foreground" />,
              label: "Política de privacidade",
              onClick: () => navigate("/privacidade"),
            },
            {
              icon: <FileText size={15} className="text-foreground" />,
              label: "Termos de uso",
              onClick: () => navigate("/termos"),
            },
          ]} />
        </div>

        {/* ── Admin (só admin) ── */}
        {isAdmin && (
          <div>
            <SectionHeader title="Admin" />
            <ProfileCard items={[
              {
                icon: <Settings size={15} className="text-orange-500" />,
                label: "Usuários",
                badge: "Admin",
                onClick: () => navigate("/admin/users"),
              },
              {
                icon: <Settings size={15} className="text-orange-500" />,
                label: "Produtos",
                badge: "Admin",
                onClick: () => navigate("/admin/products"),
              },
              {
                icon: <Settings size={15} className="text-orange-500" />,
                label: "Afiliados",
                badge: "Admin",
                onClick: () => navigate("/admin/afiliados"),
              },
            ]} />
          </div>
        )}
         {/* ── Seção: Participe ── */}
        <div>
          <SectionHeader title="Participe" />
          <div className="lg-surface rounded-2xl overflow-hidden">
            {/* Logo + tagline */}
            <div className="flex flex-col items-center py-5 px-5 text-center border-b border-border/30">
              <img src={logoUrl} alt="FaceGlow" className="h-7 mb-1.5 object-contain" />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                Skincare inteligente para a sua pele.
              </p>
            </div>

            {/* Redes sociais */}
            <div className="flex items-center justify-center gap-3 py-4 px-5 border-b border-border/30">
              <a
                href="https://instagram.com/faceglow.soora"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 border border-border/40 text-xs font-bold text-foreground active:scale-95 transition-transform"
              >
                <Instagram size={13} className="text-rose-500" />
                Instagram
              </a>
              <a
                href="https://app.faceglow-soora.me"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 border border-border/40 text-xs font-bold text-foreground active:scale-95 transition-transform"
              >
                <Globe size={13} className="text-blue-500" />
                Site
              </a>
            </div>

            {/* Compartilhar */}
            <div className="px-4 py-3.5 relative">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm coral-button active:scale-[0.97] transition-transform shadow-glow"
              >
                <Share2 size={15} />
                Compartilhar FaceGlow com amigos
              </button>
              <AnimatePresence>
                {shareToast && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-center text-xs font-semibold mt-2" style={{ color: "#5aada0" }}
                  >
                    Link copiado!
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Sair ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-transform"
          style={{ background: "rgba(245,168,184,0.1)", color: "#c87090", border: "1px solid rgba(245,168,184,0.2)" }}
        >
          <LogOut size={17} />
          Sair da conta
        </motion.button>

        {/* ── Excluir conta ── */}
        <div className="flex justify-center pb-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-muted-foreground/40 font-medium flex items-center gap-1.5 active:opacity-70 transition-opacity"
          >
            <Trash2 size={11} />
            Excluir minha conta
          </button>
        </div>

        

        {/* ── Footer ── */}
        <div className="text-center pb-4 space-y-1">
          <img src={logoIcon} alt="FaceGlow" className="h-5 mx-auto opacity-30 mb-2" />
          <p className="text-[10px] text-muted-foreground/40">
            FaceGlow © {new Date().getFullYear()} · v{APP_VERSION}
          </p>
          <p className="text-[10px] text-muted-foreground/30">
            Desenvolvido para cuidar da sua pele
          </p>

          {userId && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(userId).then(() => {
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }).catch(() => {});
              }}
              className="flex items-center gap-1.5 mt-1 mx-auto transition-opacity active:opacity-60"
            >
              <span className="text-[9px] text-muted-foreground/25 font-mono">
                ID: {userId}
              </span>
              {copiedId
                ? <Check size={10} className="flex-shrink-0" style={{ color: "#81c1a7" }} />
                : <Copy size={10} className="text-muted-foreground/25 flex-shrink-0" />
              }
            </button>
          )}
        </div>

      </motion.div>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        latestAnalysis={latestAnalysis}
        quizAnswers={quizAnswers}
        onEdit={() => { setShowProfileModal(false); navigate("/analyze"); }}
        onOpenEdit={() => { setShowProfileModal(false); setShowOutrasRespostas(true); }}
        onViewAnalysis={() => {
          setShowProfileModal(false);
          if (latestAnalysis) navigate("/results", { state: { analysis: latestAnalysis } });
          else navigate("/analyze");
        }}
        totalAnalyses={totalAnalyses}
        bestScore={bestScore}
        activeProducts={activeProducts}
        streakDays={streakDays}
      />

      <PreferenciasModal
        isOpen={showPreferencias}
        onClose={() => setShowPreferencias(false)}
        quizAnswers={quizAnswers}
        onAnswersChanged={(a) => setQuizAnswers(a)}
        routineCount={activeProducts}
        onViewRoutine={() => { setShowPreferencias(false); navigate("/routine"); }}
      />

      <OutrasRespostasModal
        isOpen={showOutrasRespostas}
        onClose={() => setShowOutrasRespostas(false)}
        quizAnswers={quizAnswers}
        onAnswersChanged={(a) => setQuizAnswers(a)}
        analyzedSkinType={latestAnalysis?.skinType}
      />

      <CarteirinhaEditModal
        isOpen={showCarteirinhaEdit}
        onClose={() => setShowCarteirinhaEdit(false)}
      />

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <BottomNav />
    </div>
  );
};

export default Profile;
