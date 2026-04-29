import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBillingStatus } from "@/lib/billing";

const BillingPending = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Aguardando confirmação do pagamento via webhook.");

  useEffect(() => {
    const externalReference = searchParams.get("external_reference") ?? undefined;
    const externalId = searchParams.get("external_id") ?? undefined;

    let mounted = true;

    const checkStatus = async () => {
      try {
        const result = await fetchBillingStatus({ externalReference, externalId });
        if (!mounted) {
          return;
        }

        if (result.isActive) {
          navigate("/premium/success", { replace: true });
          return;
        }

        setMessage("Pagamento identificado. Aguardando confirmação final do gateway.");
      } catch {
        if (!mounted) {
          return;
        }
        setMessage("Ainda não foi possível validar o pagamento. Tente novamente em instantes.");
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams]);

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
          <h1 className="text-2xl font-extrabold text-foreground">Confirmação pendente</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-[1.8rem] border border-border/70 bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <LoaderCircle size={28} className="text-primary animate-spin" />
          <div>
            <p className="text-base font-extrabold text-foreground">Processando pagamento</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Button type="button" className="w-full rounded-2xl" onClick={() => navigate("/premium/success")}>Atualizar status</Button>
          <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={() => navigate("/premium")}>Voltar para assinatura</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default BillingPending;
