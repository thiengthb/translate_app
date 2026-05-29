import { ArrowDown, ArrowUp, GripVertical, Pin } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { FieldSchema, SortEntry } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { PinSide } from "@/components/datatable/hook/useColumnLayout";
import type { DateFormatKey } from "./cell/CellRenderer";
import { DateFormatButton } from "./header/DateFormatButton";
import { HeaderMenu } from "./header/HeaderMenu";

interface SortableHeaderProps {
    field: FieldSchema;
    sortState: SortEntry[];
    onToggleSort: (fieldName: string) => void;
    width?: number;
    onResizeStart?: (e: React.MouseEvent) => void;
    dateFormat?: DateFormatKey;
    onDateFormatCycle?: (fieldName: string) => void;
    pinSide?: PinSide;
    onPin?: (side: PinSide) => void;
    pinStyle?: React.CSSProperties;
    pinClassName?: string;
    /** When true, the whole <th> becomes the column-reorder drag handle. */
    draggable?: boolean;
}

/**
 * A data column header. Compact layout:
 *
 *   [📌? Label ↑? ⋮?]                       │ resize-grip
 *
 * Sticky-pin + sort + date-format controls live in the right-aligned "⋮"
 * dropdown (see `HeaderMenu`). Hover anywhere else on the header to grab
 * and reorder the column (when `draggable`).
 */
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
    const sortIndex = sortState.findIndex((s) => s.field === field.name);
    const entry = sortIndex !== -1 ? sortState[sortIndex] : null;
    const isDate = field.type === "date";

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

    // Children that should be clickable need to swallow pointerdown so
    // the header-wide drag listener doesn't initiate a column reorder
    // when the user just meant to click a button.
    const stopDragPointer = (e: React.PointerEvent) => e.stopPropagation();

    return (
        <TableHead
            ref={setNodeRef}
            {...(draggable ? attributes : {})}
            {...(draggable ? listeners : {})}
            className={cn(
                "relative group/header select-none",
                draggable &&
                    (isDragging
                        ? "cursor-grabbing"
                        : "hover:bg-muted/40 hover:cursor-grab"),
                pinClassName,
            )}
            style={{ width, ...dragStyle, ...pinStyle }}
        >
            <div className="flex items-center gap-1 overflow-hidden pr-3">
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

                {entry && (
                    <span className="inline-flex items-center gap-0.5 shrink-0 text-primary">
                        {entry.direction === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                        ) : (
                            <ArrowDown className="h-4 w-4" />
                        )}
                        {sortState.length > 1 && (
                            <span className="text-[10px] font-semibold leading-none min-w-[12px] text-center">
                                {sortIndex + 1}
                            </span>
                        )}
                    </span>
                )}

                {isDate && onDateFormatCycle && (
                    <DateFormatButton
                        fieldName={field.name}
                        dateFormat={dateFormat ?? "datetime"}
                        onCycle={onDateFormatCycle}
                        onPointerDownCapture={stopDragPointer}
                    />
                )}

                <HeaderMenu
                    field={field}
                    sortState={sortState}
                    onToggleSort={onToggleSort}
                    pinSide={pinSide}
                    onPin={onPin}
                    onPointerDownCapture={stopDragPointer}
                />
            </div>

            {onResizeStart && (
                <div
                    className="absolute -right-2 top-0 h-full w-5 cursor-col-resize z-10 flex items-center justify-center group/resize"
                    onPointerDown={stopDragPointer}
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
