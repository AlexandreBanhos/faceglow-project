import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Pencil, Lock, Shield, HelpCircle, Settings,
  Mail, Instagram, Globe,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser, signOut } from "@/lib/auth";
import { fetchProfileSummary, fetchDashboardSummary, fetchRoutineSteps, invalidateAnalysisCache } from "@/lib/analysisClient";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AuroraBackdrop } from "@/components/shared";
import type { AnalysisResponse } from "@/lib/analysis";
import { SkinCard } from "@/components/profile/SkinCard";
import { BookOpen } from "lucide-react";
import { StatsRow } from "@/components/profile/StatsRow";
import { SubscriptionCard } from "@/components/profile/SubscriptionCard";
import { AccountCard } from "@/components/profile/AccountCard";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import logoUrl from "@/assets/logos/logo-faceglow-escrito-color.webp";
import logoIcon from "@/assets/logos/logo-faceglow.svg";


const APP_VERSION = "1.0.0";

const Profile = () => {
  const navigate = useNavigate();
  const { isPremium, creditsRemaining, isFullAccess, subscriptionType, subscriptionStatus, expiresAtUtc } = useIsPremium();
  const { isAdmin } = useIsAdmin();

  // ── Identidade ───────────────────────────────────────────────────────────
  const [displayName, setDisplayName]       = useState("Usuario");
  const [displayEmail, setDisplayEmail]     = useState("");
  const [avatarUrl, setAvatarUrl]           = useState("");
  const [isImageLoaded, setIsImageLoaded]   = useState(false);
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [userReady, setUserReady]           = useState(false);

  // ── Estatísticas ─────────────────────────────────────────────────────────
  const [totalAnalyses, setTotalAnalyses]   = useState(0);
  const [bestScore, setBestScore]           = useState(0);
  const [streakDays, setStreakDays]         = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  const [statsLoading, setStatsLoading]     = useState(true);

  // ── Análise mais recente ─────────────────────────────────────────────────
  const [lastSkinType, setLastSkinType]         = useState("");
  const [lastScore, setLastScore]               = useState(0);
  const [lastImageUrl, setLastImageUrl]         = useState("");
  const [lastConditions, setLastConditions]     = useState<Record<string, boolean>>({});
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string | undefined>();
  const [latestAnalysis, setLatestAnalysis]     = useState<AnalysisResponse | null>(null);


  // ── Efeito 1: dados do usuário ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((user) => {
      if (!mounted || !user) { setUserReady(true); return; }
      const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
      setDisplayName(name || user.email?.split("@")[0] || "Usuario");
      setDisplayEmail(user.email ?? "");
      const custom = user.user_metadata?.avatar_url ?? "";
      setAvatarUrl(custom);
      setIsCustomAvatar(!!custom);
      setUserReady(true);
    }).catch(() => setUserReady(true));
    return () => { mounted = false; };
  }, []);

  // ── Efeito 2: estatísticas + análise ────────────────────────────────────
  useEffect(() => {
    if (!userReady) return;
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
        setLastAnalysisDate(latest.createdAtUtc);
        setLatestAnalysis(latest);
        if (latest.imageUrl) setLastImageUrl(latest.imageUrl);
        if (!isCustomAvatar && latest.imageUrl) setAvatarUrl(latest.imageUrl);
        // Busca contagem real de passos ativos via v2 API
        try {
          const steps = await fetchRoutineSteps(latest.id);
          if (mounted) setActiveProducts(steps.length);
        } catch { /* mantém 0 */ }
      }
      setStatsLoading(false);
    });

    return () => { mounted = false; };
  }, [userReady, isCustomAvatar]);

  // ── Efeito 3: localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("faceglow-last-analysis");
      if (raw) {
        const parsed = JSON.parse(raw) as { imageUrl?: string; conditions?: Record<string, boolean> };
        if (parsed.imageUrl)   setLastImageUrl(parsed.imageUrl);
        if (parsed.conditions) setLastConditions(parsed.conditions);
      }
    } catch { /* ignora */ }

  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const avatarLetter = useMemo(() => {
    const src = displayName.trim() || displayEmail.trim() || "U";
    return src.charAt(0).toUpperCase();
  }, [displayName, displayEmail]);

  const handleLogout = async () => {
    invalidateAnalysisCache();
    [
      "faceglow-last-analysis",
      "faceglow-pending-analyze-image",
      "faceglow-pending-analyze-face-validation",
      "faceglow-pending-analyze-at",
    ].forEach((k) => localStorage.removeItem(k));
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  const accountItems = [
    {
      label: "Editar perfil",
      icon: <Pencil size={17} className="text-foreground" />,
      onClick: () => navigate("/profile/edit"),
    },
    {
      label: "Alterar e-mail",
      icon: <Mail size={17} className="text-foreground" />,
      onClick: () => navigate("/profile/email"),
      value: displayEmail ? displayEmail.split("@")[0] + "@…" : undefined,
    },
    {
      label: "Alterar senha",
      icon: <Lock size={17} className="text-foreground" />,
      onClick: () => navigate("/profile/password"),
    },
    {
      label: "Privacidade e dados",
      icon: <Shield size={17} className="text-foreground" />,
      onClick: () => navigate("/privacidade"),
    },
    {
      label: "Ajuda e Suporte",
      icon: <HelpCircle size={17} className="text-foreground" />,
      onClick: () => navigate("/support"),
    },
    ...(isAdmin ? [
      {
        label: "Admin Produtos",
        icon: <Settings size={17} className="text-orange-500" />,
        onClick: () => navigate("/admin/products"),
        badge: "Admin",
      },
      {
        label: "Admin Afiliados",
        icon: <Settings size={17} className="text-orange-500" />,
        onClick: () => navigate("/admin/afiliados"),
        badge: "Admin",
      },
    ] : []),
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-screen pb-28 overflow-x-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center px-6 pt-10 pb-6"
      >
        {/* Logo FaceGlow como marca no topo */}
        <img src={logoIcon} alt="FaceGlow" className="h-6 object-contain mb-5 opacity-70" />

        {/* Avatar */}
        <div className="relative w-[88px] h-[88px] rounded-full gradient-primary flex items-center justify-center shadow-glow overflow-hidden flex-shrink-0">
          <span className="text-2xl font-extrabold text-primary-foreground select-none">{avatarLetter}</span>
          {avatarUrl && (
            <motion.img
              key={avatarUrl}
              src={avatarUrl}
              alt={displayName}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: isImageLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => { setAvatarUrl(""); setIsImageLoaded(false); }}
            />
          )}
        </div>

        <h1 className="font-heading text-xl font-extrabold text-foreground mt-3 text-center">{displayName}</h1>
        {displayEmail && <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>}

        {/* Badge de plano */}
        <div className={`mt-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${
          isFullAccess
            ? "gradient-primary text-primary-foreground shadow-glow"
            : "bg-muted text-muted-foreground"
        }`}>
          {isFullAccess
            ? "✦ Premium"
            : creditsRemaining > 0
            ? `${creditsRemaining} crédito${creditsRemaining !== 1 ? "s" : ""}`
            : "Plano gratuito"}
        </div>
      </motion.div>

      {/* ── Cards ── */}
      <div className="px-5 space-y-4">

        {/* 1. Análise de Pele */}
        <SkinCard
          skinType={lastSkinType}
          overallScore={lastScore > 0 ? lastScore : undefined}
          conditions={lastConditions}
          imageUrl={lastImageUrl}
          analysisDate={lastAnalysisDate}
          latestAnalysis={latestAnalysis}
          isFullAccess={isFullAccess}
        />

        {/* 2. Aprenda sobre skincare */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          onClick={() => navigate("/aprenda")}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl lg-surface active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)", boxShadow: "0 4px 12px rgba(232,116,138,0.3)" }}>
              <BookOpen size={18} color="white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground leading-tight">Aprenda sobre Skincare</p>
              <p className="text-xs text-muted-foreground mt-0.5">Guias, ingredientes, mitos e rotinas</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground flex-shrink-0">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        {/* 3. Estatísticas */}
        <StatsRow
          totalAnalyses={statsLoading ? 0 : totalAnalyses}
          currentScore={statsLoading ? 0 : bestScore}
          activeProducts={statsLoading ? 0 : activeProducts}
          streakDays={statsLoading ? 0 : streakDays}
        />

        {/* 4. Assinatura */}
        <SubscriptionCard
          isPremium={isPremium}
          isFullAccess={isFullAccess}
          subscriptionType={subscriptionType}
          subscriptionStatus={subscriptionStatus}
          expiresAtUtc={expiresAtUtc}
          creditsRemaining={creditsRemaining}
          onManage={() => navigate("/premium")}
        />

        {/* 5. Conta */}
        <NotificationSettings />

        <AccountCard items={accountItems} />

        {/* 6. Redes sociais */}
        <SocialSection />

        {/* Sair */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-destructive/10 text-destructive font-bold active:scale-[0.97] transition-transform"
        >
          <LogOut size={16} />
          Sair da Conta
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
};

// ── Seção de Redes Sociais ────────────────────────────────────────────────────
function SocialSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42 }}
      className="lg-surface rounded-3xl overflow-hidden"
    >
      {/* Logo + tagline */}
      <div className="flex flex-col items-center py-6 px-5 text-center"
        style={{ borderBottom: "1px solid rgba(232,84,122,0.08)" }}>
        <img src={logoUrl} alt="FaceGlow" className="h-8 mb-2 object-contain" />
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
          Skincare inteligente com IA para a sua pele. Personalize sua rotina e evolua com cada análise.
        </p>
      </div>

      {/* Links sociais */}
      <div className="flex items-center justify-center gap-4 py-4 px-5">
        <a
          href="https://instagram.com/faceglow.soora"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full lg-surface border border-border/40 text-xs font-bold text-foreground active:scale-95 transition-transform"
        >
          <Instagram size={14} className="text-rose-500" />
          @faceglow.soora
        </a>
        <a
          href="https://app.faceglow-soora.me"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full lg-surface border border-border/40 text-xs font-bold text-foreground active:scale-95 transition-transform"
        >
          <Globe size={14} className="text-blue-500" />
          faceglow-soora.me
        </a>
      </div>

      {/* Versão */}
      <p className="text-center text-[10px] text-muted-foreground/60 pb-4">
        v{APP_VERSION} · FaceGlow © {new Date().getFullYear()}
      </p>
    </motion.div>
  );
}

export default Profile;
