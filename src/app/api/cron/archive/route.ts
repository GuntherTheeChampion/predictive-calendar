import { NextResponse } from "next/server";
import { saveHistory } from "@/lib/history-store";
import { getLiveNews } from "@/lib/live-feed";

export const dynamic = "force-dynamic";

/**
 * Dipanggil Vercel Cron (lihat vercel.json) pada tanggal 28–31 pukul 23:55 WIB.
 * Mengarsipkan hasil filter bulan berjalan; aman dijalankan berulang (menimpa data bulan tsb).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

