import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";

const BillingCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 pt-5 pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/premium")}
          className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Pagamento</p>
          <h1 className="text-2xl font-extrabold text-foreground">Checkout cancelado</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-[1.8rem] border border-border/70 bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <CircleX size={28} className="text-rose-600" />
          <div>
            <p className="text-base font-extrabold text-foreground">Você cancelou o pagamento</p>
            <p className="text-sm text-muted-foreground">Nenhuma cobrança foi concluída. Você pode tentar novamente quando quiser.</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Button type="button" className="w-full rounded-2xl" onClick={() => navigate("/premium")}>Tentar novamente</Button>
          <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={() => navigate("/profile")}>Voltar ao perfil</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default BillingCancel;
