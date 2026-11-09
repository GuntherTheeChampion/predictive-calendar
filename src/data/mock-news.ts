import type { RawNewsItem } from "@/types/news";
import { dateKey, daysInMonth, monthKey, shiftMonth } from "@/lib/date";

/**
 * DATA SIMULASI — judul/isi berita di bawah ini fiktif dan hanya untuk demo.
 * Berisi campuran berita relevan dan "noise" (hiburan, olahraga, sumber tidak tepercaya)
 * untuk menguji Relevance Engine.
 */
interface Template {
  day: number;
  title: string;
  description: string;
  source: string;
  url: string;
}

const LIVE_TEMPLATES: Template[] = [
  {
    day: 2,
    title: "Ratusan Buruh Pabrik Tekstil di Karawang Terkena PHK Massal",
    description:
      "Sebuah pabrik tekstil di kawasan industri Karawang menghentikan operasional dan memutus hubungan kerja ribuan karyawan akibat turunnya pesanan ekspor.",
    source: "Kompas",
    url: "https://www.kompas.com",
  },
  {
    day: 3,
    title: "Artis Ibu Kota Gelar Pernikahan Mewah di Bandung",
    description: "Pasangan selebriti menggelar resepsi dengan ribuan tamu undangan di sebuah hotel mewah.",
    source: "DetikJabar",
    url: "https://www.detik.com/jabar",
  },
  {
    day: 4,
    title: "Harga Beras dan Cabai di Pasar Bandung Naik, Inflasi Pangan Mengintai",
    description:
      "Kenaikan harga bahan pokok di sejumlah pasar tradisional Kota Bandung menekan daya beli masyarakat berpenghasilan rendah.",
    source: "Pikiran Rakyat",
    url: "https://www.pikiran-rakyat.com",
  },
  {
    day: 5,
    title: "Persib Bandung Menang Telak 3-0 di Kandang",
    description: "Pertandingan lanjutan liga berlangsung meriah di Stadion GBLA.",
    source: "CNN Indonesia",
    url: "https://www.cnnindonesia.com",
  },
  {
    day: 6,
    title: "Banjir Rendam Dayeuhkolot dan Baleendah, Ribuan Warga Mengungsi",
    description:
      "Luapan Sungai Citarum merendam permukiman di Kabupaten Bandung. Akses jalan terputus dan aktivitas ekonomi warga lumpuh sementara.",
    source: "Antara Jabar",
    url: "https://jabar.antaranews.com",
  },
  {
    day: 6,
    title: "10 Gaya Rambut Terbaru yang Lagi Viral Minggu Ini",
    description: "Tren gaya rambut selebgram bikin heboh media sosial.",
    source: "GosipSelebriti.id",
    url: "https://example.com/gosip",
  },
  {
    day: 7,
    title: "Gubernur Jabar Umumkan Relaksasi Pajak Kendaraan bagi Warga Terdampak Banjir",
    description:
      "Pemerintah Provinsi Jawa Barat memberi keringanan pajak dan penghapusan denda bagi warga di wilayah bencana.",
    source: "Tribun Jabar",
    url: "https://jabar.tribunnews.com",
  },
  {
    day: 8,
    title: "Gangguan Jaringan Operator Seluler Kompetitor di Bekasi dan Cikarang Berjam-jam",
    description:
      "Pelanggan salah satu operator seluler mengeluhkan sinyal hilang total di Bekasi dan Cikarang; sebagian mengaku berencana pindah provider.",
    source: "Detik",
    url: "https://www.detik.com",
  },
  {
    day: 8,
    title: "Pemadaman Listrik Massal Landa Sebagian Wilayah Cirebon dan Indramayu",
    description:
      "PLN melaporkan gangguan transmisi yang menyebabkan blackout selama hampir seharian dan mengganggu usaha kecil warga.",
    source: "Republika",
    url: "https://www.republika.co.id",
  },
  {
    day: 9,
    title: "Tanah Longsor Putus Akses Jalan di Sukabumi, Puluhan Rumah Tertimbun",
    description:
      "Longsor akibat hujan deras memutus akses desa di Sukabumi. Warga dievakuasi dan pasar lokal tidak beroperasi.",
    source: "Tempo",
    url: "https://www.tempo.co",
  },
  {
    day: 9,
    title: "Pemkot Bogor Akan Tutup Sementara Kawasan Pedagang Kaki Lima di Pusat Kota",
    description:
      "Kebijakan penertiban dan penutupan area komersial dinilai berdampak pada penghasilan ratusan pedagang kecil.",
    source: "Kompas",
    url: "https://www.kompas.com",
  },
  {
    day: 9,
    title: "Harga Saham Teknologi Global Menguat di Wall Street",
    description: "Indeks utama bursa Amerika ditutup menguat didorong sektor teknologi.",
    source: "Bisnis.com",
    url: "https://www.bisnis.com",
  },
  {
    day: 9,
    title: "UMK Jawa Barat Tahun Depan Diusulkan Naik, Pengusaha Keberatan",
    description:
      "Dewan pengupahan membahas usulan kenaikan upah minimum kabupaten/kota di Jawa Barat; pelaku industri di Bekasi dan Karawang khawatir terjadi efisiensi tenaga kerja.",
    source: "Bisnis.com",
    url: "https://www.bisnis.com",
  },
  {
    day: 9,
    title: "Resep Kue Lebaran Anti Gagal untuk Pemula",
    description: "Panduan memasak kue kering untuk keluarga.",
    source: "Blog Kuliner Rumahan",
    url: "https://example.com/resep",
  },
];

/** Template arsip: indeks 1 = bulan lalu, 2 = dua bulan lalu, 3 = tiga bulan lalu. */
const ARCHIVE_TEMPLATES: Record<number, Template[]> = {
  1: [
    {
      day: 3,
      title: "PHK 800 Pekerja Pabrik Sepatu di Purwakarta",
      description: "Perusahaan merumahkan ratusan karyawan karena efisiensi produksi, sebagian besar warga Purwakarta.",
      source: "Pikiran Rakyat",
      url: "https://www.pikiran-rakyat.com",
    },
    {
      day: 9,
      title: "Banjir Bandang Terjang Garut, Jembatan Penghubung Putus",
      description: "Banjir bandang merusak infrastruktur dan menghentikan aktivitas ekonomi di beberapa kecamatan Garut.",
      source: "Kompas",
      url: "https://www.kompas.com",
    },
    {
      day: 14,
      title: "Pemprov Jabar Kaji Pemotongan Subsidi Angkutan Umum",
      description: "Kebijakan subsidi daerah ditinjau ulang yang berpotensi menambah beban transportasi warga.",
      source: "Tribun Jabar",
      url: "https://jabar.tribunnews.com",
    },
    {
      day: 18,
      title: "Gangguan Jaringan Provider Seluler di Bandung Raya Picu Keluhan Pelanggan",
      description: "Gangguan jaringan operator kompetitor di Bandung memicu pelanggan mempertimbangkan migrasi.",
      source: "CNN Indonesia",
      url: "https://www.cnnindonesia.com",
    },
    {
      day: 21,
      title: "Konser Musik Internasional Digelar di Bandung",
      description: "Ribuan penonton hadir di acara hiburan akhir pekan.",
      source: "DetikJabar",
      url: "https://www.detik.com/jabar",
    },
    {
      day: 26,
      title: "Harga Bawang Merah Melonjak di Cirebon, Inflasi Daerah Naik",
      description: "Kenaikan harga bahan pokok menekan daya beli warga Cirebon.",
      source: "Antara Jabar",
      url: "https://jabar.antaranews.com",
    },
  ],
  2: [
    {
      day: 4,
      title: "Gempa Bumi Guncang Cianjur, Ratusan Rumah Rusak",
      description: "Gempa merusak permukiman dan memutus akses jalan di Cianjur; warga mengungsi.",
      source: "Kompas",
      url: "https://www.kompas.com",
    },
    {
      day: 10,
      title: "Pabrik Garmen di Bekasi Tutup, 1.500 Karyawan Dirumahkan",
      description: "Penutupan pabrik di Bekasi menambah angka pengangguran dan menurunkan daya beli.",
      source: "Bisnis.com",
      url: "https://www.bisnis.com",
    },
    {
      day: 15,
      title: "Pemkab Karawang Berikan Relaksasi Retribusi bagi Pelaku UMKM",
      description: "Kebijakan relaksasi pajak dan retribusi daerah untuk UMKM terdampak.",
      source: "Tempo",
      url: "https://www.tempo.co",
    },
    {
      day: 20,
      title: "Pemadaman Listrik Massal di Tasikmalaya Selama 10 Jam",
      description: "Blackout menyebabkan layanan seluler terganggu dan usaha warga terhenti.",
      source: "Republika",
      url: "https://www.republika.co.id",
    },
    {
      day: 24,
      title: "Klasemen Terbaru Liga 1: Persib Naik ke Posisi Tiga",
      description: "Hasil pertandingan pekan ini.",
      source: "CNN Indonesia",
      url: "https://www.cnnindonesia.com",
    },
    {
      day: 27,
      title: "Longsor Landa Sumedang, Jalur Ekonomi Terputus",
      description: "Longsor menutup akses utama dan menghambat distribusi barang di Sumedang.",
      source: "Pikiran Rakyat",
      url: "https://www.pikiran-rakyat.com",
    },
  ],
  3: [
    {
      day: 5,
      title: "UMK Bekasi dan Karawang Dibahas, Buruh Tuntut Kenaikan Upah",
      description: "Pembahasan upah minimum di kawasan industri Bekasi dan Karawang memanas.",
      source: "Kontan",
      url: "https://www.kontan.co.id",
    },
    {
      day: 12,
      title: "Banjir Rendam Pantura Indramayu, Petani dan Nelayan Rugi",
      description: "Banjir merendam sawah dan permukiman di Indramayu, mengganggu penghasilan warga.",
      source: "Antara Jabar",
      url: "https://jabar.antaranews.com",
    },
    {
      day: 17,
      title: "Operator Seluler Kompetitor Luncurkan Promo Migrasi di Jawa Barat",
      description: "Promo agresif kompetitor di Jawa Barat meningkatkan risiko churn pelanggan.",
      source: "Bisnis.com",
      url: "https://www.bisnis.com",
    },
    {
      day: 22,
      title: "Selebriti Rilis Album Baru",
      description: "Penyanyi papan atas meluncurkan album kolaborasi.",
      source: "GosipSelebriti.id",
      url: "https://example.com/gosip",
    },
    {
      day: 28,
      title: "Harga Gas Elpiji dan Bahan Pokok Naik di Bogor",
      description: "Inflasi harga kebutuhan pokok di Bogor membebani rumah tangga.",
      source: "Kompas",
      url: "https://www.kompas.com",
    },
  ],
};

function build(templates: Template[], y: number, m: number, maxDay: number, tag: string): RawNewsItem[] {
  const dim = daysInMonth(y, m);
  return templates.map((t, i) => {
    const day = Math.max(1, Math.min(t.day, maxDay, dim));
    return {
      id: `mock-${tag}-${i}`,
      title: t.title,
      description: t.description,
      publishedAt: `${dateKey(y, m, day)}T08:${String(10 + i).padStart(2, "0")}:00+07:00`,
      source: t.source,
      url: t.url,
    };
  });
}

/** Berita mentah simulasi untuk bulan berjalan (tanggal dibatasi hingga hari ini). */
export function buildMockLiveNews(y: number, m: number, todayDay: number): RawNewsItem[] {
  return build(LIVE_TEMPLATES, y, m, todayDay, monthKey(y, m));
}

/** Berita mentah simulasi untuk 1–3 bulan ke belakang dari bulan berjalan; null bila di luar jangkauan. */
export function buildMockArchiveNews(
  current: { y: number; m: number },
  target: { y: number; m: number },
): RawNewsItem[] | null {
  for (const back of [1, 2, 3]) {
    const s = shiftMonth(current.y, current.m, -back);
    if (s.y === target.y && s.m === target.m) {
      return build(ARCHIVE_TEMPLATES[back], target.y, target.m, 31, monthKey(target.y, target.m));
    }
  }
  return null;
}

