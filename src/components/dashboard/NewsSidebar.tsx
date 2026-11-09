"use client";

import { Search, X } from "lucide-react";
import type { ImpactScore, ProcessedNewsItem, RiskCategory } from "@/types/news";
import { CATEGORY_LABEL } from "@/types/news";
import { formatDateID } from "@/lib/date";
import { cn } from "@/lib/utils";
import { NewsCard } from "./NewsCard";

export type CategoryFilter = RiskCategory | "ALL";
export type ImpactFilter = ImpactScore | "ALL";

interface Props {
  title: string;
  items: ProcessedNewsItem[];
  loading: boolean;
  selectedDate: string | null;
  onClearDate: () => void;
  search: string;
  onSearch: (v: string) => void;
  category: CategoryFilter;
  onCategory: (c: CategoryFilter) => void;
  impact: ImpactFilter;
  onImpact: (i: ImpactFilter) => void;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function NewsSidebar(props: Props) {
  const { title, items, loading, selectedDate, onClearDate, search, onSearch, category, onCategory, impact, onImpact } =
    props;

  return (
    <aside className="flex h-full flex-col rounded-lg border bg-card shadow-sm">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Important Relevant News</h2>
            <p className="text-xs text-muted-foreground">
              {title} · {items.length} berita
            </p>
          </div>
          {selectedDate ? (
            <button
              type="button"
              onClick={onClearDate}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              {formatDateID(selectedDate)}
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari judul, lokasi, atau sumber…"
            className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Pill active={category === "ALL"} onClick={() => onCategory("ALL")}>
            Semua kategori
          </Pill>
          {(Object.keys(CATEGORY_LABEL) as RiskCategory[]).map((c) => (
            <Pill key={c} active={category === c} onClick={() => onCategory(c)}>
              {CATEGORY_LABEL[c]}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Pill active={impact === "ALL"} onClick={() => onImpact("ALL")}>
            Semua risiko
          </Pill>
          {(["High", "Medium", "Low"] as ImpactScore[]).map((i) => (
            <Pill key={i} active={impact === i} onClick={() => onImpact(i)}>
              {i}
            </Pill>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 lg:max-h-[calc(100vh-14rem)]">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Tidak ada berita relevan untuk filter/tanggal ini.
          </div>
        ) : (
          items.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </div>
    </aside>
  );
}

