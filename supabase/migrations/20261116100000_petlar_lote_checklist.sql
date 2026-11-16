-- Pet Lar · lote do checklist (16/11/2026)
-- L-03/L-04: parcelas acompanham a proposta · L-02: configurações de cobrança · L-15: registro de erros · L-23: validade do link do tutor

-- ===== L-03 / L-04: parcelas =====
-- Saiu de "aceita": apaga as parcelas em aberto (as já pagas ficam).
-- Continua "aceita" e o valor mudou: recalcula só o que está em aberto.
create or replace function public.tg_proposta_parcelas() returns trigger language plpgsql set search_path = '' as $$
declare v_pago numeric(10,2); v_resto numeric(10,2); v_sinal numeric(10,2);
begin
  if old.status = 'aceita' and new.status <> 'aceita' then
    delete from public.pagamentos where proposta_id = new.id and pago_em is null;
    return null;
  end if;
  if new.status = 'aceita' and old.status = 'aceita' and new.valor_total is distinct from old.valor_total then
    select coalesce(sum(valor), 0) into v_pago from public.pagamentos where proposta_id = new.id and pago_em is not null;
    if v_pago = 0 then
      delete from public.pagamentos where proposta_id = new.id;
      v_sinal := round(new.valor_total / 2, 2);
      insert into public.pagamentos (proposta_id, descricao, valor, vencimento) values
        (new.id, 'Sinal (50%)', v_sinal, (now() at time zone 'America/Sao_Paulo')::date),
        (new.id, 'Saldo (50%)', new.valor_total - v_sinal, coalesce(new.data_fim, new.data_inicio, (now() at time zone 'America/Sao_Paulo')::date));
    else
      delete from public.pagamentos where proposta_id = new.id and pago_em is null;
      v_resto := new.valor_total - v_pago;
      if v_resto > 0 then
        insert into public.pagamentos (proposta_id, descricao, valor, vencimento)
        values (new.id, 'Saldo (ajustado)', v_resto, coalesce(new.data_fim, new.data_inicio, (now() at time zone 'America/Sao_Paulo')::date));
      end if;
    end if;
  end if;
  return null;
end; $$;
drop trigger if exists propostas_parcelas on public.propostas;
create trigger propostas_parcelas after update on public.propostas for each row execute function public.tg_proposta_parcelas();

-- Aceitar de novo uma proposta que já tinha parcelas pagas: cria só o saldo que falta.
create or replace function public.tg_proposta_aceita() returns trigger language plpgsql set search_path = '' as $$
declare v_sinal numeric(10,2); v_n int; v_soma numeric(10,2);
begin
  if new.status = 'aceita' and (old.status is distinct from 'aceita') then
    select count(*), coalesce(sum(valor), 0) into v_n, v_soma from public.pagamentos where proposta_id = new.id;
    if v_n = 0 then
      v_sinal := round(new.valor_total / 2, 2);
      insert into public.pagamentos (proposta_id, descricao, valor, vencimento) values
        (new.id, 'Sinal (50%)', v_sinal, (now() at time zone 'America/Sao_Paulo')::date),
        (new.id, 'Saldo (50%)', new.valor_total - v_sinal, coalesce(new.data_fim, new.data_inicio, (now() at time zone 'America/Sao_Paulo')::date));
    elsif new.valor_total - v_soma > 0.009 then
      insert into public.pagamentos (proposta_id, descricao, valor, vencimento)
      values (new.id, 'Saldo (ajustado)', new.valor_total - v_soma, coalesce(new.data_fim, new.data_inicio, (now() at time zone 'America/Sao_Paulo')::date));
    end if;
  end if;
  return null;
end; $$;

-- "A receber" só conta parcelas de serviços aceitos
create or replace function public.painel_resumo(p_hoje date) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'hospedados_hoje', (select count(*) from public.propostas p where p.status='aceita' and p.servico='hosp' and p_hoje between p.data_inicio and coalesce(p.data_fim,p.data_inicio)),
    'servicos_hoje', (select count(*) from public.propostas p where p.status='aceita' and p_hoje between p.data_inicio and coalesce(p.data_fim,p.data_inicio)),
    'proximos_7', (select count(*) from public.propostas p where p.status='aceita' and p.data_inicio > p_hoje and p.data_inicio <= p_hoje + 7),
    'aguardando', (select count(*) from public.propostas p where p.status='enviada'),
    'aguardando_valor', case when (select private.e_gestao()) then (select coalesce(sum(p.valor_total),0) from public.propostas p where p.status='enviada') end,
    'a_receber', case when (select private.e_gestao()) then (select coalesce(sum(g.valor),0) from public.pagamentos g join public.propostas p on p.id = g.proposta_id where g.pago_em is null and p.status = 'aceita') end,
    'recebido_mes', case when (select private.e_gestao()) then (select coalesce(sum(g.valor),0) from public.pagamentos g where g.pago_em >= date_trunc('month', p_hoje) and g.pago_em < date_trunc('month', p_hoje) + interval '1 month') end,
    'follow_up', (select count(*) from public.propostas p, public.settings s where p.status='enviada'
                    and coalesce(p.cobrada_em, p.enviada_em) < now() - make_interval(days => s.follow_up_dias)
                    and (p.lembrar_em is null or p.lembrar_em <= p_hoje))
  ) where (select private.tem_acesso());
$$;

-- ===== L-02: cobrança =====
alter table public.settings add column if not exists follow_up_dias_seg int not null default 3;  -- espera entre a 2ª cobrança em diante
alter table public.settings add column if not exists reconfirmar_dias int not null default 2;    -- "perto da data": quantos dias antes do serviço

-- ===== L-23: link do tutor com validade =====
alter table public.tutor_acessos alter column expira_em set default (now() + interval '90 days');
update public.tutor_acessos set expira_em = now() + interval '90 days' where expira_em is null and revogado_em is null;

-- ===== L-15: erros de produção =====
create table if not exists public.erros (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  origem text not null default 'painel',
  rota text, mensagem text, pilha text, versao text, usuario text, agente text
);
create index if not exists erros_criado_idx on public.erros (criado_em desc);
alter table public.erros enable row level security;
revoke all on public.erros from anon;
grant select, insert, delete on public.erros to authenticated;
create policy erros_ins on public.erros for insert to authenticated with check ((select private.tem_acesso()));
create policy erros_sel on public.erros for select to authenticated using ((select private.e_gestao()));
create policy erros_del on public.erros for delete to authenticated using ((select private.e_admin()));
