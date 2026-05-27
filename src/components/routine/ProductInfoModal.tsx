import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Clock, ExternalLink, ListChecks, Sparkles, Star, Zap } from "lucide-react";
import { StepIcon } from "@/components/routine/StepIcon";
import { ProgressiveImage } from "@/components/ProgressiveImage";
import { fetchCatalogProducts, type CatalogProduct } from "@/lib/analysisClient";
import { fetchBrandLogos, type BrandLogo } from "@/lib/brandLogos";
import { findStepInfo, findStepInfoByTypeKey } from "@/components/routine/StepInfoModal";

const GRAD = "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)";
const CORAL = "#E8748A";

// ── Mapeamentos ───────────────────────────────────────────────────────────────

const SKIN_LABELS: Record<string, string> = {
  mista: "Mista", oleosa: "Oleosa", seca: "Seca", sensivel: "Sensível", normal: "Normal",
};

const SKIN_COLORS: Record<string, { bg: string; text: string }> = {
  normal:   { bg: "rgba(129,193,167,0.15)", text: "#2d6b52" },
  seca:     { bg: "rgba(59,130,246,0.12)", text: "#1d4ed8" },
  oleosa:   { bg: "rgba(245,158,11,0.12)", text: "#b45309" },
  mista:    { bg: "rgba(249,115,22,0.12)", text: "#c2410c" },
  sensivel: { bg: "rgba(232,116,138,0.12)",text: "#be185d" },
};

const PRICE_RANGE_LABELS: Record<string, string> = {
  low: "Acessível", medium: "Médio", high: "Premium", premium: "Luxo",
};

const CONCERN_LABELS: Record<string, string> = {
  manchas: "Manchas", acne: "Acne", hidratacao: "Hidratação",
  oleosidade: "Oleosidade", sensibilidade: "Sensibilidade",
  ressecamento: "Ressecamento", poros: "Poros", rugas: "Rugas",
  olheiras: "Olheiras", vermelhidao: "Vermelhidão", firmeza: "Firmeza",
  clareamento: "Clareamento", anti_aging: "Antienvelhecimento",
};

function formatConcern(raw: string): string {
  return CONCERN_LABELS[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " ");
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProductInfoModalProps {
  open: boolean;
  productName: string;
  productImage: string | null;
  recommendationReason?: string | null;
  stepLabel: string;
  stepTypeKey: string;
  skinType?: string;
  onClose: () => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ProductInfoModal({
  open, productName, productImage, recommendationReason,
  stepLabel, stepTypeKey, skinType, onClose,
}: ProductInfoModalProps) {
  const [catalogData, setCatalogData] = useState<CatalogProduct | null>(null);
  const [brandLogo, setBrandLogo]     = useState<BrandLogo | null>(null);
  const [loading, setLoading]         = useState(false);

  // stepInfo: prioridade stepTypeKey > catalogData.stepTypeKey > label
  const info = useMemo(() => {
    const effectiveKey = stepTypeKey || catalogData?.stepTypeKey || "";
    const byKey = findStepInfoByTypeKey(effectiveKey);
    if (byKey.stepTypeKey !== "treatment") return byKey; // não é fallback
    return findStepInfo(stepLabel);
  }, [stepTypeKey, stepLabel, catalogData?.stepTypeKey]);

  const normalizedSkin = (skinType ?? "normal")
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const skinAdvice = info.skinAdvice[normalizedSkin] ?? info.skinAdvice["normal"] ?? null;
  const skinLabel  = SKIN_LABELS[normalizedSkin] ?? skinType ?? "Normal";

  // recommendationReason só exibe se for diferente do nome do produto
  const hasRealReason = Boolean(recommendationReason)
    && recommendationReason?.trim().toLowerCase() !== productName.trim().toLowerCase();

  useEffect(() => {
    if (!open || !productName) return;
    let cancelled = false;
    setLoading(true);
    setCatalogData(null);
    setBrandLogo(null);

    const brand = productName.split(" ")[0]; // "Eucerin", "La", etc.

    const trySearch = (query: string) =>
      fetchCatalogProducts(stepTypeKey, query).then(r => {
        if (r.length > 0) return r;
        // fallback: só marca
        return stepTypeKey
          ? fetchCatalogProducts(stepTypeKey, brand)
          : fetchCatalogProducts("", brand);
      });

    Promise.all([trySearch(productName), fetchBrandLogos()])
      .then(([results, logos]) => {
        if (cancelled) return;
        if (results.length > 0) {
          const nameLower = productName.toLowerCase();
          // prioriza produto com nome mais parecido
          const best = results.find(r => r.name.toLowerCase().includes(brand.toLowerCase()))
            ?? results[0];
          setCatalogData(best);
          if (best?.brand) {
            const logo = logos.find(l =>
              l.brand_name.toLowerCase() === best.brand.toLowerCase()
            ) ?? null;
            setBrandLogo(logo);
          }
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, productName, stepTypeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 9998 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
              maxHeight: "90vh", display: "flex", flexDirection: "column",
              borderRadius: "28px 28px 0 0",
              background: "linear-gradient(180deg, #FDF8F6 0%, #FAFAF8 100%)",
              border: "1px solid rgba(255,255,255,0.9)", borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(244,168,199,0.25)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(232,116,138,0.3)" }} />
            </div>

            {/* Scroll body */}
            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ padding: "0 20px 8px", display: "flex", flexDirection: "column", gap: 12 }}>

                {/* ── Header gradiente ── */}
                <div style={{
                  borderRadius: 20, background: GRAD, padding: "20px",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: -24, right: -24, width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.12)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: -32, right: 24, width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Imagem produto */}
                    <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, background: "rgba(255,255,255,0.95)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
                      {productImage ? (
                        <ProgressiveImage src={productImage} alt={productName} loading="lazy" objectFit="contain" stepTypeKey={stepTypeKey} className="w-full h-full p-1" containerClassName="w-full h-full" />
                      ) : (
                        <StepIcon stepTypeKey={stepTypeKey} size={44} background="#E8748A" />
                      )}
                    </div>

                    {/* Textos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
                        {info.title}
                      </p>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.25 }}>
                        {productName}
                      </h2>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, marginTop: 8, background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}>
                        <Clock size={11} color="white" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "white" }}>{info.frequency}</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── Por que este produto + tagline ── */}
                {(hasRealReason || catalogData?.tagline) && (
                  <div style={{
                    borderRadius: 16, padding: "14px 16px",
                    background: "linear-gradient(135deg, rgba(232,116,138,0.07) 0%, rgba(244,168,199,0.06) 100%)",
                    border: "1.5px solid rgba(232,116,138,0.22)",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    {/* Header: título + logo da marca */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(232,116,138,0.3)" }}>
                          <Sparkles size={12} color="white" />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: CORAL, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                          Por que este produto
                        </span>
                      </div>
                      {/* Logo da marca */}
                      {brandLogo && (
                        <div style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 10, background: "rgba(255,255,255,0.9)", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
                          <img
                            src={brandLogo.logo_url}
                            alt={brandLogo.brand_name}
                            onError={() => setBrandLogo(null)}
                            style={{ height: 22, width: "auto", maxWidth: 90, objectFit: "contain", display: "block" }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Motivo da recomendação — só exibe se diferente do nome do produto */}
                    {hasRealReason && (
                      <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: 1.65 }}>{recommendationReason}</p>
                    )}

                    {/* Tagline do produto — aparece após carregar */}
                    {catalogData?.tagline && (
                      <>
                        <div style={{ height: 1, background: "rgba(232,116,138,0.15)" }} />
                        <p style={{ margin: 0, fontSize: 12, color: "#4B5563", lineHeight: 1.7, fontStyle: "italic" }}>
                          {catalogData.tagline}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* ── Sobre o produto (dados do catálogo) ── */}
                {(loading || catalogData) && (
                  <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(232,116,138,0.1)", padding: "16px", boxShadow: "0 1px 6px rgba(232,116,138,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <SectionHeader icon={<Star size={12} color="white" />} label="Sobre o produto" />

                    {loading && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[60, 40, 80, 50].map((w, i) => (
                          <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 6, background: "rgba(0,0,0,0.07)" }} />
                        ))}
                      </div>
                    )}

                    {catalogData && (
                      <>
                        {/* Marca + preço */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{catalogData.brand}</span>
                            {catalogData.isStaffPick && (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Star size={10} style={{ color: CORAL, fill: CORAL }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: CORAL }}>Escolha FaceGlow</span>
                              </div>
                            )}
                          </div>
                          {/* Preço */}
                          {(catalogData.priceAvg || catalogData.priceRange) && (
                            <div style={{ marginLeft: "auto", textAlign: "right" }}>
                              {catalogData.priceAvg ? (
                                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: CORAL }}>
                                  R$ {catalogData.priceAvg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              ) : null}
                              {catalogData.priceRange && (
                                <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(232,116,138,0.1)", color: CORAL }}>
                                  {PRICE_RANGE_LABELS[catalogData.priceRange] ?? catalogData.priceRange}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Separador */}
                        {((catalogData.compatibleSkinTypes?.length ?? 0) > 0 || (catalogData.targetsConcerns?.length ?? 0) > 0 || catalogData.description) && (
                          <div style={{ height: 1, background: "rgba(232,116,138,0.1)" }} />
                        )}

                        {/* Descrição */}
                        {catalogData.description && (
                          <p style={{ margin: 0, fontSize: 12, color: "#4B5563", lineHeight: 1.7 }}>
                            {catalogData.description}
                          </p>
                        )}

                        {/* Tipos de pele */}
                        {(catalogData.compatibleSkinTypes?.length ?? 0) > 0 && (
                          <div>
                            <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tipos de pele</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {catalogData.compatibleSkinTypes!.map(skin => {
                                const colors = SKIN_COLORS[skin] ?? { bg: "rgba(148,163,184,0.12)", text: "#64748b" };
                                return (
                                  <span key={skin} style={{
                                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                                    background: colors.bg, color: colors.text,
                                  }}>
                                    {SKIN_LABELS[skin] ?? skin}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Preocupações tratadas */}
                        {(catalogData.targetsConcerns?.length ?? 0) > 0 && (
                          <div>
                            <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Preocupações tratadas</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {catalogData.targetsConcerns!.map(concern => (
                                <span key={concern} style={{
                                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                                  background: "rgba(232,116,138,0.1)", color: CORAL,
                                  border: "1px solid rgba(232,116,138,0.2)",
                                }}>
                                  {formatConcern(concern)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      </>
                    )}
                  </div>
                )}

                {/* ── O que é (educativo) ── */}
                <Card>
                  <SectionHeader icon={<BookOpen size={12} color="white" />} label="O que é" />
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{info.about}</p>
                </Card>

                {/* ── No seu caso ── */}
                {skinAdvice && (
                  <Card accent>
                    <SectionHeader icon={<Zap size={12} color="white" />} label={`No seu caso — pele ${skinLabel}`} />
                    <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: 1.65 }}>{skinAdvice}</p>
                  </Card>
                )}

                {/* ── Como aplicar ── */}
                <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(232,116,138,0.1)", padding: "14px 16px", boxShadow: "0 1px 6px rgba(232,116,138,0.06)" }}>
                  <SectionHeader icon={<ListChecks size={12} color="white" />} label="Como aplicar" />
                  <div style={{ position: "relative", marginTop: 4 }}>
                    <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, rgba(232,116,138,0.4), rgba(244,168,199,0.1))" }} />
                    {info.howTo.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i < info.howTo.length - 1 ? 14 : 0 }}>
                        <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", boxShadow: "0 3px 10px rgba(232,116,138,0.35)", zIndex: 1 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "9px 12px", border: "1px solid rgba(232,116,138,0.1)", marginTop: 4 }}>
                          <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: 1.55 }}>{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div style={{ flexShrink: 0, padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(to top, #FAFAF8 70%, transparent)", display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(productName)}`, "_blank", "noopener,noreferrer")}
                style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD, border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(232,116,138,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <ExternalLink size={16} />
                Buscar produto
              </button>
              <button
                onClick={onClose}
                style={{ width: "100%", height: 44, borderRadius: 14, background: "transparent", border: "1.5px solid rgba(232,116,138,0.3)", color: CORAL, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Card({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      borderRadius: 16, padding: "14px 16px",
      background: accent
        ? "linear-gradient(135deg, rgba(232,116,138,0.07) 0%, rgba(244,168,199,0.06) 100%)"
        : "rgba(255,255,255,0.75)",
      border: accent ? "1.5px solid rgba(232,116,138,0.22)" : "1px solid rgba(232,116,138,0.1)",
      boxShadow: accent ? "none" : "0 1px 6px rgba(232,116,138,0.06)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #E8748A 0%, #F4A8C7 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(232,116,138,0.3)" }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#E8748A", textTransform: "uppercase", letterSpacing: "0.09em" }}>
        {label}
      </span>
    </div>
  );
}
