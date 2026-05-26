import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { AdminNav } from "@/components/AdminNav";
import {
  adminFetchAffiliates, adminCreateAffiliate, adminUpdateAffiliate,
  adminFetchConversions, adminPayout,
  type AffiliateRow, type AffiliateConversionRow,
} from "@/lib/affiliate";

const APP_URL = import.meta.env.VITE_APP_URL as string | undefined ?? window.location.origin;

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(rate: number) {
  return `${(rate * 100).toFixed(0)}%`;
}

export default function AdminAfiliados() {
  const navigate = useNavigate();
  const [affiliates, setAffiliates]   = useState<AffiliateRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [conversions, setConversions] = useState<Record<string, AffiliateConversionRow[]>>({});
  const [showCreate, setShowCreate]   = useState(false);
  const [copied, setCopied]           = useState<string | null>(null);

  // form criar
  const [form, setForm] = useState({ name: "", code: "", rate: "15", email: "", notes: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try { setAffiliates(await adminFetchAffiliates()); }
    catch { toast.error("Erro ao carregar afiliados"); }
    finally { setLoading(false); }
  }

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!conversions[id]) {
      try {
        const data = await adminFetchConversions(id);
        setConversions(prev => ({ ...prev, [id]: data }));
      } catch { toast.error("Erro ao carregar conversões"); }
    }
  }

  async function handleCreate() {
    if (!form.name || !form.code) return toast.error("Nome e código são obrigatórios");
    const rate = parseFloat(form.rate) / 100;
    if (isNaN(rate) || rate <= 0 || rate > 1) return toast.error("Taxa entre 1 e 100%");
    setCreating(true);
    try {
      await adminCreateAffiliate({ name: form.name, code: form.code, commissionRate: rate, email: form.email || undefined, notes: form.notes || undefined });
      toast.success(`Afiliado "${form.name}" criado`);
      setForm({ name: "", code: "", rate: "15", email: "", notes: "" });
      setShowCreate(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setCreating(false); }
  }

  async function toggleActive(aff: AffiliateRow) {
    try {
      await adminUpdateAffiliate(aff.id, { isActive: !aff.isActive });
      await load();
    } catch { toast.error("Erro ao atualizar"); }
  }

  async function handlePayout(aff: AffiliateRow) {
    const pending = (conversions[aff.id] ?? []).filter(c => c.status === "pending");
    if (pending.length === 0) return toast.error("Sem comissões pendentes");
    const confirm = window.confirm(`Registrar pagamento de ${fmtBRL(aff.pendingCommCents)} para ${aff.name}?`);
    if (!confirm) return;
    try {
      await adminPayout(aff.id, pending.map(c => c.id), `Pagamento manual - ${new Date().toLocaleDateString("pt-BR")}`);
      toast.success("Pagamento registrado!");
      setConversions(prev => ({ ...prev, [aff.id]: [] }));
      await load();
    } catch (e) { toast.error((e as Error).message); }
  }

  function copyLink(code: string) {
    const link = `${APP_URL}/?ref=${code}`;
    void navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <AdminNav />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Afiliados</h1>
          <p className="text-xs text-muted-foreground">Links com porcentagem de vendas</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl coral-button text-sm font-semibold"
        >
          <Plus size={14} /> Novo
        </button>
      </div>

      {/* Form criar */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="lg-surface rounded-2xl p-4 mb-4 space-y-3"
        >
          <p className="text-sm font-bold">Novo afiliado</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Maria Influencer"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-primary/40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Código único *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="maria123"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-border text-sm outline-none font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Comissão (%)</label>
              <input type="number" min="1" max="100" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-border text-sm outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">E-mail (opcional)</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@afiliado.com"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-border text-sm outline-none" />
            </div>
          </div>
          {form.code && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 font-mono break-all">
              {APP_URL}/?ref={form.code}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating} className="flex-1 py-2.5 rounded-xl coral-button text-sm font-bold disabled:opacity-60">
              {creating ? "Criando..." : "Criar afiliado"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm">
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : affiliates.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-10">Nenhum afiliado cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {affiliates.map(aff => (
            <div key={aff.id} className="lg-surface rounded-2xl overflow-hidden">
              {/* Card principal */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{aff.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${aff.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {aff.isActive ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {fmtPct(aff.commissionRate)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/{aff.code}</p>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => copyLink(aff.code)}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                      title="Copiar link">
                      {copied === aff.code ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    </button>
                    <a href={`${APP_URL}/?ref=${aff.code}`} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Vendas", value: `${aff.totalConversions}` },
                    { label: "Total vendas", value: fmtBRL(aff.totalSalesCents) },
                    { label: "Comissão pendente", value: fmtBRL(aff.pendingCommCents) },
                  ].map(m => (
                    <div key={m.label} className="bg-muted/40 rounded-xl p-2">
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      <p className="text-sm font-bold">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Botões */}
                <div className="flex gap-2 mt-3">
                  {aff.pendingCommCents > 0 && (
                    <button onClick={() => handlePayout(aff)}
                      className="flex-1 py-2 rounded-xl coral-button text-xs font-bold">
                      Pagar {fmtBRL(aff.pendingCommCents)}
                    </button>
                  )}
                  <button onClick={() => toggleActive(aff)}
                    className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold">
                    {aff.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => toggleExpand(aff.id)}
                    className="w-8 rounded-xl border border-border flex items-center justify-center">
                    {expanded === aff.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Conversões expandidas */}
              {expanded === aff.id && (
                <div className="border-t border-border/50 px-4 py-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Conversões</p>
                  {(conversions[aff.id] ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem conversões ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(conversions[aff.id] ?? []).map(c => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pt-BR")} · {c.planKey}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{fmtBRL(c.amountCents)}</span>
                            <span className="font-bold text-primary">{fmtBRL(c.commissionCents)}</span>
                            <span className={`px-1.5 py-0.5 rounded-full font-semibold ${c.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {c.status === "paid" ? "Pago" : "Pendente"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
