import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { assertSupabaseConfigured } from "@/lib/supabase";
import headerImg from "@/assets/wallet/header-carteiriha.png";
import fundoImg  from "@/assets/wallet/fundo-carteiriha.png";

interface ValidationResult {
  is_valid: boolean;
  user_name: string | null;
  membership_status: string | null;
}

function validityLabel() {
  return `Mai/ ${new Date().getFullYear() + 1}`;
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-emerald-600" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}

const ValidarCarteirinha = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const [result, setResult]   = useState<ValidationResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [verifiedAt] = useState(() =>
    new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
  );

  useEffect(() => {
    if (!codigo) { setLoading(false); return; }
    const sb = assertSupabaseConfigured();
    sb.rpc("validate_member_card", { p_code: codigo })
      .then(({ data, error }) => {
        if (error || !data?.[0]) {
          setResult({ is_valid: false, user_name: null, membership_status: null });
          return;
        }
        setResult(data[0] as ValidationResult);
      })
      .catch(() =>
        setResult({ is_valid: false, user_name: null, membership_status: null })
      )
      .finally(() => setLoading(false));
  }, [codigo]);

  const isActive = result?.is_valid && result?.membership_status === "active";

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#e2e8f4" }}>

      {/* Fundo */}
      <img
        src={fundoImg}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        aria-hidden
        alt=""
      />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Header — mesma imagem da carteirinha */}
        <img src={headerImg} alt="" className="w-full" draggable={false} />

        {/* Conteúdo */}
        <div className="px-5 pt-5 pb-12 max-w-sm mx-auto w-full space-y-4">

          {loading ? (
            <div className="flex justify-center py-16">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: "#c0507a30", borderTopColor: "#c0507a" }}
              />
            </div>
          ) : (
            <>
              {/* Badge de status */}
              <div
                className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{
                  background: "#ffffff",
                  border: `1.5px solid ${isActive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
                  boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
                }}
              >
                {isActive ? (
                  <CheckCircle2 size={22} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={22} className="text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-bold text-sm ${isActive ? "text-emerald-700" : "text-red-600"}`}>
                    {isActive ? "Carteirinha válida" : "Carteirinha inválida ou expirada"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Verificado em {verifiedAt}</p>
                </div>
              </div>

              {/* Detalhes */}
              {result?.is_valid && (
                <div
                  className="rounded-3xl overflow-hidden divide-y divide-gray-50"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(255,255,255,0.8)",
                  }}
                >
                  <DetailRow label="Nome"     value={result.user_name ?? "Membro"} />
                  <DetailRow label="Status"   value={isActive ? "Ativo" : "Inativo"} accent={isActive} />
                  <DetailRow label="Validade" value={validityLabel()} />
                </div>
              )}

              {/* Código */}
              <p className="text-center text-xs text-gray-400/60 font-mono pt-1">{codigo}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidarCarteirinha;
