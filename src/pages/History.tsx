import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, TrendingUp, TrendingDown, Maximize2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingComparatorCard } from "@/components/FloatingComparatorCard";
import { type AnalysisResponse } from "@/lib/analysis";
import { fetchUserAnalyses } from "@/lib/analysisClient";
import { AuroraBackdrop } from "@/components/shared";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatSkinType = (skinType: string) => {
  const normalized = (skinType ?? "").trim();
  if (!normalized) {
    return "Sem analise";
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`;
};

const fallbackImage = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80";
const HISTORY_PAGE_SIZE = 4;

const History = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyses, setAnalyses] = useState<AnalysisResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<{ before: AnalysisResponse; after: AnalysisResponse } | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      try {
        const loaded = await fetchUserAnalyses(HISTORY_PAGE_SIZE, 0, { forceRefresh: false });
        if (!mounted) return;
        setAnalyses(loaded);
        setHasMore(loaded.length === HISTORY_PAGE_SIZE);
      } catch (error) {
        console.error("Erro ao carregar historia:", error);
        if (!mounted) return;
        setAnalyses([]);
        setHasMore(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    loadHistory();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const loadMoreHistory = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const loaded = await fetchUserAnalyses(HISTORY_PAGE_SIZE, analyses.length);
      setAnalyses((previous) => [...previous, ...loaded]);
      setHasMore(loaded.length === HISTORY_PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const totalEvolution = useMemo(() => {
    if (analyses.length < 2) {
      return 0;
    }

    return analyses[0].overallScore - analyses[analyses.length - 1].overallScore;
  }, [analyses]);

  const latestAnalysis = analyses[0] ?? null;
  const baselineAnalysis = analyses.length > 1 ? analyses[analyses.length - 1] : null;

  const handleCompare = (beforeAnalysis: AnalysisResponse, afterAnalysis: AnalysisResponse) => {
    setSelectedForComparison({ before: beforeAnalysis, after: afterAnalysis });
    setIsComparatorOpen(true);
  };

  if (isLoading && analyses.length === 0) {
    return (
      <div className="min-h-screen pb-28" style={{
        background: "linear-gradient(135deg, rgba(252, 231, 243, 0.6) 0%, rgba(254, 243, 199, 0.5) 50%, rgba(219, 234, 254, 0.5) 100%)",
        backgroundAttachment: "fixed"
      }}>
        <div className="px-6 pt-14 pb-2">
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="mx-6 mt-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen pb-28 overflow-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10 mx-auto w-full max-w-md">
      <AnimatePresence>
        {isComparatorOpen && selectedForComparison && (
          <FloatingComparatorCard
            isOpen={isComparatorOpen}
            onClose={() => setIsComparatorOpen(false)}
            beforeImage={selectedForComparison.before.imageUrl || fallbackImage}
            afterImage={selectedForComparison.after.imageUrl || fallbackImage}
            beforeLabel={`Antes - ${formatDate(selectedForComparison.before.createdAtUtc)}`}
            afterLabel={`Depois - ${formatDate(selectedForComparison.after.createdAtUtc)}`}
            beforeScore={selectedForComparison.before.overallScore}
            afterScore={selectedForComparison.after.overallScore}
            fallbackImage={fallbackImage}
          />
        )}
      </AnimatePresence>

      <div className="px-6 pt-14 pb-2">
        <h1 className="text-2xl font-extrabold text-foreground">HistÃ³rico</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Acompanhe a evoluÃ§Ã£o da sua pele
        </p>
      </div>

      {/* Progress Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-6 mt-4 p-5 lg-surface mb-6 rounded-2xl"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              EvoluÃ§Ã£o Total
            </p>
            <p className="text-4xl font-extrabold text-foreground mt-1">
              {totalEvolution > 0 ? "+" : ""}
              {totalEvolution}
            </p>
            <p className="text-xs font-bold text-primary mt-1">
              pontos de melhora âœ¨
            </p>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {[...analyses.slice(0, 6)].reverse().map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.overallScore / 100) * 64}px` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  className="w-7 rounded-t-lg gradient-primary opacity-70"
                  style={{ opacity: 0.4 + (i / Math.max(analyses.length, 1)) * 0.6 }}
                />
              ))}
          </div>
        </div>
      </motion.div>

      {latestAnalysis && analyses.length > 1 && (
        <>
          {/* AnÃ¡lise Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-6 my-6"
          >
            <h2 className="text-sm font-bold text-foreground mb-3">AnÃ¡lise Mais Recente</h2>
            <div className="flex items-center gap-3 p-3 lg-surface rounded-2xl">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/50 bg-muted flex-shrink-0">
                <img
                  src={latestAnalysis.imageUrl || fallbackImage}
                  alt="AnÃ¡lise principal"
                  loading="eager"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage;
                  }}
                />
                {/* Score Badge Sobreposto */}
                <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                  <span className="text-[9px] font-extrabold text-primary-foreground">{latestAnalysis.overallScore}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Data</p>
                <p className="text-sm font-bold text-foreground">{formatDate(latestAnalysis.createdAtUtc)}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Analysis List */}
      <div className="px-6 space-y-2.5">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
          AnÃ¡lises Anteriores
        </h2>
        {analyses.length === 0 && (
          <div className="lg-surface p-4 rounded-2xl text-sm text-muted-foreground">
            Nenhuma analise encontrada para este usuario.
          </div>
        )}
        {analyses.map((item, i) => {
          const next = analyses[i + 1];
          const change = next ? item.overallScore - next.overallScore : 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="rounded-2xl lg-surface overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-4 text-left"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-border/50 bg-muted flex-shrink-0">
                  <img
                    src={item.imageUrl || fallbackImage}
                    alt={formatDate(item.createdAtUtc)}
                    loading="eager"
                    onError={(event) => {
                      event.currentTarget.src = fallbackImage;
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* Score Badge Sobreposto */}
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-extrabold text-primary-foreground">
                      {item.overallScore}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{formatDate(item.createdAtUtc)}</p>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Sua pele esta</span>
                    <span className="text-sm font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                      {formatSkinType(item.skinType)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {change !== 0 && (
                    <div
                      className={`text-xs font-bold flex items-center gap-0.5 ${
                        change > 0 ? "text-green-500" : "text-orange-500"
                      }`}
                    >
                      {change > 0 ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      {change > 0 ? "+" : ""}{change}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {latestAnalysis && item.id !== latestAnalysis.id && (
                    <button
                      onClick={() => handleCompare(item, latestAnalysis)}
                      className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-primary/20 transition-colors"
                      title="Comparar com anÃ¡lise mais recente"
                    >
                      <Maximize2 size={16} className="text-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/results", { state: { analysis: item } })}
                    className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {!isLoading && analyses.length > 0 && hasMore && (
          <button
            type="button"
            onClick={loadMoreHistory}
            disabled={isLoadingMore}
            className="w-full rounded-2xl border border-border/60 bg-card/80 py-3 text-sm font-semibold text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? "Carregando..." : "Carregar mais"}
          </button>
        )}
      </div>

      <BottomNav />
      </div>
    </div>
  );
};

export default History;
