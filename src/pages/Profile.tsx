import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, LogOut, Shield, Bell, HelpCircle, Sparkles, Pencil, Lock, TrendingUp, Flame, Trophy, Coins, Settings, PackageOpen, ScanFace, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser, signOut } from "@/lib/auth";
import { fetchProfileSummary, fetchDashboardSummary, invalidateAnalysisCache } from "@/lib/analysisClient";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import { getSkinProfile, SEX_LABELS, SKIN_TYPE_LABELS, GOAL_LABELS } from "@/lib/skinProfile";
import type { SkinProfile } from "@/lib/skinProfile";
import { getUserCatalog } from "@/lib/userCatalog";
import { AuroraBackdrop } from "@/components/shared";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPremium: hasActivePlan, creditsRemaining, isFullAccess } = useIsPremium();
  const { isAdmin } = useIsAdmin();
  const [displayName, setDisplayName] = useState("Usuario");
  const [displayEmail, setDisplayEmail] = useState("usuario@email.com");
  const [displayPhone, setDisplayPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [userReady, setUserReady] = useState(false);
  const [skinProfile, setSkinProfile] = useState<SkinProfile>({});
  const [catalogCount, setCatalogCount] = useState(0);
  const [lastAnalysisImageUrl, setLastAnalysisImageUrl] = useState("");
  const [lastAnalysisSkinType, setLastAnalysisSkinType] = useState("");
  const [lastAnalysisConditions, setLastAnalysisConditions] = useState<Record<string, boolean>>({});
  const [isSkinProfileModalOpen, setIsSkinProfileModalOpen] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<unknown>(null);

  // Efeito 1: Carregar dados do usuario
  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!mounted) {
          return;
        }

        if (!user) {
          setUserReady(true);
          return;
        }

        const metadataName =
          (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
          (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
          "";

        const fallbackName = user.email?.split("@")[0] ?? "Usuario";
        setDisplayName(metadataName || fallbackName);
        setDisplayEmail(user.email ?? "usuario@email.com");
        setDisplayPhone(typeof user.user_metadata?.phone_number === "string" ? user.user_metadata.phone_number : "");
        
        // Se tem avatar_url customizado, marca como custom
        const customAvatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";
        setAvatarUrl(customAvatarUrl);
        setIsCustomAvatar(!!customAvatarUrl);
        
        setUserReady(true);
      } catch (error) {
        console.error("[Profile] Erro ao carregar usuario:", error);
        if (mounted) setUserReady(true);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Efeito 2: Carregar dados do perfil (sincronizado com userReady)
  useEffect(() => {
    let mounted = true;

    const loadProfileData = async () => {
      setIsLoadingStats(true);
      try {
        const summary = await fetchProfileSummary();
        const dashboard = await fetchDashboardSummary(false);

        if (!mounted) return;

        if (summary) {
          setTotalAnalyses(summary.stats.totalAnalyses);
          setBestScore(summary.stats.bestScore);
          setStreakDays(summary.stats.streakDays);
        } else {
          setTotalAnalyses(0);
          setBestScore(0);
          setStreakDays(0);
        }

        if (dashboard?.latest) {
          if (dashboard.latest.skinType) setLastAnalysisSkinType(dashboard.latest.skinType);
          setLatestAnalysis(dashboard.latest);
        }
      } catch (error) {
        console.error("[Profile] Erro ao carregar dados:", error);
        if (mounted) { setTotalAnalyses(0); setBestScore(0); setStreakDays(0); }
      } finally {
        if (mounted) setIsLoadingStats(false);
      }
    };

    // So carregue dados apos usuario estar pronto
    if (userReady) {
      loadProfileData();
    }

    return () => {
      mounted = false;
    };
  }, [userReady]);

  // Efeito 3: Carregar imagem da Ãºltima anÃ¡lise como avatar padrÃ£o (se usuÃ¡rio nÃ£o tem avatar customizado)
  useEffect(() => {
    let mounted = true;

    const loadLastAnalysisImage = async () => {
      // Se tem avatar customizado, nÃ£o sobrescrever
      if (isCustomAvatar) return;

      try {
        const dashboard = await fetchDashboardSummary(false);
        if (!mounted) return;

        if (dashboard.latest?.imageUrl) {
          const img = new Image();
          img.onload = () => { if (mounted) { setAvatarUrl(dashboard.latest.imageUrl); setIsImageLoaded(false); } };
          img.src = dashboard.latest.imageUrl;
        }
      } catch (error) {
        console.error("[Profile] Erro ao carregar imagem:", error);
      }
    };

    if (userReady && !isCustomAvatar) {
      loadLastAnalysisImage();
    }

    return () => {
      mounted = false;
    };
  }, [userReady, isCustomAvatar]);

  // Efeito 4: Carregar perfil da pele e catÃ¡logo
  useEffect(() => {
    setSkinProfile(getSkinProfile());
    getCurrentUser().then((user) => {
      setCatalogCount(getUserCatalog(user?.id).length);
    });

    const raw = localStorage.getItem("faceglow-last-analysis");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { imageUrl?: string; conditions?: Record<string, boolean> };
        if (parsed.imageUrl) setLastAnalysisImageUrl(parsed.imageUrl);
        if (parsed.conditions) setLastAnalysisConditions(parsed.conditions);
      } catch {
        // ignore
      }
    }
  }, []);

  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return phone;
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  };

  const CONDITION_LABELS: Record<string, string> = {
    acne: "Acne",
    olheiras: "Olheiras",
    poros: "Poros dilatados",
    manchas: "Manchas",
    labiosRessecados: "LÃ¡bios ressecados",
    linhasFinas: "Linhas finas",
    vermelhidao: "VermelhidÃ£o",
    espinhasAtivas: "Espinhas ativas",
    cravos: "Cravos",
    ressecamento: "Ressecamento",
  };

  const activeConditions = Object.entries(lastAnalysisConditions)
    .filter(([, v]) => v === true)
    .map(([k]) => CONDITION_LABELS[k] ?? k);

  const avatarLetter = useMemo(() => {
    const source = displayName.trim() || displayEmail.trim() || "U";
    return source.charAt(0).toUpperCase();
  }, [displayEmail, displayName]);

  const handleLogout = async () => {
    invalidateAnalysisCache();
    localStorage.removeItem("faceglow-last-analysis");
    localStorage.removeItem("faceglow-pending-analyze-image");
    localStorage.removeItem("faceglow-pending-analyze-face-validation");
    localStorage.removeItem("faceglow-pending-analyze-at");
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  type MenuItem = {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    badge?: string;
  };

  const baseMenuItems: MenuItem[] = [
    { label: "Alterar dados e foto", icon: <Pencil size={18} className="text-foreground" />, onClick: () => navigate("/profile/edit") },
    { label: "Alterar senha", icon: <Lock size={18} className="text-foreground" />, onClick: () => navigate("/profile/password") },
    { label: "NotificaÃ§Ãµes", icon: <Bell size={18} className="text-foreground" />, onClick: () => undefined },
    { label: "Privacidade e SeguranÃ§a", icon: <Shield size={18} className="text-foreground" />, onClick: () => undefined },
    { label: "Ajuda e Suporte", icon: <HelpCircle size={18} className="text-foreground" />, onClick: () => undefined },
  ];

  const menuItems: MenuItem[] = isAdmin 
    ? [
        ...baseMenuItems,
        { 
          label: "Administrator", 
          icon: <Settings size={18} className="text-orange-500" />, 
          onClick: () => navigate("/admin/products"),
          badge: "Admin"
        },
      ]
    : baseMenuItems;

  if (isLoadingStats && !displayName) {
    return <LoadingSpinnerFullScreen message="Carregando seu perfil..." />;
  }

  return (
    <div className="relative w-full min-h-screen pb-28 overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10">
        <h1 className="text-2xl font-extrabold text-foreground">Perfil</h1>
      </div>

      <div className="mx-6 mt-14 mb-5 relative">
        {/* Avatar half outside top edge */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-glow overflow-hidden z-10">
          <span className="text-2xl font-extrabold text-primary-foreground">{avatarLetter}</span>
          {avatarUrl && (
            <motion.img
              key={avatarUrl}
              src={avatarUrl}
              alt="Avatar"
              className="absolute w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: isImageLoaded ? 1 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setAvatarUrl("")}
            />
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg-surface pt-14 pb-5 flex flex-col items-center text-center rounded-2xl"
        >
          <p className="font-heading text-xl font-bold text-foreground">{displayName}</p>
          <button
            onClick={() => setIsSkinProfileModalOpen(true)}
            className="mt-2 flex items-center gap-1 text-xs font-bold text-primary"
          >
            Ver detalhes perfil
            <ChevronRight size={12} className="text-primary" />
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-6 grid grid-cols-2 gap-3 mb-5"
      >
        {/* Streak com ring animado */}
        <div className="lg-surface p-3 rounded-2xl flex flex-col items-center justify-center">
          {(() => {
            const R = 20;
            const circ = 2 * Math.PI * R;
            const weekProgress = streakDays === 0 ? 0 : Math.min((streakDays % 7 || 7) / 7, 1);
            const offset = circ * (1 - weekProgress);
            return (
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r={R} fill="none" stroke="#F3F4F6" strokeWidth="4" />
                <motion.circle
                  cx="26" cy="26" r={R}
                  fill="none" stroke="#F59E0B" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.35 }}
                  transform="rotate(-90 26 26)"
                />
                <text x="26" y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill="#F59E0B" dominantBaseline="middle">{streakDays}</text>
                <text x="26" y="33" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#9CA3AF" dominantBaseline="middle">dias</text>
              </svg>
            );
          })()}
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-1">SequÃªncia</p>
        </div>

        {/* Demais stats */}
        {[
          { label: "AnÃ¡lises", value: totalAnalyses.toString(), icon: TrendingUp },
          { label: "Melhor Score", value: bestScore.toString(), icon: Trophy },
          { label: "CrÃ©ditos", value: creditsRemaining.toString(), icon: Coins },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="lg-surface p-4 rounded-2xl text-center">
              <Icon size={22} className="mx-auto text-primary" />
              <p className="text-xl font-extrabold text-foreground mt-2">{stat.value}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Skin Profile Modal */}
      {isSkinProfileModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setIsSkinProfileModalOpen(false); }}
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-full max-w-lg bg-background rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "92dvh" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-4 border-b border-border/40">
              <button
                onClick={() => setIsSkinProfileModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft size={18} className="text-foreground" />
              </button>
              <h2 className="flex-1 text-base font-extrabold text-foreground">Perfil de Pele</h2>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover border-2 border-primary/30" />
              ) : (
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-sm font-extrabold text-white">{avatarLetter}</span>
                </div>
              )}
            </div>

            {/* Section: Escaneamento facial */}
            {lastAnalysisImageUrl && (
              <div className="mx-5 mt-4 p-3 rounded-2xl bg-primary/5 border border-primary/15 flex items-center gap-3">
                <img src={lastAnalysisImageUrl} alt="Escaneamento" className="w-12 h-12 rounded-xl object-cover border border-border/40" />
                <div>
                  <p className="text-xs font-bold text-foreground">Escaneamento facial</p>
                  {bestScore > 0 && <p className="text-xs text-primary font-semibold mt-0.5">Score geral: {bestScore}</p>}
                </div>
                <ScanFace size={18} className="ml-auto text-primary/60" />
              </div>
            )}

            {/* Items list */}
            <div className="overflow-y-auto px-5 py-4 space-y-0" style={{ maxHeight: "calc(92dvh - 220px)" }}>
              {[
                { label: "Nome", value: displayName },
                { label: "Email", value: displayEmail },
                displayPhone ? { label: "Telefone", value: maskPhone(displayPhone) } : null,
                {
                  label: "Tipo de pele",
                  value: lastAnalysisSkinType
                    ? lastAnalysisSkinType.charAt(0).toUpperCase() + lastAnalysisSkinType.slice(1).toLowerCase()
                    : skinProfile.analyzedSkinType
                    ? skinProfile.analyzedSkinType.charAt(0).toUpperCase() + skinProfile.analyzedSkinType.slice(1).toLowerCase()
                    : skinProfile.selfSkinType
                    ? SKIN_TYPE_LABELS[skinProfile.selfSkinType]
                    : null,
                },
                { label: "Sexo", value: skinProfile.sex ? SEX_LABELS[skinProfile.sex] : null },
                { label: "Idade", value: skinProfile.ageRange ? `${skinProfile.ageRange} anos` : null },
                {
                  label: "Problemas de pele",
                  value: activeConditions.length > 0
                    ? activeConditions.join(", ")
                    : null,
                },
                { label: "Meta de pele", value: skinProfile.skinGoal ? GOAL_LABELS[skinProfile.skinGoal] : null },
              ]
                .filter((item): item is { label: string; value: string } => !!item && !!item.value)
                .map((item, i, arr) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 py-3.5 ${
                      i < arr.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <span className="text-sm font-bold text-foreground w-32 shrink-0">{item.label}</span>
                    <span className="flex-1 text-sm text-primary font-semibold truncate">{item.value}</span>
                    <ChevronRight size={14} className="text-primary/60 shrink-0" />
                  </div>
                ))}

              {/* Dicas de skincare */}
              <div className="border-t border-border/40 pt-3.5 flex items-center gap-3">
                <span className="text-sm font-bold text-foreground w-32 shrink-0">Dicas de skincare</span>
                {isFullAccess ? (
                  <button
                    onClick={() => { setIsSkinProfileModalOpen(false); navigate("/routine", latestAnalysis ? { state: { analysis: latestAnalysis } } : undefined); }}
                    className="flex-1 flex items-center gap-1"
                  >
                    <span className="text-sm text-muted-foreground font-semibold">Abrir rotina</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setIsSkinProfileModalOpen(false); navigate("/premium"); }}
                    className="flex-1 flex items-center gap-1"
                  >
                    <span className="text-sm text-primary font-semibold">Assine para ver rotina</span>
                  </button>
                )}
                <ChevronRight size={14} className="text-primary/60 shrink-0" />
              </div>
            </div>

            {/* Bottom action buttons */}
            <div className="px-5 pt-3 pb-8 border-t border-border/40 flex gap-2">
              {isFullAccess ? (
                <button
                  onClick={() => { setIsSkinProfileModalOpen(false); navigate("/routine", latestAnalysis ? { state: { analysis: latestAnalysis } } : undefined); }}
                  className="flex-1 py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                >
                  <Flame size={15} />
                  Minha Rotina
                </button>
              ) : (
                <button
                  onClick={() => { setIsSkinProfileModalOpen(false); navigate("/premium"); }}
                  className="flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-sm font-bold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} />
                  Premium
                </button>
              )}
              <button
                onClick={() => { setIsSkinProfileModalOpen(false); navigate("/meus-produtos"); }}
                className="flex-1 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
              >
                <PackageOpen size={15} />
                {catalogCount > 0 ? `Produtos (${catalogCount})` : "Meus Produtos"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-6 mb-5"
      >
        <button
          onClick={() => navigate("/premium")}
          className="w-full p-4 rounded-2xl gradient-hero text-primary-foreground flex items-center gap-3 active:scale-[0.97] transition-transform shadow-glow"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-bold">
              {hasActivePlan ? "Meu plano" : "Desbloqueie o Premium"}
            </p>
            <p className="text-xs opacity-80 font-medium">
              {hasActivePlan ? "Sobre sua assinatura e recursos" : "AnÃ¡lises ilimitadas e rotinas exclusivas"}
            </p>
          </div>
          <ChevronRight size={18} />
        </button>
      </motion.div>

      <div className="px-6 space-y-2">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            onClick={item.onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl active:scale-[0.98] transition-transform ${
              item.badge ? "bg-orange-500/10 border border-orange-500/30 lg-surface" : "lg-surface"
            }`}
          >
            <span className="w-8 flex items-center justify-center">{item.icon}</span>
            <div className="flex-1 text-left">
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
              {item.badge && (
                <p className="text-xs text-orange-600 font-bold mt-0.5">{item.badge}</p>
              )}
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      <div className="px-6 mt-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-destructive/10 text-destructive font-bold active:scale-[0.97] transition-transform"
        >
          <LogOut size={16} />
          Sair da Conta
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
