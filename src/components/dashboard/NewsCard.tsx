import { ExternalLink, Lightbulb, MapPin, Sparkles } from "lucide-react";
import type { ProcessedNewsItem } from "@/types/news";
import { formatDateID } from "@/lib/date";
import { CategoryBadge, ImpactBadge } from "./badges";

export function NewsCard({ item }: { item: ProcessedNewsItem }) {
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{formatDateID(item.publishedAt)}</span>
        <ImpactBadge score={item.impactScore} />
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-snug">{item.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={item.category} />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {item.location}
        </span>
        {item.isPredicted ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
            <Sparkles className="h-3 w-3" />
            Proyeksi AI
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2 rounded-md bg-blue-50 p-3 text-xs">
        <p className="leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Analisis AI: </span>
          {item.aiReasoning}
        </p>
        <p className="flex gap-1.5 leading-relaxed text-blue-900">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold">Rekomendasi Collection &amp; Retention: </span>
            {item.actionableInsight}
          </span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{item.source}</span>
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            Buka sumber <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

