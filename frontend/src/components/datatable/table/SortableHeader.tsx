import { TableHead } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
    ArrowDown,
    ArrowDownAZ,
    ArrowUp,
    ArrowUpAZ,
    ArrowUpDown,
    CalendarClock,
    GripVertical,
    MoreVertical,
    Pin,
    PinOff,
} from "lucide-react";
import type { FieldSchema, SortEntry } from "@/types";
import { DATE_FORMAT_LABELS, type DateFormatKey } from "./cell/CellRenderer";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PinSide } from "@/components/datatable/hook/useColumnLayout";

interface SortableHeaderProps {
    field: FieldSchema;
    sortState: SortEntry[];
    onToggleSort: (fieldName: string) => void;
    width?: number;
    onResizeStart?: (e: React.MouseEvent) => void;
    dateFormat?: DateFormatKey;
    onDateFormatCycle?: (fieldName: string) => void;
    /** Current pin side for this column (null = not pinned). */
    pinSide?: PinSide;
    /** Pin this column to a side (or unpin). */
    onPin?: (side: PinSide) => void;
    /** Sticky positioning offsets when this column is pinned. */
    pinStyle?: React.CSSProperties;
    /** Extra classes for pinned columns (shadow, background, etc.). */
    pinClassName?: string;
    /** Enable drag-and-drop reorder. */
    draggable?: boolean;
}

export function SortableHeader({
    field,
    sortState,
    onToggleSort,
    width,
    onResizeStart,
    dateFormat,
    onDateFormatCycle,
    pinSide,
    onPin,
    pinStyle,
    pinClassName,
    draggable,
}: SortableHeaderProps) {
    const isSortable = field.sortable === true;
    const isDate = field.type === "date";
    const sortIndex = sortState.findIndex((s) => s.field === field.name);
    const entry = sortIndex !== -1 ? sortState[sortIndex] : null;

    const SortIcon =
        entry?.direction === "asc"
            ? ArrowUp
            : entry?.direction === "desc"
                ? ArrowDown
                : ArrowUpDown;

    const currentFormatLabel = DATE_FORMAT_LABELS[dateFormat ?? "datetime"];

    // dnd-kit sortable hook — always called to keep hook order stable
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.name, disabled: !draggable });

    const dragStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 30 : undefined,
    };

    return (
        <TableHead
            ref={setNodeRef}
            className={cn(
                "relative group/header",
                isSortable && "cursor-pointer select-none hover:bg-muted/50",
                pinClassName,
            )}
            style={{ width, ...dragStyle, ...pinStyle }}
            onClick={() => isSortable && onToggleSort(field.name)}
        >
            <div className="flex items-center gap-1 overflow-hidden pr-3">
                {draggable && (
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center justify-center h-5 w-4 -ml-1 text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 transition-opacity"
                        aria-label="Drag to reorder"
                        data-no-row-click
                    >
                        <GripVertical size={12} />
                    </button>
                )}

                {pinSide && (
                    <Pin
                        size={11}
                        className={cn(
                            "shrink-0 text-primary",
                            pinSide === "right" && "rotate-90",
                        )}
                    />
                )}

                <span className="truncate">{field.label}</span>

                {isSortable && (
                    <span className="inline-flex items-center gap-0.5 shrink-0">
                        <SortIcon
                            className={cn(
                                "h-4 w-4",
                                entry ? "text-primary" : "text-muted-foreground/50",
                            )}
                        />
                        {entry && sortState.length > 1 && (
                            <span className="text-[10px] font-semibold leading-none text-primary min-w-[12px] text-center">
                                {sortIndex + 1}
                            </span>
                        )}
                    </span>
                )}

                {isDate && onDateFormatCycle && (
                    <TooltipWrapper content={`Định dạng: ${currentFormatLabel} — Click để đổi`}>
                        <button
                            type="button"
                            className="inline-flex items-center shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 group-hover/header:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDateFormatCycle(field.name);
                            }}
                            data-no-row-click
                        >
                            <CalendarClock className="h-3.5 w-3.5" />
                        </button>
                    </TooltipWrapper>
                )}

                {onPin && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto inline-flex items-center shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 group-hover/header:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                                aria-label="Column options"
                                data-no-row-click
                            >
                                <MoreVertical size={13} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {isSortable && (
                                <>
                                    <DropdownMenuItem
                                        onSelect={() => onToggleSort(field.name)}
                                        className="gap-2 text-sm"
                                    >
                                        {entry?.direction === "asc" ? (
                                            <ArrowDownAZ size={13} />
                                        ) : (
                                            <ArrowUpAZ size={13} />
                                        )}
                                        Sắp xếp
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem
                                onSelect={() => onPin(pinSide === "left" ? null : "left")}
                                className="gap-2 text-sm"
                            >
                                <Pin size={13} />
                                {pinSide === "left" ? "Bỏ ghim trái" : "Ghim trái"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => onPin(pinSide === "right" ? null : "right")}
                                className="gap-2 text-sm"
                            >
                                <Pin size={13} className="rotate-90" />
                                {pinSide === "right" ? "Bỏ ghim phải" : "Ghim phải"}
                            </DropdownMenuItem>
                            {pinSide && (
                                <DropdownMenuItem onSelect={() => onPin(null)} className="gap-2 text-sm">
                                    <PinOff size={13} />
                                    Bỏ ghim
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {onResizeStart && (
                <div
                    className="absolute -right-2 top-0 h-full w-5 cursor-col-resize z-10 flex items-center justify-center group/resize"
                    onMouseDown={onResizeStart}
                    onClick={(e) => e.stopPropagation()}
                    data-no-row-click
                >
                    <div className="w-[2px] h-3/5 rounded-full bg-muted-foreground/20 group-hover/header:bg-primary/60 group-hover/resize:!bg-primary transition-all duration-150 group-hover/resize:h-4/5 group-hover/resize:w-[3px] group-hover/resize:shadow-[0_0_6px_rgba(201,112,64,0.5)]" />
                    <GripVertical className="absolute h-3 w-3 text-primary opacity-0 group-hover/resize:opacity-100 transition-opacity duration-150" />
                </div>
            )}
        </TableHead>
    );
}
