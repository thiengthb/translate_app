import type { EntitySchema } from "@/types/common/datatable";

/**
 * Schema + API binding for one entity. Files under
 * {@code src/pages/management/.../<entity>/index.tsx} export this so the
 * router can wire up a custom {@link AutoCrudPage} for that entity.
 *
 * Entities without a per-entity file fall back to
 * {@code MetadataDrivenCrudPage} which builds the same shape from
 * {@code /api/meta/entities}.
 */
export interface EntityConfig {
    name: string;
    path: string;
    api: any;
    schema: EntitySchema;
}
