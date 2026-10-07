import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ImagePlus, Plus, Trash2, X, Loader2 } from "lucide-react";
import { AuroraBackdrop } from "@/components/shared";
import { createPedido, uploadCinemaImage } from "@/lib/cinema";
import { getCurrentUser } from "@/lib/auth";
import logoIcon from "@/assets/logos/logo-faceglow.svg";

interface TicketDraft {
  tipo: string;
  assento: string;
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
        className="w-full mt-1.5 px-3.5 py-3 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
      />
    </div>
  );
}

export default function CinemaNew() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");
  const [sala, setSala] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tickets, setTickets] = useState<TicketDraft[]>([{ tipo: "", assento: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function addTicket() {
    setTickets((prev) => [...prev, { tipo: "", assento: "" }]);
  }

  function removeTicket(i: number) {
    setTickets((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTicket(i: number, field: keyof TicketDraft, val: string) {
    setTickets((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!titulo.trim()) errs.titulo = "Título obrigatório.";
    if (!data) errs.data = "Data obrigatória.";
    if (!hora) errs.hora = "Hora obrigatória.";
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

      let imagem_url: string | null = null;
      if (imageFile) {
        imagem_url = await uploadCinemaImage(imageFile, user.id);
      }

      const data_hora = new Date(`${data}T${hora}`).toISOString();

      const pedido = await createPedido({
        titulo: titulo.trim(),
        local: local.trim(),
        sala: sala.trim(),
        data_hora,
        tags,
        imagem_url,
        ingressos: tickets.filter((t) => t.tipo.trim()),
      });

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
          <h1 className="font-heading text-xl font-extrabold text-foreground">Novo pedido</h1>
        </div>
        <img src={logoIcon} alt="FaceGlow" className="h-6 opacity-40" />
      </div>

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
            aria-label="Selecionar imagem"
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
          <LabeledInput id="local" label="Local" value={local} onChange={setLocal} placeholder="ex: Cinemark" />
          <LabeledInput id="sala" label="Sala" value={sala} onChange={setSala} placeholder="ex: Sala 3 — IMAX" />
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

        {/* Tags */}
        <div className="lg-surface rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Tags</p>
          <div className="flex gap-2">
            <input
              id="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="ex: Ação, Dublado…"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Adicionar tag"
            />
            <button
              type="button" onClick={addTag}
              className="px-3.5 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold active:scale-95 transition-transform"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-muted/60 text-foreground">
                  {t}
                  <button onClick={() => removeTag(t)} aria-label={`Remover tag ${t}`}>
                    <X size={11} className="text-muted-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ingressos */}
        <div className="lg-surface rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ingressos</p>
          {tickets.map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
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
          {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando…</> : "Salvar pedido"}
        </button>
      </motion.div>
    </div>
  );
}
