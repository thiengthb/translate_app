import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { SortEntry } from "@/types";

interface Options {
    entityName: string;
    page: number;
    size: number;
    search: string;
    sortState: SortEntry[];
    filters: Record<string, any>;
    setPage: (page: number) => void;
    setSize: (size: number) => void;
    setSearch: (s: string) => void;
    setSortState: (s: SortEntry[]) => void;
    setFilters: (f: any) => void;
}

const FILTER_PREFIX = "f.";

/**
 * Two-way sync between table state and URL search params.
 *
 * URL shape:
 *   ?page=2&size=20&q=hello&sort=email,asc;createdAt,desc&f.role=ADMIN&f.isActive=true
 *
 * Each table on a page uses its own entityName as a namespace by prefixing keys
 * with `t.<entityName>.`? No — we keep flat URL because typically one table per
 * route. If multi-table coexistence becomes needed, wrap each key with a
 * namespace later.
 *
 * The first hydrate-from-URL fires once on mount; subsequent state changes
 * write back to the URL with `replace` so the browser back-stack doesn't fill
 * up with every keystroke.
 */
export function useTableUrlSync(opts: Options) {
    const [params, setParams] = useSearchParams();
    const hydrated = useRef(false);
    const lastEntity = useRef(opts.entityName);

    // ─── Hydrate state from URL once on mount (or when entity changes) ──────
    useEffect(() => {
        if (hydrated.current && lastEntity.current === opts.entityName) return;
        hydrated.current = true;
        lastEntity.current = opts.entityName;

        const page = params.get("page");
        const size = params.get("size");
        const q = params.get("q");
        const sort = params.get("sort");

        if (page) {
            const n = Number(page);
            if (Number.isFinite(n) && n >= 0) opts.setPage(n);
        }
        if (size) {
            const n = Number(size);
            if (Number.isFinite(n) && n > 0) opts.setSize(n);
        }
        if (q !== null) opts.setSearch(q);
        if (sort) {
            const parsed = parseSort(sort);
            if (parsed.length > 0) opts.setSortState(parsed);
        }

        const filtersFromUrl: Record<string, any> = {};
        for (const [key, value] of params.entries()) {
            if (!key.startsWith(FILTER_PREFIX)) continue;
            const fieldName = key.slice(FILTER_PREFIX.length);
            filtersFromUrl[fieldName] = parseFilterValue(value);
        }
        if (Object.keys(filtersFromUrl).length > 0) opts.setFilters(filtersFromUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opts.entityName]);

    // ─── Write state back to URL ────────────────────────────────────────────
    useEffect(() => {
        if (!hydrated.current) return;

        const next = new URLSearchParams(params);

        // Preserve any non-table params already in the URL
        // (we only manage page/size/q/sort/f.*)
        for (const key of Array.from(next.keys())) {
            if (
                key === "page" ||
                key === "size" ||
                key === "q" ||
                key === "sort" ||
                key.startsWith(FILTER_PREFIX)
            ) {
                next.delete(key);
            }
        }

        if (opts.page > 0) next.set("page", String(opts.page));
        if (opts.size && opts.size !== 10) next.set("size", String(opts.size));
        if (opts.search) next.set("q", opts.search);
        if (opts.sortState.length > 0) next.set("sort", serializeSort(opts.sortState));

        for (const [field, value] of Object.entries(opts.filters || {})) {
            if (isEmpty(value)) continue;
            next.set(`${FILTER_PREFIX}${field}`, serializeFilterValue(value));
        }

        setParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opts.page, opts.size, opts.search, opts.sortState, opts.filters]);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseSort(raw: string): SortEntry[] {
    return raw
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [field, direction] = entry.split(",").map((s) => s.trim());
            if (!field) return null;
            const dir = direction === "desc" ? "desc" : "asc";
            return { field, direction: dir } as SortEntry;
        })
        .filter((s): s is SortEntry => s !== null);
}

function serializeSort(state: SortEntry[]): string {
    return state.map((s) => `${s.field},${s.direction}`).join(";");
}

function parseFilterValue(raw: string): any {
    if (raw === "true") return true;
    if (raw === "false") return false;
    if (raw.includes(",")) return raw.split(",").map((s) => s.trim()).filter(Boolean);
    const asNumber = Number(raw);
    if (raw !== "" && Number.isFinite(asNumber) && !raw.startsWith("0")) return raw; // keep string for IDs
    return raw;
}

function serializeFilterValue(value: any): string {
    if (Array.isArray(value)) return value.join(",");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (value === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === "object" && Object.keys(value).length === 0) return true;
    return false;
}
