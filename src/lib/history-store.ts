import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataSourceType, ImpactScore, ProcessedNewsItem, RiskCategory } from "@/types/news";
import { fetchHistoricalMonthNews } from "@/lib/news-service";
import { filterNewsForCollection } from "@/lib/relevance-engine";

/**
 * Penyimpanan riwayat berita (tabel `past_news_history`).
 * Mendukung kredensial:
 * - NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_ANON_KEY atau SUPABASE_ANON_KEY
 * Jika tabel di Supabase belum dibuat atau tidak terjangkau, otomatis fallback ke `.data/past_news_history.json`.
 */

const TABLE = "past_news_history";
const LOCAL_FILE = path.join(process.cwd(), ".data", "past_news_history.json");

export interface HistoryResult {
  items: ProcessedNewsItem[];
  dataSource: DataSourceType;
  totalFetched: number;
  discarded: number;
  dbStatus: {
    connected: boolean;
    provider: "supabase" | "local-file";
    autoSavedCount?: number;
    error?: string;
  };
  warning?: string;
}

interface Row {
  id: string;
  month_key: string;
  published_at: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  location: string;
  category: RiskCategory;
  impact_score: ImpactScore;
  ai_reasoning: string;
  actionable_insight: string;
}

function getSupabase(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isSupabaseConfigured() {
  return getSupabase() !== null;
}

const toRow = (item: ProcessedNewsItem, month: string): Row => ({
  id: item.id,
  month_key: month,
  published_at: item.publishedAt,
  title: item.title,
  summary: item.summary,
  source: item.source,
  source_url: item.sourceUrl,
  location: item.location,
  category: item.category,
  impact_score: item.impactScore,
  ai_reasoning: item.aiReasoning,
  actionable_insight: item.actionableInsight,
});

const fromRow = (r: Row): ProcessedNewsItem => ({
  id: r.id,
  title: r.title,
  summary: r.summary,
  publishedAt: r.published_at,
  source: r.source,
  sourceUrl: r.source_url,
  location: r.location,
  category: r.category,
  impactScore: r.impact_score,
  aiReasoning: r.ai_reasoning,
  actionableInsight: r.actionable_insight,
});

async function readLocal(): Promise<Record<string, ProcessedNewsItem[]>> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalMonth(month: string, items: ProcessedNewsItem[]): Promise<void> {
  try {
    const store = await readLocal();
    const existing = store[month] ?? [];
    const byId = new Map<string, ProcessedNewsItem>();
    for (const item of existing) byId.set(item.id, item);
    for (const item of items) byId.set(item.id, item);
    store[month] = Array.from(byId.values()).sort((a, b) => (a.publishedAt < b.publishedAt ? -1 : 1));
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Abaikan di environment read-only
  }
}

/**
 * Auto-Upsert berita ke Supabase (dan salinan ke file lokal).
 * Tidak menghapus berita lain di bulan yang sama, melainkan menggabungkan/memperbarui berdasarkan `id`.
 */
export async function autoUpsertNews(
  month: string,
  items: ProcessedNewsItem[],
): Promise<{
  connected: boolean;
  provider: "supabase" | "local-file";
  autoSavedCount: number;
  error?: string;
}> {
  if (items.length === 0) {
    const hasSb = isSupabaseConfigured();
    return { connected: hasSb, provider: hasSb ? "supabase" : "local-file", autoSavedCount: 0 };
  }

  await writeLocalMonth(month, items);

  const supabase = getSupabase();
  if (!supabase) {
    return {
      connected: false,
      provider: "local-file",
      autoSavedCount: items.length,
    };
  }

  const rows = items.map((i) => toRow(i, month));
  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: "id" });

  if (error) {
    return {
      connected: false,
      provider: "local-file",
      autoSavedCount: items.length,
      error: `Supabase (${error.message}) — Pastikan Anda sudah menjalankan supabase/schema.sql di SQL Editor Supabase.`,
    };
  }

  return {
    connected: true,
    provider: "supabase",
    autoSavedCount: items.length,
  };
}

/**
 * Ambil riwayat bulan tertentu (YYYY-MM).
 * 1. Cek di Supabase `past_news_history`.
 * 2. Jika di database masih kosong untuk bulan tersebut, tarik arsip berita nyata dari Google News RSS
 *    (Backfill otomatis), saring dengan AI/Rules, lalu simpan ke Supabase agar kunjungan berikutnya instan.
 */
export async function getHistory(month: string): Promise<HistoryResult> {
  const supabase = getSupabase();
  let sbError: string | undefined;

  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("month_key", month)
      .order("published_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const items = (data as Row[]).map(fromRow);
      return {
        items,
        dataSource: "supabase",
        totalFetched: items.length,
        discarded: 0,
        dbStatus: { connected: true, provider: "supabase" },
      };
    }
    if (error) {
      sbError = `Supabase (${error.message}) — Jalankan supabase/schema.sql di SQL Editor Supabase untuk mengaktifkan tabel.`;
    }
  }

  // Cek penyimpanan file lokal terlebih dahulu
  const localStore = await readLocal();
  if (localStore[month] && localStore[month].length > 0) {
    const localItems = localStore[month];
    // Jika Supabase sudah terkonfigurasi tetapi tadi kosong, coba sinkronkan ke Supabase
    if (supabase && !sbError) {
      const syncStatus = await autoUpsertNews(month, localItems);
      if (syncStatus.connected) {
        return {
          items: localItems,
          dataSource: "supabase",
          totalFetched: localItems.length,
          discarded: 0,
          dbStatus: syncStatus,
        };
      }
    }
    return {
      items: localItems,
      dataSource: "local-file",
      totalFetched: localItems.length,
      discarded: 0,
      dbStatus: {
        connected: false,
        provider: "local-file",
        error: sbError,
      },
      warning: sbError,
    };
  }

  // Backfill otomatis dari Google News RSS untuk bulan tersebut
  const [y, m] = month.split("-").map(Number);
  const fetched = await fetchHistoricalMonthNews(y, m);
  const filtered = await filterNewsForCollection(fetched.items);
  const upsertStatus = await autoUpsertNews(month, filtered.relevant);

  const warnings = [sbError, fetched.warning, filtered.warning, upsertStatus.error]
    .filter(Boolean)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .join(" ");

  return {
    items: filtered.relevant,
    dataSource: upsertStatus.connected ? "supabase" : fetched.source,
    totalFetched: fetched.items.length,
    discarded: filtered.discarded,
    dbStatus: upsertStatus,
    warning: warnings || undefined,
  };
}

/** Simpan hasil filter satu bulan ke riwayat (dipakai oleh tombol Arsipkan / Cron). */
export async function saveHistory(
  month: string,
  items: ProcessedNewsItem[],
): Promise<{ store: "supabase" | "local-file"; saved: number; warning?: string }> {
  const status = await autoUpsertNews(month, items);
  return {
    store: status.provider,
    saved: status.autoSavedCount,
    warning: status.error,
  };
}
