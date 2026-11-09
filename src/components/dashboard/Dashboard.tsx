"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Radio,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { ImpactScore, NewsResponse, ProcessedNewsItem } from "@/types/news";
import { compareMonth, getJakartaToday, monthKey, monthName, shiftMonth, type YMD } from "@/lib/date";
import { cn } from "@/lib/utils";
import { CalendarGrid } from "./CalendarGrid";
import { NewsSidebar, type CategoryFilter, type ImpactFilter } from "./NewsSidebar";
import { IMPACT_STYLE } from "./badges";

const MODE_INFO = {
  live: { label: "Live Real-Time News (Bulan Berjalan)", icon: Radio, style: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  archive: { label: "Historical Archive (Database)", icon: Database, style: "bg-slate-100 text-slate-700 ring-slate-200" },
  outlook: { label: "Predictive Outlook (Bulan Depan)", icon: Sparkles, style: "bg-violet-50 text-violet-700 ring-violet-200" },
} as const;

const SOURCE_LABEL: Record<string, string> = {
  "google-news-rss": "Google News RSS Indonesia (Real News)",
  gnews: "GNews API (Real News)",
  supabase: "Supabase Database (PostgreSQL)",
  "local-file": "Local JSON Database",
  "seasonal-model": "Model Proyeksi Musiman",
  mock: "Data Cadangan (Offline)",
};

export function Dashboard() {
  const [today, setToday] = useState<YMD | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [impact, setImpact] = useState<ImpactFilter>("ALL");
  const [reloadTick, setReloadTick] = useState(0);
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    const t = getJakartaToday();
    setToday(t);
    setView({ y: t.y, m: t.m });
  }, []);

  const viewKey = view ? monthKey(view.y, view.m) : null;
  const diff = view && today ? compareMonth(view, today) : 0;

  useEffect(() => {
    if (!viewKey || !today) return;
    const controller = new AbortController();
    const endpoint = diff < 0 ? `/api/history?month=${viewKey}` : `/api/news?month=${viewKey}`;

    setLoading(true);
    setError(null);
    setSelectedDate(null);
    fetch(endpoint, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setData(json as NewsResponse);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setData(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [viewKey, diff, today, reloadTick]);

  const allItems = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((i) => {
      if (category !== "ALL" && i.category !== category) return false;
      if (impact !== "ALL" && i.impactScore !== impact) return false;
      if (q && !`${i.title} ${i.location} ${i.source} ${i.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allItems, search, category, impact]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ProcessedNewsItem[]>();
    for (const i of filtered) {
      const arr = map.get(i.publishedAt) ?? [];
      arr.push(i);
      map.set(i.publishedAt, arr);
    }
    return map;
  }, [filtered]);

  const sidebarItems = useMemo(() => {
    const list = selectedDate ? (itemsByDate.get(selectedDate) ?? []) : filtered;
    return [...list].sort(
      (a, b) =>
        IMPACT_STYLE[b.impactScore].rank - IMPACT_STYLE[a.impactScore].rank ||
        (a.publishedAt < b.publishedAt ? 1 : -1),
    );
  }, [filtered, itemsByDate, selectedDate]);

  const counts = useMemo(() => {
    const c: Record<ImpactScore, number> = { High: 0, Medium: 0, Low: 0 };
    for (const i of allItems) c[i.impactScore]++;
    return c;
  }, [allItems]);

  const go = useCallback(
    (delta: number) => setView((v) => (v ? shiftMonth(v.y, v.m, delta) : v)),
    [],
  );

  const archiveNow = async () => {
    setArchiving(true);
    setArchiveMsg(null);
    try {
      const res = await fetch("/api/history", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setArchiveMsg(
        `${json.saved} berita bulan ${json.month} berhasil disimpan ke ${SOURCE_LABEL[json.store] ?? json.store}.`,
      );
    } catch (err) {
      setArchiveMsg(`Gagal mengarsipkan: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setArchiving(false);
    }
  };

  if (!view || !today) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat dashboard…</div>;
  }

  const mode = diff < 0 ? "archive" : diff > 0 ? "outlook" : "live";
  const ModeIcon = MODE_INFO[mode].icon;
  const monthTitle = `${monthName(view.m)} ${view.y}`;
  const isCurrent = diff === 0;
  const dbStatus = data?.meta.dbStatus;

  return (
    <main className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Collection &amp; Retention · Jawa Barat</p>
          <h1 className="text-2xl font-bold tracking-tight">Predictive News Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Berita nyata portal Indonesia yang memengaruhi kemampuan bayar &amp; risiko churn pelanggan Jawa Barat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Bulan sebelumnya"
            className="rounded-md border bg-card p-2 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[160px] text-center text-lg font-semibold">{monthTitle}</div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Bulan berikutnya"
            className="rounded-md border bg-card p-2 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isCurrent}
            onClick={() => setView({ y: today.y, m: today.m })}
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
          >
            Bulan Ini
          </button>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
            MODE_INFO[mode].style,
          )}
        >
          <ModeIcon className="h-3.5 w-3.5" />
          {MODE_INFO[mode].label}
        </span>

        {dbStatus ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
              dbStatus.connected
                ? "bg-blue-50 text-blue-700 ring-blue-200"
                : "bg-amber-50 text-amber-800 ring-amber-200",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {dbStatus.connected
              ? `Supabase Connected${dbStatus.autoSavedCount ? ` · Auto-Saved (${dbStatus.autoSavedCount})` : ""}`
              : "Database Lokal Aktif (Menunggu Tabel Supabase)"}
          </span>
        ) : null}

        {data ? (
          <span className="text-xs text-muted-foreground">
            Sumber: <strong>{SOURCE_LABEL[data.meta.dataSource] ?? data.meta.dataSource}</strong>
            {data.meta.engine !== "none" ? ` · Filter: ${data.meta.engine === "gemini" ? "Gemini AI" : "Relevance Engine"}` : ""}
            {data.meta.totalFetched > 0
              ? ` · ${data.meta.totalFetched} berita ditarik, ${data.meta.discarded} tidak relevan dibuang`
              : ""}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {isCurrent ? (
            <>
              <button
                type="button"
                onClick={() => setReloadTick((t) => t + 1)}
                className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Tarik Berita Terbaru
              </button>
              <button
                type="button"
                onClick={archiveNow}
                disabled={archiving || loading}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                {archiving ? "Menyimpan…" : "Sinkronkan ke Database"}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {archiveMsg ? (
        <div role="status" className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {archiveMsg}
        </div>
      ) : null}
      {data?.meta.warning ? (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>{data.meta.warning}</span>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-3 gap-3 md:max-w-xl">
        {(["High", "Medium", "Low"] as ImpactScore[]).map((lvl) => (
          <div key={lvl} className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", IMPACT_STYLE[lvl].dot)} />
              {IMPACT_STYLE[lvl].label}
            </div>
            <div className="mt-1 text-2xl font-bold">{loading ? "–" : counts[lvl]}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <CalendarGrid
          year={view.y}
          month={view.m}
          today={today}
          itemsByDate={itemsByDate}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
        <NewsSidebar
          title={selectedDate ? "Tanggal terpilih" : monthTitle}
          items={sidebarItems}
          loading={loading}
          selectedDate={selectedDate}
          onClearDate={() => setSelectedDate(null)}
          search={search}
          onSearch={setSearch}
          category={category}
          onCategory={setCategory}
          impact={impact}
          onImpact={setImpact}
        />
      </div>
    </main>
  );
}
