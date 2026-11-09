import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ImpactScore, ProcessedNewsItem, RiskCategory } from "@/types/news";
import { buildMockArchiveNews } from "@/data/mock-news";
import { filterWithRules } from "@/lib/relevance-engine";
import { getJakartaToday } from "@/lib/date";

/**
 * Penyimpanan riwayat berita bulan lalu (tabel `past_news_history`).
 * - Dengan SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: memakai Supabase (PostgreSQL).
 * - Tanpa itu: file lokal `.data/past_news_history.json` (+ seed data simulasi 3 bulan terakhir).
 */

const TABLE = "past_news_history";
const LOCAL_FILE = path.join(process.cwd(), ".data", "past_news_history.json");

export interface HistoryResult {
  items: ProcessedNewsItem[];
  dataSource: "supabase" | "local-file" | "mock";
  totalFetched: number;
  discarded: number;
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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

/** Ambil riwayat bulan tertentu (YYYY-MM) — tidak pernah memanggil API berita live. */
export async function getHistory(month: string): Promise<HistoryResult> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("month_key", month)
      .order("published_at", { ascending: true });
    if (!error) {
      const items = ((data ?? []) as Row[]).map(fromRow);
      return { items, dataSource: "supabase", totalFetched: items.length, discarded: 0 };
    }
    // lanjut ke fallback lokal bila query gagal
    const local = await getLocalHistory(month);
    return { ...local, warning: `Supabase gagal (${error.message}); memakai penyimpanan lokal.` };
  }
  return getLocalHistory(month);
}

async function getLocalHistory(month: string): Promise<HistoryResult> {
  const store = await readLocal();
  if (store[month]) {
    return { items: store[month], dataSource: "local-file", totalFetched: store[month].length, discarded: 0 };
  }
  // Seed demo: 1–3 bulan terakhir diambil dari arsip simulasi.
  const [y, m] = month.split("-").map(Number);
  const today = getJakartaToday();
  const raw = buildMockArchiveNews({ y: today.y, m: today.m }, { y, m });
  if (raw) {
    const { relevant, discarded } = filterWithRules(raw);
    return { items: relevant, dataSource: "mock", totalFetched: raw.length, discarded };
  }
  return { items: [], dataSource: "local-file", totalFetched: 0, discarded: 0 };
}

/** Simpan hasil filter satu bulan ke riwayat (menimpa data bulan tersebut). */
export async function saveHistory(
  month: string,
  items: ProcessedNewsItem[],
): Promise<{ store: "supabase" | "local-file"; saved: number; warning?: string }> {
  const supabase = getSupabase();
  if (supabase) {
    const del = await supabase.from(TABLE).delete().eq("month_key", month);
    if (del.error) throw new Error(del.error.message);
    if (items.length > 0) {
      const ins = await supabase.from(TABLE).insert(items.map((i) => toRow(i, month)));
      if (ins.error) throw new Error(ins.error.message);
    }
    return { store: "supabase", saved: items.length };
  }

  const store = await readLocal();
  store[month] = items;
  try {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    throw new Error(
      `Tidak dapat menulis penyimpanan lokal (${err instanceof Error ? err.message : "unknown"}). Konfigurasikan Supabase untuk hosting serverless.`,
    );
  }
  return { store: "local-file", saved: items.length };
}

