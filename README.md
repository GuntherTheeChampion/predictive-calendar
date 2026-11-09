# Predictive News Calendar — Collection & Retention (Jawa Barat)

Dashboard kalender bulanan berisi berita nyata dari portal berita nasional & lokal yang memengaruhi kemampuan bayar & risiko churn pelanggan telekomunikasi di Jawa Barat.

## Fitur Utama

1. **Berita Nyata Otomatis (Google News RSS Indonesia)**:
   - Menarik berita asli secara langsung dari portal berita terpercaya (*Kompas, Detik, Pikiran Rakyat, Antara, CNN Indonesia, Bisnis.com, Tribun Jabar*, dll.) tanpa perlu mendaftar API Key berita berbayar.
2. **Auto-Upsert & Historical Backfill ke Supabase**:
   - Setiap berita yang lolos *Relevance Engine* langsung disimpan otomatis ke tabel `past_news_history` di Supabase (serta backup di penyimpanan lokal).
   - Saat Anda menggeser kalender ke bulan-bulan sebelumnya (*Past Months*), sistem membaca dari database; jika bulan tersebut belum memiliki arsip, sistem otomatis melakukan *backfill* berita nyata bulan tersebut dari Google News RSS.
3. **AI Actionable Insights & Filter 4 Pilar Risiko**:
   - Menyaring berita ke dalam 4 kategori: `Ekonomi & PHK`, `Bencana Alam`, `Kebijakan Daerah`, dan `Kompetitor & Jaringan`.

## Menjalankan Aplikasi

```bash
npm install
npm run dev        # http://localhost:3000
```

## Konfigurasi Database Supabase

1. Pastikan file `.env.local` berisi URL dan Publishable/Anon Key Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://vjhdqnhpstgdsjgoqtks.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```
2. Buka **Supabase Dashboard** → **SQL Editor** → **New Query**, lalu jalankan isi file [`supabase/schema.sql`](./supabase/schema.sql) (termasuk *policy* RLS agar aplikasi dapat membaca dan menyimpan berita otomatis).
