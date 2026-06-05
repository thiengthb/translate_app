import { createBaseApiService } from "@/api/base-service.api";
import { metadataApi, type EntityMetadata, type FieldMetadata } from "@/api/features/metadata.api";
import Loading from "@/components/datatable/common/Loading";
import NoResult from "@/components/datatable/common/NoResult";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
  type FieldType,
  type FilterType,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AutoCrudPage } from "./AutoCrudPage";

/**
 * Fallback CRUD page for sidebar menu entries that have no per-entity
 * EntityConfig file. Pulls full schema from the backend `/api/meta/entities`
 * endpoint and builds an EntityConfig at runtime — so a new entity registered
 * only on the BE (Entity + DTO, courtesy of Mức 1/2/3) appears with full CRUD
 * UI without any FE code change.
 *
 * Per-entity FE customization is still supported: simply ship a
 * `src/pages/management/.../<entity>/index.tsx` exporting `entityConfig` and
 * the file-based registry wins (this fallback never runs).
 */

const AUDIT_FIELD_NAMES = new Set([
  "id",
  "isActive",
  "isDeleted",
  "version",
  "tenantId",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
]);

// Cache one API client per apiPath across renders.
const apiCache = new Map<string, ReturnType<typeof createBaseApiService>>();
function apiFor(apiPath: string) {
  const normalized = apiPath.startsWith("/api") ? apiPath.slice(4) : apiPath;
  let api = apiCache.get(normalized);
  if (!api) {
    api = createBaseApiService({ path: normalized });
    apiCache.set(normalized, api);
  }
  return api;
}

function mapFieldType(fm: FieldMetadata): FieldType {
  if (fm.relation) return "relation";
  if (fm.enumValues && fm.enumValues.length > 0) return "select";
  const t = (fm.type || "").toLowerCase();
  if (t === "textarea") return "textarea";
  if (t === "password") return "password";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "date" || t === "datetime") return "date";
  if (t === "select") return "select";
  return "text";
}

function mapFilterType(fm: FieldMetadata): FilterType | undefined {
  const t = mapFieldType(fm);
  if (t === "boolean") return "boolean";
  if (t === "select") return "select";
  if (t === "date") return "dateRange";
  if (t === "number") return "numberRange";
  return "text";
}

function buildFieldSchema(fm: FieldMetadata, byEntity: Map<string, EntityMetadata>): FieldSchema {
  const type = mapFieldType(fm);
  const base: FieldSchema = {
    name: fm.name,
    label: fm.label || fm.name,
    type,
    sortable: fm.sortable,
    filterable: fm.filterable,
    filterType: fm.filterable ? mapFilterType(fm) : undefined,
    editable: !fm.readOnly,
    visible: !fm.hidden,
  };

  if (type === "select" && fm.enumValues?.length) {
    base.options = fm.enumValues.map((v) => ({ label: v, value: v }));
  }

  if (type === "relation" && fm.relation) {
    const target = byEntity.get(fm.relation.entity);
    if (target) {
      base.relation = {
        api: apiFor(target.apiPath),
        valueField: "id",
        labelField: fm.relation.displayField || "name",
        multiple:
          fm.relation.type === "many-to-many" || fm.relation.type === "one-to-many",
      };
    }
  }

  return base;
}

function buildEntityConfig(meta: EntityMetadata, all: EntityMetadata[]): EntityConfig {
  const byEntity = new Map(all.map((m) => [m.entityName, m]));

  const userFields = (meta.fields ?? [])
    .filter((f) => !AUDIT_FIELD_NAMES.has(f.name))
    .filter((f) => !f.hidden || f.name === "password")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((f) => buildFieldSchema(f, byEntity));

  const schema: EntitySchema = {
    // Use the backend permission resource (e.g. "KANJI_RADICAL") rather than the
    // collapsed entity name ("kanjiradical"): useTablePermissions derives the
    // <RESOURCE>_READ key from this, and a camelCase entity name would lose the
    // word boundary ("KANJIRADICAL_READ" ≠ "KANJI_RADICAL_READ"), disabling the
    // list query for every multi-word metadata-driven entity.
    entityName: (meta.resource || meta.entityName).toLowerCase(),
    idField: "id",
    fields: [...userFields, ...(auditableFieldsSchema as FieldSchema[])],
  };

  return {
    name: meta.label || meta.entityName,
    path: meta.menu?.url || meta.apiPath.replace(/^\/api/, ""),
    api: apiFor(meta.apiPath),
    schema,
  };
}

interface Props {
  url: string;
}

export const MetadataDrivenCrudPage = ({ url }: Props) => {
  const { data: allMetadata, isLoading, isError } = useQuery({
    queryKey: ["metadata", "entities"],
    queryFn: metadataApi.getAll,
    staleTime: 30 * 60 * 1000,
  });

  const entityConfig = useMemo(() => {
    if (!allMetadata) return null;
    const match = allMetadata.find((m) => m.menu?.url === url);
    if (!match) return null;
    return buildEntityConfig(match, allMetadata);
  }, [allMetadata, url]);

  if (isLoading) return <Loading />;
  if (isError || !entityConfig) return <NoResult />;

  return <AutoCrudPage entity={entityConfig} />;
};
