import type { NewsResponse } from "@/types/news";
import { getJakartaToday, monthKey } from "@/lib/date";
import { fetchCurrentMonthNews } from "@/lib/news-service";
import { filterNewsForCollection } from "@/lib/relevance-engine";

/** Pipeline bulan berjalan: fetch berita mentah → Relevance Engine → hasil siap tampil/arsip. */
export async function getLiveNews(): Promise<NewsResponse> {
  const today = getJakartaToday();
  const fetched = await fetchCurrentMonthNews(today.y, today.m, today.d);
  const filtered = await filterNewsForCollection(fetched.items);
  const warnings = [fetched.warning, filtered.warning].filter(Boolean).join(" ");

  return {
    items: filtered.relevant,
    meta: {
      mode: "live",
      month: monthKey(today.y, today.m),
      dataSource: fetched.source,
      engine: filtered.engine,
      totalFetched: fetched.items.length,
      discarded: filtered.discarded,
      warning: warnings || undefined,
    },
  };
}

