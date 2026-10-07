import { assertSupabaseConfigured } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CinemaPedido {
  id: string;
  user_id: string;
  codigo: string;
  titulo: string;
  local: string;
  sala: string;
  data_hora: string;
  tags: string[];
  imagem_url: string | null;
  created_at: string;
  ingressos?: CinemaIngresso[];
}

export interface CinemaIngresso {
  id: string;
  pedido_id: string;
  tipo: string;
  assento: string;
  token: string;
  resgatado_em: string | null;
}

export interface NovoPedidoPayload {
  titulo: string;
  local: string;
  sala: string;
  data_hora: string;
  tags: string[];
  imagem_url: string | null;
  ingressos: { tipo: string; assento: string }[];
}

// Na edição, ingressos com `id` são atualizados (mantendo token e resgate); sem `id` são criados.
export interface EditPedidoPayload extends Omit<NovoPedidoPayload, "ingressos"> {
  ingressos: { id?: string; tipo: string; assento: string }[];
}

// ── Opções padrão ─────────────────────────────────────────────────────────────

export const LOCAIS = ["Shopping Vila Velha", "Shopping Vitória"] as const;
export const IDIOMAS = ["DUB", "LEG", "ORIG"] as const;
export type Idioma = (typeof IDIOMAS)[number];

// Aceita as grafias antigas digitadas à mão (ex: "Dublado")
export function idiomaDaTag(tag: string): Idioma | null {
  const t = tag.trim().toUpperCase();
  if (t === "DUB" || t === "DUBLADO") return "DUB";
  if (t === "LEG" || t === "LEGENDADO") return "LEG";
  if (t === "ORIG" || t === "ORIGINAL") return "ORIG";
  return null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listPedidos(): Promise<CinemaPedido[]> {
  const sb = assertSupabaseConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado.");

  const { data, error } = await sb
    .from("cinema_pedidos")
    .select("*, ingressos:cinema_ingressos(*)")
    .eq("user_id", user.id)
    .order("data_hora", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CinemaPedido[];
}

export async function getPedido(id: string): Promise<CinemaPedido> {
  const sb = assertSupabaseConfigured();

  const { data, error } = await sb
    .from("cinema_pedidos")
    .select("*, ingressos:cinema_ingressos(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CinemaPedido;
}

export async function createPedido(payload: NovoPedidoPayload): Promise<CinemaPedido> {
  const sb = assertSupabaseConfigured();
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: pedido, error: pedidoErr } = await sb
    .from("cinema_pedidos")
    .insert({
      user_id: user.id,
      titulo: payload.titulo,
      local: payload.local,
      sala: payload.sala,
      data_hora: payload.data_hora,
      tags: payload.tags,
      imagem_url: payload.imagem_url,
    })
    .select()
    .single();

  if (pedidoErr) throw pedidoErr;

  if (payload.ingressos.length > 0) {
    const { error: ingErr } = await sb.from("cinema_ingressos").insert(
      payload.ingressos.map((ing) => ({
        pedido_id: (pedido as CinemaPedido).id,
        tipo: ing.tipo,
        assento: ing.assento,
      }))
    );
    if (ingErr) throw ingErr;
  }

  return getPedido((pedido as CinemaPedido).id);
}

export async function updatePedido(id: string, payload: EditPedidoPayload): Promise<CinemaPedido> {
  const sb = assertSupabaseConfigured();

  const { error: pedidoErr } = await sb
    .from("cinema_pedidos")
    .update({
      titulo: payload.titulo,
      local: payload.local,
      sala: payload.sala,
      data_hora: payload.data_hora,
      tags: payload.tags,
      imagem_url: payload.imagem_url,
    })
    .eq("id", id);
  if (pedidoErr) throw pedidoErr;

  const { data: atuais, error: listErr } = await sb
    .from("cinema_ingressos")
    .select("id")
    .eq("pedido_id", id);
  if (listErr) throw listErr;

  const manter = new Set(payload.ingressos.filter((i) => i.id).map((i) => i.id!));
  const remover = (atuais ?? []).map((i) => i.id as string).filter((iid) => !manter.has(iid));
  if (remover.length > 0) {
    const { error } = await sb.from("cinema_ingressos").delete().in("id", remover);
    if (error) throw error;
  }

  for (const ing of payload.ingressos.filter((i) => i.id)) {
    const { error } = await sb
      .from("cinema_ingressos")
      .update({ tipo: ing.tipo, assento: ing.assento })
      .eq("id", ing.id!);
    if (error) throw error;
  }

  const novos = payload.ingressos.filter((i) => !i.id);
  if (novos.length > 0) {
    const { error } = await sb.from("cinema_ingressos").insert(
      novos.map((ing) => ({ pedido_id: id, tipo: ing.tipo, assento: ing.assento }))
    );
    if (error) throw error;
  }

  return getPedido(id);
}

export async function deletePedido(id: string): Promise<void> {
  const sb = assertSupabaseConfigured();
  const { error } = await sb.from("cinema_pedidos").delete().eq("id", id);
  if (error) throw error;
}

export async function resgataIngresso(id: string): Promise<CinemaIngresso> {
  const sb = assertSupabaseConfigured();
  const { data, error } = await sb
    .from("cinema_ingressos")
    .update({ resgatado_em: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as CinemaIngresso;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export async function uploadCinemaImage(file: File, userId: string): Promise<string> {
  const sb = assertSupabaseConfigured();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await sb.storage.from("cinema-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from("cinema-images").getPublicUrl(path);
  return data.publicUrl;
}
