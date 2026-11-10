-- Cobrar resposta (A-03): registro das cobranças e lembretes
alter table public.propostas
  add column if not exists cobrancas int not null default 0,
  add column if not exists cobrada_em timestamptz,
  add column if not exists lembrar_em date;
alter table public.settings add column if not exists expira_dias int not null default 15;
create index if not exists propostas_enviadas_idx on public.propostas (enviada_em) where status = 'enviada';

-- Hoje: só conta para cobrar o que não foi adiado
create or replace function public.painel_resumo(p_hoje date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'hospedados_hoje', (select count(*) from public.propostas p where p.status='aceita' and p.servico='hosp' and p_hoje between p.data_inicio and coalesce(p.data_fim,p.data_inicio)),
    'servicos_hoje', (select count(*) from public.propostas p where p.status='aceita' and p_hoje between p.data_inicio and coalesce(p.data_fim,p.data_inicio)),
    'proximos_7', (select count(*) from public.propostas p where p.status='aceita' and p.data_inicio > p_hoje and p.data_inicio <= p_hoje + 7),
    'aguardando', (select count(*) from public.propostas p where p.status='enviada'),
    'aguardando_valor', case when (select private.e_gestao()) then (select coalesce(sum(p.valor_total),0) from public.propostas p where p.status='enviada') end,
    'a_receber', case when (select private.e_gestao()) then (select coalesce(sum(g.valor),0) from public.pagamentos g where g.pago_em is null) end,
    'recebido_mes', case when (select private.e_gestao()) then (select coalesce(sum(g.valor),0) from public.pagamentos g where g.pago_em >= date_trunc('month', p_hoje) and g.pago_em < date_trunc('month', p_hoje) + interval '1 month') end,
    'follow_up', (select count(*) from public.propostas p, public.settings s where p.status='enviada'
                    and coalesce(p.cobrada_em, p.enviada_em) < now() - make_interval(days => s.follow_up_dias)
                    and (p.lembrar_em is null or p.lembrar_em <= p_hoje))
  ) where (select private.tem_acesso());
$$;
revoke all on function public.painel_resumo(date) from public, anon;
grant execute on function public.painel_resumo(date) to authenticated;
