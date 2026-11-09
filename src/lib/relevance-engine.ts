import type { ImpactScore, ProcessedNewsItem, RawNewsItem, RiskCategory } from "@/types/news";
import { isoToJakartaDate } from "@/lib/date";
import { isTrustedSource } from "@/lib/trusted-sources";

export interface FilterResult {
  relevant: ProcessedNewsItem[];
  discarded: number;
  engine: "gemini" | "rules";
  warning?: string;
}

/* ------------------------------------------------------------------ */
/*  Kriteria relevansi (Collection & Retention — Jawa Barat)           */
/* ------------------------------------------------------------------ */

const CATEGORY_KEYWORDS: Record<RiskCategory, string[]> = {
  ECONOMIC_SHIFT: [
    "phk", "pemutusan hubungan kerja", "memutus hubungan kerja", "dirumahkan", "merumahkan",
    "pabrik tutup", "tutup pabrik", "pengangguran", "inflasi", "harga beras", "harga cabai",
    "harga bawang", "harga elpiji", "harga gas", "bahan pokok", "kebutuhan pokok", "daya beli",
    "umr", "ump", "umk", "upah minimum", "kenaikan harga", "efisiensi", "kredit macet",
  ],
  NATURAL_DISASTER: [
    "banjir", "longsor", "gempa", "puting beliung", "kekeringan", "erupsi", "bencana",
    "mengungsi", "pengungsi", "dievakuasi", "evakuasi", "banjir bandang", "rob", "tanggap darurat",
  ],
  REGIONAL_POLICY: [
    "pajak", "relaksasi", "keringanan", "retribusi", "subsidi", "perda", "peraturan daerah",
    "penutupan", "penertiban", "pembatasan", "bansos", "bantuan sosial", "kebijakan",
  ],
  TELECOM_COMPETITOR: [
    "pemadaman listrik", "listrik padam", "pln", "blackout", "gangguan jaringan", "gangguan listrik",
    "jaringan down", "sinyal hilang", "operator seluler", "provider", "kompetitor", "migrasi",
    "pindah provider", "internet down", "kabel fiber putus", "gangguan transmisi", "churn",
  ],
};

const HIGH_MARKERS = [
  "massal", "ribuan", "ratusan", "puluhan", "lumpuh", "terputus", "putus", "memutus", "darurat",
  "korban jiwa", "mengungsi", "blackout", "bandang", "menghentikan operasional", "tertimbun",
  "tutup", "dirumahkan", "melonjak",
];

const ENTERTAINMENT_NOISE = [
  "artis", "selebriti", "selebgram", "gosip", "konser", "album", "pernikahan mewah",
  "klasemen", "liga 1", "persib", "resep", "gaya rambut",
];

/** Kabupaten/Kota & penanda wilayah Jawa Barat → nama tampilan. */
const WEST_JAVA_REGIONS: Array<[string, string]> = [
  ["dayeuhkolot", "Kab. Bandung"],
  ["baleendah", "Kab. Bandung"],
  ["kota bandung", "Kota Bandung"],
  ["kabupaten bandung", "Kab. Bandung"],
  ["bandung", "Bandung Raya"],
  ["cimahi", "Kota Cimahi"],
  ["cikarang", "Kab. Bekasi"],
  ["bekasi", "Bekasi"],
  ["karawang", "Kab. Karawang"],
  ["purwakarta", "Kab. Purwakarta"],
  ["subang", "Kab. Subang"],
  ["indramayu", "Kab. Indramayu"],
  ["cirebon", "Cirebon"],
  ["majalengka", "Kab. Majalengka"],
  ["kuningan", "Kab. Kuningan"],
  ["sumedang", "Kab. Sumedang"],
  ["garut", "Kab. Garut"],
  ["tasikmalaya", "Tasikmalaya"],
  ["ciamis", "Kab. Ciamis"],
  ["pangandaran", "Kab. Pangandaran"],
  ["banjar", "Kota Banjar"],
  ["cianjur", "Kab. Cianjur"],
  ["sukabumi", "Sukabumi"],
  ["bogor", "Bogor"],
  ["depok", "Kota Depok"],
  ["priangan", "Priangan"],
  ["jawa barat", "Jawa Barat"],
  ["jabar", "Jawa Barat"],
];

function matches(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}(nya)?($|[^a-z0-9])`, "i").test(text);
}

function countHits(text: string, keywords: string[]): string[] {
  return keywords.filter((k) => matches(text, k));
}

function detectLocation(text: string): string | null {
  for (const [needle, label] of WEST_JAVA_REGIONS) {
    if (matches(text, needle)) return label;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Insight template                                                   */
/* ------------------------------------------------------------------ */

const INSIGHTS: Record<RiskCategory, Record<ImpactScore, string>> = {
  ECONOMIC_SHIFT: {
    High: "Segmentasi pelanggan di area/industri terdampak: tawarkan restrukturisasi atau cicilan tagihan, tunda eskalasi penagihan agresif 14–30 hari, dan prioritaskan kontak empatik. Siapkan paket hemat untuk mencegah churn.",
    Medium: "Pantau pola keterlambatan bayar di area terkait; kirim reminder lebih awal dengan opsi pembayaran fleksibel dan tawarkan paket lebih murah kepada pelanggan berisiko.",
    Low: "Masukkan area ini ke watchlist; tidak perlu perubahan strategi penagihan, cukup pantau tren pembayaran 1–2 siklus.",
  },
  NATURAL_DISASTER: {
    High: "Aktifkan relief program: tunda penagihan & penonaktifan layanan 7–14 hari untuk area bencana, beri perpanjangan jatuh tempo dan bonus kuota darurat. Hindari kontak penagihan agresif; fokus pada pemulihan layanan.",
    Medium: "Longgarkan penagihan di kecamatan terdampak, tawarkan perpanjangan masa aktif dan jadwal bayar baru; verifikasi kondisi jaringan di area tersebut.",
    Low: "Siaga: pantau perkembangan bencana dan siapkan skrip komunikasi bila dampak meluas.",
  },
  REGIONAL_POLICY: {
    High: "Evaluasi ulang jadwal & channel penagihan di wilayah kebijakan (mis. pembatasan operasional usaha). Sesuaikan target collection dan tawarkan metode pembayaran digital.",
    Medium: "Perhatikan pelanggan UMKM/pedagang di area terdampak kebijakan; tawarkan fleksibilitas tanggal jatuh tempo dan edukasi pembayaran digital.",
    Low: "Catat sebagai konteks; belum memerlukan tindakan khusus. Pantau implementasi kebijakan.",
  },
  TELECOM_COMPETITOR: {
    High: "Retention alert: jalankan kampanye proaktif untuk pelanggan di area gangguan kompetitor (penawaran migrasi, bonus data) dan pastikan jaringan sendiri stabil. Tunda penagihan bila gangguan listrik memengaruhi akses pelanggan.",
    Medium: "Siapkan penawaran retensi/win-back ringan di area terkait dan monitor lonjakan permintaan porting number dari kompetitor.",
    Low: "Pantau aktivitas kompetitor di wilayah tersebut; belum diperlukan tindakan.",
  },
};

function buildReasoning(category: RiskCategory, location: string, hits: string[], impact: ImpactScore): string {
  const label: Record<RiskCategory, string> = {
    ECONOMIC_SHIFT: "guncangan ekonomi yang menekan pendapatan/daya beli",
    NATURAL_DISASTER: "bencana/force majeure yang mengganggu aktivitas ekonomi dan akses",
    REGIONAL_POLICY: "kebijakan daerah yang memengaruhi kemampuan bayar",
    TELECOM_COMPETITOR: "gangguan listrik/jaringan atau aktivitas kompetitor yang memicu risiko churn",
  };
  const kw = hits.slice(0, 4).join(", ");
  return `Terdeteksi ${label[category]} di ${location} (indikator: ${kw}). Dampak ${impact.toLowerCase()} terhadap collection & retention.`;
}

/* ------------------------------------------------------------------ */
/*  Rule-based engine (fallback / default tanpa API key)               */
/* ------------------------------------------------------------------ */

function trim(text: string, max = 220) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function filterWithRules(newsList: RawNewsItem[]): { relevant: ProcessedNewsItem[]; discarded: number } {
  const relevant: ProcessedNewsItem[] = [];
  let discarded = 0;

  for (const raw of newsList) {
    if (!isTrustedSource(raw.source)) {
      discarded++;
      continue;
    }
    const text = `${raw.title} ${raw.description}`.toLowerCase();
    const location = detectLocation(text);
    if (!location) {
      discarded++;
      continue;
    }

    let best: { category: RiskCategory; hits: string[] } | null = null;
    for (const category of Object.keys(CATEGORY_KEYWORDS) as RiskCategory[]) {
      const hits = countHits(text, CATEGORY_KEYWORDS[category]);
      if (hits.length > 0 && (!best || hits.length > best.hits.length)) best = { category, hits };
    }
    if (!best) {
      discarded++;
      continue;
    }

    const noise = countHits(text, ENTERTAINMENT_NOISE);
    if (noise.length > 0 && best.hits.length < 2) {
      discarded++;
      continue;
    }

    const highHits = countHits(text, HIGH_MARKERS);
    let impact: ImpactScore;
    if (highHits.length >= 2 || (highHits.length >= 1 && best.hits.length >= 2)) impact = "High";
    else if (best.hits.length >= 2 || highHits.length >= 1) impact = "Medium";
    else impact = "Low";

    relevant.push({
      id: raw.id,
      title: raw.title,
      summary: trim(raw.description),
      publishedAt: isoToJakartaDate(raw.publishedAt),
      source: raw.source,
      sourceUrl: raw.url,
      location,
      category: best.category,
      impactScore: impact,
      aiReasoning: buildReasoning(best.category, location, [...best.hits, ...highHits], impact),
      actionableInsight: INSIGHTS[best.category][impact],
    });
  }

  return { relevant, discarded };
}

/* ------------------------------------------------------------------ */
/*  Gemini engine                                                      */
/* ------------------------------------------------------------------ */

interface GeminiEvaluation {
  id: string;
  relevant: boolean;
  category?: string;
  impactScore?: string;
  location?: string;
  aiReasoning?: string;
  actionableInsight?: string;
}

const CATEGORIES: RiskCategory[] = ["ECONOMIC_SHIFT", "NATURAL_DISASTER", "REGIONAL_POLICY", "TELECOM_COMPETITOR"];
const IMPACTS: ImpactScore[] = ["High", "Medium", "Low"];

async function filterWithGemini(newsList: RawNewsItem[], apiKey: string): Promise<ProcessedNewsItem[]> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const payload = newsList.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    source: n.source,
    date: isoToJakartaDate(n.publishedAt),
  }));

  const prompt = `Berikut adalah daftar berita terkini di Jawa Barat. Evaluasi setiap berita untuk tim Collection & Retention perusahaan telekomunikasi.
Tandai relevant=true HANYA bila berita berdampak pada daya beli masyarakat, ekonomi lokal, kemampuan bayar tagihan, atau risiko churn pelanggan di Jawa Barat. Kategori:
- ECONOMIC_SHIFT: PHK massal, inflasi bahan pokok, perubahan UMR/UMK.
- NATURAL_DISASTER: banjir, gempa, longsor, force majeure yang memutus akses/ekonomi lokal.
- REGIONAL_POLICY: relaksasi pajak, pemotongan subsidi, penutupan area komersial.
- TELECOM_COMPETITOR: pemadaman listrik massal atau gangguan jaringan kompetitor.
Abaikan (relevant=false) berita di luar konteks ini (hiburan, olahraga, politik umum, berita di luar Jawa Barat).
Untuk berita relevan, isi impactScore (High/Medium/Low = risiko terhadap billing collection), location (kab/kota), aiReasoning (1 kalimat) dan actionableInsight (rekomendasi tindakan untuk tim Collection & Retention, Bahasa Indonesia).

Berita:
${JSON.stringify(payload)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                relevant: { type: "BOOLEAN" },
                category: { type: "STRING", enum: CATEGORIES },
                impactScore: { type: "STRING", enum: IMPACTS },
                location: { type: "STRING" },
                aiReasoning: { type: "STRING" },
                actionableInsight: { type: "STRING" },
              },
              required: ["id", "relevant"],
            },
          },
        },
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini mengembalikan respons kosong");
  const evaluations = JSON.parse(text) as GeminiEvaluation[];

  const byId = new Map(newsList.map((n) => [n.id, n]));
  const out: ProcessedNewsItem[] = [];
  for (const ev of evaluations) {
    const raw = byId.get(ev.id);
    if (!raw || !ev.relevant) continue;
    if (!CATEGORIES.includes(ev.category as RiskCategory)) continue;
    const category = ev.category as RiskCategory;
    const impact = IMPACTS.includes(ev.impactScore as ImpactScore) ? (ev.impactScore as ImpactScore) : "Medium";
    out.push({
      id: raw.id,
      title: raw.title,
      summary: trim(raw.description),
      publishedAt: isoToJakartaDate(raw.publishedAt),
      source: raw.source,
      sourceUrl: raw.url,
      location: ev.location?.trim() || "Jawa Barat",
      category,
      impactScore: impact,
      aiReasoning: ev.aiReasoning?.trim() || buildReasoning(category, ev.location || "Jawa Barat", [], impact),
      actionableInsight: ev.actionableInsight?.trim() || INSIGHTS[category][impact],
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Menyaring berita mentah: hanya berita yang memengaruhi kemampuan bayar / retensi pelanggan
 * di Jawa Barat yang dipertahankan. Memakai Gemini bila GEMINI_API_KEY tersedia, jika tidak
 * (atau bila gagal) memakai mesin berbasis aturan.
 */
export async function filterNewsForCollection(newsList: RawNewsItem[]): Promise<FilterResult> {
  // Sumber tidak tepercaya selalu dibuang sebelum diproses mesin mana pun.
  const trusted = newsList.filter((n) => isTrustedSource(n.source));
  const untrustedCount = newsList.length - trusted.length;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && trusted.length > 0) {
    try {
      const relevant = await filterWithGemini(trusted, apiKey);
      return { relevant, discarded: newsList.length - relevant.length, engine: "gemini" };
    } catch (err) {
      const rules = filterWithRules(trusted);
      return {
        relevant: rules.relevant,
        discarded: rules.discarded + untrustedCount,
        engine: "rules",
        warning: `Gemini gagal (${err instanceof Error ? err.message : "unknown"}); memakai filter berbasis aturan.`,
      };
    }
  }

  const rules = filterWithRules(trusted);
  return { relevant: rules.relevant, discarded: rules.discarded + untrustedCount, engine: "rules" };
}
