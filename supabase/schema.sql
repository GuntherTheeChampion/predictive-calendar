-- Tabel riwayat berita yang lolos Relevance Engine pada bulan-bulan sebelumnya.
create table if not exists public.past_news_history (
  id                 text primary key,
  month_key          text        not null,            -- format YYYY-MM
  published_at       date        not null,
  title              text        not null,
  summary            text        not null,
  source             text        not null,
  source_url         text        not null,
  location           text        not null,
  category           text        not null check (category in
                       ('ECONOMIC_SHIFT','NATURAL_DISASTER','REGIONAL_POLICY','TELECOM_COMPETITOR')),
  impact_score       text        not null check (impact_score in ('High','Medium','Low')),
  ai_reasoning       text        not null,
  actionable_insight text        not null,
  created_at         timestamptz not null default now()
);

create index if not exists past_news_history_month_idx
  on public.past_news_history (month_key, published_at);

-- Akses hanya lewat service role dari server (API route); aktifkan RLS tanpa policy publik.
alter table public.past_news_history enable row level security;

