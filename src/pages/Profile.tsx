import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, Lock, Bell, Shield, HelpCircle, Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser, signOut } from "@/lib/auth";
import { fetchProfileSummary, fetchDashboardSummary, invalidateAnalysisCache } from "@/lib/analysisClient";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AuroraBackdrop } from "@/components/shared";
import type { LifestyleAnswers } from "@/components/analyze/LifestyleQuestionnaire";
import type { AnalysisResponse } from "@/lib/analysis";
import { SkinCard } from "@/components/profile/SkinCard";
import { LifestyleCard } from "@/components/profile/LifestyleCard";
import { StatsRow } from "@/components/profile/StatsRow";
import { SubscriptionCard } from "@/components/profile/SubscriptionCard";
import { AccountCard } from "@/components/profile/AccountCard";

const QUIZ_ANSWERS_KEY   = "faceglow-quiz-answers";
const QUIZ_COMPLETED_KEY = "faceglow-quiz-completed";

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

  // ── Análise mais recente ─────────────────────────────────────────────────
  const [lastSkinType, setLastSkinType]                 = useState("");
  const [lastScore, setLastScore]                       = useState(0);
  const [lastImageUrl, setLastImageUrl]                 = useState("");
  const [lastConditions, setLastConditions]             = useState<Record<string, boolean>>({});
  const [lastAnalysisDate, setLastAnalysisDate]         = useState<string | undefined>();
  const [latestAnalysis, setLatestAnalysis]             = useState<AnalysisResponse | null>(null);

  // ── Quiz / lifestyle ─────────────────────────────────────────────────────
  const [quizAnswers, setQuizAnswers] = useState<LifestyleAnswers | null>(null);

  // ── Efeito 1: dados do usuário ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((user) => {
        if (!mounted || !user) { setUserReady(true); return; }
        const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
        setDisplayName(name || user.email?.split("@")[0] || "Usuario");
        setDisplayEmail(user.email ?? "");
        const custom = user.user_metadata?.avatar_url ?? "";
        setAvatarUrl(custom);
        setIsCustomAvatar(!!custom);
        setUserReady(true);
      })
      .catch(() => setUserReady(true));
    return () => { mounted = false; };
  }, []);

  // ── Efeito 2: estatísticas + análise (paralelo) ──────────────────────────
  useEffect(() => {
    if (!userReady) return;
    let mounted = true;

    Promise.all([
      fetchProfileSummary().catch(() => null),
      fetchDashboardSummary(false).catch(() => null),
    ]).then(([summary, dashboard]) => {
      if (!mounted) return;

      if (summary?.stats) {
        setTotalAnalyses(summary.stats.totalAnalyses);
        setBestScore(summary.stats.bestScore);
        setStreakDays(summary.stats.streakDays);
      }

      const latest = dashboard?.latest as AnalysisResponse | null | undefined;
      if (latest) {
        setLastSkinType(latest.skinType ?? "");
        setLastScore(latest.overallScore ?? 0);
        setLastAnalysisDate(latest.createdAtUtc);
        setLatestAnalysis(latest);
        if (!isCustomAvatar && latest.imageUrl) setAvatarUrl(latest.imageUrl);
      }
    });

    return () => { mounted = false; };
  }, [userReady, isCustomAvatar]);

  // ── Efeito 3: dados do localStorage ─────────────────────────────────────
  useEffect(() => {
    // Última análise (conditions + imageUrl)
    try {
      const raw = localStorage.getItem("faceglow-last-analysis");
      if (raw) {
        const parsed = JSON.parse(raw) as { imageUrl?: string; conditions?: Record<string, boolean> };
        if (parsed.imageUrl)   setLastImageUrl(parsed.imageUrl);
        if (parsed.conditions) setLastConditions(parsed.conditions);
      }
    } catch { /* ignora */ }

    // Respostas do questionário
    try {
      const raw = localStorage.getItem(QUIZ_ANSWERS_KEY);
      if (raw) setQuizAnswers(JSON.parse(raw) as LifestyleAnswers);
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
    { label: "Editar perfil",          icon: <Pencil    size={17} className="text-foreground" />,      onClick: () => navigate("/profile/edit")      },
    { label: "Alterar senha",          icon: <Lock      size={17} className="text-foreground" />,      onClick: () => navigate("/profile/password")  },
    { label: "Notificações",           icon: <Bell      size={17} className="text-foreground" />,      onClick: () => {}                             },
    { label: "Privacidade e Segurança",icon: <Shield    size={17} className="text-foreground" />,      onClick: () => {}                             },
    { label: "Ajuda e Suporte",        icon: <HelpCircle size={17} className="text-foreground" />,     onClick: () => {}                             },
    ...(isAdmin ? [{
      label: "Administrator",
      icon: <Settings size={17} className="text-orange-500" />,
      onClick: () => navigate("/admin/products"),
      badge: "Admin",
    }] : []),
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full min-h-screen pb-28 overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* ── Header: avatar + nome + badge ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center px-6 pt-12 pb-6"
      >
        {/* Avatar */}
        <div className="relative w-22 h-22 w-[88px] h-[88px] rounded-full gradient-primary flex items-center justify-center shadow-glow overflow-hidden flex-shrink-0">
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

        {/* Nome */}
        <h1 className="font-heading text-xl font-extrabold text-foreground mt-3 text-center">{displayName}</h1>

        {/* Email */}
        {displayEmail && (
          <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>
        )}

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

        {/* 2. Perfil de Pele (questionário) */}
        <LifestyleCard
          answers={quizAnswers}
          onUpdate={() => {
            localStorage.removeItem(QUIZ_COMPLETED_KEY);
            navigate("/analyze");
          }}
        />

        {/* 3. Estatísticas */}
        <StatsRow
          totalAnalyses={totalAnalyses}
          bestScore={bestScore}
          creditsRemaining={creditsRemaining}
          streakDays={streakDays}
        />

        {/* 4. Assinatura / Plano */}
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
        <AccountCard items={accountItems} />

        {/* Sair */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
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

export default Profile;
