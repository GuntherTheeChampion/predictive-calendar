import type { ImpactScore, RiskCategory } from "@/types/news";
import { CATEGORY_LABEL } from "@/types/news";
import { cn } from "@/lib/utils";

export const IMPACT_STYLE: Record<ImpactScore, { badge: string; dot: string; label: string; rank: number }> = {
  High: {
    badge: "bg-red-100 text-red-700 ring-red-200",
    dot: "bg-red-500",
    label: "High Risk",
    rank: 3,
  },
  Medium: {
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    label: "Medium Risk",
    rank: 2,
  },
  Low: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    label: "Low Risk",
    rank: 1,
  },
};

export function ImpactBadge({ score, className }: { score: ImpactScore; className?: string }) {
  const s = IMPACT_STYLE[score];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        s.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: RiskCategory }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {CATEGORY_LABEL[category]}
    </span>
  );
}

