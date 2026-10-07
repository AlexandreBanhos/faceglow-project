import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ImagePlus, Plus, Trash2, Loader2 } from "lucide-react";
import { AuroraBackdrop } from "@/components/shared";
import {
  createPedido, getPedido, updatePedido, uploadCinemaImage,
  LOCAIS, IDIOMAS, SALAS, TAG_3D, idiomaDaTag, salaDaTag, is3D, type Idioma, type Sala,
} from "@/lib/cinema";
import { getCurrentUser } from "@/lib/auth";
import logoIcon from "@/assets/logos/logo-faceglow.svg";

// `id` presente = ingresso já salvo (na edição mantém token e resgate)
interface TicketDraft {
  id?: string;
  tipo: string;
  assento: string;
  resgatado?: boolean;
}

const inputClass =
  "w-full mt-1.5 px-3.5 py-3 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

const LOCAL_OUTRO = "__outro__";

function isLocalPadrao(local: string) {
  return (LOCAIS as readonly string[]).includes(local);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ISO → valores dos inputs date/time no fuso local
function splitDataHora(iso: string) {
  const d = new Date(iso);
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-[11px] font-semibold mt-1" style={{ color: "#e8829a" }}>{msg}</p>;
}

function LabeledInput({
  label, id, value, onChange, placeholder, type = "text", required,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        {label}{required && <span aria-hidden="true" className="ml-0.5" style={{ color: "#e8829a" }}>*</span>}
      </label>
      <input
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default function CinemaNew() {
  const navigate = useNavigate();
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const isEdit = !!pedidoId;
  const fileRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState<string>(LOCAIS[0]);
  // Caso excepcional: local fora da lista padrão, digitado à mão
  const [localManual, setLocalManual] = useState(false);
  const [sala, setSala] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [idioma, setIdioma] = useState<Idioma>("DUB");
  const [tem3D, setTem3D] = useState(false);
  const [salaTipo, setSalaTipo] = useState<Sala | null>(null);
  // Tags antigas fora do padrão (ex: "IMAX" digitado à mão) são preservadas ao salvar
  const [tagsLegadas, setTagsLegadas] = useState<string[]>([]);
  const [tickets, setTickets] = useState<TicketDraft[]>([{ tipo: "", assento: "" }]);
  const [imagemAtual, setImagemAtual] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingPedido, setLoadingPedido] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edição: preenche o formulário com o pedido salvo
  useEffect(() => {
    if (!pedidoId) return;
    let mounted = true;
    getPedido(pedidoId)
      .then((p) => {
        if (!mounted) return;
        const dh = splitDataHora(p.data_hora);
        const idiomaSalvo = p.tags.map(idiomaDaTag).find(Boolean);
        setTitulo(p.titulo);
        setLocal(p.local || LOCAIS[0]);
        setLocalManual(!!p.local && !isLocalPadrao(p.local));
        setSala(p.sala ?? "");
        setData(dh.data);
        setHora(dh.hora);
        if (idiomaSalvo) setIdioma(idiomaSalvo);
        setTem3D(p.tags.some(is3D));
        setSalaTipo(p.tags.map(salaDaTag).find(Boolean) ?? null);
        setTagsLegadas(p.tags.filter((t) => !idiomaDaTag(t) && !is3D(t) && !salaDaTag(t)));
        setImagemAtual(p.imagem_url);
        setImagePreview(p.imagem_url);
        const ings = p.ingressos ?? [];
        setTickets(ings.length > 0
          ? ings.map((i) => ({ id: i.id, tipo: i.tipo, assento: i.assento ?? "", resgatado: !!i.resgatado_em }))
          : [{ tipo: "", assento: "" }]);
      })
      .catch((e: unknown) => { if (mounted) setSaveError(e instanceof Error ? e.message : "Erro ao carregar pedido."); })
      .finally(() => { if (mounted) setLoadingPedido(false); });
    return () => { mounted = false; };
  }, [pedidoId]);

  function handleLocalSelect(value: string) {
    if (value === LOCAL_OUTRO) {
      setLocalManual(true);
      setLocal("");
    } else {
      setLocalManual(false);
      setLocal(value);
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function addTicket() {
    setTickets((prev) => [...prev, { tipo: "", assento: "" }]);
  }

  function removeTicket(i: number) {
    setTickets((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTicket(i: number, field: "tipo" | "assento", val: string) {
    setTickets((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!titulo.trim()) errs.titulo = "Título obrigatório.";
    if (!data) errs.data = "Data obrigatória.";
    if (!hora) errs.hora = "Hora obrigatória.";
    if (localManual && !local.trim()) errs.local = "Informe o local.";
    tickets.forEach((t, i) => {
      if (!t.tipo.trim()) errs[`ticket_tipo_${i}`] = "Tipo obrigatório.";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Não autenticado.");

      let imagem_url = imagemAtual;
      if (imageFile) imagem_url = await uploadCinemaImage(imageFile, user.id);

      const base = {
        titulo: titulo.trim(),
        local: local.trim(),
        sala: sala.trim(),
        data_hora: new Date(`${data}T${hora}`).toISOString(),
        tags: [idioma, ...(tem3D ? [TAG_3D] : []), ...(salaTipo ? [salaTipo] : []), ...tagsLegadas],
        imagem_url,
      };
      const ingressos = tickets
        .filter((t) => t.tipo.trim())
        .map((t) => ({ id: t.id, tipo: t.tipo.trim(), assento: t.assento.trim() }));

      const pedido = isEdit
        ? await updatePedido(pedidoId!, { ...base, ingressos })
        : await createPedido({ ...base, ingressos: ingressos.map(({ tipo, assento }) => ({ tipo, assento })) });

      navigate(`/cinema/${pedido.id}`, { replace: true });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative w-full min-h-screen pb-12 overflow-x-hidden" style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" className="-z-10" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-8 pb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center active:bg-muted/80 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-extrabold text-foreground">{isEdit ? "Editar pedido" : "Novo pedido"}</h1>
        </div>
        <img src={logoIcon} alt="FaceGlow" className="h-6 opacity-40" />
      </div>

      {loadingPedido ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 space-y-5"
      >
        {/* Upload de imagem */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Imagem</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-44 rounded-2xl overflow-hidden border-2 border-dashed border-border/50 flex items-center justify-center bg-muted/30 active:bg-muted/50 transition-colors relative"
            aria-label={imagePreview ? "Trocar imagem" : "Selecionar imagem"}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                <ImagePlus size={28} />
                <p className="text-xs font-semibold">Toque para adicionar imagem</p>
              </div>
            )}
          </button>
          <input
            ref={fileRef} type="file" accept="image/*" className="sr-only"
            onChange={handleImagePick} aria-hidden="true"
          />
        </div>

        {/* Campos principais */}
        <div className="lg-surface rounded-2xl p-4 space-y-4">
          <div>
            <LabeledInput
              id="titulo" label="Título" value={titulo} onChange={setTitulo}
              placeholder="ex: Inception" required
            />
            <FieldError msg={errors.titulo} />
          </div>
          <div>
            <label htmlFor="local" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Local</label>
            <select
              id="local"
              value={localManual ? LOCAL_OUTRO : local}
              onChange={(e) => handleLocalSelect(e.target.value)}
              className={inputClass}
            >
              {LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value={LOCAL_OUTRO}>Outro local…</option>
            </select>
            {localManual && (
              <>
                <input
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Nome do cinema ou shopping"
                  aria-label="Outro local"
                  autoFocus
                  className={inputClass}
                />
                <FieldError msg={errors.local} />
              </>
            )}
          </div>
          <LabeledInput id="sala" label="Sala" value={sala} onChange={setSala} placeholder="ex: Sala 3" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <LabeledInput id="data" label="Data" value={data} onChange={setData} type="date" required />
              <FieldError msg={errors.data} />
            </div>
            <div>
              <LabeledInput id="hora" label="Hora" value={hora} onChange={setHora} type="time" required />
              <FieldError msg={errors.hora} />
            </div>
          </div>
        </div>

        {/* Idioma, sessão e sala */}
        <div className="lg-surface rounded-2xl p-4 space-y-4">
          <div>
            <p id="idioma-label" className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Idioma</p>
            <div role="radiogroup" aria-labelledby="idioma-label" className="grid grid-cols-3 gap-2">
              {IDIOMAS.map((op) => {
                const ativo = idioma === op;
                return (
                  <button
                    key={op}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setIdioma(op)}
                    className="py-2.5 rounded-xl text-sm font-extrabold tracking-wide transition-colors"
                    style={ativo
                      ? { background: "#812627", color: "#fff" }
                      : { background: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Sessão</p>
            <button
              type="button"
              aria-pressed={tem3D}
              onClick={() => setTem3D((v) => !v)}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold tracking-wide transition-colors"
              style={tem3D
                ? { background: "#0C1960", color: "#fff" }
                : { background: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}
            >
              3D
            </button>
          </div>

          <div>
            <p id="sala-label" className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Sala</p>
            <div role="radiogroup" aria-labelledby="sala-label" className="grid grid-cols-3 gap-2">
              {([null, ...SALAS] as (Sala | null)[]).map((op) => {
                const ativo = salaTipo === op;
                return (
                  <button
                    key={op ?? "padrao"}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setSalaTipo(op)}
                    className="py-2.5 rounded-xl text-sm font-extrabold tracking-wide transition-colors"
                    style={ativo
                      ? { background: "hsl(var(--foreground))", color: "hsl(var(--background))" }
                      : { background: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}
                  >
                    {op ?? "Padrão"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ingressos */}
        <div className="lg-surface rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ingressos</p>
          {tickets.map((t, i) => (
            <div key={t.id ?? `novo-${i}`} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                {t.resgatado && (
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Resgatado</p>
                )}
                <input
                  value={t.tipo}
                  onChange={(e) => updateTicket(i, "tipo", e.target.value)}
                  placeholder="Tipo (ex: Meia, Inteira)"
                  aria-label={`Tipo do ingresso ${i + 1}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <FieldError msg={errors[`ticket_tipo_${i}`]} />
                <input
                  value={t.assento}
                  onChange={(e) => updateTicket(i, "assento", e.target.value)}
                  placeholder="Assento (ex: F12)"
                  aria-label={`Assento do ingresso ${i + 1}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {tickets.length > 1 && (
                <button
                  type="button" onClick={() => removeTicket(i)}
                  className="w-9 h-9 mt-0.5 rounded-xl bg-muted/40 flex items-center justify-center active:bg-muted/60 flex-shrink-0"
                  aria-label={`Remover ingresso ${i + 1}`}
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button" onClick={addTicket}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border/50 text-xs font-bold text-muted-foreground active:bg-muted/30 transition-colors"
          >
            <Plus size={13} /> Adicionar ingresso
          </button>
        </div>

        {/* Erro de save */}
        {saveError && (
          <p className="text-xs font-semibold text-center" style={{ color: "#e8829a" }}>{saveError}</p>
        )}

        {/* Botão salvar */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm coral-button shadow-glow active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando…</> : isEdit ? "Salvar alterações" : "Salvar pedido"}
        </button>
      </motion.div>
      )}
    </div>
  );
}
