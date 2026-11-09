import { NextResponse } from "next/server";
import type { NewsResponse } from "@/types/news";
import { compareMonth, getJakartaToday, parseMonthKey } from "@/lib/date";
import { getLiveNews } from "@/lib/live-feed";
import { buildOutlook } from "@/lib/seasonal-outlook";

export const dynamic = "force-dynamic";

/**
 * GET /api/news?month=YYYY-MM
 * - bulan berjalan  → berita live + Relevance Engine
 * - bulan mendatang → proyeksi musiman (Predictive Outlook)
 * - bulan lalu      → gunakan /api/history (tidak memanggil API berita live)
 */
export async function GET(request: Request) {
  const monthParam = new URL(request.url).searchParams.get("month");
  const today = getJakartaToday();
  const target = monthParam ? parseMonthKey(monthParam) : { y: today.y, m: today.m };
  if (!target) {
    return NextResponse.json({ error: "Parameter month harus berformat YYYY-MM" }, { status: 400 });
  }

  const diff = compareMonth(target, today);
  if (diff < 0) {
    return NextResponse.json(
      { error: "Bulan lalu dilayani oleh /api/history, bukan API berita live." },
      { status: 400 },
    );
  }

  if (diff > 0) {
    const items = buildOutlook(target.y, target.m);
    const body: NewsResponse = {
      items,
      meta: {
        mode: "outlook",
        month: monthParam!,
        dataSource: "seasonal-model",
        engine: "none",
        totalFetched: items.length,
        discarded: 0,
      },
    };
    return NextResponse.json(body);
  }

  try {
    return NextResponse.json(await getLiveNews());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat berita" },
      { status: 500 },
    );
  }
}

