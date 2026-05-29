import { userApi } from "@/api";
import type { EntitySchema } from "@/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface Options {
    schema: EntitySchema;
    enabled: boolean;
}

/**
 * Pre-loads dropdown options for every {@code type: "relation"} field, plus
 * the user list used to render createdBy/updatedBy audit cells.
 *
 * Cached 5 min via react-query staleTime, so opening a form on multiple
 * entities doesn't re-fetch the same role / category list.
 */
export function useTableRelations({ schema, enabled }: Options) {
    const relationFields = useMemo(
        () => schema.fields.filter((f) => f.type === "relation" && f.relation),
        [schema],
    );

    const hasAuditUserFields = useMemo(
        () => schema.fields.some((f) => f.name === "createdBy" || f.name === "updatedBy"),
        [schema],
    );

    const relationQueries = useQueries({
        queries: relationFields.map((field) => ({
            queryKey: ["relation", schema.entityName, field.name],
            queryFn: async () => {
                const res = await field.relation!.api.getPage({ page: 0, size: 9999 });
                return res.content;
            },
            enabled,
            staleTime: 5 * 60 * 1000,
        })),
    });

    const auditUsersQuery = useQuery({
        queryKey: ["relation", schema.entityName, "audit-users"],
        queryFn: async () => {
            const res = await userApi.getPage({ page: 0, size: 9999 });
            return res.content;
        },
        enabled: hasAuditUserFields && enabled,
        staleTime: 5 * 60 * 1000,
    });

    const relationOptions = useMemo(() => {
        const map: Record<string, any[]> = {};
        relationFields.forEach((field, index) => {
            map[field.name] = relationQueries[index]?.data ?? [];
        });

        if (hasAuditUserFields) {
            const users = auditUsersQuery.data ?? [];
            if (schema.fields.some((f) => f.name === "createdBy")) map.createdBy = users;
            if (schema.fields.some((f) => f.name === "updatedBy")) map.updatedBy = users;
        }

        return map;
    }, [relationFields, relationQueries, hasAuditUserFields, auditUsersQuery.data, schema.fields]);

    return { relationOptions };
}
