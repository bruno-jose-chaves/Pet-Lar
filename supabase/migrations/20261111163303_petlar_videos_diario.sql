-- Diário com vídeo + medidor de armazenamento
alter table public.diario drop constraint if exists diario_tipo_check;
alter table public.diario add constraint diario_tipo_check check (tipo in ('comeu','agua','passeio','xixi','coco','remedio','dormiu','brincou','banho','foto','video','nota','chegou','saiu'));

update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
where id = 'pets';

create or replace function public.uso_armazenamento()
returns table (tipo text, arquivos bigint, bytes bigint)
language sql stable security definer set search_path = '' as $$
  select case when o.metadata->>'mimetype' like 'video/%' then 'video' else 'foto' end, count(*), coalesce(sum((o.metadata->>'size')::bigint), 0)
  from storage.objects o where o.bucket_id = 'pets' and (select private.e_gestao())
  group by 1;
$$;
revoke all on function public.uso_armazenamento() from public, anon;
grant execute on function public.uso_armazenamento() to authenticated;
