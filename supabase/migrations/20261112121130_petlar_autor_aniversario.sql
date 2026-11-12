-- Quem criou cada proposta (para a gestão ver o que cada login fez) + aniversário do pet
alter table public.propostas add column if not exists criado_por text default lower(coalesce(auth.jwt() ->> 'email', ''));
-- aniversário: 'AAAA-MM-DD', ou '---MM-DD' quando o tutor não sabe o ano
alter table public.pets add column if not exists aniversario text check (aniversario is null or aniversario ~ '^(\d{4}|--)-\d{2}-\d{2}$');
