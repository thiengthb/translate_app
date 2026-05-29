import type { EntitySchema } from "@/types";
import { useState } from "react";
import { useTableDataIO } from "./useTableDataIO";
import { useTableMutations } from "./useTableMutations";
import { useTablePermissions } from "./useTablePermissions";
import { useTableQuery } from "./useTableQuery";
import { useTableRelations } from "./useTableRelations";

/**
 * Facade composing five focused sub-hooks. Returns the same shape as the
 * previous monolithic implementation so ProTable and Toolbar don't change.
 *
 * Sub-hooks (test / reuse them in isolation if you only need part of the
 * ProTable behavior):
 *   useTablePermissions  resource-derived can{Create,Read,...} + key strings
 *   useTableQuery        list + page + sort + search + filters + columnVisibility
 *   useTableMutations    create / update / delete / patchField / bulkDelete + fieldErrors
 *   useTableRelations    pre-fetched dropdown options + audit-user lookup
 *   useTableDataIO       import / export blob handling
 */
export function useProTable(api: any, schema: EntitySchema) {
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
        mutations.bulkDelete(selected);
        setSelected([]);
    };

    return {
        schema,

        data: queryParts.data,
        total: queryParts.total,
        loading: queryParts.loading,
        isFetching: queryParts.isFetching,
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
        isSubmitting: mutations.isSubmitting,
        fieldErrors: mutations.fieldErrors,
        setFieldErrors: mutations.setFieldErrors,

        importFile: dataIO.importFile,
        exportFile: dataIO.exportFile,

        relationOptions,
        permission,
    };
}
