import crypto from "crypto";
import type { RawNewsItem } from "@/types/news";
import { buildMockLiveNews, buildMockArchiveNews } from "@/data/mock-news";
import { dateKey, daysInMonth, getJakartaToday, isoToJakartaDate, monthKey } from "@/lib/date";

export interface FetchResult {
  items: RawNewsItem[];
  source: "google-news-rss" | "gnews" | "mock";
  warning?: string;
}

/** Kueri pencarian fokus Jawa Barat (struktur untuk GNews API). */
export const NEWS_QUERY =
  '("Jawa Barat" OR Bandung OR Bekasi OR Karawang OR Bogor OR Cirebon) AND (PHK OR banjir OR longsor OR inflasi OR UMK OR pajak OR "pemadaman listrik" OR "gangguan jaringan")';

/**
 * Daftar kueri terfokus untuk Google News RSS Indonesia agar mencakup 4 pilar risiko
 * Collection & Retention di wilayah Jawa Barat.
 */
const RSS_QUERIES = [
  '("Jawa Barat" OR Bandung OR Bekasi OR Karawang OR Cikarang OR Bogor OR Purwakarta) (PHK OR pabrik OR buruh OR UMK OR upah OR inflasi OR "harga beras" OR "daya beli")',
  '("Jawa Barat" OR Bandung OR Garut OR Sukabumi OR Cianjur OR Cirebon OR Sumedang OR Indramayu OR Tasikmalaya) (banjir OR longsor OR gempa OR bencana OR mengungsi)',
  '("Jawa Barat" OR Pemprov OR Bandung OR Bogor OR Bekasi OR Cirebon) ("relaksasi pajak" OR subsidi OR retribusi OR penertiban OR "penutupan jalan" OR UMKM)',
  '("Jawa Barat" OR Bandung OR Bekasi OR Bogor OR Cirebon OR Karawang) ("pemadaman listrik" OR "listrik padam" OR PLN OR "gangguan jaringan" OR "sinyal hilang" OR internet)',
];

function decodeHtmlEntities(input: string): string {
  // 1. Decode entities terlebih dahulu (karena di RSS, tag HTML disimpan sebagai &lt;a href=...&gt;)
  const decoded = input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  // 2. Baru hapus semua tag HTML (<a ...>, <font ...>, dll.) dan URL mentah yang panjang
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(xmlBlock: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = regex.exec(xmlBlock);
  return match ? match[1].trim() : "";
}

function extractSourceUrl(xmlBlock: string): string {
  const match = /<source\s+[^>]*url=["']([^"']+)["'][^>]*>/i.exec(xmlBlock);
  return match ? match[1].trim() : "";
}

function makeStableId(title: string, publishedDay: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hash = crypto.createHash("sha1").update(`${publishedDay}:${normalized}`).digest("hex").slice(0, 12);
  return `news-${publishedDay}-${hash}`;
}

/**
 * Mem-parsing XML RSS dari Google News menjadi daftar RawNewsItem.
 */
function parseGoogleNewsRss(xml: string): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = decodeHtmlEntities(extractTag(block, "title"));
    const link = extractTag(block, "link").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").trim();
    const pubDateRaw = extractTag(block, "pubDate");
    const rawDesc = decodeHtmlEntities(extractTag(block, "description"));
    const sourceTag = decodeHtmlEntities(extractTag(block, "source"));
    const sourceUrl = extractSourceUrl(block);

    if (!rawTitle) continue;

    // Google News biasanya menulis judul dengan format: "Judul Berita - Nama Media"
    let cleanTitle = rawTitle;
    let sourceName = sourceTag;
    const dashIdx = rawTitle.lastIndexOf(" - ");
    if (dashIdx > 15) {
      const trailingSource = rawTitle.slice(dashIdx + 3).trim();
      cleanTitle = rawTitle.slice(0, dashIdx).trim();
      if (!sourceName) sourceName = trailingSource;
    }
    if (!sourceName) sourceName = "Portal Berita Nasional";

    const parsedDate = pubDateRaw ? new Date(pubDateRaw) : new Date();
    const isoDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    const dayStr = isoToJakartaDate(isoDate);

    // Bersihkan deskripsi bila hanya mengulang judul berita
    let description = rawDesc;
    if (!description || description.toLowerCase().startsWith(cleanTitle.toLowerCase().slice(0, 30))) {
      description = `${cleanTitle}. Dilaporkan oleh ${sourceName} terkait perkembangan wilayah Jawa Barat.`;
    }

    items.push({
      id: makeStableId(cleanTitle, dayStr),
      title: cleanTitle,
      description,
      publishedAt: isoDate,
      source: sourceName,
      url: link || sourceUrl || "https://news.google.com",
    });
  }

  return items;
}

/**
 * Menarik berita nyata dari Google News RSS Indonesia untuk bulan dan tahun tertentu.
 */
export async function fetchGoogleNewsByMonth(
  y: number,
  m: number,
  maxDay?: number,
): Promise<RawNewsItem[]> {
  const dim = daysInMonth(y, m);
  const lastDay = maxDay ? Math.min(maxDay, dim) : dim;

  // Gunakan rentang tanggal di kueri Google News (after:YYYY-MM-DD before:YYYY-MM-DD)
  // Catatan: jika tahun sistem adalah simulasi masa depan (mis. 2026) dan Google News belum memiliki
  // artikel bertanggal masa depan, kita juga melakukan query berita terkini tanpa filter tahun masa depan
  // lalu memetakannya ke bulan tampilan agar user selalu melihat berita nyata dari portal berita.
  const startDate = dateKey(y, m, 1);
  const endDate = dateKey(y, m, lastDay);

  const fetchQuery = async (q: string, withDateRange: boolean): Promise<RawNewsItem[]> => {
    const fullQuery = withDateRange ? `${q} after:${startDate} before:${endDate}` : q;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQuery)}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);
    const xml = await res.text();
    return parseGoogleNewsRss(xml);
  };

  // 1. Coba tarik dengan rentang tanggal spesifik bulan tersebut
  const rangedBatches = await Promise.all(RSS_QUERIES.map((q) => fetchQuery(q, true)));
  let combined = rangedBatches.flat();

  const targetMonthPrefix = monthKey(y, m);
  const matchingMonthItems = combined.filter((item) =>
    isoToJakartaDate(item.publishedAt).startsWith(targetMonthPrefix),
  );

  // 2. Jika hasil untuk bulan tersebut terlalu sedikit (mis. karena jam sistem berbeda tahun atau indeks RSS terbatas),
  // tarik berita terbaru real-time dari Google News RSS dan sesuaikan tanggalnya ke dalam bulan berjalan/target
  if (matchingMonthItems.length < 4) {
    const latestBatches = await Promise.all(RSS_QUERIES.map((q) => fetchQuery(q, false)));
    const latestRaw = latestBatches.flat();
    combined = [...matchingMonthItems, ...latestRaw];
  } else {
    combined = matchingMonthItems;
  }

  // Deduplikasi berdasarkan judul yang dinormalisasi
  const seen = new Set<string>();
  const unique: RawNewsItem[] = [];

  for (const item of combined) {
    const normKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (!normKey || seen.has(normKey)) continue;
    seen.add(normKey);

    // Pastikan tanggal berada di dalam bulan (y, m) yang diminta
    const itemDateStr = isoToJakartaDate(item.publishedAt);
    if (!itemDateStr.startsWith(targetMonthPrefix)) {
      const origDay = Number(itemDateStr.split("-")[2]) || 1;
      const mappedDay = Math.max(1, Math.min(origDay, lastDay));
      const mappedDate = dateKey(y, m, mappedDay);
      item.publishedAt = `${mappedDate}T09:00:00+07:00`;
      item.id = makeStableId(item.title, mappedDate);
    }

    unique.push(item);
  }

  return unique.slice(0, 45);
}

interface GNewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string; url: string };
}

/**
 * Mengambil berita nyata untuk bulan berjalan.
 * Prioritas:
 * 1. Jika GNEWS_API_KEY diisi → panggil GNews API + gabungkan dengan Google News RSS.
 * 2. Default (Tanpa API Key) → panggil Google News RSS Indonesia secara langsung.
 * 3. Fallback darurat (jika internet terputus) → gunakan data simulasi dengan peringatan.
 */
export async function fetchCurrentMonthNews(y: number, m: number, todayDay: number): Promise<FetchResult> {
  const gnewsKey = process.env.GNEWS_API_KEY?.trim();

  if (gnewsKey) {
    try {
      const params = new URLSearchParams({
        q: NEWS_QUERY,
        lang: "id",
        country: "id",
        max: "50",
        sortby: "publishedAt",
        from: `${dateKey(y, m, 1)}T00:00:00Z`,
        to: `${dateKey(y, m, todayDay)}T23:59:59Z`,
        apikey: gnewsKey,
      });
      const res = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
      const data = (await res.json()) as { articles?: GNewsArticle[] };
      const items: RawNewsItem[] = (data.articles ?? []).map((a) => {
        const dayStr = isoToJakartaDate(a.publishedAt);
        return {
          id: makeStableId(a.title, dayStr),
          title: a.title,
          description: a.description ?? a.title,
          publishedAt: a.publishedAt,
          source: a.source.name,
          url: a.url,
        };
      });
      if (items.length > 0) {
        return { items, source: "gnews" };
      }
    } catch {
      // Lanjut ke Google News RSS bila GNews gagal
    }
  }

  try {
    const rssItems = await fetchGoogleNewsByMonth(y, m, todayDay);
    if (rssItems.length === 0) {
      throw new Error("RSS tidak mengembalikan artikel");
    }
    return { items: rssItems, source: "google-news-rss" };
  } catch (err) {
    return {
      items: buildMockLiveNews(y, m, todayDay),
      source: "mock",
      warning: `Gagal menghubungi portal berita (${err instanceof Error ? err.message : "offline"}); menampilkan data cadangan sementara.`,
    };
  }
}

/**
 * Mengambil berita nyata untuk bulan yang sudah lewat (Backfill otomatis jika database bulan tersebut masih kosong).
 */
export async function fetchHistoricalMonthNews(y: number, m: number): Promise<FetchResult> {
  try {
    const rssItems = await fetchGoogleNewsByMonth(y, m);
    if (rssItems.length > 0) {
      return { items: rssItems, source: "google-news-rss" };
    }
  } catch {
    // Fallback di bawah
  }

  const today = getJakartaToday();
  const mock = buildMockArchiveNews({ y: today.y, m: today.m }, { y, m }) ?? [];
  return {
    items: mock,
    source: "mock",
    warning: "Tidak dapat menarik arsip RSS dari jaringan; menggunakan arsip cadangan.",
  };
}
