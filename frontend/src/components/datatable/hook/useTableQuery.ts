import { DefaultPagination, type EntitySchema, type Pagination, type SortEntry } from "@/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface Options {
    api: any;
    schema: EntitySchema;
    enabled: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Owns the read-side state: pagination, sorting, search, filters, column
 * visibility, and the actual `useQuery` against the listing endpoint.
 */
export function useTableQuery({ api, schema, enabled }: Options) {
    const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
    const [sortState, setSortState] = useState<SortEntry[]>([]);
    const [filters, setFilters] = useState<any>({});
    const [search, setSearch] = useState<string>("");

    // Debounce search input so we don't fire a request per keystroke.
    const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        schema.fields.forEach((f) => {
            initial[f.name] = f.visible !== false;
        });
        return initial;
    });

    const visibleFields = useMemo(
        () => schema.fields.filter((f) => columnVisibility[f.name] !== false),
        [schema.fields, columnVisibility],
    );

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

    // Stable key for filters object — same content => same key fragment.
    const filtersKey = useMemo(() => stableSerialize(filters), [filters]);

    const queryKey = [
        schema.entityName,
        pagination.page,
        pagination.size,
        currentSort,
        filtersKey,
        debouncedSearch,
    ];

    const query = useQuery({
        queryKey,
        enabled,
        queryFn: () =>
            api.getPage(
                { ...pagination, sort: currentSort.length > 0 ? currentSort : undefined },
                debouncedSearch,
                filters,
            ),
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
    });

    // Track last successful fetch timestamp for the refresh indicator
    const [lastUpdated, setLastUpdated] = useState<number>(0);
    const wasFetchingRef = useRef(query.isFetching);
    useEffect(() => {
        // Detect transition: was fetching, now not, and success → bump timestamp
        if (wasFetchingRef.current && !query.isFetching && query.isSuccess) {
            setLastUpdated(Date.now());
        }
        wasFetchingRef.current = query.isFetching;
    }, [query.isFetching, query.isSuccess]);

    return {
        queryKey,
        query,
        data: query.data?.content ?? [],
        total: query.data?.totalElements ?? 0,
        loading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        lastUpdated,

        page: pagination.page ?? 0,
        size: pagination.size ?? 10,
        setPage: (page: number) => setPagination((prev) => ({ ...prev, page })),
        setSize: (size: number) => setPagination((prev) => ({ ...prev, size })),

        sortState,
        setSortState,
        toggleSort,
        clearSort,

        filters,
        setFilters,
        clearFilters: () => setFilters({}),
        removeFilter: (fieldName: string) =>
            setFilters((prev: any) => {
                const next = { ...prev };
                delete next[fieldName];
                return next;
            }),

        search,
        setSearch,
        debouncedSearch,
        isSearchPending: search !== debouncedSearch,

        columnVisibility,
        visibleFields,
        toggleFieldVisibility,
    };
}

/**
 * Stable string representation of a value — sorts object keys so a
 * re-referenced filter object with the same content produces the same key.
 */
function stableSerialize(value: any): string {
    if (value === null || value === undefined) return "";
    if (typeof value !== "object") return String(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${k}:${stableSerialize(value[k])}`).join(",")}}`;
}
