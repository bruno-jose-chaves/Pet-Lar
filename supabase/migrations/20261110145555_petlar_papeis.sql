-- Níveis de acesso: admin (tudo + acessos), gestora (todo o negócio), assistente (rotina dos pets, sem valores)
alter table public.admins add column if not exists papel text not null default 'gestora'
  check (papel in ('admin','gestora','assistente'));
update public.admins set papel = 'admin' where email in ('brunojose_chaves@hotmail.com','brunojosechavescarvalho@gmail.com');

create or replace function private.papel() returns text language sql stable security definer set search_path = '' as $$
  select a.papel from public.admins a where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''));
$$;
create or replace function private.tem_acesso() returns boolean language sql stable security definer set search_path = '' as $$
  select private.papel() is not null;
$$;
create or replace function private.e_gestao() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.papel() in ('admin','gestora'), false);
$$;
create or replace function private.e_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.papel() = 'admin', false);
$$;
revoke all on function private.papel(), private.tem_acesso(), private.e_gestao(), private.e_admin() from public, anon;
grant execute on function private.papel(), private.tem_acesso(), private.e_gestao(), private.e_admin() to authenticated;

-- o app pergunta "qual é o meu papel?" logo depois do login
create or replace function public.meu_papel() returns text language sql stable security definer set search_path = '' as $$
  select private.papel();
$$;
revoke all on function public.meu_papel() from public, anon;
grant execute on function public.meu_papel() to authenticated;

-- nunca ficar sem administrador
create or replace function public.tg_admins_protege() returns trigger language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'DELETE' and old.papel = 'admin') or (tg_op = 'UPDATE' and old.papel = 'admin' and new.papel <> 'admin') then
    if (select count(*) from public.admins where papel = 'admin') <= 1 then
      raise exception 'Precisa existir pelo menos um administrador.';
    end if;
  end if;
  return coalesce(new, old);
end; $$;
drop trigger if exists admins_protege on public.admins;
create trigger admins_protege before update or delete on public.admins for each row execute function public.tg_admins_protege();

-- ===== políticas novas =====
drop policy if exists admins_all on public.admins;
drop policy if exists settings_all on public.settings;
drop policy if exists tutores_all on public.tutores;
drop policy if exists pets_all on public.pets;
drop policy if exists propostas_all on public.propostas;
drop policy if exists proposta_pets_all on public.proposta_pets;
drop policy if exists pagamentos_all on public.pagamentos;

-- acessos: cada um vê o próprio registro; só admin vê e muda todos
create policy admins_sel on public.admins for select to authenticated
  using ((select private.e_admin()) or email = lower(coalesce((select auth.jwt() ->> 'email'), '')));
create policy admins_ins on public.admins for insert to authenticated with check ((select private.e_admin()));
create policy admins_upd on public.admins for update to authenticated using ((select private.e_admin())) with check ((select private.e_admin()));
create policy admins_del on public.admins for delete to authenticated using ((select private.e_admin()));

-- configurações: todos leem (contato, capacidade); gestão altera
create policy settings_sel on public.settings for select to authenticated using ((select private.tem_acesso()));
create policy settings_upd on public.settings for update to authenticated using ((select private.e_gestao())) with check ((select private.e_gestao()));

-- tutores e pets: todos veem e editam a ficha; criar e excluir é da gestão
create policy tutores_sel on public.tutores for select to authenticated using ((select private.tem_acesso()));
create policy tutores_upd on public.tutores for update to authenticated using ((select private.tem_acesso())) with check ((select private.tem_acesso()));
create policy tutores_ins on public.tutores for insert to authenticated with check ((select private.e_gestao()));
create policy tutores_del on public.tutores for delete to authenticated using ((select private.e_gestao()));
create policy pets_sel on public.pets for select to authenticated using ((select private.tem_acesso()));
create policy pets_upd on public.pets for update to authenticated using ((select private.tem_acesso())) with check ((select private.tem_acesso()));
create policy pets_ins on public.pets for insert to authenticated with check ((select private.e_gestao()));
create policy pets_del on public.pets for delete to authenticated using ((select private.e_gestao()));

-- propostas: gestão faz tudo; assistente só enxerga serviços confirmados (para a agenda)
create policy propostas_sel on public.propostas for select to authenticated
  using ((select private.e_gestao()) or ((select private.tem_acesso()) and status = 'aceita'));
create policy propostas_ins on public.propostas for insert to authenticated with check ((select private.e_gestao()));
create policy propostas_upd on public.propostas for update to authenticated using ((select private.e_gestao())) with check ((select private.e_gestao()));
create policy propostas_del on public.propostas for delete to authenticated using ((select private.e_gestao()));
create policy proposta_pets_sel on public.proposta_pets for select to authenticated using ((select private.tem_acesso()));
create policy proposta_pets_ins on public.proposta_pets for insert to authenticated with check ((select private.e_gestao()));
create policy proposta_pets_del on public.proposta_pets for delete to authenticated using ((select private.e_gestao()));

-- dinheiro: só gestão
create policy pagamentos_all on public.pagamentos for all to authenticated using ((select private.e_gestao())) with check ((select private.e_gestao()));

-- fotos: todos com acesso (assistente pode trocar a foto de um pet)
drop policy if exists pets_fotos_select on storage.objects;
drop policy if exists pets_fotos_insert on storage.objects;
drop policy if exists pets_fotos_update on storage.objects;
drop policy if exists pets_fotos_delete on storage.objects;
create policy pets_fotos_select on storage.objects for select to authenticated using (bucket_id = 'pets' and (select private.tem_acesso()));
create policy pets_fotos_insert on storage.objects for insert to authenticated with check (bucket_id = 'pets' and (select private.tem_acesso()));
create policy pets_fotos_update on storage.objects for update to authenticated using (bucket_id = 'pets' and (select private.tem_acesso()));
create policy pets_fotos_delete on storage.objects for delete to authenticated using (bucket_id = 'pets' and (select private.tem_acesso()));

-- resumo da tela Hoje: valores em R$ só para a gestão
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
    'follow_up', (select count(*) from public.propostas p, public.settings s where p.status='enviada' and p.enviada_em < now() - make_interval(days => s.follow_up_dias))
  ) where (select private.tem_acesso());
$$;
revoke all on function public.painel_resumo(date) from public, anon;
grant execute on function public.painel_resumo(date) to authenticated;

drop function if exists private.is_admin();
