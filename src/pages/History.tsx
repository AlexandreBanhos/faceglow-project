import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, TrendingUp, TrendingDown, Maximize2, Camera } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingComparatorCard } from "@/components/FloatingComparatorCard";
import { ScoreChart } from "@/components/history/ScoreChart";
import { type AnalysisResponse } from "@/lib/analysis";
import { fetchUserAnalyses, readAnalysesCache } from "@/lib/analysisClient";
import { AuroraBackdrop } from "@/components/shared";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatSkinType = (skinType: string) => {
  const normalized = (skinType ?? "").trim();
  if (!normalized) return "—";
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()}`;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80";

// Carrega generosamente para o gráfico ter dados completos
const INITIAL_LOAD = 50;
const MORE_PAGE_SIZE = 10;

const History = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyses, setAnalyses] = useState<AnalysisResponse[]>(() => readAnalysesCache(INITIAL_LOAD) ?? []);
  const [isLoading, setIsLoading] = useState(() => readAnalysesCache(INITIAL_LOAD) === null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<{
    before: AnalysisResponse;
    after: AnalysisResponse;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchUserAnalyses(INITIAL_LOAD, 0, { forceRefresh: false })
      .then((loaded) => {
        if (!mounted) return;
        setAnalyses(loaded);
        setHasMore(loaded.length === INITIAL_LOAD);
      })
      .catch(() => {
        if (!mounted) return;
        setAnalyses([]);
        setHasMore(false);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, []); // in-memory cache (180s TTL) gerencia revalidação — sem re-fetch a cada navegação

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const loaded = await fetchUserAnalyses(MORE_PAGE_SIZE, analyses.length);
      setAnalyses((prev) => [...prev, ...loaded]);
      setHasMore(loaded.length === MORE_PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCompare = (before: AnalysisResponse, after: AnalysisResponse) => {
    setSelectedForComparison({ before, after });
    setIsComparatorOpen(true);
  };

  // Estatísticas do header
  const headerStats = useMemo(() => {
    if (analyses.length < 2) return null;
    const chronological = [...analyses].sort(
      (a, b) =>
        new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()
    );
    const first = chronological[0];
    const last = chronological.at(-1)!;
    const delta = last.overallScore - first.overallScore;
    const spanDays = Math.round(
      (new Date(last.createdAtUtc).getTime() -
        new Date(first.createdAtUtc).getTime()) /
        86_400_000
    );
    const weeks = Math.round(spanDays / 7);
    return { delta, spanDays, weeks };
  }, [analyses]);

  const latestAnalysis = analyses[0] ?? null;

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-screen pb-28"
        style={{ background: "var(--grad-aurora)" }}
      >
        <AuroraBackdrop tone="warm" className="-z-10" />
        <div className="px-6 pt-14 pb-2">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="mx-6 mt-4 space-y-3">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-h-screen pb-28 overflow-x-hidden"
      style={{ background: "var(--grad-aurora)" }}
    >
      <AuroraBackdrop tone="warm" className="-z-10" />
      <div className="relative z-10 mx-auto w-full max-w-md">

        {/* Comparador before/after */}
        <AnimatePresence>
          {isComparatorOpen && selectedForComparison && (
            <FloatingComparatorCard
              isOpen={isComparatorOpen}
              onClose={() => setIsComparatorOpen(false)}
              beforeImage={selectedForComparison.before.imageUrl || fallbackImage}
              afterImage={selectedForComparison.after.imageUrl || fallbackImage}
              beforeLabel={`Antes · ${formatDate(selectedForComparison.before.createdAtUtc)}`}
              afterLabel={`Depois · ${formatDate(selectedForComparison.after.createdAtUtc)}`}
              beforeScore={selectedForComparison.before.overallScore}
              afterScore={selectedForComparison.after.overallScore}
              fallbackImage={fallbackImage}
            />
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <div className="px-6 pt-14 pb-3">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-extrabold text-foreground leading-tight">
              Sua pele, em movimento
            </h1>
            {headerStats ? (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm text-muted-foreground font-medium">
                  {analyses.length} análise{analyses.length !== 1 ? "s" : ""}
                </span>
                {headerStats.weeks > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-sm text-muted-foreground font-medium">
                      {headerStats.weeks} sem.
                    </span>
                  </>
                )}
                {headerStats.delta !== 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background:
                        headerStats.delta > 0
                          ? "rgba(22,163,74,0.1)"
                          : "rgba(220,38,38,0.1)",
                      color: headerStats.delta > 0 ? "#16A34A" : "#DC2626",
                    }}
                  >
                    {headerStats.delta > 0 ? "+" : ""}
                    {headerStats.delta} pts
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe a evolução da sua pele
              </p>
            )}
          </motion.div>
        </div>

        {/* ── Gráfico de evolução adaptativo ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-6 mt-2 mb-4 p-4 lg-surface rounded-2xl"
        >
          <p
            className="fg-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3"
          >
            Evolução do score
          </p>
          <ScoreChart analyses={analyses} />
        </motion.div>

        {/* ── Botão Nova Análise ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="px-6 mb-5"
        >
          <button
            onClick={() => navigate("/analyze")}
            className="coral-button w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5"
          >
            <Camera size={18} />
            Nova Análise
          </button>
        </motion.div>

        {/* ── Lista de análises ── */}
        <div className="px-6 space-y-2.5">
          {analyses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="lg-surface p-6 rounded-2xl text-center"
            >
              <p className="text-sm font-semibold text-foreground mb-1">
                Nenhuma análise ainda
              </p>
              <p className="text-xs text-muted-foreground">
                Faça sua primeira análise para começar a acompanhar sua pele.
              </p>
            </motion.div>
          ) : (
            <>
              <p className="fg-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Análises
              </p>
              {analyses.map((item, i) => {
                const next = analyses[i + 1];
                const change = next ? item.overallScore - next.overallScore : null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    className="rounded-2xl lg-surface overflow-hidden"
                  >
                    <div className="flex items-center gap-3.5 p-3.5">
                      {/* Foto com badge de score */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-border/40 bg-muted flex-shrink-0">
                        <img
                          src={item.imageUrl || fallbackImage}
                          alt={formatDate(item.createdAtUtc)}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = fallbackImage;
                          }}
                        />
                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full gradient-primary flex items-center justify-center shadow-md">
                          <span className="text-[10px] font-extrabold text-primary-foreground">
                            {item.overallScore}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-tight">
                          {formatDate(item.createdAtUtc)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">Pele</span>
                          <span
                            className="text-[11px] font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
                          >
                            {formatSkinType(item.skinType)}
                          </span>
                        </div>
                      </div>

                      {/* Delta */}
                      {change !== null && change !== 0 && (
                        <div
                          className={`flex items-center gap-0.5 text-xs font-bold flex-shrink-0 ${
                            change > 0 ? "text-green-500" : "text-orange-500"
                          }`}
                        >
                          {change > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {change > 0 ? "+" : ""}
                          {change}
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {latestAnalysis && item.id !== latestAnalysis.id && (
                          <button
                            onClick={() => handleCompare(item, latestAnalysis)}
                            className="liquiglass-button w-8 h-8 rounded-xl flex items-center justify-center"
                            title="Comparar com análise mais recente"
                          >
                            <Maximize2 size={14} className="text-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate("/results", { state: { analysis: item } })
                          }
                          className="liquiglass-button w-8 h-8 rounded-xl flex items-center justify-center"
                        >
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Carregar mais */}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="liquiglass-button w-full py-3 rounded-2xl text-sm font-semibold text-foreground disabled:opacity-50"
                >
                  {isLoadingMore ? "Carregando..." : "Carregar mais"}
                </button>
              )}
            </>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
};

export default History;
