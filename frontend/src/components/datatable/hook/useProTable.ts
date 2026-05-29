import type { EntitySchema } from "@/types";
import { useState } from "react";
import { useTableDataIO } from "./useTableDataIO";
import { useTableMutations } from "./useTableMutations";
import { useTablePermissions } from "./useTablePermissions";
import { useTableQuery } from "./useTableQuery";
import { useTableRelations } from "./useTableRelations";
import { useTableUrlSync } from "./useTableUrlSync";

/**
 * Facade composing focused sub-hooks. Returns the same shape as the previous
 * monolithic implementation so ProTable and Toolbar don't change.
 *
 * Sub-hooks (test / reuse them in isolation if you only need part of the
 * ProTable behavior):
 *   useTablePermissions  resource-derived can{Create,Read,...} + key strings
 *   useTableQuery        list + page + sort + search + filters + columnVisibility
 *   useTableMutations    create / update / delete / patchField / bulkDelete + fieldErrors
 *   useTableRelations    pre-fetched dropdown options + audit-user lookup
 *   useTableDataIO       import / export blob handling
 *   useTableUrlSync      two-way sync table state ↔ URL search params
 */
export function useProTable(api: any, schema: EntitySchema, options?: { urlSync?: boolean }) {
    const urlSyncEnabled = options?.urlSync !== false;

    const permission = useTablePermissions(schema.entityName);
    const queryParts = useTableQuery({ api, schema, enabled: permission.canRead });
    const { relationOptions } = useTableRelations({ schema, enabled: permission.canRead });

    const [selected, setSelected] = useState<any[]>([]);
    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [isFormOpen, setFormOpen] = useState(false);

    const mutations = useTableMutations({
        api,
        schema,
        queryKey: queryParts.queryKey,
        permission,
        onSuccessClose: () => {
            setEditingRow(null);
            setFormOpen(false);
        },
    });

    const dataIO = useTableDataIO({ api, entityName: schema.entityName, permission });

    // ─── URL state sync ─────────────────────────────────────────────────────
    // Pulls page/size/sort/search/filters from URL on mount; writes back on
    // change so refresh + share-link preserve the view.
    useTableUrlSync({
        entityName: schema.entityName,
        page: queryParts.page,
        size: queryParts.size,
        search: queryParts.search,
        sortState: queryParts.sortState,
        filters: queryParts.filters,
        setPage: urlSyncEnabled ? queryParts.setPage : () => {},
        setSize: urlSyncEnabled ? queryParts.setSize : () => {},
        setSearch: urlSyncEnabled ? queryParts.setSearch : () => {},
        setSortState: urlSyncEnabled ? queryParts.setSortState : () => {},
        setFilters: urlSyncEnabled ? queryParts.setFilters : () => {},
    });

    const openCreate = () => {
        if (!permission.canCreate) return;
        setEditingRow(null);
        mutations.setFieldErrors({});
        setFormOpen(true);
    };

    const openEdit = (row: any) => {
        if (!permission.canUpdate) return;
        setEditingRow(row);
        mutations.setFieldErrors({});
        setFormOpen(true);
    };

    const bulkDelete = () => {
        if (!permission.canDelete || selected.length === 0) return;
        // Snapshot the selected rows so we can re-create them on Undo.
        const snapshot = queryParts.data.filter((r: any) =>
            selected.includes(r[schema.idField]),
        );
        mutations.bulkDelete(selected, snapshot);
        setSelected([]);
    };

    const bulkUpdate = async (patch: Record<string, any>) => {
        if (!permission.canUpdate || selected.length === 0) return;
        await mutations.bulkUpdate(selected, patch, queryParts.data);
        setSelected([]);
    };

    const clearSelection = () => setSelected([]);

    const selectAllOnPage = () => {
        const ids = (queryParts.data || []).map((r: any) => r[schema.idField]);
        setSelected(ids);
    };

    const applyView = (state: {
        search?: string;
        sortState?: any[];
        filters?: Record<string, any>;
        columnVisibility?: Record<string, boolean>;
    }) => {
        if (state.search !== undefined) queryParts.setSearch(state.search);
        if (state.sortState !== undefined) queryParts.setSortState(state.sortState);
        if (state.filters !== undefined) queryParts.setFilters(state.filters);
        if (state.columnVisibility !== undefined) {
            for (const [name, visible] of Object.entries(state.columnVisibility)) {
                queryParts.toggleFieldVisibility(name, visible);
            }
        }
        queryParts.setPage(0);
    };

    return {
        schema,

        data: queryParts.data,
        total: queryParts.total,
        loading: queryParts.loading,
        isFetching: queryParts.isFetching,
        isError: queryParts.isError,
        error: queryParts.error,
        refetch: queryParts.refetch,
        lastUpdated: queryParts.lastUpdated,
        isSearchPending: queryParts.isSearchPending,

        page: queryParts.page,
        size: queryParts.size,
        setPage: queryParts.setPage,
        setSize: queryParts.setSize,
        sortState: queryParts.sortState,
        toggleSort: queryParts.toggleSort,
        clearSort: queryParts.clearSort,
        filters: queryParts.filters,
        setFilters: queryParts.setFilters,
        clearFilters: queryParts.clearFilters,
        removeFilter: queryParts.removeFilter,
        search: queryParts.search,
        setSearch: queryParts.setSearch,
        columnVisibility: queryParts.columnVisibility,
        visibleFields: queryParts.visibleFields,
        toggleFieldVisibility: queryParts.toggleFieldVisibility,

        selected,
        setSelected,
        editingRow,
        isFormOpen,
        setFormOpen,
        openCreate,
        openEdit,

        create: mutations.create,
        update: mutations.update,
        remove: mutations.remove,
        patchField: (id: any, fieldName: string, value: any) =>
            mutations.patchField(id, fieldName, value, queryParts.data),
        bulkDelete,
        bulkUpdate,
        clearSelection,
        selectAllOnPage,
        applyView,
        isSubmitting: mutations.isSubmitting,
        fieldErrors: mutations.fieldErrors,
        setFieldErrors: mutations.setFieldErrors,

        importFile: dataIO.importFile,
        exportFile: dataIO.exportFile,

        relationOptions,
        permission,
    };
}
