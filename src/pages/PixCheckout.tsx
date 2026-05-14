import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Clock, HourglassIcon, AlertCircle, Loader } from "lucide-react";
import { fetchBillingStatus } from "@/lib/billing";

interface PixCheckoutState {
  qrCodeBase64: string;
  qrCode: string;
  amount: number;
  externalReference: string;
  plan: string;
}

export const PixCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PixCheckoutState | undefined;
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    if (!state) {
      navigate("/premium");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, navigate]);

  const handleCopyPix = async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  const handleVerifyPayment = async () => {
    if (!state) return;
    
    setIsVerifying(true);
    setVerificationError("");

    try {
      const data = await fetchBillingStatus({
        externalReference: state.externalReference,
      });

      // Se status Ã© "succeeded" ou "approved", redireciona para sucesso
      if (data.status === "succeeded" || data.status === "approved" || data.isActive) {
        navigate("/premium/success");
      } else if (data.status === "pending") {
        setVerificationError("Pagamento ainda nÃ£o confirmado. Processo pode levar alguns minutos.");
      } else {
        setVerificationError("Pagamento nÃ£o encontrado. Tente novamente ou entre em contato com suporte.");
      }
    } catch (error) {
      console.error("Erro ao verificar:", error);
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Erro ao verificar pagamento. Tente novamente."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (!state) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 hover:bg-card/40 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-foreground" />
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-accent/80 mb-6 shadow-lg">
            <HourglassIcon size={28} className="text-white" />
          </div>

          <h1 className="text-3xl font-black text-foreground mb-2">
            Pagamento PIX
          </h1>
          <p className="text-muted-foreground">
            Escaneie o QR Code ou copie o cÃ³digo PIX
          </p>
        </motion.div>

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 mb-8 p-3 rounded-xl bg-accent/20 border border-accent/30"
        >
          <Clock size={18} className="text-accent" />
          <p className="text-sm font-semibold text-accent">
            QR Code expira em{" "}
            <span className="font-black">
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </span>
          </p>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {state.qrCodeBase64 && (
            <div className="flex justify-center p-6 rounded-3xl bg-card/80 backdrop-blur border border-border shadow-lg">
              <img
                src={`data:image/png;base64,${state.qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-64 h-64 rounded-2xl object-contain"
              />
            </div>
          )}
        </motion.div>

        {/* Amount */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-center mb-8 p-4 rounded-2xl bg-card/70 backdrop-blur border border-border"
        >
          <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
          <p className="text-4xl font-black text-foreground">
            R$ {(state.amount).toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{state.plan}</p>
        </motion.div>

        {/* Copy PIX Code */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleCopyPix}
          className={`w-full p-4 rounded-2xl border-2 font-semibold transition-all mb-4 flex items-center justify-center gap-2 ${
            copied
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:border-primary/50"
          }`}
        >
          <Copy size={18} />
          {copied ? "CÃ³digo copiado!" : "Copiar cÃ³digo PIX"}
        </motion.button>

        {/* Verify Payment Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={handleVerifyPayment}
          disabled={isVerifying}
          className="w-full p-4 rounded-2xl bg-primary/20 border-2 border-primary text-primary font-semibold transition-all mb-6 flex items-center justify-center gap-2 hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader size={18} className="animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar pagamento"
          )}
        </motion.button>

        {/* Verification Error */}
        {verificationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
          >
            {verificationError}
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-8 p-4 rounded-2xl bg-primary/10 border border-primary/20"
        >
          <p className="text-sm font-bold text-foreground">Como pagar:</p>
          <ol className="text-sm text-foreground space-y-2 list-decimal list-inside opacity-80">
            <li>Abra seu app de banco ou carteira digital</li>
            <li>
              <strong>Escaneie o QR Code</strong> acima ou <strong>copie o cÃ³digo</strong>
            </li>
            <li>Confirme a transaÃ§Ã£o</li>
            <li>Seu acesso serÃ¡ ativado automaticamente</li>
          </ol>
        </motion.div>

        {/* Status Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex gap-3"
        >
          <AlertCircle size={18} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-accent opacity-80">
            Seu pagamento Ã© monitorado em tempo real. Assim que confirmar, vocÃª terÃ¡ acesso imediato!
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PixCheckout;
