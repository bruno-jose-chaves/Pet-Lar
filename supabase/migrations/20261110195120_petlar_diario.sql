-- Diário do pet (F-02): registros rápidos durante visitas e estadias
create table if not exists public.diario (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  proposta_id uuid references public.propostas(id) on delete set null,
  tipo text not null check (tipo in ('comeu','agua','passeio','xixi','coco','remedio','dormiu','brincou','banho','foto','nota','chegou','saiu')),
  nota text,
  foto_path text,
  criado_em timestamptz not null default now(),
  autor text default lower(coalesce(auth.jwt() ->> 'email', ''))
);
create index if not exists diario_pet_idx on public.diario (pet_id, criado_em desc);
create index if not exists diario_proposta_idx on public.diario (proposta_id, criado_em);
alter table public.diario enable row level security;
create policy diario_sel on public.diario for select to authenticated using ((select private.tem_acesso()));
create policy diario_ins on public.diario for insert to authenticated with check ((select private.tem_acesso()));
create policy diario_upd on public.diario for update to authenticated using ((select private.tem_acesso())) with check ((select private.tem_acesso()));
create policy diario_del on public.diario for delete to authenticated using ((select private.tem_acesso()));
