import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Camera } from "lucide-react";
import { assertSupabaseConfigured } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

interface FormData {
  institution: string;
  course: string;
  education_level: string;
  cpf: string;
  birth_date: string;
  card_photo_url: string;
}

const EMPTY: FormData = {
  institution: "", course: "", education_level: "",
  cpf: "", birth_date: "", card_photo_url: "",
};

const EDUCATION_LEVELS = [
  "Graduação", "Pós-graduação", "Mestrado", "Doutorado", "Técnico", "Ensino Médio",
];

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3}\.\d{3}\.\d{3})(\d{1,2})/, "$1-$2");
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function CarteirinhaEditModal({ isOpen, onClose, onSaved }: Props) {
  const [form, setForm]         = useState<FormData>(EMPTY);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [userName, setUserName] = useState("");
  const [userCode, setUserCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Carrega dados existentes ao abrir
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    const load = async () => {
      try {
        const authUser = await getCurrentUser();
        if (!authUser || !mounted) return;
        const sb = assertSupabaseConfigured();
        const [{ data }, { data: uRow }] = await Promise.all([
          sb.from("user_profiles")
            .select("institution, course, education_level, cpf, birth_date, card_photo_url")
            .eq("user_id", authUser.id)
            .maybeSingle(),
          sb.from("users").select("user_code").eq("id", authUser.id).maybeSingle(),
        ]);
        if (!mounted) return;
        const name =
          (authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "").trim() ||
          authUser.email?.split("@")[0] || "Membro";
        setUserName(name);
        setUserCode(uRow?.user_code ?? "");
        setForm({
          institution:     data?.institution     ?? "",
          course:          data?.course          ?? "",
          education_level: data?.education_level ?? "",
          cpf:             data?.cpf             ?? "",
          birth_date:      data?.birth_date      ?? "",
          card_photo_url:  data?.card_photo_url  ?? "",
        });
        setPhotoPreview(data?.card_photo_url ?? "");
        setPhotoFile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;
      const sb = assertSupabaseConfigured();

      let photoUrl = form.card_photo_url;

      // Upload de foto se houver arquivo selecionado
      if (photoFile) {
        const ext  = photoFile.name.split(".").pop() ?? "jpg";
        const path = `${authUser.id}/card-photo.${ext}`;
        const { error: upErr } = await sb.storage
          .from("wallet-photos")
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

        if (!upErr) {
          const { data: { publicUrl } } = sb.storage
            .from("wallet-photos")
            .getPublicUrl(path);
          photoUrl = publicUrl;
        }
      }

      await sb.from("user_profiles").upsert(
        {
          user_id:         authUser.id,
          institution:     form.institution,
          course:          form.course,
          education_level: form.education_level,
          cpf:             form.cpf,
          birth_date:      form.birth_date || null,
          card_photo_url:  photoUrl,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.4)", zIndex: 60 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl bg-white"
            style={{ maxHeight: "90vh", zIndex: 70 }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: "90vh" }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <h2 className="font-bold text-base text-gray-900">Dados da carteirinha</h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div
                    className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: "#c0507a30", borderTopColor: "#c0507a" }}
                  />
                </div>
              ) : (
                <div className="px-5 py-5 space-y-4 pb-8">

                  {/* Foto da carteirinha */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Foto da carteirinha</p>
                    <div className="flex gap-4">
                      {/* Foto + botão abaixo */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div
                          className="w-[90px] h-[110px] rounded-xl overflow-hidden flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #c0507a, #e8a080)" }}
                        >
                          {photoPreview ? (
                            <img src={photoPreview} alt="" className="w-full h-full object-cover object-top" />
                          ) : (
                            <Camera size={28} className="text-white/70" />
                          )}
                        </div>
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 active:bg-gray-50 transition-colors"
                        >
                          <Camera size={12} />
                          {photoPreview ? "Trocar" : "Escolher"}
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </div>

                      {/* Dados ao lado */}
                      <div className="flex-1 flex flex-col justify-center gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Nome</p>
                          <p className="text-sm font-bold text-gray-800 leading-snug">{userName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Validade</p>
                          <p className="text-sm font-semibold text-gray-700">{`30/03/${new Date().getFullYear() + 1}`}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Código</p>
                          <p className="text-sm font-semibold text-gray-700 font-mono tracking-wider">{userCode || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Instituição */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                      Instituição de ensino
                    </label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#c0507a] transition-colors bg-white"
                      value={form.institution}
                      onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                      placeholder="Ex: UFF, USP, UFMG…"
                    />
                  </div>

                  {/* Curso */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Curso</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#c0507a] transition-colors bg-white"
                      value={form.course}
                      onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
                      placeholder="Ex: Odontologia, Direito…"
                    />
                  </div>

                  {/* Nível de ensino */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                      Nível de ensino
                    </label>
                    <select
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#c0507a] transition-colors bg-white appearance-none"
                      value={form.education_level}
                      onChange={(e) => setForm((f) => ({ ...f, education_level: e.target.value }))}
                    >
                      <option value="">Selecionar…</option>
                      {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">CPF</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#c0507a] transition-colors bg-white"
                      value={form.cpf}
                      onChange={(e) => setForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                  </div>

                  {/* Data de nascimento */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                      Data de nascimento
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#c0507a] transition-colors"
                      value={form.birth_date}
                      onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                    />
                  </div>

                  {/* Salvar */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 mt-2"
                    style={{ background: "linear-gradient(135deg, #c0507a, #e8a080)" }}
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={15} />
                        Salvar alterações
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
