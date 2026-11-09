import type { NewsResponse } from "@/types/news";
import { getJakartaToday, monthKey } from "@/lib/date";
import { fetchCurrentMonthNews } from "@/lib/news-service";
import { filterNewsForCollection } from "@/lib/relevance-engine";
import { autoUpsertNews } from "@/lib/history-store";

/**
 * Pipeline bulan berjalan:
 * Fetch berita nyata (Google News RSS / GNews) → Relevance Engine → Auto-Upsert ke Supabase / Database.
 */
export async function getLiveNews(): Promise<NewsResponse> {
  const today = getJakartaToday();
  const currentMonth = monthKey(today.y, today.m);
  const fetched = await fetchCurrentMonthNews(today.y, today.m, today.d);
  const filtered = await filterNewsForCollection(fetched.items);
  const dbStatus = await autoUpsertNews(currentMonth, filtered.relevant);

  const warnings = [fetched.warning, filtered.warning, dbStatus.error]
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .join(" ");

  return {
    items: filtered.relevant,
    meta: {
      mode: "live",
      month: currentMonth,
      dataSource: fetched.source,
      engine: filtered.engine,
      totalFetched: fetched.items.length,
      discarded: filtered.discarded,
      dbStatus,
      warning: warnings || undefined,
    },
  };
}
