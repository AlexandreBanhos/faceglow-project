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
