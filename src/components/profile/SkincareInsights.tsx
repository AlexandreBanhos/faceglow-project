/**
 * SkincareInsights — carrossel de cards informativos sobre skincare.
 * Conteúdo parametrizável: os artigos podem ser enriquecidos sem alterar o componente.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, BookOpen } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Article {
  id: string;
  emoji: string;
  category: string;
  categoryColor: string;
  title: string;
  summary: string;
  content: string;
  /** Se fornecido, só aparece para usuários com esse tipo de pele */
  suitableFor?: string[];
}

// ── Artigos base (parametrizáveis) ────────────────────────────────────────────

const ARTICLES: Article[] = [
  {
    id: "order",
    emoji: "1️⃣",
    category: "Rotina",
    categoryColor: "#6366f1",
    title: "Ordem certa dos produtos",
    summary: "Do mais leve ao mais pesado. A sequência importa para absorção.",
    content: `A regra de ouro do skincare é aplicar do produto mais fino para o mais grosso:\n\n**1. Limpeza** — remove impurezas e permite que o que vier depois absorva bem.\n\n**2. Tônico** — equilibra o pH e prepara a pele.\n\n**3. Sérum** — ativos concentrados (vitamina C, niacinamida, etc.) penetram fundo.\n\n**4. Hidratante** — sela a hidratação e os ativos anteriores.\n\n**5. Protetor solar** (de manhã) — proteção é o último passo e o mais importante.\n\n⚠️ Espere 1-2 minutos entre camadas para absorção completa.`,
  },
  {
    id: "sunscreen",
    emoji: "☀️",
    category: "Proteção",
    categoryColor: "#f59e0b",
    title: "Protetor solar: guia completo",
    summary: "SPF todo dia, mesmo em dias nublados. Você sabe por quê?",
    content: `O protetor solar é o produto anti-envelhecimento mais eficaz que existe.\n\n**Tipos:**\n- **Físico/mineral**: reflete os raios UV. Ideal para peles sensíveis. Ingredientes: óxido de zinco, dióxido de titânio.\n- **Químico**: absorve e neutraliza os raios. Textura mais leve, se espalhada melhor.\n- **Híbrido**: combina os dois — equilíbrio entre proteção e conforto.\n\n**FPS:**\n- FPS 30 bloqueia ~97% dos UVB\n- FPS 50 bloqueia ~98%\n- FPS 50+ para peles mais claras ou exposição prolongada\n\n**Reaplicação:** necessária a cada 2h em exposição direta ao sol.\n\n☁️ Raios UVA atravessam nuvens e vidros — use mesmo dentro de casa.`,
  },
  {
    id: "serum",
    emoji: "🧪",
    category: "Ingredientes",
    categoryColor: "#8b5cf6",
    title: "O que é sérum e quando usar",
    summary: "Alta concentração de ativos em textura leve. Potencializa sua rotina.",
    content: `Séruns são concentrados de ativos que penetram nas camadas mais profundas da pele. São mais eficazes que cremes comuns para tratar condições específicas.\n\n**Principais tipos:**\n\n**Vitamina C** — antioxidante, uniformiza o tom, estimula colágeno. Use de manhã.\n\n**Ácido hialurônico** — hidratação profunda, adequado para todos os tipos. Pode usar manhã e noite.\n\n**Niacinamida** — poros dilatados, oleosidade, manchas. Muito bem tolerado.\n\n**Retinol** — anti-envelhecimento, renova células. Somente à noite (veja o card de retinol).\n\n**Peptídeos** — firmeza e elasticidade. Noite.\n\n💡 Regra: máximo 2 séruns por vez para evitar irritação.`,
  },
  {
    id: "retinol",
    emoji: "✨",
    category: "Anti-aging",
    categoryColor: "#ec4899",
    title: "Retinol: mitos e como usar",
    summary: "O ingrediente mais estudado do anti-aging. Mas exige introdução gradual.",
    content: `O retinol (vitamina A) é o ativo mais estudado para anti-envelhecimento, mas muita gente abandona por usar errado.\n\n**O que faz:**\n- Acelera a renovação celular\n- Reduz linhas finas e rugas\n- Melhora textura e uniformidade\n- Ajuda no controle da acne\n\n**Como introduzir:**\n1. Comece com concentração baixa (0.1-0.25%)\n2. Use só 2x por semana nas primeiras 4 semanas\n3. Aumente gradualmente conforme tolerância\n4. SEMPRE use protetor solar no dia seguinte\n\n**Purging (erupção inicial):** normal nas primeiras semanas — o retinol acelera a renovação e "traz" impurezas à superfície. Dura até 6 semanas.\n\n⚠️ Não misture com AHAs/BHAs na mesma noite e evite durante gravidez.`,
  },
  {
    id: "myths",
    emoji: "🔍",
    category: "Mitos",
    categoryColor: "#0ea5e9",
    title: "Mitos e verdades do skincare",
    summary: "A internet está cheia de desinformação. Veja o que é real.",
    content: `**❌ MITO: Pele oleosa não precisa de hidratante**\nVerdade: pele oleosa precisa de hidratação — falta de água faz as glândulas sebáceas produzirem mais óleo. Use hidratantes oil-free, em gel.\n\n**❌ MITO: Quanto mais ingredientes, melhor**\nVerdade: pele simples é pele saudável. 3-5 produtos bem escolhidos superam 10 produtos aleatórios.\n\n**❌ MITO: Produtos naturais são sempre seguros**\nVerdade: muitos extratos naturais são alérgenos comuns (lavanda, citros, chá tree). "Natural" não significa hipoalergênico.\n\n**❌ MITO: É preciso sentir o produto agindo (ardência/picada)**\nVerdade: sensação de ardência indica irritação. Produtos eficazes não precisam "picar".\n\n**✅ VERDADE: Protetor solar de dia + retinol à noite = combo poderoso**\n\n**✅ VERDADE: Hidratação vem de dentro também — beba água.**`,
  },
  {
    id: "oily",
    emoji: "💧",
    category: "Pele Oleosa",
    categoryColor: "#16a34a",
    title: "Cuidados para pele oleosa",
    summary: "Controle de oleosidade sem ressecar. O equilíbrio é a chave.",
    content: `Pele oleosa produz excesso de sebo pelas glândulas sebáceas. O objetivo não é eliminar o óleo — ele protege a pele — mas equilibrar.\n\n**Limpeza:** 2x ao dia com limpador suave (evite sabonetes agressivos que ressequem — isso piora a oleosidade).\n\n**Ingredientes aliados:**\n- **Niacinamida** (2-10%) — reduz produção de sebo\n- **Ácido salicílico** — desobstrui poros, anti-acne\n- **Retinol** — normaliza renovação celular\n- **Zinco** — anti-inflamatório\n\n**Hidratante:** gel-creme ou sérum de ácido hialurônico. Evite óleos e manteigas.\n\n**Protetor solar:** gel-creme ou fluido oil-free com toque seco.\n\n💡 Papel matificante ao longo do dia ajuda sem danificar a pele.`,
    suitableFor: ["oily", "combination"],
  },
  {
    id: "dry",
    emoji: "🌸",
    category: "Pele Seca",
    categoryColor: "#f97316",
    title: "Cuidados para pele seca",
    summary: "Barreira cutânea fortalecida. Ingredientes que retêm hidratação.",
    content: `Pele seca tem barreira cutânea comprometida, perdendo água facilmente (TEWL — transepidermal water loss).\n\n**Ingredientes essenciais:**\n- **Ácido hialurônico** — capta água do ambiente\n- **Ceramidas** — restauram a barreira lipídica\n- **Glicerina** — umectante potente\n- **Esqualano** — emoliente leve, não comedogênico\n- **Manteiga de karité / óleo de argan** — oclusivos que selam hidratação\n\n**Rotina:**\n1. Limpador cremoso (não espuma)\n2. Tônico hidratante (sem álcool)\n3. Sérum de ácido hialurônico\n4. Hidratante rico em ceramidas\n5. Opcional: óleo facial por cima à noite (oclusivo)\n\n🛁 Banhos quentes demasiado longos destroem a barreira cutânea. Prefira água morna.`,
    suitableFor: ["dry"],
  },
  {
    id: "acids",
    emoji: "⚗️",
    category: "Esfoliação",
    categoryColor: "#dc2626",
    title: "AHA, BHA e PHA: qual usar?",
    summary: "Ácidos para renovação celular e poros. Cada um tem seu lugar.",
    content: `Os ácidos esfoliam quimicamente, removendo células mortas sem o atrito físico das esponjas.\n\n**AHAs (ácidos alfa-hidroxi) — ácido glicólico, lático, mandélico:**\n- Agem na superfície\n- Hidratam ao exfoliar\n- Ideais para manchas, textura, pele seca\n- Fotossensibilizantes — use à noite e protetor de manhã\n\n**BHA (ácido beta-hidroxi) — ácido salicílico:**\n- Penetra no poro\n- Anti-inflamatório\n- Ideal para acne, poros dilatados, oleosidade\n\n**PHAs (ácidos poliidroxi):**\n- Exfoliação mais suave\n- Ideais para peles sensíveis\n- Hidratantes\n\n**Frequência:** 2-3x por semana no início. Não use AHA e retinol na mesma noite.\n\n⚠️ Após esfoliação, a pele fica mais vulnerável ao sol — proteção solar obrigatória.`,
  },
];

// Renderiza texto com **negrito** de forma segura (sem dangerouslySetInnerHTML)
function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

// ── Card individual ────────────────────────────────────────────────────────────

function InsightCard({ article, onClick }: { article: Article; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[200px] rounded-3xl overflow-hidden text-left active:scale-95 transition-transform shadow-sm"
      style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.7)" }}
    >
      {/* Header colorido */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ background: `linear-gradient(135deg, ${article.categoryColor}18, ${article.categoryColor}0a)` }}
      >
        <span className="text-2xl leading-none">{article.emoji}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${article.categoryColor}20`, color: article.categoryColor }}
        >
          {article.category}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-3 pb-4">
        <p className="text-sm font-bold text-foreground leading-tight mb-1.5">{article.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{article.summary}</p>
        <div className="flex items-center gap-1 mt-3" style={{ color: article.categoryColor }}>
          <span className="text-[10px] font-bold">Ler mais</span>
          <ChevronRight size={10} />
        </div>
      </div>
    </button>
  );
}

// ── Modal de artigo ────────────────────────────────────────────────────────────

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const paragraphs = article.content.split("\n\n").filter(Boolean);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    if (!modal) return;

    const focusables = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[800] flex items-end justify-center"
      style={{ backgroundColor: "rgba(15,10,30,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-modal-title"
    >
      <motion.div
        ref={modalRef}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 360 }}
        className="w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: "white", maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header colorido */}
        <div
          className="flex items-start justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${article.categoryColor}15, ${article.categoryColor}06)` }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none mt-0.5" aria-hidden="true">{article.emoji}</span>
            <div>
              <span className="text-[10px] font-bold" style={{ color: article.categoryColor }}>
                {article.category}
              </span>
              <h2 id="article-modal-title" className="text-base font-extrabold text-foreground leading-tight mt-0.5">{article.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar artigo"
            className="w-8 h-8 rounded-full bg-white/70 border border-white/60 flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <X size={14} className="text-slate-600" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-8 space-y-3" style={{ scrollbarWidth: "none" }}>
          {paragraphs.map((p, i) => {
            const hasBold = p.includes("**");
            if (hasBold) {
              return <p key={i} className="text-sm text-foreground leading-relaxed">{renderBoldText(p)}</p>;
            }
            return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>;
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface SkincareInsightsProps {
  skinType?: string;
}

export function SkincareInsights({ skinType }: SkincareInsightsProps) {
  const [selected, setSelected] = useState<Article | null>(null);

  const normalizedType = skinType?.toLowerCase() ?? "";

  // Filtra artigos: mostra genéricos + específicos do tipo de pele do usuário
  const visibleArticles = ARTICLES.filter(a => {
    if (!a.suitableFor) return true;
    return a.suitableFor.some(t => normalizedType.includes(t));
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 mb-3">
        <BookOpen size={15} className="text-primary" />
        <h2 className="text-sm font-bold text-foreground">Aprenda sobre skincare</h2>
      </div>

      {/* Carrossel horizontal */}
      <div
        className="flex gap-3 overflow-x-auto pb-3 px-5"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {visibleArticles.map(article => (
          <InsightCard
            key={article.id}
            article={article}
            onClick={() => setSelected(article)}
          />
        ))}
      </div>

      {/* Modal do artigo */}
      <AnimatePresence>
        {selected && (
          <ArticleModal article={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
