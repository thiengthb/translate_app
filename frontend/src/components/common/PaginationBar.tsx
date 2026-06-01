import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationBarProps {
  /** 1-based current page. */
  currentPage: number;
  totalPages: number;
  /** Receives the new 1-based page. */
  onPageChange: (page: number) => void;
  /** Total item count — shown as a subtle counter when provided. */
  totalItems?: number;
  className?: string;
}

/**
 * Compact, self-contained page navigator for client-side paginated lists.
 * Renders nothing when there's only a single page.
 */
export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  className,
}: PaginationBarProps) {
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5,
  });

  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {totalItems != null && (
        <span className="hidden sm:block mr-2 text-xs text-muted-foreground tabular-nums">
          {totalItems} total
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        disabled={!canPrev}
        onClick={() => onPageChange(1)}
        aria-label="First page"
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        disabled={!canPrev}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {showLeftEllipsis && (
        <span className="px-1 text-muted-foreground select-none">…</span>
      )}
      {pages.map((p) => (
        <Button
          key={p}
          size="icon"
          variant={p === currentPage ? "default" : "ghost"}
          className="size-9 tabular-nums text-xs"
          onClick={() => onPageChange(p)}
          aria-current={p === currentPage ? "page" : undefined}
        >
          {p}
        </Button>
      ))}
      {showRightEllipsis && (
        <span className="px-1 text-muted-foreground select-none">…</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        disabled={!canNext}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        disabled={!canNext}
        onClick={() => onPageChange(totalPages)}
        aria-label="Last page"
      >
        <ChevronsRight className="size-4" />
      </Button>
    </div>
  );
}
