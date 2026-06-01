import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/usePagination";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataPaginationProps {
  /** 1-based current page. */
  currentPage: number;
  totalPages: number;
  /** Receives the new 1-based page. */
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Datatable-style page navigator — the standard pagination control across
 * client-side paginated lists (extracted from the My Library footer).
 *
 *   [3 / 10]  [⟪][⟨][1][2][3][⟩][⟫]
 *
 * A "current / total" indicator followed by first / prev / numbered /
 * next / last buttons with tooltips. Numbered buttons collapse on mobile.
 * Renders nothing when there's a single page. Page-size selection and any
 * total-count label are left to the caller — this is navigation only.
 */
export function DataPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: DataPaginationProps) {
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5,
  });

  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <span className="text-muted-foreground whitespace-nowrap tabular-nums select-none">
        <span className="font-semibold text-foreground">{currentPage}</span>
        <span className="mx-1 opacity-50">/</span>
        <span className="text-foreground">{totalPages}</span>
      </span>
      <div className="flex items-center gap-0.5">
        <TooltipWrapper content="Trang đầu">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(1)} disabled={!canPrev}>
            <ChevronsLeft size={14} />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="Trang trước">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)} disabled={!canPrev}>
            <ChevronLeft size={14} />
          </Button>
        </TooltipWrapper>
        <div className="hidden md:flex items-center gap-0.5">
          {showLeftEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
          {pages.map((p) => (
            <Button key={p} size="icon"
              variant={p === currentPage ? "default" : "ghost"}
              onClick={() => onPageChange(p)}
              className="h-8 w-8 tabular-nums text-xs">
              {p}
            </Button>
          ))}
          {showRightEllipsis && <span className="px-1 text-muted-foreground select-none">…</span>}
        </div>
        <TooltipWrapper content="Trang sau">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)} disabled={!canNext}>
            <ChevronRight size={14} />
          </Button>
        </TooltipWrapper>
        <TooltipWrapper content="Trang cuối">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => onPageChange(totalPages)} disabled={!canNext}>
            <ChevronsRight size={14} />
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  );
}
