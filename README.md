# Predictive News Calendar — Collection & Retention (Jawa Barat)

Dashboard kalender bulanan berisi berita yang memengaruhi kemampuan bayar & risiko churn pelanggan telekomunikasi di Jawa Barat.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

Tanpa konfigurasi apa pun aplikasi berjalan dengan **data simulasi** + filter berbasis aturan. Untuk data nyata, salin `.env.example` ke `.env.local` dan isi:

| Variabel | Fungsi |
| --- | --- |
| `GNEWS_API_KEY` | Berita live bulan berjalan (GNews) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Relevance Engine berbasis LLM (fallback ke aturan bila gagal) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Riwayat bulan lalu; jalankan `supabase/schema.sql` dulu |
| `CRON_SECRET` | Mengamankan `/api/cron/archive` (Vercel Cron, lihat `vercel.json`) |

## Alur

- **Bulan berjalan** → `GET /api/news` → `news-service` → `filterNewsForCollection` (`src/lib/relevance-engine.ts`).
- **Bulan lalu** → `GET /api/history?month=YYYY-MM` → hanya membaca database (tanpa API berita live).
- **Bulan depan** → `GET /api/news?month=YYYY-MM` → proyeksi musiman (ditandai "Proyeksi AI", bukan berita nyata).
- **Arsip** → `POST /api/history` (tombol "Arsipkan Bulan Ini") atau cron `/api/cron/archive` pada tgl 28–31.

Penyimpanan lokal (`.data/past_news_history.json`) hanya untuk pengembangan; di hosting serverless gunakan Supabase.

