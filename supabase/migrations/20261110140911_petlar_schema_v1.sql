-- Pet Lar · schema v1
create extension if not exists pg_trgm with schema extensions;

-- ===== administradores (quem pode usar o painel) =====
create table public.admins (
  email text primary key check (email = lower(email)),
  nome text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.email = lower(coalesce((select auth.jwt() ->> 'email'), '')));
$$;

-- usado na tela de login para liberar o "primeiro acesso" só para e-mails autorizados
create or replace function public.email_autorizado(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.email = lower(trim(p_email)));
$$;

-- ===== configurações (uma linha só) =====
create table public.settings (
  id int primary key default 1 check (id = 1),
  pix_chave text,
  pix_nome text default 'Larissa',
  pix_cidade text default 'BALNEARIO CAMBORIU',
  whatsapp text default '(47) 99917-9091',
  instagram text default '@petlar.bc',
  capacidade_hospedagem int not null default 3,
  follow_up_dias int not null default 2,
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

-- ===== tutores e pets =====
create table public.tutores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text,
  email text,
  endereco text,
  bairro text,
  cidade text default 'Balneário Camboriú',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid references public.tutores(id) on delete set null,
  nome text,
  especie text not null default 'cao' check (especie in ('cao','gato')),
  raca text,
  idade text,
  porte text not null default 'P' check (porte in ('P','M','G','GG')),
  passeia boolean not null default true,
  foto_path text,
  alimentacao text,
  medicacao text,
  comportamento text,
  limitacoes text,
  veterinario text,
  reativo boolean not null default false,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== propostas =====
create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  ano int,
  seq int,
  tutor_id uuid references public.tutores(id) on delete set null,
  tutor_nome text,
  servico text not null check (servico in ('visitas','pacote','estendida','hosp','banho')),
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada','expirada','cancelada')),
  data_inicio date,
  data_fim date,
  cidade text,
  valor_total numeric(10,2) not null default 0,
  valor_cheio numeric(10,2) not null default 0,
  resumo text,
  payload jsonb not null default '{}'::jsonb,
  validade_ate date,
  enviada_em timestamptz,
  respondida_em timestamptz,
  motivo_recusa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposta_pets (
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  primary key (proposta_id, pet_id)
);

-- ===== pagamentos =====
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null check (valor >= 0),
  vencimento date,
  pago_em date,
  forma text check (forma in ('pix','dinheiro','cartao','outro')),
  created_at timestamptz not null default now()
);

-- ===== índices (consultas mais usadas) =====
create index propostas_status_created_idx on public.propostas (status, created_at desc);
create index propostas_periodo_idx on public.propostas (data_inicio, data_fim) where status = 'aceita';
create index propostas_tutor_idx on public.propostas (tutor_id);
create index proposta_pets_pet_idx on public.proposta_pets (pet_id);
create index pets_tutor_idx on public.pets (tutor_id);
create index pagamentos_proposta_idx on public.pagamentos (proposta_id);
create index pagamentos_aberto_idx on public.pagamentos (vencimento) where pago_em is null;
create index tutores_nome_trgm on public.tutores using gin (nome extensions.gin_trgm_ops);
create index pets_nome_trgm on public.pets using gin (nome extensions.gin_trgm_ops);

-- ===== gatilhos =====
create or replace function public.tg_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger tutores_upd before update on public.tutores for each row execute function public.tg_updated_at();
create trigger pets_upd before update on public.pets for each row execute function public.tg_updated_at();
create trigger propostas_upd before update on public.propostas for each row execute function public.tg_updated_at();
create trigger settings_upd before update on public.settings for each row execute function public.tg_updated_at();

-- numeração PL-2026-001 (sequencial por ano, sem buracos por concorrência)
create or replace function public.tg_proposta_numero() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.numero is null then
    new.ano := extract(year from now() at time zone 'America/Sao_Paulo')::int;
    perform pg_advisory_xact_lock(hashtext('petlar_numero_' || new.ano));
    select coalesce(max(p.seq), 0) + 1 into new.seq from public.propostas p where p.ano = new.ano;
    new.numero := 'PL-' || new.ano || '-' || lpad(new.seq::text, 3, '0');
  end if;
  return new;
end; $$;
create trigger propostas_numero before insert on public.propostas for each row execute function public.tg_proposta_numero();

-- mudança de status: datas e parcelas 50/50 quando aceita
create or replace function public.tg_proposta_status() returns trigger language plpgsql set search_path = '' as $$
declare v_sinal numeric(10,2);
begin
  if new.status is distinct from old.status then
    if new.status = 'enviada' and new.enviada_em is null then new.enviada_em := now(); end if;
    if new.status in ('aceita','recusada') then new.respondida_em := now(); end if;
  end if;
  return new;
end; $$;
create trigger propostas_status before update on public.propostas for each row execute function public.tg_proposta_status();

create or replace function public.tg_proposta_aceita() returns trigger language plpgsql set search_path = '' as $$
declare v_sinal numeric(10,2);
begin
  if new.status = 'aceita' and (old.status is distinct from 'aceita')
     and not exists (select 1 from public.pagamentos g where g.proposta_id = new.id) then
    v_sinal := round(new.valor_total / 2, 2);
    insert into public.pagamentos (proposta_id, descricao, valor, vencimento) values
      (new.id, 'Sinal (50%)', v_sinal, (now() at time zone 'America/Sao_Paulo')::date),
      (new.id, 'Saldo (50%)', new.valor_total - v_sinal, coalesce(new.data_fim, new.data_inicio, (now() at time zone 'America/Sao_Paulo')::date));
  end if;
  return new;
end; $$;
create trigger propostas_aceita after update on public.propostas for each row execute function public.tg_proposta_aceita();

-- ===== segurança: só administradores =====
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.tutores enable row level security;
alter table public.pets enable row level security;
alter table public.propostas enable row level security;
alter table public.proposta_pets enable row level security;
alter table public.pagamentos enable row level security;

create policy admins_all on public.admins for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy settings_all on public.settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tutores_all on public.tutores for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pets_all on public.pets for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy propostas_all on public.propostas for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy proposta_pets_all on public.proposta_pets for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pagamentos_all on public.pagamentos for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.email_autorizado(text) from public;
grant execute on function public.email_autorizado(text) to anon, authenticated;

-- ===== fotos dos pets (privadas) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pets', 'pets', false, 5242880, array['image/jpeg','image/png','image/webp']);

create policy pets_fotos_select on storage.objects for select to authenticated using (bucket_id = 'pets' and (select public.is_admin()));
create policy pets_fotos_insert on storage.objects for insert to authenticated with check (bucket_id = 'pets' and (select public.is_admin()));
create policy pets_fotos_update on storage.objects for update to authenticated using (bucket_id = 'pets' and (select public.is_admin()));
create policy pets_fotos_delete on storage.objects for delete to authenticated using (bucket_id = 'pets' and (select public.is_admin()));

-- ===== resumo do painel numa chamada só =====
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
  ) where (select public.is_admin());
$$;
grant execute on function public.painel_resumo(date) to authenticated;

-- e-mails com acesso (Larissa entra pela tela de Configurações)
insert into public.admins (email, nome) values
  ('brunojose_chaves@hotmail.com','Bruno'),
  ('brunojosechavescarvalho@gmail.com','Bruno');
