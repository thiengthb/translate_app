import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, List } from "lucide-react";

export function nextRevealTarget(visible: number): number {
  if (visible < 100) return 100;
  return (Math.floor(visible / 100) + 1) * 100;
}

interface RevealMoreProps {
  total: number;
  visibleCount: number;
  onChange: (next: number) => void;
  /**
   * When provided, shows a "collapse" button whenever visibleCount > initialCount.
   * Clicking it resets back to initialCount — Quizlet-style hide-back.
   */
  initialCount?: number;
  unit?: string;
  className?: string;
}

export function RevealMore({
  total,
  visibleCount,
  onChange,
  initialCount,
  unit = "thẻ",
  className,
}: RevealMoreProps) {
  const canCollapse = initialCount !== undefined && visibleCount > initialCount;
  const showingAll  = visibleCount >= total;

  // Nothing to do: at initial state and already showing everything
  if (!canCollapse && showingAll) return null;

  const next       = Math.min(nextRevealTarget(visibleCount), total);
  const nextIsAll  = next >= total;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2 pt-2", className)}>
      {/* Expand buttons — hidden once showing all */}
      {!showingAll && (
        <>
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
        </>
      )}

      {/* Collapse button — shown when expanded beyond initialCount */}
      {canCollapse && (
        <button
          type="button"
          onClick={() => onChange(initialCount!)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronUp className="size-4" />
          {showingAll ? "Ẩn bớt" : `Ẩn về ${initialCount} ${unit}`}
        </button>
      )}
    </div>
  );
}
