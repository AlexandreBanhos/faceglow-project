import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { assertSupabaseConfigured } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { useIsPremium } from "@/hooks/useIsPremium";
import logoUrl from "@/assets/logos/logo-faceglow-escrito-color.webp";

interface CardData {
  name: string;
  userCode: string;
  memberSince: string;
}

const PLAN_LABEL: Record<string, string> = {
  monthly: "Premium Mensal",
  annual: "Premium Anual",
  credits: "Análise Avulsa",
  test: "Acesso Teste",
};

export function WalletCard() {
  const { isFullAccess, subscriptionType, expiresAtUtc } = useIsPremium();
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!user || !mounted) return;

        const sb = assertSupabaseConfigured();
        const { data } = await sb
          .from("users")
          .select("user_code, created_at")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const name =
          (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim() ||
          user.email?.split("@")[0] ||
          "Membro";

        setCardData({
          name,
          userCode: data?.user_code ?? "—",
          memberSince: data?.created_at
            ? new Date(data.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
            : "—",
        });
      } catch {
        /* mantém loading false */
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!cardData?.userCode || cardData.userCode === "—" || !canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      `https://faceglow-soora.me/validar/${cardData.userCode}`,
      { width: 80, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" } }
    ).catch(() => {});
  }, [cardData?.userCode]);

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const planName = isFullAccess
    ? (PLAN_LABEL[subscriptionType ?? ""] ?? "Premium")
    : "Gratuito";

  const expiryLabel = expiresAtUtc
    ? new Date(expiresAtUtc).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md"
      style={{ background: "#fff", maxWidth: 340, margin: "0 auto" }}
    >
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3"
        style={{ background: "linear-gradient(135deg, #c0507a 0%, #e8a080 100%)" }}
      >
        <img src={logoUrl} alt="FaceGlow" className="h-5 object-contain brightness-0 invert" />
        <p className="text-white/70 text-[10px] font-medium mt-0.5 tracking-wide">
          CARTEIRINHA DIGITAL
        </p>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, #c0507a, #e8a080)" }}
          >
            {cardData?.name.charAt(0).toUpperCase()}
          </div>

          {/* Dados + QR */}
          <div className="flex-1 flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest">Membro</p>
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{cardData?.name}</p>
              <span
                className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isFullAccess ? "#c0507a18" : "#f3f4f6",
                  color: isFullAccess ? "#c0507a" : "#6b7280",
                }}
              >
                {planName}
              </span>
            </div>
            <div className="flex-shrink-0">
              <canvas ref={canvasRef} width={80} height={80} className="rounded-lg" />
            </div>
          </div>
        </div>

        <hr className="my-3 border-gray-100" />

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">Código</p>
            <p className="text-sm font-mono font-bold text-gray-800 tracking-wide">
              {cardData?.userCode}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold">
              {expiryLabel ? "Validade" : "Membro desde"}
            </p>
            <p className="text-xs font-semibold text-gray-700">
              {expiryLabel ?? cardData?.memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* Footer decorativo */}
      <div className="relative h-5 overflow-hidden">
        <div
          className="absolute -left-3 bottom-0 w-10 h-10 rounded-full opacity-20"
          style={{ background: "#c0507a" }}
        />
        <div
          className="absolute left-5 bottom-0 w-8 h-8 rounded-full opacity-15"
          style={{ background: "#e8a080" }}
        />
        <div
          className="absolute -right-2 bottom-0 w-14 h-14 rounded-full opacity-15"
          style={{ background: "#c0507a" }}
        />
      </div>
    </div>
  );
}
