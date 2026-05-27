import { DefaultPagination, type EntitySchema, type Pagination, type SortEntry } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface Options {
    api: any;
    schema: EntitySchema;
    enabled: boolean;
}

/**
 * Owns the read-side state: pagination, sorting, search, filters, column
 * visibility, and the actual `useQuery` against the listing endpoint.
 */
export function useTableQuery({ api, schema, enabled }: Options) {
    const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
    const [sortState, setSortState] = useState<SortEntry[]>([]);
    const [filters, setFilters] = useState<any>({});
    const [search, setSearch] = useState<string>("");

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        schema.fields.forEach((f) => {
            initial[f.name] = f.visible !== false;
        });
        return initial;
    });

    const visibleFields = schema.fields.filter((f) => columnVisibility[f.name] !== false);

    const toggleFieldVisibility = (fieldName: string, visible: boolean) =>
        setColumnVisibility((prev) => ({ ...prev, [fieldName]: visible }));

    const toggleSort = (fieldName: string) =>
        setSortState((prev) => {
            const idx = prev.findIndex((s) => s.field === fieldName);
            if (idx === -1) return [...prev, { field: fieldName, direction: "asc" as const }];
            if (prev[idx].direction === "asc") {
                return prev.map((s, i) => (i === idx ? { ...s, direction: "desc" as const } : s));
            }
            return prev.filter((_, i) => i !== idx);
        });

    const clearSort = () => setSortState([]);

    const currentSort: string[] = sortState.map((s) => `${s.field},${s.direction}`);

    const queryKey = [schema.entityName, pagination.page, pagination.size, currentSort, filters, search];

    const query = useQuery({
        queryKey,
        enabled,
        queryFn: () =>
            api.getPage(
                { ...pagination, sort: currentSort.length > 0 ? currentSort : undefined },
                search,
                filters,
            ),
        placeholderData: keepPreviousData,
    });

    return {
        queryKey,
        query,
        data: query.data?.content ?? [],
        total: query.data?.totalElements ?? 0,
        loading: query.isLoading,
        isFetching: query.isFetching,

        page: pagination.page,
        size: pagination.size,
        setPage: (page: number) => setPagination((prev) => ({ ...prev, page })),
        setSize: (size: number) => setPagination((prev) => ({ ...prev, size })),

        sortState,
        toggleSort,
        clearSort,

        filters,
        setFilters,
        clearFilters: () => setFilters({}),

        search,
        setSearch,

        columnVisibility,
        visibleFields,
        toggleFieldVisibility,
    };
}
