"use client";

import type { ImpactScore, ProcessedNewsItem } from "@/types/news";
import { dateKey, daysInMonth, firstWeekdayMonday, type YMD } from "@/lib/date";
import { cn } from "@/lib/utils";
import { IMPACT_STYLE } from "./badges";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

interface Props {
  year: number;
  month: number;
  today: YMD;
  itemsByDate: Map<string, ProcessedNewsItem[]>;
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}

function topImpact(items: ProcessedNewsItem[]): ImpactScore {
  return items.reduce<ImpactScore>(
    (acc, i) => (IMPACT_STYLE[i.impactScore].rank > IMPACT_STYLE[acc].rank ? i.impactScore : acc),
    "Low",
  );
}

export function CalendarGrid({ year, month, today, itemsByDate, selectedDate, onSelect }: Props) {
  const offset = firstWeekdayMonday(year, month);
  const total = daysInMonth(year, month);
  const cells: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = dateKey(today.y, today.m, today.d);

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b bg-muted/60">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground",
              i >= 5 && "text-red-500/80",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="min-h-[88px] border-b border-r bg-muted/20 last:border-r-0" />;
          }
          const key = dateKey(year, month, day);
          const items = itemsByDate.get(key) ?? [];
          const top = items.length ? topImpact(items) : null;
          const isSelected = selectedDate === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(isSelected ? null : key)}
              aria-pressed={isSelected}
              aria-label={`${day}, ${items.length} berita relevan`}
              className={cn(
                "group relative flex min-h-[88px] flex-col items-start border-b border-r p-2 text-left transition",
                "hover:bg-blue-50 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                (idx + 1) % 7 === 0 && "border-r-0",
                isSelected && "bg-blue-50 ring-2 ring-inset ring-accent",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {day}
              </span>

              {top ? (
                <div className="mt-auto w-full space-y-1">
                  <div className="flex items-center gap-1">
                    {(["High", "Medium", "Low"] as ImpactScore[]).map((lvl) => {
                      const n = items.filter((i) => i.impactScore === lvl).length;
                      return n ? (
                        <span
                          key={lvl}
                          title={`${n} ${IMPACT_STYLE[lvl].label}`}
                          className={cn(
                            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                            IMPACT_STYLE[lvl].dot,
                          )}
                        >
                          {n}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <p className="hidden truncate text-[10px] text-muted-foreground sm:block">{items[0].title}</p>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

