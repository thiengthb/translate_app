import { ColumnToggle } from "./ColumnToggle";
import { FilterPopover } from "./filter/FilterPopover";
import { SearchInput } from "./SearchInput";
import { ToolbarActions } from "./ToolbarActions";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { SavedViewsMenu } from "./SavedViewsMenu";
import { DensityToggle } from "./DensityToggle";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
import { RefreshIndicator } from "./RefreshIndicator";
import ActionButton from "../common/ActionButton";
import { ArrowUpDown } from "lucide-react";
import type { Density } from "@/components/datatable/hook/useDensity";

export type { ViewMode } from "./ViewModeToggle";

interface ToolbarProps {
    table: any;
    headerActions?: React.ReactNode;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
    density?: Density;
    onDensityChange?: (density: Density) => void;
}

/**
 * Single-row toolbar:
 *
 *   [Cols][Filter][Views][Sort?] | [ViewMode][Density][Refresh] [── Search ──] [Import][Export][Print][Create]
 *
 * All controls are h-9 icon-only with tooltips. Search grows to fill space.
 * On very narrow screens, controls wrap thanks to flex-wrap, but height
 * stays uniform.
 */
export function Toolbar({
    table,
    headerActions,
    viewMode = "table",
    onViewModeChange,
    density,
    onDensityChange,
}: ToolbarProps) {
    const { schema } = table;

    const hasFilters = schema.fields.some((f: any) => f.filterable);
    const activeFilterEntries = Object.entries(table.filters || {}).filter(
        ([, v]) => !isFilterEmpty(v),
    );
    const activeFilterCount = activeFilterEntries.length;

    const hasSorts = table.sortState?.length > 0;

    return (
        <div className="flex flex-col gap-2 w-full min-w-0" data-protable-toolbar>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0 w-full">
                <ColumnToggle
                    schema={schema}
                    columnVisibility={table.columnVisibility}
                    toggleFieldVisibility={table.toggleFieldVisibility}
                />

                <FilterPopover
                    table={table}
                    hasFilters={hasFilters}
                    activeFilterCount={activeFilterCount}
                />

                {table.applyView && (
                    <SavedViewsMenu
                        entityName={schema.entityName}
                        currentState={{
                            search: table.search,
                            sortState: table.sortState,
                            filters: table.filters,
                            columnVisibility: table.columnVisibility,
                        }}
                        onApply={table.applyView}
                    />
                )}

                {hasSorts && (
                    <ActionButton
                        onClick={() => table.clearSort()}
                        tooltip={`Xóa ${table.sortState.length} sắp xếp`}
                        variant="outline"
                        icon={<ArrowUpDown size={15} />}
                    />
                )}

                <span className="mx-0.5 h-6 w-px bg-border" aria-hidden />

                {onViewModeChange && (
                    <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
                )}

                {density && onDensityChange && (
                    <DensityToggle density={density} onChange={onDensityChange} />
                )}

                {table.lastUpdated !== undefined && table.refetch && (
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

                <ToolbarActions table={table} headerActions={headerActions} />
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
