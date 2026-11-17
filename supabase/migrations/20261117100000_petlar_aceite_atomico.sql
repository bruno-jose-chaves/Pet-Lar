-- L-34: aceite do tutor numa única transação (atualiza a proposta e tira os pets que ficaram de fora).
create or replace function public.portal_aceitar(p_id uuid, p_row jsonb, p_ficam uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.propostas set
    status = 'aceita',
    payload = coalesce(p_row->'payload', payload),
    servico = coalesce(p_row->>'servico', servico),
    valor_total = coalesce((p_row->>'valor_total')::numeric, valor_total),
    valor_cheio = coalesce((p_row->>'valor_cheio')::numeric, valor_cheio),
    data_inicio = coalesce((p_row->>'data_inicio')::date, data_inicio),
    data_fim = coalesce((p_row->>'data_fim')::date, data_fim)
  where id = p_id and status = 'enviada';
  if not found then raise exception 'proposta_nao_aberta'; end if;
  if p_ficam is not null and cardinality(p_ficam) > 0 then
    delete from public.proposta_pets where proposta_id = p_id and pet_id <> all (p_ficam);
  end if;
end $$;
revoke all on function public.portal_aceitar(uuid, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.portal_aceitar(uuid, jsonb, uuid[]) to service_role;
