import { cn } from "@/lib/utils";
import { ChevronDown, List } from "lucide-react";

/**
 * Progressive "show more" controls for long lists.
 *
 * Reveal schedule: first jump goes to 100, then by hundreds (200, 300, …),
 * each step capped at `total`. Always offers a "show everything" shortcut.
 * Renders nothing once everything is visible.
 *
 * The parent owns the `visibleCount` state and slices its list with it;
 * this component only renders the buttons and computes the next target.
 */
export function nextRevealTarget(visible: number): number {
  if (visible < 100) return 100;
  return (Math.floor(visible / 100) + 1) * 100;
}

interface RevealMoreProps {
  total: number;
  visibleCount: number;
  onChange: (next: number) => void;
  /** Noun shown in the labels, e.g. "thẻ" (default) / "card". */
  unit?: string;
  className?: string;
}

export function RevealMore({
  total,
  visibleCount,
  onChange,
  unit = "thẻ",
  className,
}: RevealMoreProps) {
  if (visibleCount >= total) return null;

  const next = Math.min(nextRevealTarget(visibleCount), total);
  const nextIsAll = next >= total;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2 pt-2", className)}>
      {!nextIsAll && (
        <button
          type="button"
          onClick={() => onChange(next)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronDown className="size-4" />
          Xem tiếp tới {next} {unit}
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange(total)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <List className="size-4" />
        Xem tất cả ({total})
      </button>
    </div>
  );
}
