import type { EntitySchema } from "@/types";
import type { ValidationErrorResponse } from "@/types/common/error";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import type { TablePermissions } from "./useTablePermissions";

interface Options {
    api: any;
    schema: EntitySchema;
    queryKey: readonly unknown[];
    permission: TablePermissions;
    onSuccessClose: () => void;
}

/** Audit / system fields that should never be sent back in a PATCH. */
const STRIPPED_AUDIT_FIELDS = [
    "createdAt",
    "updatedAt",
    "createdBy",
    "updatedBy",
    "version",
    "isDeleted",
] as const;

/**
 * Owns create / update / delete / patchField / bulkDelete mutations plus the
 * field-level validation error map returned by the BE on HTTP 400.
 */
export function useTableMutations({ api, schema, queryKey, permission, onSuccessClose }: Options) {
    const qc = useQueryClient();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    const invalidate = () => qc.invalidateQueries({ queryKey: [schema.entityName] });

    const handleValidationError = (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            const body = error.response.data as ValidationErrorResponse;
            if (body?.errors) setFieldErrors(body.errors);
        }
    };

    const createMutation = useMutation({
        mutationFn: (data: any) => api.create(data),
        onSuccess: () => {
            invalidate();
            setFieldErrors({});
            onSuccessClose();
        },
        onError: handleValidationError,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: any) => api.update(id, data),
        onSuccess: () => {
            invalidate();
            setFieldErrors({});
            onSuccessClose();
        },
        onError: handleValidationError,
    });

    const removeMutation = useMutation({
        mutationFn: (id: any) => api.delete(id),
        onSuccess: invalidate,
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: Array<string | number>) => api.bulkDelete(ids),
        onSuccess: invalidate,
    });

    const patchFieldMutation = useMutation({
        mutationFn: ({ id, data }: { id: any; data: Record<string, any> }) => api.update(id, data),
        onSuccess: invalidate,
    });

    const create = (data: any) => {
        if (!permission.canCreate) return;
        createMutation.mutate(data);
    };

    const update = ({ id, data }: any) => {
        if (!permission.canUpdate) return;
        updateMutation.mutate({ id, data });
    };

    const remove = (id: any) => {
        if (!permission.canDelete) return;
        removeMutation.mutate(id);
    };

    const patchField = (id: any, fieldName: string, value: any, currentData: any[]) => {
        if (!permission.canUpdate) return;
        const row = currentData.find((r) => r[schema.idField] === id);
        if (!row) return;

        const previousValue = row[fieldName];
        const updateData = { ...row, [fieldName]: value };
        for (const auditField of STRIPPED_AUDIT_FIELDS) {
            delete updateData[auditField];
        }

        // Snapshot current cache page so we can restore on failure without
        // forcing a full refetch (cheap, instant rollback).
        const previousPage = qc.getQueryData(queryKey);

        // Optimistic local update.
        qc.setQueryData(queryKey, (old: any) => {
            if (!old?.content) return old;
            return {
                ...old,
                content: old.content.map((r: any) =>
                    r[schema.idField] === id ? { ...r, [fieldName]: value } : r,
                ),
            };
        });

        patchFieldMutation.mutate(
            { id, data: updateData },
            {
                onError: () => {
                    // Restore snapshot and silently mark stale so a later focus
                    // event refreshes — avoids the heavy immediate refetch.
                    if (previousPage !== undefined) {
                        qc.setQueryData(queryKey, previousPage);
                    } else {
                        // Fallback: revert the single field in-place
                        qc.setQueryData(queryKey, (old: any) => {
                            if (!old?.content) return old;
                            return {
                                ...old,
                                content: old.content.map((r: any) =>
                                    r[schema.idField] === id ? { ...r, [fieldName]: previousValue } : r,
                                ),
                            };
                        });
                    }
                },
            },
        );
    };

    const bulkDelete = (ids: Array<string | number>, snapshotRows?: any[]) => {
        if (!permission.canDelete || ids.length === 0) return;
        bulkDeleteMutation.mutate(ids);

        // Undo flow: show toast with Undo button. If clicked within the toast
        // duration, re-create the deleted rows from the snapshot.
        if (snapshotRows && snapshotRows.length > 0 && permission.canCreate) {
            const restore = async () => {
                try {
                    await Promise.all(
                        snapshotRows.map((row) => {
                            const data = { ...row };
                            for (const auditField of STRIPPED_AUDIT_FIELDS) {
                                delete data[auditField];
                            }
                            delete data[schema.idField]; // BE assigns new id
                            return api.create(data);
                        }),
                    );
                    invalidate();
                    toast.success(`Đã khôi phục ${snapshotRows.length} bản ghi`);
                } catch {
                    toast.error("Không thể khôi phục bản ghi");
                }
            };
            toast(`Đã xóa ${snapshotRows.length} bản ghi`, {
                action: { label: "Hoàn tác", onClick: restore },
                duration: 7000,
            });
        }
    };

    /**
     * Apply the same field patch to a list of records. Uses individual
     * `api.update` calls in parallel — if the BE later exposes a real
     * bulk endpoint, we can swap to it without callers changing.
     */
    const bulkUpdate = async (
        ids: Array<string | number>,
        patch: Record<string, any>,
        currentData: any[],
    ): Promise<void> => {
        if (!permission.canUpdate || ids.length === 0) return;
        await Promise.all(
            ids.map((id) => {
                const row = currentData.find((r) => r[schema.idField] === id);
                if (!row) return Promise.resolve();
                const data = { ...row, ...patch };
                for (const auditField of STRIPPED_AUDIT_FIELDS) {
                    delete data[auditField];
                }
                return api.update(id, data);
            }),
        );
        invalidate();
    };

    return {
        create,
        update,
        remove,
        patchField,
        bulkDelete,
        bulkUpdate,
        invalidate,
        fieldErrors,
        setFieldErrors,
        isSubmitting: createMutation.isPending || updateMutation.isPending,
    };
}
