-- Permite que o dono edite o pedido e remova ingressos dele (tela /cinema/:id/editar).
-- Mesmo critério das policies existentes: dono do pedido = auth.uid().

create policy cinema_pedidos_update on public.cinema_pedidos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy cinema_ingressos_delete on public.cinema_ingressos
  for delete
  using (exists (
    select 1 from public.cinema_pedidos
    where cinema_pedidos.id = cinema_ingressos.pedido_id
      and cinema_pedidos.user_id = auth.uid()
  ));
