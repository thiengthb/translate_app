import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAutoPageSize } from "@/components/datatable/hook/useAutoPageSize";
import { useTableKeyboard } from "@/components/datatable/hook/useTableKeyboard";
import { useDensity } from "@/components/datatable/hook/useDensity";
import { useColumnLayout } from "@/components/datatable/hook/useColumnLayout";
import { useColumnPinning } from "@/components/datatable/hook/useColumnPinning";
import { useTableVirtualization } from "@/components/datatable/hook/useTableVirtualization";
import { logger } from "@/lib/logger";
import { ChevronRight } from "lucide-react";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import Loading from "./common/Loading";
import NoResult from "./common/NoResult";
import { TableSkeleton } from "./common/TableSkeleton";
import { BulkActionBar } from "./toolbar/BulkActionBar";
import { BulkEditModal } from "./modal/BulkEditModal";
import { ConfirmDeleteModal } from "./modal/ConfirmDeleteModal";
import { DetailModal } from "./modal/DetailModal";
import { FormModal } from "./modal/form/FormModal";
import { CardView } from "./table/card/CardView";
import { ChartView } from "./table/chart/ChartView";
import { CellRenderer, DATE_FORMAT_CYCLE, type DateFormatKey } from "./table/cell/CellRenderer";
import { Pagination } from "./table/Pagination";
import { RowActions } from "./table/RowActions";
import { RowSelection } from "./table/RowSelection";
import { SelectAllCheckbox } from "./table/SelectAllCheckbox";
import { SortableHeader } from "./table/SortableHeader";
import { Toolbar } from "./toolbar/Toolbar";
import type { ViewMode } from "./toolbar/Toolbar";

/**
 * ProTable: Reusable data table component with sensible defaults.
 *
 * Architecture: Default + Override Pattern.
 *
 * Default behavior (zero config):
 * - Internal modal CRUD system (create / edit / delete)
 * - Default row actions (view, edit, delete)
 * - Default create button
 *
 * Optional overrides (for complex entities):
 * - headerActions          override default create button
 * - renderRowActions       complete override of row actions
 * - onView / onEdit / onDelete   individual action overrides
 * - renderFormModal        override default form modal
 */
interface ProTableProps<TData = any> {
    /** Table instance from useProTable. */
    table: any;
    headerActions?: React.ReactNode;
    renderRowActions?: (row: TData) => React.ReactNode;
    onView?: (row: TData) => void;
    onEdit?: (row: TData) => void;
    onDelete?: (row: TData) => void;
    renderFormModal?: (props: {
        open: boolean;
        onClose: (open: boolean) => void;
        schema: any;
        initial: TData | null;
        onSubmit: (data: any) => void;
    }) => React.ReactNode;
    onRowClick?: (row: TData) => void;
    autoPageSize?: boolean;
    rowHeight?: number;
    hideActions?: boolean;
    /**
     * Expandable row configuration. Auto-enabled when any field has
     * `expandable: true`; pass `renderExpandedRow` to override content.
     */
    expandable?: {
        renderExpandedRow?: (row: TData) => React.ReactNode;
    };
    /** Row count threshold at which virtualization kicks in (default 100). Set 0 to always virtualize, Infinity to disable. */
    virtualizeThreshold?: number;
}

const ACTION_COLUMN_WIDTH = 132;

// Elements that should NOT trigger a row click when clicked. Add
// `data-no-row-click` to any custom interactive element you embed.
const ROW_CLICK_GUARD_SELECTOR = [
    "button",
    "a",
    "input",
    "label",
    "select",
    "textarea",
    "[role='button']",
    "[role='menuitem']",
    "[role='checkbox']",
    "[data-no-row-click]",
    "[data-state='open']",
].join(", ");

export function ProTable<TData = any>({
    table,
    headerActions,
    renderRowActions,
    onView,
    onEdit,
    onDelete,
    renderFormModal,
    onRowClick,
    autoPageSize = true,
    rowHeight: rowHeightProp,
    hideActions = false,
    expandable,
    virtualizeThreshold = 100,
}: ProTableProps<TData>) {
    const { schema } = table;

    // ─── Density (compact / normal / comfortable) ───────────────────────────
    const [density, setDensity, densityCfg] = useDensity(schema.entityName);
    const rowHeight = rowHeightProp ?? densityCfg.rowHeight;

    // Auto-detect expandable from schema
    const isExpandable = useMemo<boolean>(
        () => schema.fields.some((f: any) => f.expandable === true),
        [schema.fields],
    );

    const [isAutoSize, setIsAutoSize] = useState(autoPageSize);

    const { containerRef, calculatedSize } = useAutoPageSize({
        rowHeight,
        onSizeChange: isAutoSize ? table.setSize : undefined,
    });

    // ─── Expand state ───────────────────────────────────────────────────────
    const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
    const toggleExpand = useCallback((id: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // ─── Internal modal state (used when overrides are not provided) ────────
    const [deleteItem, setDeleteItem] = useState<TData | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [detailRow, setDetailRow] = useState<TData | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

    // ─── Detail prev/next derived from current page ─────────────────────────
    const detailIndex = useMemo(() => {
        if (!detailRow || !table.data) return -1;
        const id = (detailRow as any)[schema.idField];
        return table.data.findIndex((r: any) => r[schema.idField] === id);
    }, [detailRow, table.data, schema.idField]);

    const goToDetail = (i: number) => {
        if (!table.data || i < 0 || i >= table.data.length) return;
        setDetailRow(table.data[i]);
    };

    // ─── Per-column date format cycling ─────────────────────────────────────
    const [dateFormats, setDateFormats] = useState<Record<string, DateFormatKey>>({});
    const cycleDateFormat = useCallback((fieldName: string) => {
        setDateFormats((prev) => {
            const current = prev[fieldName] ?? "datetime";
            const idx = DATE_FORMAT_CYCLE.indexOf(current);
            const next = DATE_FORMAT_CYCLE[(idx + 1) % DATE_FORMAT_CYCLE.length];
            return { ...prev, [fieldName]: next };
        });
    }, []);

    // ─── Column layout (order + pinning) ────────────────────────────────────
    const columnLayout = useColumnLayout(schema.entityName, table.visibleFields);

    // ─── Column widths + resize ─────────────────────────────────────────────
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const widths: Record<string, number> = {};
        schema.fields.forEach((f: any) => {
            widths[f.name] = f.width || 150;
        });
        return widths;
    });

    // Leading offset = expand col (40) + selection (20) + index (50)
    const leadingOffset =
        (isExpandable ? 40 : 0) + 20 + 50;

    const { pinStyles, pinSides } = useColumnPinning({
        arrangedFields: columnLayout.arrangedFields,
        leftPinned: columnLayout.leftPinned,
        rightPinned: columnLayout.rightPinned,
        columnWidths,
        leadingOffset,
    });

    // ─── Drag-and-drop sensors ──────────────────────────────────────────────
    const dndSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        columnLayout.reorder(String(active.id), String(over.id));
    };

    const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);

    const onResizeStart = useCallback(
        (fieldName: string, e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startWidth = columnWidths[fieldName] || 150;
            resizingRef.current = { field: fieldName, startX, startWidth };

            const onMouseMove = (ev: MouseEvent) => {
                if (!resizingRef.current) return;
                const { field, startX, startWidth } = resizingRef.current;
                const diff = ev.clientX - startX;
                const minW = schema.fields.find((f: any) => f.name === field)?.minWidth || 60;
                const newWidth = Math.max(minW, startWidth + diff);
                setColumnWidths((prev) => ({ ...prev, [field]: newWidth }));
            };

            const onMouseUp = () => {
                resizingRef.current = null;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.userSelect = "";
            };

            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        },
        [columnWidths, schema.fields],
    );

    // ─── Keyboard navigation ────────────────────────────────────────────────
    const focusedRowIndex = useTableKeyboard({
        enabled: viewMode === "table",
        rowCount: table.data?.length ?? 0,
        onActivate: (i) => {
            const row = table.data?.[i];
            if (row) {
                if (onView) onView(row);
                else setDetailRow(row);
            }
        },
        onDelete: (i) => {
            const row = table.data?.[i];
            if (row && (table.permission?.canDelete ?? true)) {
                if (onDelete) onDelete(row);
                else setDeleteItem(row);
            }
        },
        onFocusSearch: () => {
            const input = document.querySelector<HTMLInputElement>(
                'input[placeholder="Tìm kiếm..."]',
            );
            input?.focus();
            input?.select();
        },
        onSelectAll: () => table.selectAllOnPage?.(),
        onEscape: () => table.clearSelection?.(),
    });

    // ─── Permissions / column visibility ────────────────────────────────────
    const canViewRow = table.permission?.canRead ?? true;
    const canEditRow = table.permission?.canUpdate ?? true;
    const canDeleteRow = table.permission?.canDelete ?? true;
    const hasRowActions = canViewRow || canEditRow || canDeleteRow;
    const showActionsColumn = !hideActions && hasRowActions;

    // ─── Computed: colspan for expanded row, hoisted out of map ─────────────
    const expandColSpan =
        (isExpandable ? 1 : 0) +
        1 + // selection
        1 + // index
        columnLayout.arrangedFields.length +
        (showActionsColumn ? 1 : 0);

    // ─── Delete confirmation ────────────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (!deleteItem) return;
        if (!table.permission?.canDelete) return;
        try {
            setDeleteLoading(true);
            await table.remove((deleteItem as any)[schema.idField]);
            setDeleteItem(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    // ─── Row action renderer ────────────────────────────────────────────────
    const defaultRenderRowActions = (row: TData) => (
        <RowActions
            row={row}
            onView={onView || setDetailRow}
            onEdit={onEdit || table.openEdit}
            onDelete={onDelete || setDeleteItem}
            viewPermission={table.permission?.keys?.read}
            editPermission={table.permission?.keys?.update}
            deletePermission={table.permission?.keys?.delete}
        />
    );
    const finalRenderRowActions = renderRowActions || defaultRenderRowActions;

    // ─── Empty / error state classification ─────────────────────────────────
    const hasActiveFilters =
        (table.search && table.search !== "") ||
        Object.values(table.filters || {}).some((v) =>
            Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "" && v !== null,
        );

    const renderEmptyState = () => {
        if (table.loading) return <Loading />;
        if (table.isError) {
            return (
                <NoResult
                    variant="error"
                    onAction={() => table.refetch?.()}
                    actionLabel="Thử lại"
                />
            );
        }
        if (hasActiveFilters) {
            return (
                <NoResult
                    variant="filtered"
                    onAction={() => {
                        table.clearFilters();
                        table.setSearch("");
                    }}
                />
            );
        }
        return (
            <NoResult
                variant="empty"
                onAction={
                    table.permission?.canCreate ? () => table.openCreate() : undefined
                }
            />
        );
    };

    const handleRowClick = (e: React.MouseEvent, row: TData) => {
        if (!onRowClick) return;
        try {
            const target = e.target as HTMLElement | null;
            if (target && target.closest(ROW_CLICK_GUARD_SELECTOR)) return;
        } catch (err) {
            logger.error("Error checking click target:", err);
        }
        onRowClick(row);
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    const showSkeleton = table.loading && (!table.data || table.data.length === 0);
    const hasRows = !showSkeleton && table.data?.length > 0;

    return (
        <div className="grid gap-3 sm:gap-4 h-full font-inter grid-rows-[auto_1fr_auto] min-w-0 w-full max-w-full">
            <Toolbar
                table={table}
                headerActions={headerActions}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                density={density}
                onDensityChange={setDensity}
            />

            <div
                ref={containerRef}
                className="h-full rounded-lg border bg-card text-foreground flex flex-col w-full min-w-0 max-w-full overflow-hidden"
            >
                {viewMode === "table" ? (
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0 overflow-auto">
                        {/*
                          DndContext + SortableContext MUST live outside <table>:
                          they render hidden live-region <div>s for a11y, and a
                          <div> inside <tr> is invalid HTML — browsers move it
                          out and the column count gets misaligned (Actions header
                          ends up one column to the right of the action buttons).
                        */}
                        <DndContext
                            sensors={dndSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={columnLayout.arrangedFields.map((f: any) => f.name)}
                                strategy={horizontalListSortingStrategy}
                            >
                        <Table className="table-fixed">
                            <colgroup>
                                {isExpandable && <col style={{ width: 36 }} />}
                                <col style={{ width: 36 }} />
                                <col style={{ width: 44 }} />
                                {columnLayout.arrangedFields.map((f: any) => (
                                    <col key={f.name} style={{ width: columnWidths[f.name] || 150 }} />
                                ))}
                                {showActionsColumn && <col style={{ width: ACTION_COLUMN_WIDTH }} />}
                            </colgroup>
                            <TableHeader className="bg-muted/40 z-10 sticky top-0 shadow-sm [&_th]:font-semibold [&_th]:text-foreground [&_th]:h-11 [&_th]:bg-muted/40">
                                <TableRow>
                                    {isExpandable && <TableHead className="!p-0" />}
                                    <TableHead className="!px-1 text-center">
                                        <SelectAllCheckbox table={table} idField={schema.idField} />
                                    </TableHead>
                                    <TableHead className="!px-1 text-center text-muted-foreground">
                                        #
                                    </TableHead>
                                    {columnLayout.arrangedFields.map((f: any) => (
                                        <SortableHeader
                                            key={f.name}
                                            field={f}
                                            sortState={table.sortState}
                                            onToggleSort={table.toggleSort}
                                            width={columnWidths[f.name] || 150}
                                            onResizeStart={(e) => onResizeStart(f.name, e)}
                                            dateFormat={dateFormats[f.name]}
                                            onDateFormatCycle={
                                                f.type === "date" ? cycleDateFormat : undefined
                                            }
                                            draggable
                                            pinSide={pinSides[f.name] ?? null}
                                            onPin={(side) => columnLayout.setPin(f.name, side)}
                                            pinStyle={pinStyles[f.name]?.style}
                                            pinClassName={pinStyles[f.name]?.className}
                                        />
                                    ))}
                                    {showActionsColumn && (
                                        <TableHead
                                            style={{ width: ACTION_COLUMN_WIDTH }}
                                            className="sticky right-0 z-30 !bg-muted/40 border-l border-border/70 shadow-[-8px_0_10px_-10px_rgba(0,0,0,0.35)]"
                                        >
                                            Actions
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>

                            {showSkeleton ? (
                                <TableSkeleton
                                    rows={Math.min(table.size || 10, 10)}
                                    columns={columnLayout.arrangedFields.length}
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
                                        {table.data.map((row: any, index: number) => {
                                            const id = row[schema.idField];
                                            const isExpanded = isExpandable && expandedRows.has(id);

                                            return (
                                                <Fragment key={id}>
                                                    <TableRow
                                                        data-focused={focusedRowIndex === index || undefined}
                                                        className={`group w-full odd:bg-muted/20 even:bg-card hover:bg-accent/40 border-b border-border/40 ${densityCfg.rowClassName} ${
                                                            focusedRowIndex === index
                                                                ? "outline outline-2 outline-primary outline-offset-[-2px] !bg-primary/5"
                                                                : ""
                                                        }`}
                                                        onClick={(e) => handleRowClick(e, row)}
                                                    >
                                                        {isExpandable && (
                                                            <TableCell className="!p-0 text-center">
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center justify-center w-full h-full p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                                                    onClick={(e) => toggleExpand(id, e)}
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

                                                        <TableCell data-no-row-click className="!px-1 text-center">
                                                            <RowSelection id={id} table={table} />
                                                        </TableCell>

                                                        <TableCell className="!px-1 text-center text-muted-foreground text-xs tabular-nums">
                                                            {(table.page || 0) * (table.size || 10) + index + 1}
                                                        </TableCell>

                                                        {columnLayout.arrangedFields.map((f: any) => {
                                                            const pin = pinStyles[f.name];
                                                            const cellPinClassName = pin
                                                                ? `${pin.className} ${
                                                                      index % 2 === 0
                                                                          ? "!bg-muted/20"
                                                                          : "!bg-card"
                                                                  } group-hover:!bg-accent/40`
                                                                : "";
                                                            return (
                                                                <CellRenderer
                                                                    key={f.name}
                                                                    field={f}
                                                                    value={row[f.name]}
                                                                    relationOptions={table.relationOptions}
                                                                    disableBooleanToggle={!(table.permission?.canUpdate ?? true)}
                                                                    onBooleanToggle={(fieldName, newValue) => {
                                                                        if (!(table.permission?.canUpdate ?? true)) return;
                                                                        table.patchField(id, fieldName, newValue);
                                                                    }}
                                                                    onInlineEdit={
                                                                        (table.permission?.canUpdate ?? true)
                                                                            ? (fieldName, newValue) =>
                                                                                  table.patchField(id, fieldName, newValue)
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
                                                                className={`sticky right-0 z-20 border-l border-border/70 ${
                                                                    index % 2 === 0 ? "bg-muted/20" : "bg-card"
                                                                } group-hover:bg-accent/40 shadow-[-8px_0_10px_-10px_rgba(0,0,0,0.35)]`}
                                                                data-no-row-click
                                                            >
                                                                <div className="flex items-center gap-1 overflow-hidden">
                                                                    {finalRenderRowActions(row)}
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>

                                                    {isExpanded && (
                                                        <TableRow className="bg-background hover:bg-background">
                                                            <TableCell colSpan={expandColSpan} className="p-0 border-b">
                                                                {expandable?.renderExpandedRow
                                                                    ? expandable.renderExpandedRow(row)
                                                                    : schema.fields
                                                                          .filter((f: any) => f.expandable)
                                                                          .map((f: any) =>
                                                                              f.renderExpanded ? (
                                                                                  f.renderExpanded(row[f.name], row)
                                                                              ) : (
                                                                                  <div key={f.name} className="p-3">
                                                                                      <CellRenderer
                                                                                          field={f}
                                                                                          value={row[f.name]}
                                                                                          relationOptions={table.relationOptions}
                                                                                          disableBooleanToggle={
                                                                                              !(table.permission?.canUpdate ?? true)
                                                                                          }
                                                                                          onBooleanToggle={(fieldName, newValue) => {
                                                                                              if (
                                                                                                  !(table.permission?.canUpdate ?? true)
                                                                                              ) {
                                                                                                  return;
                                                                                              }
                                                                                              table.patchField(id, fieldName, newValue);
                                                                                          }}
                                                                                          dateFormat={
                                                                                              f.type === "date"
                                                                                                  ? (dateFormats[f.name] ?? "datetime")
                                                                                                  : undefined
                                                                                          }
                                                                                      />
                                                                                  </div>
                                                                              ),
                                                                          )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                )
                            )}
                        </Table>
                            </SortableContext>
                        </DndContext>
                        </div>

                        {!showSkeleton && !hasRows && (
                            <div className="flex-1 flex items-center justify-center">
                                {renderEmptyState()}
                            </div>
                        )}
                    </div>
                ) : viewMode === "card" ? (
                    <>
                        {hasRows ? (
                            <CardView
                                table={table}
                                onRowClick={onRowClick}
                                showActions={showActionsColumn}
                                renderRowActions={showActionsColumn ? finalRenderRowActions : undefined}
                                onView={onView || setDetailRow}
                                onEdit={onEdit || table.openEdit}
                                onDelete={onDelete || setDeleteItem}
                                disableBooleanToggle={!(table.permission?.canUpdate ?? true)}
                                onBooleanToggle={(id, fieldName, newValue) => {
                                    if (!(table.permission?.canUpdate ?? true)) return;
                                    table.patchField(id, fieldName, newValue);
                                }}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                {renderEmptyState()}
                            </div>
                        )}
                    </>
                ) : (
                    // viewMode === "chart"
                    hasRows ? (
                        <ChartView table={table} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            {renderEmptyState()}
                        </div>
                    )
                )}
            </div>

            <Pagination
                table={table}
                isAutoSize={isAutoSize}
                autoSize={calculatedSize}
                onPageSizeChange={(value) => {
                    if (value === "auto") {
                        setIsAutoSize(true);
                        table.setSize(calculatedSize);
                    } else {
                        setIsAutoSize(false);
                        table.setSize(Number(value));
                    }
                    table.setPage(0);
                }}
            />

            {/* Form Modal: custom renderer or default */}
            {renderFormModal ? (
                renderFormModal({
                    open: table.isFormOpen,
                    onClose: (open) => {
                        if (!open) table.setFieldErrors({});
                        table.setFormOpen(open);
                    },
                    schema,
                    initial: table.editingRow,
                    onSubmit: (data) => {
                        if (table.editingRow) {
                            table.update({ id: table.editingRow[schema.idField], data });
                        } else {
                            table.create(data);
                        }
                    },
                })
            ) : (
                <FormModal
                    open={table.isFormOpen}
                    onClose={(open) => {
                        if (!open) table.setFieldErrors({});
                        table.setFormOpen(open);
                    }}
                    schema={schema}
                    initial={table.editingRow}
                    title={table.editingRow ? "Edit" : "Create"}
                    isSubmitting={table.isSubmitting}
                    relationOptions={table.relationOptions}
                    fieldErrors={table.fieldErrors}
                    onSubmit={(data) => {
                        if (table.editingRow) {
                            table.update({ id: table.editingRow[schema.idField], data });
                        } else {
                            table.create(data);
                        }
                    }}
                />
            )}

            <ConfirmDeleteModal
                open={!!deleteItem}
                onOpenChange={(open) => !open && setDeleteItem(null)}
                onConfirm={handleDeleteConfirm}
                loading={deleteLoading}
            />

            <DetailModal
                open={!!detailRow}
                onClose={(open) => !open && setDetailRow(null)}
                schema={schema}
                row={detailRow}
                relationOptions={table.relationOptions}
                onPrev={detailIndex > 0 ? () => goToDetail(detailIndex - 1) : undefined}
                onNext={
                    detailIndex >= 0 && detailIndex < (table.data?.length ?? 0) - 1
                        ? () => goToDetail(detailIndex + 1)
                        : undefined
                }
                position={
                    detailIndex >= 0
                        ? { current: detailIndex + 1, total: table.data?.length ?? 0 }
                        : undefined
                }
            />

            {/* ─── Sticky bulk action bar ─────────────────────────────── */}
            <BulkActionBar
                selectedCount={table.selected?.length ?? 0}
                total={table.data?.length ?? 0}
                onClearSelection={() => table.clearSelection?.()}
                onBulkDelete={
                    table.permission?.canDelete ? () => setBulkDeleteOpen(true) : undefined
                }
                onBulkEdit={
                    table.permission?.canUpdate ? () => setBulkEditOpen(true) : undefined
                }
                deletePermission={table.permission?.keys?.delete}
                editPermission={table.permission?.keys?.update}
            />

            <BulkEditModal
                open={bulkEditOpen}
                onOpenChange={setBulkEditOpen}
                schema={schema}
                selectedCount={table.selected?.length ?? 0}
                relationOptions={table.relationOptions}
                onApply={async (patch) => {
                    await table.bulkUpdate?.(patch);
                }}
            />

            <ConfirmDeleteModal
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                onConfirm={async () => {
                    try {
                        setBulkDeleteLoading(true);
                        await table.bulkDelete?.();
                        setBulkDeleteOpen(false);
                    } finally {
                        setBulkDeleteLoading(false);
                    }
                }}
                loading={bulkDeleteLoading}
                title="Xóa các mục đã chọn"
                description={`Bạn có chắc muốn xóa ${
                    table.selected?.length ?? 0
                } mục đã chọn? Hành động này không thể hoàn tác.`}
            />
        </div>
    );
}
