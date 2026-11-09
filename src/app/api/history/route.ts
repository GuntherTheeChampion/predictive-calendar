import { NextResponse } from "next/server";
import type { NewsResponse } from "@/types/news";
import { compareMonth, getJakartaToday, parseMonthKey } from "@/lib/date";
import { getHistory, saveHistory } from "@/lib/history-store";
import { getLiveNews } from "@/lib/live-feed";

export const dynamic = "force-dynamic";

/** GET /api/history?month=YYYY-MM — baca arsip bulan lalu dari database (bukan API berita live). */
export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") ?? "";
  const target = parseMonthKey(month);
  if (!target) {
    return NextResponse.json({ error: "Parameter month harus berformat YYYY-MM" }, { status: 400 });
  }
  if (compareMonth(target, getJakartaToday()) >= 0) {
    return NextResponse.json({ error: "Riwayat hanya tersedia untuk bulan yang sudah lewat." }, { status: 400 });
  }

  const history = await getHistory(month);
  const body: NewsResponse = {
    items: history.items,
    meta: {
      mode: "archive",
      month,
      dataSource: history.dataSource,
      engine: "none",
      totalFetched: history.totalFetched,
      discarded: history.discarded,
      warning: history.warning,
    },
  };
  return NextResponse.json(body);
}

/** POST /api/history — arsipkan hasil filter bulan berjalan ke tabel past_news_history. */
export async function POST() {
  try {
    const live = await getLiveNews();
    const result = await saveHistory(live.meta.month, live.items);
    return NextResponse.json({ month: live.meta.month, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengarsipkan" },
      { status: 500 },
    );
  }
}

