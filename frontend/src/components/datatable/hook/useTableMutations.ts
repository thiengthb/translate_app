import type { EntitySchema } from "@/types";
import type { ValidationErrorResponse } from "@/types/common/error";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import type { TablePermissions } from "./useTablePermissions";

interface Options {
    api: any;
    schema: EntitySchema;
    queryKey: readonly unknown[];
    permission: TablePermissions;
    onSuccessClose: () => void;
}

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

        const updateData = { ...row, [fieldName]: value };
        delete updateData.createdAt;
        delete updateData.updatedAt;

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
                onError: () => invalidate(), // rollback by refetch
            },
        );
    };

    const bulkDelete = (ids: Array<string | number>) => {
        if (!permission.canDelete || ids.length === 0) return;
        bulkDeleteMutation.mutate(ids);
    };

    return {
        create,
        update,
        remove,
        patchField,
        bulkDelete,
        invalidate,
        fieldErrors,
        setFieldErrors,
        isSubmitting: createMutation.isPending || updateMutation.isPending,
    };
}
