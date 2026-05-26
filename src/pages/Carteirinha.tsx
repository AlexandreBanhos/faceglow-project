import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { assertSupabaseConfigured } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { CarteirinhaEditModal } from "@/components/profile/CarteirinhaEditModal";
import headerImg from "@/assets/wallet/header-carteiriha.png";
import fundoImg  from "@/assets/wallet/fundo-carteiriha.png";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3}\.\d{3})(\d{1,2})/, "$1-$2");
}

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function validityLabel() {
  return `Mar/ ${new Date().getFullYear() + 1}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-gray-700 leading-snug">
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium">{value || "—"}</span>
    </p>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

interface ProfileData {
  name: string;
  userCode: string;
  cardPhotoUrl: string;
  cpf: string;
  birth_date: string;
  institution: string;
  course: string;
  education_level: string;
}

export default function Carteirinha() {
  const navigate  = useNavigate();
  const [data, setData]       = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const authUser = await getCurrentUser();
        if (!authUser || !mounted) return;

        const sb = assertSupabaseConfigured();
        const [{ data: uRow }, { data: pRow }] = await Promise.all([
          sb.from("users").select("user_code").eq("id", authUser.id).single(),
          sb.from("user_profiles")
            .select("cpf, birth_date, institution, course, education_level, card_photo_url")
            .eq("user_id", authUser.id)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        const name =
          (authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "").trim() ||
          authUser.email?.split("@")[0] || "Membro";

        const profile: ProfileData = {
          name,
          userCode:        uRow?.user_code       ?? "",
          cardPhotoUrl:    pRow?.card_photo_url   ?? authUser.user_metadata?.avatar_url ?? "",
          cpf:             pRow?.cpf              ?? "",
          birth_date:      pRow?.birth_date       ?? "",
          institution:     pRow?.institution      ?? "",
          course:          pRow?.course           ?? "",
          education_level: pRow?.education_level  ?? "",
        };

        setData(profile);

        const noData = !pRow?.institution && !pRow?.course && !pRow?.cpf &&
                       !pRow?.birth_date && !pRow?.education_level;
        if (noData) setEditOpen(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [refreshKey]);

  useEffect(() => {
    if (!data?.userCode || !canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      `https://faceglow-soora.me/validar/${data.userCode}`,
      { width: 90, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" } }
    ).catch(() => {});
  }, [data?.userCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#e2e8f4" }}>
        <div
          className="w-7 h-7 border-2 rounded-full animate-spin"
          style={{ borderColor: "#c0507a30", borderTopColor: "#c0507a" }}
        />
      </div>
    );
  }

  const avatarLetter = data?.name.charAt(0).toUpperCase() ?? "M";

  return (
    <>
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#e2e8f4" }}>

      {/* Imagem de fundo */}
      <img
        src={fundoImg}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        aria-hidden
        alt=""
      />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Header — imagem clicável para voltar (área transparente top-left) */}
        <div className="relative">
          <img src={headerImg} alt="" className="w-full" draggable={false} />
          {/* Área clicável de voltar sobreposta ao header */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-0 left-0 w-16 h-full"
            aria-label="Voltar"
          />
        </div>

        {/* Conteúdo */}
        <div className="px-5 pt-5 pb-12 max-w-sm mx-auto w-full">

          {/* Botão editar sempre visível */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
            style={{
              background: "#ffffff",
              border: "1.5px solid rgba(192,80,122,0.15)",
              boxShadow: "0 2px 12px rgba(192,80,122,0.08)",
            }}
          >
            <p className="text-sm font-semibold text-gray-700">Minha Carteirinha Digital</p>
            <button
              onClick={() => setEditOpen(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl text-white active:opacity-80 transition-opacity"
              style={{ background: "linear-gradient(135deg, #c0507a, #e8a080)" }}
            >
              Editar
            </button>
          </motion.div>

          {/* Linha de identidade — mesma altura */}
          <div className="flex gap-4 mb-4" style={{ height: 172 }}>

            {/* Foto */}
            <div
              className="flex-shrink-0 w-[134px] h-full rounded-2xl overflow-hidden flex items-center justify-center text-4xl font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg, #c0507a, #e8a080)",
                border: "4px solid #fff",
                boxShadow: "0 4px 18px rgba(0,0,0,0.14)",
              }}
            >
              {data?.cardPhotoUrl ? (
                <img
                  src={data.cardPhotoUrl}
                  alt=""
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                avatarLetter
              )}
            </div>

            {/* QR Code — clicável → validar */}
            <button
              onClick={() => data?.userCode && navigate(`/validar/${data.userCode}`)}
              className="flex-1 h-full rounded-2xl flex flex-col items-center justify-center active:opacity-70 transition-opacity"
              style={{
                padding: 20,
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.65)",
                boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
              }}
            >
              {data?.userCode ? (
                <canvas ref={canvasRef} width={90} height={90} className="rounded-lg pointer-events-none" />
              ) : (
                <div className="w-[90px] h-[90px] rounded-lg bg-gray-100" />
              )}
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center leading-tight">
                Código de uso · CNE
              </p>
              <p className="text-[13px] font-bold text-gray-800 font-mono tracking-wider mt-0.5">
                {data?.userCode || "—"}
              </p>
            </button>
          </div>

          {/* Card de informações — com blur */}
          <div
            className="rounded-3xl px-5 py-5"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 4px 28px rgba(0,0,0,0.09)",
            }}
          >
            <p className="text-[17px] font-bold text-gray-900 mb-3.5 leading-tight">{data?.name}</p>

            <div className="space-y-2">
              <InfoRow label="Ins. Ensino"        value={data?.institution ?? ""} />
              <InfoRow label="Curso"              value={data?.course ?? ""} />
              <InfoRow label="Nível de ensino"    value={data?.education_level ?? ""} />
              <InfoRow label="CPF"                value={data?.cpf ? maskCpf(data.cpf) : ""} />
              <InfoRow label="Data de nascimento" value={data?.birth_date ? fmtDate(data.birth_date) : ""} />
              <InfoRow label="Validade"           value={validityLabel()} />
            </div>
          </div>
        </div>
      </div>
    </div>

      <CarteirinhaEditModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </>
  );
}
