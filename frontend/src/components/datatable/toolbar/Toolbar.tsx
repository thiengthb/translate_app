import { ArrowUpDown, LayoutPanelTop, Plus } from "lucide-react";

import ActionButton from "../common/ActionButton";
import { PermissionGate } from "@/components/PermissionGate";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { DataIOMenu } from "./DataIOMenu";
import { DisplayOptionsMenu } from "./DisplayOptionsMenu";
import { FilterPopover } from "./filter/FilterPopover";
import { RefreshIndicator } from "./RefreshIndicator";
import { SearchInput } from "./SearchInput";
import type { ViewMode } from "./DisplayOptionsMenu";
import type { Density } from "@/components/datatable/hook/useDensity";

export type { ViewMode } from "./DisplayOptionsMenu";

interface ToolbarProps {
    table: any;
    headerActions?: React.ReactNode;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    density?: Density;
    onDensityChange?: (density: Density) => void;
    /**
     * When provided AND the view is in card mode, render a button that
     * opens the card-layout editor. Undefined hides the button — wired
     * conditionally by ProTable so the entry point only appears when
     * the editor actually makes sense.
     */
    onOpenCardLayout?: () => void;
    /**
     * Catalog mode — the viewer is read-only on this entity. Drops the
     * Create button + view-mode picker. Search becomes the hero.
     */
    readOnly?: boolean;
}

/**
 * Compact toolbar layout:
 *
 *   [Display ▾][Refresh][── Search ──][Filter] | [Sort?][Data I/O ▾][Create]
 *
 * Display dropdown groups: column visibility, density, saved views, view mode.
 * Data I/O dropdown groups: import, export, print.
 */
export function Toolbar({
    table,
    headerActions,
    viewMode = "table",
    onViewModeChange,
    density,
    onDensityChange,
    onOpenCardLayout,
    readOnly = false,
}: ToolbarProps) {
    const { schema } = table;

    const hasFilters = schema.fields.some((f: any) => f.filterable);
    const activeFilterEntries = Object.entries(table.filters || {}).filter(
        ([, v]) => !isFilterEmpty(v),
    );
    const activeFilterCount = activeFilterEntries.length;

    const hasSorts = table.sortState?.length > 0;
    const showRefresh =
        table.lastUpdated !== undefined && typeof table.refetch === "function";

    return (
        <div className="flex flex-col gap-2 w-full min-w-0" data-protable-toolbar>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0 w-full">
                {/* Catalog mode (`readOnly`) collapses the toolbar to
                    the bare essentials — only search + filter remain.
                    Everything else (display options, refresh, sort
                    clear, card layout editor, data I/O, create) is
                    workspace-only chrome and would either do nothing
                    useful or actively confuse a browse-only viewer. */}
                {!readOnly && (
                    <DisplayOptionsMenu
                        schema={schema}
                        columnVisibility={table.columnVisibility}
                        toggleFieldVisibility={table.toggleFieldVisibility}
                        viewMode={viewMode}
                        onViewModeChange={onViewModeChange}
                        density={density}
                        onDensityChange={onDensityChange}
                        entityName={schema.entityName}
                        savedViewState={{
                            search: table.search,
                            sortState: table.sortState,
                            filters: table.filters,
                            columnVisibility: table.columnVisibility,
                        }}
                        onApplyView={table.applyView}
                        readOnly={readOnly}
                    />
                )}

                {!readOnly && showRefresh && (
                    <RefreshIndicator
                        lastUpdated={table.lastUpdated}
                        isFetching={table.isFetching}
                        onRefresh={() => table.refetch()}
                    />
                )}

                <div className="flex-1 min-w-[180px]">
                    <SearchInput
                        search={table.search}
                        onSearchChange={table.setSearch}
                        isPending={table.isSearchPending}
                    />
                </div>

                <FilterPopover
                    table={table}
                    hasFilters={hasFilters}
                    activeFilterCount={activeFilterCount}
                />

                {!readOnly && (
                    <>
                        <span className="mx-0.5 h-6 w-px bg-border" aria-hidden />

                        {hasSorts && (
                            <ActionButton
                                onClick={() => table.clearSort()}
                                tooltip={`Xóa ${table.sortState.length} sắp xếp`}
                                variant="outline"
                                icon={<ArrowUpDown size={15} />}
                            />
                        )}

                        {onOpenCardLayout && viewMode === "card" && (
                            <ActionButton
                                onClick={onOpenCardLayout}
                                tooltip="Tùy chỉnh card layout"
                                variant="outline"
                                icon={<LayoutPanelTop size={15} />}
                            />
                        )}

                        <DataIOMenu table={table} />

                        {headerActions || (
                            <PermissionGate
                                permission={table.permission?.keys?.create}
                            >
                                <ActionButton
                                    onClick={() => table.openCreate()}
                                    tooltip="Tạo mới"
                                    variant="default"
                                    icon={<Plus size={15} />}
                                />
                            </PermissionGate>
                        )}
                    </>
                )}
            </div>

            {activeFilterCount > 0 && (
                <ActiveFilterChips
                    schema={schema}
                    filters={table.filters}
                    relationOptions={table.relationOptions}
                    onRemove={table.removeFilter}
                    onClearAll={table.clearFilters}
                />
            )}
        </div>
    );
}

function isFilterEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (value === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === "object" && Object.keys(value).length === 0) return true;
    return false;
}
