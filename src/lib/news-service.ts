import type { RawNewsItem } from "@/types/news";
import { buildMockLiveNews } from "@/data/mock-news";
import { dateKey } from "@/lib/date";

export interface FetchResult {
  items: RawNewsItem[];
  source: "gnews" | "mock";
  warning?: string;
}

/** Kueri pencarian fokus Jawa Barat (struktur siap produksi untuk GNews / NewsAPI). */
export const NEWS_QUERY =
  '("Jawa Barat" OR Bandung OR Bekasi OR Karawang OR Bogor OR Cirebon) AND (PHK OR banjir OR longsor OR inflasi OR UMK OR pajak OR "pemadaman listrik" OR "gangguan jaringan")';

interface GNewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string; url: string };
}

/**
 * Mengambil berita mentah untuk bulan berjalan.
 * - Dengan GNEWS_API_KEY: memanggil GNews API sungguhan.
 * - Tanpa key (atau gagal): memakai berita simulasi.
 */
export async function fetchCurrentMonthNews(y: number, m: number, todayDay: number): Promise<FetchResult> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    return { items: buildMockLiveNews(y, m, todayDay), source: "mock" };
  }

  try {
    const params = new URLSearchParams({
      q: NEWS_QUERY,
      lang: "id",
      country: "id",
      max: "100",
      sortby: "publishedAt",
      from: `${dateKey(y, m, 1)}T00:00:00Z`,
      to: `${dateKey(y, m, todayDay)}T23:59:59Z`,
      apikey: apiKey,
    });
    const res = await fetch(`https://gnews.io/api/v4/search?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
    const data = (await res.json()) as { articles?: GNewsArticle[] };
    const items: RawNewsItem[] = (data.articles ?? []).map((a, i) => ({
      id: `gnews-${Buffer.from(a.url).toString("base64url").slice(-24)}-${i}`,
      title: a.title,
      description: a.description ?? "",
      publishedAt: a.publishedAt,
      source: a.source.name,
      url: a.url,
    }));
    return { items, source: "gnews" };
  } catch (err) {
    return {
      items: buildMockLiveNews(y, m, todayDay),
      source: "mock",
      warning: `GNews gagal (${err instanceof Error ? err.message : "unknown"}); memakai data simulasi.`,
    };
  }
}

