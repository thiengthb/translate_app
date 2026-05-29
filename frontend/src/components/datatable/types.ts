/**
 * Datatable shared types.
 *
 * `TableInstance<TData>` mirrors the public shape returned by `useProTable`.
 * Components below the table accept this instead of `any` so prop misuse
 * becomes a compile error instead of a runtime surprise.
 *
 * Kept structural (not derived from `ReturnType<typeof useProTable>`) on
 * purpose: avoids a circular import between hooks and consumers, and lets
 * the type evolve without breaking every signature in the tree.
 */
import type { EntitySchema, FieldSchema, SortEntry } from "@/types";
import type { TablePermissions } from "./hook/useTablePermissions";

export type Updater<T> = T | ((prev: T) => T);

export interface TableInstance<TData = any> {
    schema: EntitySchema;

    // ─── Data ───────────────────────────────────────────────────────────────
    data: TData[];
    total: number;
    loading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    lastUpdated: number;
    isSearchPending: boolean;

    // ─── Pagination ─────────────────────────────────────────────────────────
    page: number;
    size: number;
    setPage: (page: number) => void;
    setSize: (size: number) => void;

    // ─── Sort ───────────────────────────────────────────────────────────────
    sortState: SortEntry[];
    toggleSort: (fieldName: string) => void;
    clearSort: () => void;

    // ─── Filter / search ────────────────────────────────────────────────────
    filters: Record<string, any>;
    setFilters: (next: Updater<Record<string, any>>) => void;
    clearFilters: () => void;
    removeFilter: (name: string) => void;
    search: string;
    setSearch: (s: string) => void;

    // ─── Column visibility ──────────────────────────────────────────────────
    columnVisibility: Record<string, boolean>;
    visibleFields: FieldSchema[];
    toggleFieldVisibility: (name: string, visible: boolean) => void;

    // ─── Selection / editing ────────────────────────────────────────────────
    selected: any[];
    setSelected: (next: Updater<any[]>) => void;
    editingRow: TData | null;
    isFormOpen: boolean;
    setFormOpen: (open: boolean) => void;
    openCreate: () => void;
    openEdit: (row: TData) => void;

    // ─── Mutations ──────────────────────────────────────────────────────────
    create: (data: any) => Promise<void> | void;
    update: (args: { id: any; data: any }) => Promise<void> | void;
    remove: (id: any) => Promise<void> | void;
    patchField: (id: any, fieldName: string, value: any) => Promise<void> | void;
    bulkDelete: () => void;
    bulkUpdate: (patch: Record<string, any>) => Promise<void> | void;
    clearSelection: () => void;
    selectAllOnPage: () => void;
    applyView: (state: SavedViewState) => void;
    isSubmitting: boolean;
    /** Server-side validation errors keyed by field name; each field may have
     *  multiple messages (e.g. min-length + format). */
    fieldErrors: Record<string, string[]>;
    setFieldErrors: (errors: Record<string, string[]>) => void;

    // ─── Data I/O ───────────────────────────────────────────────────────────
    importFile: (file: File) => Promise<any>;
    exportFile: (params?: any) => Promise<Blob | void>;

    // ─── Relations + permissions ────────────────────────────────────────────
    relationOptions: Record<string, any[]>;
    permission: TablePermissions;
}

export interface SavedViewState {
    search?: string;
    sortState?: SortEntry[];
    filters?: Record<string, any>;
    columnVisibility?: Record<string, boolean>;
}

/** Tightest row shape we can assume — anything with the id field. */
export type TableRow = Record<string, any>;

/** Pin side for both system columns and user-pinned data columns. */
export type PinSide = "left" | "right" | null;
