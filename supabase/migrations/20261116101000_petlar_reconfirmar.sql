-- L-02: marca quando a Lari já reconfirmou com o tutor (perto da data do serviço)
alter table public.propostas add column if not exists reconfirmada_em timestamptz;
