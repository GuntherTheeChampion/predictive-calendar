import type { ProcessedNewsItem } from "@/types/news";
import { dateKey, daysInMonth, monthKey } from "@/lib/date";

/**
 * Proyeksi musiman untuk bulan depan. BUKAN berita nyata — ditandai `isPredicted` dan
 * bersumber dari "AI Predictive Outlook" agar tim dapat bersiap lebih awal.
 */
interface SeasonalRule {
  months: number[]; // 1-12, kosong = setiap bulan
  day: number;
  title: string;
  summary: string;
  location: string;
  category: ProcessedNewsItem["category"];
  impactScore: ProcessedNewsItem["impactScore"];
  reasoning: string;
  insight: string;
}

const RULES: SeasonalRule[] = [
  {
    months: [],
    day: 25,
    title: "Periode gajian & THR akhir bulan: puncak jendela pembayaran tagihan",
    summary: "Mayoritas pelanggan menerima gaji sekitar tanggal 25–30. Pembayaran cenderung meningkat setelah periode ini.",
    location: "Jawa Barat",
    category: "ECONOMIC_SHIFT",
    impactScore: "Low",
    reasoning: "Pola arus kas pelanggan bulanan: peluang collection tertinggi pada 25–30.",
    insight: "Jadwalkan kampanye reminder & penagihan intensif pada tanggal 25–30; hindari kontak berat sebelum tanggal gajian.",
  },
  {
    months: [10, 11, 12, 1, 2, 3],
    day: 12,
    title: "Puncak musim hujan: risiko banjir & longsor di Bandung Raya, Garut, Sukabumi, dan Pantura",
    summary: "Curah hujan tinggi pada musim penghujan meningkatkan peluang banjir Citarum, longsor Priangan, dan banjir Pantura.",
    location: "Bandung Raya, Garut, Sukabumi, Pantura",
    category: "NATURAL_DISASTER",
    impactScore: "High",
    reasoning: "Pola musiman historis: bencana hidrometeorologi mengganggu ekonomi lokal & akses jaringan.",
    insight: "Siapkan skenario relief (penundaan penagihan & perpanjangan jatuh tempo) untuk area rawan; koordinasikan dengan tim jaringan.",
  },
  {
    months: [11, 12],
    day: 20,
    title: "Penetapan UMK Jawa Barat: potensi gesekan industri di Bekasi & Karawang",
    summary: "Penetapan upah minimum tahun berikutnya biasanya terjadi akhir tahun; dapat memicu efisiensi tenaga kerja atau demo buruh.",
    location: "Bekasi, Karawang, Purwakarta",
    category: "ECONOMIC_SHIFT",
    impactScore: "Medium",
    reasoning: "Siklus tahunan penetapan UMK memengaruhi pendapatan rumah tangga pekerja industri.",
    insight: "Pantau pelanggan segmen buruh pabrik; siapkan paket hemat dan opsi cicilan bila terjadi gelombang PHK.",
  },
  {
    months: [12],
    day: 24,
    title: "Libur Natal & Tahun Baru: lonjakan belanja dan pergerakan masyarakat",
    summary: "Pengeluaran rumah tangga meningkat; trafik jaringan di destinasi wisata Jabar naik.",
    location: "Bandung Raya, Bogor, Pangandaran",
    category: "TELECOM_COMPETITOR",
    impactScore: "Medium",
    reasoning: "Kompetitor biasanya meluncurkan promo besar; kualitas jaringan diuji di lokasi wisata.",
    insight: "Luncurkan penawaran retensi akhir tahun & pastikan kapasitas jaringan di area wisata.",
  },
  {
    months: [7],
    day: 15,
    title: "Tahun ajaran baru: lonjakan kebutuhan biaya pendidikan rumah tangga",
    summary: "Biaya sekolah dan perlengkapan menekan anggaran keluarga di awal tahun ajaran.",
    location: "Jawa Barat",
    category: "ECONOMIC_SHIFT",
    impactScore: "Medium",
    reasoning: "Pengeluaran terkonsentrasi pada pendidikan mengurangi kemampuan bayar tagihan.",
    insight: "Tawarkan fleksibilitas jadwal pembayaran kepada pelanggan keluarga.",
  },
  {
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    day: 5,
    title: "Jatuh tempo pajak kendaraan & tagihan awal bulan menumpuk",
    summary: "Kewajiban rutin awal bulan (cicilan, listrik, pajak) berpotensi bersaing dengan tagihan telekomunikasi.",
    location: "Jawa Barat",
    category: "REGIONAL_POLICY",
    impactScore: "Low",
    reasoning: "Persaingan prioritas pembayaran rumah tangga pada awal bulan.",
    insight: "Beri reminder ramah dan opsi autodebet agar tagihan tidak tertinggal oleh kewajiban lain.",
  },
];

export function buildOutlook(y: number, m: number): ProcessedNewsItem[] {
  const dim = daysInMonth(y, m);
  return RULES.filter((r) => r.months.length === 0 || r.months.includes(m)).map((r, i) => ({
    id: `outlook-${monthKey(y, m)}-${i}`,
    title: r.title,
    summary: r.summary,
    publishedAt: dateKey(y, m, Math.min(r.day, dim)),
    source: "AI Predictive Outlook",
    sourceUrl: "",
    location: r.location,
    category: r.category,
    impactScore: r.impactScore,
    aiReasoning: r.reasoning,
    actionableInsight: r.insight,
    isPredicted: true,
  }));
}

