import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import type { FieldSchema } from "@/types";

import { TableSkeleton } from "../common/TableSkeleton";
import {
    ACTION_COLUMN_WIDTH,
    DEFAULT_COLUMN_WIDTH,
    EXPAND_COLUMN_WIDTH,
    INDEX_COLUMN_WIDTH,
    SELECT_COLUMN_WIDTH,
    rowStripeClass,
} from "../constants";
import type {
    PinStyles,
    PinSidesMap,
} from "./TableView.types";
import { CellRenderer, type DateFormatKey } from "./cell/CellRenderer";
import { RowSelection } from "./RowSelection";
import { SelectAllCheckbox } from "./SelectAllCheckbox";
import { SortableHeader } from "./SortableHeader";

interface TableViewProps {
    table: any;
    densityCfg: { rowClassName: string };

    // ─── Column layout + pinning ────────────────────────────────────────────
    arrangedFields: FieldSchema[];
    columnWidths: Record<string, number>;
    pinStyles: PinStyles;
    pinSides: PinSidesMap;
    onPin: (fieldName: string, side: "left" | "right" | null) => void;
    onReorder: (activeId: string, overId: string) => void;
    onResizeStart: (fieldName: string, e: React.MouseEvent) => void;

    // ─── Sticky offsets ─────────────────────────────────────────────────────
    expandLeft: number;
    selectLeft: number;
    indexLeft: number;
    totalTableWidth: number;

    // ─── System columns ─────────────────────────────────────────────────────
    isExpandable: boolean;
    showActionsColumn: boolean;
    expandedRows: Set<string | number>;
    onToggleExpand: (id: string | number, e: React.MouseEvent) => void;
    expandedRowContent: (row: any) => React.ReactNode;
    renderRowActions: (row: any) => React.ReactNode;

    // ─── Per-cell behaviour ─────────────────────────────────────────────────
    dateFormats: Record<string, DateFormatKey>;
    onDateFormatCycle: (fieldName: string) => void;

    // ─── Empty / loading ────────────────────────────────────────────────────
    showSkeleton: boolean;
    hasRows: boolean;
    renderEmptyState: () => React.ReactNode;

    // ─── Row interaction ────────────────────────────────────────────────────
    focusedRowIndex: number | null;
    onRowClick: (e: React.MouseEvent, row: any) => void;
}

/**
 * Renders the table viewport (header + body + colgroup + DnD context).
 *
 * Why this lives in its own file:
 * 1. ProTable used to inline ~250 lines of JSX here; splitting keeps the
 *    parent focused on orchestration (state, modals, hooks).
 * 2. Sticky system columns (expand / select / index / actions) have a lot
 *    of style boilerplate — co-locating it makes future tweaks (z-index,
 *    shadow, padding) a single-file change.
 *
 * Layout note: DndContext + SortableContext MUST live OUTSIDE `<table>`
 * because they render hidden a11y `<div>`s. A `<div>` inside `<tr>` is
 * invalid HTML — browsers move it out and the column count gets
 * misaligned (Actions header ends up one column off from action buttons).
 */
export function TableView({
    table,
    densityCfg,
    arrangedFields,
    columnWidths,
    pinStyles,
    pinSides,
    onPin,
    onReorder,
    onResizeStart,
    expandLeft,
    selectLeft,
    indexLeft,
    totalTableWidth,
    isExpandable,
    showActionsColumn,
    expandedRows,
    onToggleExpand,
    expandedRowContent,
    renderRowActions,
    dateFormats,
    onDateFormatCycle,
    showSkeleton,
    hasRows,
    renderEmptyState,
    focusedRowIndex,
    onRowClick,
}: TableViewProps) {
    const { schema } = table;

    const dndSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        onReorder(String(active.id), String(over.id));
    };

    const expandColSpan =
        (isExpandable ? 1 : 0) +
        1 /* selection */ +
        1 /* index */ +
        arrangedFields.length +
        (showActionsColumn ? 1 : 0);

    return (
        <div className="relative flex-1 min-h-0 flex flex-col">
            {/* ScrollHintContainer replaces the previous `<div overflow-auto>`
                — it provides the single y+x scroll surface that the sticky
                cells need (sticky positions relative to nearest scrolling
                ancestor, so we keep the structure flat). Hidden scrollbars
                + floating chevrons replace the native bars without changing
                sticky behaviour. */}
            {/* topOffset clears the sticky header (h-11 = 44px) so the up-arrow
                floats over the scrollable rows, not the frozen header. 48 =
                44px header + 4px gap (matches the default top inset). */}
            <ScrollHintContainer axis="both" className="flex-1 min-h-0" topOffset={48}>
                <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={arrangedFields.map((f) => f.name)}
                        strategy={horizontalListSortingStrategy}
                    >
                        {/*
                          Raw <table> instead of shadcn <Table>: the wrapper
                          adds its own <div overflow-x-auto> which nests a
                          second scroll container inside the outer one.
                          That offsets the horizontal scrollbar to the
                          bottom of the table content (off-screen when
                          vertically scrolled) and confuses sticky
                          positioning because the nearest x-scroll
                          ancestor differs from the nearest y-scroll one.
                        */}
                        <table
                            data-slot="table"
                            className="w-full caption-bottom text-sm table-fixed"
                            style={{ minWidth: totalTableWidth }}
                        >
                            <colgroup>
                                {isExpandable && (
                                    <col style={{ width: EXPAND_COLUMN_WIDTH }} />
                                )}
                                <col style={{ width: SELECT_COLUMN_WIDTH }} />
                                <col style={{ width: INDEX_COLUMN_WIDTH }} />
                                {arrangedFields.map((f) => (
                                    <col
                                        key={f.name}
                                        style={{
                                            width:
                                                columnWidths[f.name] ||
                                                DEFAULT_COLUMN_WIDTH,
                                        }}
                                    />
                                ))}
                                {showActionsColumn && (
                                    <col style={{ width: ACTION_COLUMN_WIDTH }} />
                                )}
                            </colgroup>

                            <TableHeader className="bg-muted z-30 sticky top-0 shadow-sm [&_th]:font-semibold [&_th]:text-foreground [&_th]:h-11 [&_th]:bg-muted">
                                <TableRow>
                                    {isExpandable && (
                                        <TableHead
                                            style={{ left: expandLeft }}
                                            className="sticky z-40 !p-0 !bg-muted"
                                        />
                                    )}
                                    <TableHead
                                        style={{ left: selectLeft }}
                                        className="sticky z-40 !px-0 text-center !bg-muted"
                                    >
                                        <div className="flex items-center justify-center">
                                            <SelectAllCheckbox
                                                table={table}
                                                idField={schema.idField}
                                            />
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        style={{ left: indexLeft }}
                                        className="sticky z-40 !px-1 text-center text-muted-foreground text-xs !bg-muted border-r border-border/70 shadow-[8px_0_10px_-10px_rgba(0,0,0,0.35)]"
                                    >
                                        #
                                    </TableHead>
                                    {arrangedFields.map((f) => (
                                        <SortableHeader
                                            key={f.name}
                                            field={f}
                                            sortState={table.sortState}
                                            onToggleSort={table.toggleSort}
                                            width={
                                                columnWidths[f.name] ||
                                                DEFAULT_COLUMN_WIDTH
                                            }
                                            onResizeStart={(e) =>
                                                onResizeStart(f.name, e)
                                            }
                                            dateFormat={dateFormats[f.name]}
                                            onDateFormatCycle={
                                                f.type === "date"
                                                    ? onDateFormatCycle
                                                    : undefined
                                            }
                                            draggable
                                            pinSide={pinSides[f.name] ?? null}
                                            onPin={(side) =>
                                                onPin(f.name, side)
                                            }
                                            pinStyle={pinStyles[f.name]?.style}
                                            pinClassName={
                                                pinStyles[f.name]?.className
                                            }
                                        />
                                    ))}
                                    {showActionsColumn && (
                                        <TableHead
                                            style={{
                                                width: ACTION_COLUMN_WIDTH,
                                            }}
                                            className="sticky right-0 z-40 !bg-muted border-l border-border/70 shadow-[-8px_0_10px_-10px_rgba(0,0,0,0.35)] !px-1 text-center"
                                        >
                                            Action
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>

                            {showSkeleton ? (
                                <TableSkeleton
                                    rows={Math.min(table.size || 10, 10)}
                                    columns={arrangedFields.length}
                                    showExpand={isExpandable}
                                    showActions={showActionsColumn}
                                />
                            ) : (
                                hasRows && (
                                    <TableBody
                                        className={
                                            table.isFetching
                                                ? "opacity-60 transition-opacity"
                                                : "transition-opacity"
                                        }
                                    >
                                        {table.data.map(
                                            (row: any, index: number) => (
                                                <TableViewRow
                                                    key={row[schema.idField]}
                                                    row={row}
                                                    index={index}
                                                    table={table}
                                                    arrangedFields={
                                                        arrangedFields
                                                    }
                                                    pinStyles={pinStyles}
                                                    isExpandable={isExpandable}
                                                    showActionsColumn={
                                                        showActionsColumn
                                                    }
                                                    expandLeft={expandLeft}
                                                    selectLeft={selectLeft}
                                                    indexLeft={indexLeft}
                                                    densityCfg={densityCfg}
                                                    expandedRows={expandedRows}
                                                    onToggleExpand={
                                                        onToggleExpand
                                                    }
                                                    expandedRowContent={
                                                        expandedRowContent
                                                    }
                                                    renderRowActions={
                                                        renderRowActions
                                                    }
                                                    dateFormats={dateFormats}
                                                    expandColSpan={expandColSpan}
                                                    focusedRowIndex={
                                                        focusedRowIndex
                                                    }
                                                    onRowClick={onRowClick}
                                                />
                                            ),
                                        )}
                                    </TableBody>
                                )
                            )}
                        </table>
                    </SortableContext>
                </DndContext>
            </ScrollHintContainer>

            {/* Empty / no-result state — overlays the whole table region and
                centers in its TRUE middle. Absolute (not a flex sibling) so it
                doesn't split height with the scroll area and get pushed into
                the lower half. `pointer-events-none` lets header sorting still
                work; the message itself re-enables clicks for its action. */}
            {!showSkeleton && !hasRows && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto">{renderEmptyState()}</div>
                </div>
            )}
        </div>
    );
}

// ─── Per-row renderer ───────────────────────────────────────────────────────
interface TableViewRowProps {
    row: any;
    index: number;
    table: any;
    arrangedFields: FieldSchema[];
    pinStyles: PinStyles;
    isExpandable: boolean;
    showActionsColumn: boolean;
    expandLeft: number;
    selectLeft: number;
    indexLeft: number;
    densityCfg: { rowClassName: string };
    expandedRows: Set<string | number>;
    onToggleExpand: (id: string | number, e: React.MouseEvent) => void;
    expandedRowContent: (row: any) => React.ReactNode;
    renderRowActions: (row: any) => React.ReactNode;
    dateFormats: Record<string, DateFormatKey>;
    expandColSpan: number;
    focusedRowIndex: number | null;
    onRowClick: (e: React.MouseEvent, row: any) => void;
}

function TableViewRow({
    row,
    index,
    table,
    arrangedFields,
    pinStyles,
    isExpandable,
    showActionsColumn,
    expandLeft,
    selectLeft,
    indexLeft,
    densityCfg,
    expandedRows,
    onToggleExpand,
    expandedRowContent,
    renderRowActions,
    dateFormats,
    expandColSpan,
    focusedRowIndex,
    onRowClick,
}: TableViewRowProps) {
    const { schema } = table;
    const id = row[schema.idField];
    const isExpanded = isExpandable && expandedRows.has(id);
    const isFocused = focusedRowIndex === index;
    const canUpdate = table.permission?.canUpdate ?? true;

    return (
        <Fragment>
            <TableRow
                data-focused={isFocused || undefined}
                className={`group w-full odd:bg-muted/20 even:bg-card hover:bg-accent/40 border-b border-border/40 ${
                    densityCfg.rowClassName
                } ${
                    isFocused
                        ? "outline outline-2 outline-primary outline-offset-[-2px] !bg-primary/5"
                        : ""
                }`}
                onClick={(e) => onRowClick(e, row)}
            >
                {isExpandable && (
                    <TableCell
                        style={{ left: expandLeft }}
                        className={`sticky z-20 !p-0 text-center ${rowStripeClass(index)} group-hover:!bg-accent/40`}
                    >
                        <button
                            type="button"
                            className="flex items-center justify-center w-full h-full p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            onClick={(e) => onToggleExpand(id, e)}
                            aria-label={
                                isExpanded ? "Collapse row" : "Expand row"
                            }
                            data-no-row-click
                        >
                            <ChevronRight
                                className="h-4 w-4 transition-transform duration-200"
                                style={{
                                    transform: isExpanded
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                }}
                            />
                        </button>
                    </TableCell>
                )}

                <TableCell
                    data-no-row-click
                    style={{ left: selectLeft }}
                    className={`sticky z-20 !px-0 text-center ${rowStripeClass(index)} group-hover:!bg-accent/40`}
                >
                    <div className="flex items-center justify-center">
                        <RowSelection id={id} table={table} />
                    </div>
                </TableCell>

                <TableCell
                    style={{ left: indexLeft }}
                    className={`sticky z-20 !px-1 text-center text-muted-foreground text-xs tabular-nums border-r border-border/70 shadow-[8px_0_10px_-10px_rgba(0,0,0,0.35)] ${rowStripeClass(index)} group-hover:!bg-accent/40`}
                >
                    {(table.page || 0) * (table.size || 10) + index + 1}
                </TableCell>

                {arrangedFields.map((f) => {
                    const pin = pinStyles[f.name];
                    const cellPinClassName = pin
                        ? `${pin.className} ${
                              index % 2 === 0 ? "!bg-muted/20" : "!bg-card"
                          } group-hover:!bg-accent/40`
                        : "";
                    return (
                        <CellRenderer
                            key={f.name}
                            field={f}
                            value={row[f.name]}
                            relationOptions={table.relationOptions}
                            disableBooleanToggle={!canUpdate}
                            onBooleanToggle={(fieldName, newValue) => {
                                if (!canUpdate) return;
                                table.patchField(id, fieldName, newValue);
                            }}
                            onInlineEdit={
                                canUpdate
                                    ? (fieldName, newValue) =>
                                          table.patchField(
                                              id,
                                              fieldName,
                                              newValue,
                                          )
                                    : undefined
                            }
                            dateFormat={
                                f.type === "date"
                                    ? (dateFormats[f.name] ?? "datetime")
                                    : undefined
                            }
                            pinStyle={pin?.style}
                            pinClassName={cellPinClassName}
                        />
                    );
                })}

                {showActionsColumn && (
                    <TableCell
                        style={{ width: ACTION_COLUMN_WIDTH }}
                        className={`sticky right-0 z-20 border-l border-border/70 !px-1 ${rowStripeClass(index)} group-hover:bg-accent/40 shadow-[-8px_0_10px_-10px_rgba(0,0,0,0.35)]`}
                        data-no-row-click
                    >
                        <div className="flex items-center justify-center gap-0.5 overflow-hidden">
                            {renderRowActions(row)}
                        </div>
                    </TableCell>
                )}
            </TableRow>

            {isExpanded && (
                <TableRow className="bg-background hover:bg-background">
                    <TableCell colSpan={expandColSpan} className="p-0 border-b">
                        {expandedRowContent(row)}
                    </TableCell>
                </TableRow>
            )}
        </Fragment>
    );
}
