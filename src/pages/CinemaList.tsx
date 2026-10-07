import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Ticket, MapPin, CalendarDays, AlertCircle, Pencil } from "lucide-react";
import { AuroraBackdrop } from "@/components/shared";
import BottomNav from "@/components/BottomNav";
import { listPedidos, type CinemaPedido } from "@/lib/cinema";
import logoIcon from "@/assets/logos/logo-faceglow.svg";

function fmtDataHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function PedidoCard({ pedido, onClick, onEdit }: { pedido: CinemaPedido; onClick: () => void; onEdit: () => void }) {
  const total = pedido.ingressos?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full lg-surface rounded-2xl overflow-hidden flex items-stretch"
    >
    <button
      onClick={onClick}
      className="flex-1 min-w-0 text-left flex gap-0 active:scale-[0.98] transition-transform"
    >
      {/* Faixa de imagem */}
      <div className="w-20 h-20 flex-shrink-0 bg-muted/40 overflow-hidden">
        {pedido.imagem_url ? (
          <img src={pedido.imagem_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full gradient-primary flex items-center justify-center">
            <Ticket size={22} className="text-white/70" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 px-3.5 py-3">
        <p className="text-sm font-bold text-foreground leading-tight truncate">{pedido.titulo}</p>
        {pedido.local && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <MapPin size={10} /> {pedido.local}{pedido.sala ? ` · ${pedido.sala}` : ""}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <CalendarDays size={10} /> {fmtDataHora(pedido.data_hora)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
            #{pedido.codigo}
          </span>
          {total > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground">
              {total} ingresso{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

    </button>

      <button
        onClick={onEdit}
        className="w-11 flex items-center justify-center border-l border-border/30 active:bg-muted/40 transition-colors flex-shrink-0"
        aria-label={`Editar pedido ${pedido.titulo}`}
      >
        <Pencil size={15} className="text-muted-foreground" />
      </button>
    </motion.div>
  );
}

export default function CinemaList() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<CinemaPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listPedidos()
      .then((data) => { if (mounted) setPedidos(data); })
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e.message : "Erro ao carregar pedidos.");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="relative w-full min-h-screen pb-28 overflow-x-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-4">
        <button
          onClick={() => navigate("/profile")}
          className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center active:bg-muted/80 transition-colors flex-shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-extrabold text-foreground">Meus ingressos</h1>
          <p className="text-xs text-muted-foreground">{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}</p>
        </div>
        <img src={logoIcon} alt="FaceGlow" className="h-6 opacity-40" />
      </div>

      <div className="px-5 space-y-3">
        {/* Estado de carregamento */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {/* Erro */}
        {!loading && error && (
          <div className="lg-surface rounded-2xl px-4 py-5 flex items-start gap-3">
            <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Erro ao carregar</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              <button
                onClick={() => { setError(null); setLoading(true); listPedidos().then(setPedidos).catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro")).finally(() => setLoading(false)); }}
                className="text-xs font-bold mt-2" style={{ color: "#e8a9c2" }}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Vazio */}
        {!loading && !error && pedidos.length === 0 && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                <Ticket size={28} className="text-white" />
              </div>
              <p className="font-heading text-lg font-bold text-foreground">Nenhum ingresso ainda</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px]">
                Guarde seus ingressos de cinema e shows aqui.
              </p>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Lista */}
        {!loading && !error && pedidos.map((p) => (
          <PedidoCard
            key={p.id}
            pedido={p}
            onClick={() => navigate(`/cinema/${p.id}`)}
            onEdit={() => navigate(`/cinema/${p.id}/editar`)}
          />
        ))}
      </div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260 }}
        onClick={() => navigate("/cinema/novo")}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl gradient-primary shadow-glow flex items-center justify-center z-20 active:scale-95 transition-transform"
        aria-label="Adicionar ingresso"
      >
        <Plus size={22} className="text-white" />
      </motion.button>

      <BottomNav />
    </div>
  );
}
