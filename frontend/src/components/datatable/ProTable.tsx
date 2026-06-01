import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

import { ROW_CLICK_GUARD_SELECTOR } from "./constants";
import type { TableInstance } from "./types";
import { useAutoPageSize } from "./hook/useAutoPageSize";
import { useColumnLayout } from "./hook/useColumnLayout";
import { useColumnPinning } from "./hook/useColumnPinning";
import { useColumnResize } from "./hook/useColumnResize";
import { useDateFormats } from "./hook/useDateFormats";
import { useDensity } from "./hook/useDensity";
import { useProTableModals } from "./hook/useProTableModals";
import { useRowExpansion } from "./hook/useRowExpansion";
import { useTableKeyboard } from "./hook/useTableKeyboard";
import { useTableLayoutMetrics } from "./hook/useTableLayoutMetrics";
import { useViewMode } from "./hook/useViewMode";

import Loading from "./common/Loading";
import NoResult from "./common/NoResult";
import { BulkEditModal } from "./modal/BulkEditModal";
import { ConfirmDeleteModal } from "./modal/ConfirmDeleteModal";
import { DetailModal } from "./modal/DetailModal";
import { FormModal } from "./modal/form/FormModal";
import { CardLayoutEditor } from "./table/card/CardLayoutEditor";
import { CardView } from "./table/card/CardView";
import { useCardLayout } from "./table/card/useCardLayout";
import { CellRenderer } from "./table/cell/CellRenderer";
import { ChartView } from "./table/chart/ChartView";
import { Pagination } from "./table/Pagination";
import { RowActions } from "./table/RowActions";
import { TableView } from "./table/TableView";
import { BulkActionBar } from "./toolbar/BulkActionBar";
import { Toolbar } from "./toolbar/Toolbar";

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
    table: TableInstance<TData>;
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
}

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
    const { expanded: expandedRows, toggle: toggleExpand } = useRowExpansion();

    // ─── Internal modal state (used when overrides are not provided) ────────
    const {
        deleteItem,
        setDeleteItem,
        deleteLoading,
        setDeleteLoading,
        detailRow,
        setDetailRow,
        bulkEditOpen,
        setBulkEditOpen,
        bulkDeleteOpen,
        setBulkDeleteOpen,
        bulkDeleteLoading,
        setBulkDeleteLoading,
    } = useProTableModals<TData>();
    // View mode (table/card/chart) is persisted globally so it survives
    // reloads AND navigation to another module — see useViewMode.
    const [viewMode, setViewMode] = useViewMode();
    const [cardLayoutEditorOpen, setCardLayoutEditorOpen] = useState(false);

    // ─── Catalog mode ───────────────────────────────────────────────────────
    // When the viewer has no write permissions (no create AND no update AND
    // no delete), ProTable shifts into a "browse-only" personality:
    //   - view mode is locked to card (the natural medium for browsing)
    //   - the view-mode picker, create button, bulk bar, checkboxes, and
    //     row action buttons all disappear
    //   - the card-layout seed flips to a gallery-friendly preset
    // The intent is to make the page read as a catalog, not a stripped-down
    // admin grid. The viewer still gets search, filter, sort, pagination,
    // and the detail modal on click — everything they need to consume the
    // data, nothing more.
    const perm = table.permission;
    const isReadOnly = perm
        ? !perm.canCreate && !perm.canUpdate && !perm.canDelete
        : false;
    const effectiveViewMode = isReadOnly ? "card" : viewMode;

    // ─── Card-view layout customization ─────────────────────────────────────
    // Mounted at this level so the toolbar's "Tùy chỉnh card layout" button
    // and the CardView itself share one source of truth — and changes from
    // the editor live-update the cards behind the dialog.
    // Catalog mode seeds with the "Product" preset when images are
    // available, "Compact" otherwise — gives read-only viewers a
    // polished landing layout instead of the bare schema defaults.
    const hasImageCandidate = useMemo<boolean>(
        () =>
            (table.visibleFields as any[]).some(
                (f: any) =>
                    f.type === "image" ||
                    /(image|avatar|photo|thumbnail|picture|logo|cover|banner)/i.test(
                        f.name,
                    ),
            ),
        [table.visibleFields],
    );
    const cardLayout = useCardLayout(
        schema.entityName,
        table.visibleFields as any,
        isReadOnly
            ? { defaultPresetId: hasImageCandidate ? "product" : "compact" }
            : undefined,
    );

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
    const { formats: dateFormats, cycle: cycleDateFormat } = useDateFormats();

    // ─── Column layout (order + pinning) ────────────────────────────────────
    const columnLayout = useColumnLayout(schema.entityName, table.visibleFields);

    // ─── Column widths + resize ─────────────────────────────────────────────
    const {
        widths: columnWidths,
        onResizeStart,
    } = useColumnResize({ fields: schema.fields });

    // ─── Permissions / column visibility ────────────────────────────────────
    const canViewRow = table.permission?.canRead ?? true;
    const canEditRow = table.permission?.canUpdate ?? true;
    const canDeleteRow = table.permission?.canDelete ?? true;
    const hasRowActions = canViewRow || canEditRow || canDeleteRow;
    const showActionsColumn = !hideActions && hasRowActions;

    // ─── Sticky offsets + total width math ──────────────────────────────────
    const {
        expandLeft,
        selectLeft,
        indexLeft,
        leadingOffset,
        trailingOffset,
        totalTableWidth,
    } = useTableLayoutMetrics({
        arrangedFields: columnLayout.arrangedFields,
        columnWidths,
        isExpandable,
        showActionsColumn,
    });

    const { pinStyles, pinSides } = useColumnPinning({
        arrangedFields: columnLayout.arrangedFields,
        leftPinned: columnLayout.leftPinned,
        rightPinned: columnLayout.rightPinned,
        columnWidths,
        leadingOffset,
        trailingOffset,
    });

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
        onToggleSelectRow: (i) => {
            const row = table.data?.[i];
            if (!row) return;
            const id = (row as any)[schema.idField];
            table.setSelected((prev: any[]) =>
                prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id],
            );
        },
        onCreate: () => {
            if (table.permission?.canCreate ?? true) table.openCreate?.();
        },
        onRefresh: () => table.refetch?.(),
    });

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

    // ─── Expanded-row content builder ───────────────────────────────────────
    const buildExpandedRowContent = (row: any) => {
        if (expandable?.renderExpandedRow) return expandable.renderExpandedRow(row);
        const canUpdate = table.permission?.canUpdate ?? true;
        return schema.fields
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
                            disableBooleanToggle={!canUpdate}
                            onBooleanToggle={(fieldName, newValue) => {
                                if (!canUpdate) return;
                                table.patchField(row[schema.idField], fieldName, newValue);
                            }}
                            dateFormat={
                                f.type === "date"
                                    ? (dateFormats[f.name] ?? "datetime")
                                    : undefined
                            }
                        />
                    </div>
                ),
            );
    };

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
                viewMode={effectiveViewMode}
                onViewModeChange={setViewMode}
                density={density}
                onDensityChange={setDensity}
                /* Card layout editing is admin-only. Catalog viewers
                   get whatever layout the admin chose for the entity —
                   no entry point exposed to them. */
                onOpenCardLayout={
                    !isReadOnly && effectiveViewMode === "card"
                        ? () => setCardLayoutEditorOpen(true)
                        : undefined
                }
                readOnly={isReadOnly}
            />

            <div
                ref={containerRef}
                className={cn(
                    "h-full text-foreground flex flex-col w-full min-w-0 max-w-full overflow-hidden",
                    // Workspace mode keeps the bordered card surface
                    // — gives the data-grid a clear container. Catalog
                    // mode drops it so cards float on the page
                    // background like a gallery, no admin-grid chrome.
                    !isReadOnly && "rounded-lg border bg-card",
                )}
            >
                {effectiveViewMode === "table" ? (
                    <TableView
                        table={table}
                        densityCfg={densityCfg}
                        arrangedFields={columnLayout.arrangedFields}
                        columnWidths={columnWidths}
                        pinStyles={pinStyles}
                        pinSides={pinSides}
                        onPin={(name, side) => columnLayout.setPin(name, side)}
                        onReorder={(activeId, overId) =>
                            columnLayout.reorder(activeId, overId)
                        }
                        onResizeStart={onResizeStart}
                        expandLeft={expandLeft}
                        selectLeft={selectLeft}
                        indexLeft={indexLeft}
                        totalTableWidth={totalTableWidth}
                        isExpandable={isExpandable}
                        showActionsColumn={showActionsColumn}
                        expandedRows={expandedRows}
                        onToggleExpand={toggleExpand}
                        expandedRowContent={buildExpandedRowContent}
                        renderRowActions={finalRenderRowActions}
                        dateFormats={dateFormats}
                        onDateFormatCycle={cycleDateFormat}
                        showSkeleton={showSkeleton}
                        hasRows={hasRows}
                        renderEmptyState={renderEmptyState}
                        focusedRowIndex={focusedRowIndex}
                        onRowClick={handleRowClick}
                    />
                ) : effectiveViewMode === "card" ? (
                    <>
                        {hasRows ? (
                            <CardView
                                table={table}
                                /* Catalog mode: clicking a card opens
                                   the detail modal as the default
                                   drill-in. Outside catalog mode we
                                   stay opt-in so existing pages keep
                                   their own onRowClick semantics. */
                                onRowClick={
                                    onRowClick ??
                                    (isReadOnly
                                        ? (row) => setDetailRow(row)
                                        : undefined)
                                }
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
                                layout={cardLayout.config}
                                readOnly={isReadOnly}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                {renderEmptyState()}
                            </div>
                        )}
                    </>
                ) : (
                    // effectiveViewMode === "chart"
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
                readOnly={isReadOnly}
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
                            table.update({ id: (table.editingRow as any)[schema.idField], data });
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
                            table.update({ id: (table.editingRow as any)[schema.idField], data });
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

            {/* ─── Sticky bulk action bar ──────────────────────────────
                Catalog mode never shows this — selection itself is
                hidden, so the bulk bar would have nothing to act on. */}
            {!isReadOnly && (
                <BulkActionBar
                    selectedCount={table.selected?.length ?? 0}
                    total={table.data?.length ?? 0}
                    onClearSelection={() => table.clearSelection?.()}
                    onBulkDelete={
                        table.permission?.canDelete
                            ? () => setBulkDeleteOpen(true)
                            : undefined
                    }
                    onBulkEdit={
                        table.permission?.canUpdate
                            ? () => setBulkEditOpen(true)
                            : undefined
                    }
                    deletePermission={table.permission?.keys?.delete}
                    editPermission={table.permission?.keys?.update}
                />
            )}

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

            {/* Card layout editor — a non-modal side sheet. The cards
                behind stay fully visible AND interactive so the editor
                IS the live preview against real data.
                Skipped entirely for catalog viewers (no permission to
                edit the layout — that's an admin tool). */}
            {!isReadOnly && (
                <CardLayoutEditor
                    open={cardLayoutEditorOpen}
                    onOpenChange={setCardLayoutEditorOpen}
                    cardLayout={cardLayout}
                    visibleFields={table.visibleFields as any}
                />
            )}
        </div>
    );
}
