import {
    ArrowDown,
    ArrowDownAZ,
    ArrowUp,
    ArrowUpAZ,
    ArrowUpDown,
    MoreVertical,
    Pin,
    PinOff,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FieldSchema, SortEntry } from "@/types";
import type { PinSide } from "@/components/datatable/hook/useColumnLayout";

interface HeaderMenuProps {
    field: FieldSchema;
    sortState: SortEntry[];
    onToggleSort: (fieldName: string) => void;
    pinSide?: PinSide;
    onPin?: (side: PinSide) => void;
    /** Stop pointerdown bubbling — prevents the column-drag listener on
     *  the parent <th> from firing when the user clicks the menu trigger. */
    onPointerDownCapture?: (e: React.PointerEvent) => void;
}

/**
 * Column header "⋮" menu — sort + pin controls.
 *
 * Extracted from SortableHeader so the header cell stays a simple layout
 * shell. The cycle math (`toggleSort` cycles none→asc→desc→none) lives
 * here so callers can fire-and-forget direction-specific items.
 */
export function HeaderMenu({
    field,
    sortState,
    onToggleSort,
    pinSide,
    onPin,
    onPointerDownCapture,
}: HeaderMenuProps) {
    const isSortable = field.sortable === true;
    const entry = sortState.find((s) => s.field === field.name) ?? null;
    const hasMenu = isSortable || !!onPin;

    if (!hasMenu) return null;

    const setSortAsc = () => {
        if (entry?.direction === "asc") return;
        if (entry?.direction === "desc") {
            // desc → none → asc
            onToggleSort(field.name);
            onToggleSort(field.name);
            return;
        }
        onToggleSort(field.name); // none → asc
    };

    const setSortDesc = () => {
        if (entry?.direction === "desc") return;
        if (!entry) {
            // none → asc → desc
            onToggleSort(field.name);
            onToggleSort(field.name);
            return;
        }
        onToggleSort(field.name); // asc → desc
    };

    const clearSort = () => {
        if (!entry) return;
        if (entry.direction === "asc") {
            // asc → desc → none
            onToggleSort(field.name);
            onToggleSort(field.name);
        } else {
            // desc → none
            onToggleSort(field.name);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onPointerDown={onPointerDownCapture}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "ml-auto inline-flex items-center shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all cursor-pointer",
                        entry || pinSide
                            ? "opacity-100"
                            : "opacity-0 group-hover/header:opacity-100",
                    )}
                    aria-label="Column options"
                    data-no-row-click
                >
                    <MoreVertical size={13} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48"
                onPointerDown={onPointerDownCapture}
            >
                {isSortable && (
                    <>
                        <DropdownMenuLabel className="text-xs">
                            Sắp xếp
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onSelect={setSortAsc}
                            className="gap-2 text-sm"
                        >
                            <ArrowUpAZ size={13} />
                            <span className="flex-1">Tăng dần</span>
                            {entry?.direction === "asc" && (
                                <ArrowUp size={12} className="text-primary" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={setSortDesc}
                            className="gap-2 text-sm"
                        >
                            <ArrowDownAZ size={13} />
                            <span className="flex-1">Giảm dần</span>
                            {entry?.direction === "desc" && (
                                <ArrowDown size={12} className="text-primary" />
                            )}
                        </DropdownMenuItem>
                        {entry && (
                            <DropdownMenuItem
                                onSelect={clearSort}
                                className="gap-2 text-sm text-muted-foreground"
                            >
                                <ArrowUpDown size={13} />
                                Bỏ sắp xếp
                            </DropdownMenuItem>
                        )}
                    </>
                )}

                {isSortable && onPin && <DropdownMenuSeparator />}

                {onPin && (
                    <>
                        <DropdownMenuLabel className="text-xs">
                            Ghim cột
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onSelect={() =>
                                onPin(pinSide === "left" ? null : "left")
                            }
                            className="gap-2 text-sm"
                        >
                            <Pin size={13} />
                            {pinSide === "left" ? "Bỏ ghim trái" : "Ghim trái"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() =>
                                onPin(pinSide === "right" ? null : "right")
                            }
                            className="gap-2 text-sm"
                        >
                            <Pin size={13} className="rotate-90" />
                            {pinSide === "right"
                                ? "Bỏ ghim phải"
                                : "Ghim phải"}
                        </DropdownMenuItem>
                        {pinSide && (
                            <DropdownMenuItem
                                onSelect={() => onPin(null)}
                                className="gap-2 text-sm text-muted-foreground"
                            >
                                <PinOff size={13} />
                                Bỏ ghim
                            </DropdownMenuItem>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
