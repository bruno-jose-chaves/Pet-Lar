-- tira is_admin() da API pública: fica num schema não exposto
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_admin() set schema private;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
-- email_autorizado continua público de propósito (tela de primeiro acesso); só responde sim/não
revoke all on function public.email_autorizado(text) from public;
grant execute on function public.email_autorizado(text) to anon, authenticated;
-- painel_resumo usa o is_admin novo
create or replace function public.painel_resumo(p_hoje date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'hospedados_hoje', (select count(*) from public.propostas p where p.status='aceita' and p.servico='hosp' and p_hoje between p.data_inicio and coalesce(p.data_fim,p.data_inicio)),
    'servicos_hoje', (select count(*) from public.propostas p where p.status='aceita' and p_hoje between p.data_inicio and coalesce(p.data_fim,p.data_inicio)),
    'proximos_7', (select count(*) from public.propostas p where p.status='aceita' and p.data_inicio > p_hoje and p.data_inicio <= p_hoje + 7),
    'aguardando', (select count(*) from public.propostas p where p.status='enviada'),
    'aguardando_valor', (select coalesce(sum(p.valor_total),0) from public.propostas p where p.status='enviada'),
    'a_receber', (select coalesce(sum(g.valor),0) from public.pagamentos g where g.pago_em is null),
    'recebido_mes', (select coalesce(sum(g.valor),0) from public.pagamentos g where g.pago_em >= date_trunc('month', p_hoje) and g.pago_em < date_trunc('month', p_hoje) + interval '1 month'),
    'follow_up', (select count(*) from public.propostas p, public.settings s where p.status='enviada' and p.enviada_em < now() - make_interval(days => s.follow_up_dias))
  ) where (select private.is_admin());
$$;
revoke all on function public.painel_resumo(date) from public, anon;
grant execute on function public.painel_resumo(date) to authenticated;
