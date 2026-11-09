-- Tabel riwayat berita yang lolos Relevance Engine (Bulan Berjalan & Bulan Lalu).
-- Jalankan script ini di Supabase Dashboard -> SQL Editor -> New Query -> Run.

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

-- Aktifkan Row Level Security (RLS) beserta policy agar Publishable/Anon Key dari aplikasi
-- dapat membaca dan menyimpan (Auto-Upsert) berita yang sudah terfilter AI.
alter table public.past_news_history enable row level security;

drop policy if exists "Allow read past_news_history" on public.past_news_history;
create policy "Allow read past_news_history"
  on public.past_news_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow insert past_news_history" on public.past_news_history;
create policy "Allow insert past_news_history"
  on public.past_news_history
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow update past_news_history" on public.past_news_history;
create policy "Allow update past_news_history"
  on public.past_news_history
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Sengaja TIDAK ada policy DELETE untuk anon: aplikasi hanya memakai upsert, dan kunci publishable
-- bisa dilihat di browser. Hapus policy lama bila sebelumnya sempat dibuat:
drop policy if exists "Allow delete past_news_history" on public.past_news_history;

-- CATATAN KEAMANAN: policy INSERT/UPDATE untuk anon di atas membuat siapa pun yang memegang
-- publishable key bisa menulis ke tabel ini. Untuk produksi, isi SUPABASE_SERVICE_ROLE_KEY
-- (server-side saja, tanpa prefix NEXT_PUBLIC) lalu hapus policy insert/update untuk anon.
