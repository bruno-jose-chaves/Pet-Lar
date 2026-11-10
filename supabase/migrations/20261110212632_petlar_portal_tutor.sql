-- Área do tutor (F-01): acesso por link pessoal enviado no WhatsApp (sem senha, sem SMS).
-- O portal não fala com as tabelas direto: tudo passa pela Edge Function "portal", que valida o link
-- e usa a chave de serviço. Aqui ficam só os links, as avaliações e a marca de "ficha atualizada pelo tutor".

create table if not exists public.tutor_acessos (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutores(id) on delete cascade,
  token text not null unique default replace(replace(replace(encode(extensions.gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', ''),
  criado_em timestamptz not null default now(),
  criado_por text default lower(coalesce(auth.jwt() ->> 'email', '')),
  expira_em timestamptz,
  revogado_em timestamptz,
  aceite_em timestamptz,           -- tutor concordou com o uso dos dados (LGPD)
  ultimo_acesso timestamptz,
  acessos integer not null default 0
);
create index if not exists tutor_acessos_tutor_idx on public.tutor_acessos (tutor_id, criado_em desc);
alter table public.tutor_acessos enable row level security;
create policy tutor_acessos_sel on public.tutor_acessos for select to authenticated using ((select private.e_gestao()));
create policy tutor_acessos_ins on public.tutor_acessos for insert to authenticated with check ((select private.e_gestao()));
create policy tutor_acessos_upd on public.tutor_acessos for update to authenticated using ((select private.e_gestao())) with check ((select private.e_gestao()));
create policy tutor_acessos_del on public.tutor_acessos for delete to authenticated using ((select private.e_gestao()));

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  tutor_id uuid references public.tutores(id) on delete set null,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 1000),
  criado_em timestamptz not null default now(),
  unique (proposta_id)
);
create index if not exists avaliacoes_tutor_idx on public.avaliacoes (tutor_id);
alter table public.avaliacoes enable row level security;
create policy avaliacoes_sel on public.avaliacoes for select to authenticated using ((select private.tem_acesso()));
create policy avaliacoes_del on public.avaliacoes for delete to authenticated using ((select private.e_gestao()));

alter table public.pets add column if not exists atualizado_tutor_em timestamptz;
