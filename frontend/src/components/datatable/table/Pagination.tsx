import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

interface PaginationProps {
    table: any;
    isAutoSize?: boolean;
    autoSize?: number;
    onPageSizeChange?: (value: string) => void;
}

/**
 * Single-row compact pagination — minimal vertical footprint so the table
 * body gets the most screen real-estate.
 *
 *   [Selected x/y | Tổng N]   [Hàng/trang [20 ▾]] [1/10] [⟪][⟨][1][2][3][⟩][⟫]
 */
export function Pagination({
    table,
    isAutoSize = true,
    autoSize,
    onPageSizeChange,
}: PaginationProps) {
    const totalPages = Math.ceil(table.total / table.size) || 1;
    const currentPage = table.page + 1;

    const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
        currentPage,
        totalPages,
        paginationItemsToDisplay: 5,
    });

    const canPrev = table.page > 0;
    const canNext = table.page < totalPages - 1;

    const currentSelectValue = isAutoSize ? "auto" : String(table.size);

    return (
        <div
            className="flex items-center justify-between gap-2 w-full min-w-0 text-xs"
            data-protable-pagination
        >
            <div className="flex items-center gap-2 text-muted-foreground min-w-0 shrink overflow-hidden">
                {table.selected?.length > 0 ? (
                    <span className="whitespace-nowrap">
                        <span className="font-semibold text-foreground tabular-nums">
                            {table.selected.length}
                        </span>
                        <span className="hidden sm:inline">
                            {" / "}
                            <span className="tabular-nums">{table.total ?? 0}</span>
                            {" đã chọn"}
                        </span>
                    </span>
                ) : (
                    <span className="hidden md:inline whitespace-nowrap tabular-nums">
                        Tổng:{" "}
                        <span className="font-semibold text-foreground">{table.total ?? 0}</span>
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
                <Select value={currentSelectValue} onValueChange={onPageSizeChange}>
                    <SelectTrigger className="h-8 w-[78px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">
                            Auto{autoSize ? ` (${autoSize})` : ""}
                        </SelectItem>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <span
                    className="text-muted-foreground whitespace-nowrap tabular-nums"
                    aria-live="polite"
                >
                    <span className="font-semibold text-foreground">{currentPage}</span>
                    <span className="mx-1 opacity-50">/</span>
                    <span className="text-foreground">{totalPages}</span>
                </span>

                <div className="flex items-center gap-0.5">
                    <TooltipWrapper content="Trang đầu">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPage(0)}
                            disabled={!canPrev}
                            aria-label="First page"
                        >
                            <ChevronsLeft size={14} />
                        </Button>
                    </TooltipWrapper>
                    <TooltipWrapper content="Trang trước">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPage(table.page - 1)}
                            disabled={!canPrev}
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={14} />
                        </Button>
                    </TooltipWrapper>

                    <div className="hidden md:flex items-center gap-0.5">
                        {showLeftEllipsis && (
                            <span className="px-1 text-muted-foreground select-none">…</span>
                        )}
                        {pages.map((p) => (
                            <Button
                                key={p}
                                size="icon"
                                variant={p === currentPage ? "default" : "ghost"}
                                onClick={() => table.setPage(p - 1)}
                                className="h-8 w-8 tabular-nums text-xs"
                            >
                                {p}
                            </Button>
                        ))}
                        {showRightEllipsis && (
                            <span className="px-1 text-muted-foreground select-none">…</span>
                        )}
                    </div>

                    <TooltipWrapper content="Trang sau">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPage(table.page + 1)}
                            disabled={!canNext}
                            aria-label="Next page"
                        >
                            <ChevronRight size={14} />
                        </Button>
                    </TooltipWrapper>
                    <TooltipWrapper content="Trang cuối">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => table.setPage(totalPages - 1)}
                            disabled={!canNext}
                            aria-label="Last page"
                        >
                            <ChevronsRight size={14} />
                        </Button>
                    </TooltipWrapper>
                </div>
            </div>
        </div>
    );
}
