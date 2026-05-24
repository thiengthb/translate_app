import {
  DefaultPagination,
  type EntitySchema,
  type FileFormat,
  type ImportResult,
  type Pagination,
  type SortEntry,
} from "@/types";
import { userApi } from "@/api";
import { downloadBlob, getFilenameFromHeader } from "@/components/datatable/util/dataio.utils";
import { usePermissions } from "@/hooks/usePermissions";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ValidationErrorResponse } from "@/types/common/error";
import { useMemo, useState } from "react";
import axios from "axios";

const resolvePermissionResource = (entityName: string) => {
  const normalizedName = (entityName || "").trim().toLowerCase();

  if (normalizedName === "module" || normalizedName === "module-group" || normalizedName === "module_group") {
    return "MENU";
  }

  return normalizedName.replace(/[-\s]+/g, "_").toUpperCase();
};

export function useProTable(api: any, schema: EntitySchema) {
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();

  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const [sortState, setSortState] = useState<SortEntry[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [search, setSearch] = useState<string>("");

  const [selected, setSelected] = useState<any[]>([]);

  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    schema.fields.forEach((field) => {
      initial[field.name] = field.visible !== false;
    });
    return initial;
  });

  const visibleFields = schema.fields.filter(
    (field) => columnVisibility[field.name] !== false,
  );

  const toggleFieldVisibility = (fieldName: string, visible: boolean) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [fieldName]: visible,
    }));
  };

  const toggleSort = (fieldName: string) => {
    setSortState((prev) => {
      const idx = prev.findIndex((s) => s.field === fieldName);
      if (idx === -1)
        return [...prev, { field: fieldName, direction: "asc" as const }];
      if (prev[idx].direction === "asc") {
        return prev.map((s, i) =>
          i === idx ? { ...s, direction: "desc" as const } : s,
        );
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearSort = () => setSortState([]);

  const currentSort: string[] = sortState.map(
    (s) => `${s.field},${s.direction}`,
  );

  const relationFields = useMemo(
    () => schema.fields.filter((f) => f.type === "relation" && f.relation),
    [schema],
  );

  const permissionResource = useMemo(
    () => resolvePermissionResource(schema.entityName),
    [schema.entityName],
  );

  const permissionKeys = useMemo(
    () => ({
      read: `${permissionResource}_READ`,
      create: `${permissionResource}_CREATE`,
      update: `${permissionResource}_UPDATE`,
      delete: `${permissionResource}_DELETE`,
      import: `${permissionResource}_CREATE`,
      export: `${permissionResource}_READ`,
    }),
    [permissionResource],
  );

  const permission = useMemo(
    () => ({
      resource: permissionResource,
      keys: permissionKeys,
      canRead: hasPermission(permissionKeys.read),
      canCreate: hasPermission(permissionKeys.create),
      canUpdate: hasPermission(permissionKeys.update),
      canDelete: hasPermission(permissionKeys.delete),
      canImport: hasPermission(permissionKeys.import),
      canExport: hasPermission(permissionKeys.export),
    }),
    [hasPermission, permissionKeys, permissionResource],
  );

  const hasAuditUserFields = useMemo(
    () => schema.fields.some((f) => f.name === "createdBy" || f.name === "updatedBy"),
    [schema],
  );

  const relationQueries = useQueries({
    queries: relationFields.map((field) => ({
      queryKey: ["relation", schema.entityName, field.name],
      queryFn: async () => {
        const res = await field.relation!.api.getPage({
          page: 0,
          size: 9999,
        });
        return res.content;
      },
      enabled: permission.canRead,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const auditUsersQuery = useQuery({
    queryKey: ["relation", schema.entityName, "audit-users"],
    queryFn: async () => {
      const res = await userApi.getPage({
        page: 0,
        size: 9999,
      });
      return res.content;
    },
    enabled: hasAuditUserFields && permission.canRead,
    staleTime: 5 * 60 * 1000,
  });

  const relationOptions = useMemo(() => {
    const map: Record<string, any[]> = {};
    relationFields.forEach((field, index) => {
      map[field.name] = relationQueries[index]?.data ?? [];
    });

    if (hasAuditUserFields) {
      const users = auditUsersQuery.data ?? [];
      if (schema.fields.some((f) => f.name === "createdBy")) {
        map.createdBy = users;
      }
      if (schema.fields.some((f) => f.name === "updatedBy")) {
        map.updatedBy = users;
      }
    }

    return map;
  }, [relationFields, relationQueries, hasAuditUserFields, auditUsersQuery.data, schema.fields]);

  const queryKey = [
    schema.entityName,
    pagination.page,
    pagination.size,
    currentSort,
    filters,
    search,
  ];

  const query = useQuery({
    queryKey,
    enabled: permission.canRead,
    queryFn: () =>
      api.getPage(
        {
          ...pagination,
          sort: currentSort.length > 0 ? currentSort : undefined,
        },
        search,
        filters,
      ),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: [schema.entityName] });

  const handleMutationError = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      const body = error.response.data as ValidationErrorResponse;
      if (body?.errors) {
        setFieldErrors(body.errors);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => api.create(data),
    onSuccess: () => {
      invalidate();
      setFieldErrors({});
      setEditingRow(null);
      setFormOpen(false);
    },
    onError: handleMutationError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.update(id, data),
    onSuccess: () => {
      invalidate();
      setFieldErrors({});
      setEditingRow(null);
      setFormOpen(false);
    },
    onError: handleMutationError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: any) => api.delete(id),
    onSuccess: invalidate,
  });

  const patchFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: any; data: Record<string, any> }) =>
      api.update(id, data),
    onSuccess: invalidate,
  });

  const patchField = (id: any, fieldName: string, value: any) => {
    if (!permission.canUpdate) return;

    const currentData: any[] = query.data?.content ?? [];
    const row = currentData.find((r: any) => r[schema.idField] === id);
    if (!row) return;

    const updateData = { ...row, [fieldName]: value };

    delete updateData.createdAt;
    delete updateData.updatedAt;

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
          // Revert on error
          invalidate();
        },
      },
    );
  };

  const importMutation = useMutation<ImportResult, any, File>({
    mutationFn: api.import,
    onSuccess: invalidate,
  });

  const importFile = async (file: File) => {
    if (!permission.canImport) {
      throw new Error("Missing import permission");
    }

    return importMutation.mutateAsync(file);
  };

  const exportFile = async (format: FileFormat) => {
    if (!permission.canExport) {
      throw new Error("Missing export permission");
    }

    const res = await api.export(format);

    const contentDisposition = res.headers["content-disposition"];
    const filename = getFilenameFromHeader(contentDisposition);

    const contentType =
      format === "EXCEL"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : format === "CSV"
          ? "text/csv"
          : "application/pdf";

    const blob = new Blob([res.data], { type: contentType });

    downloadBlob(blob, filename || undefined);
  };

  const openCreate = () => {
    if (!permission.canCreate) return;

    setEditingRow(null);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: any) => {
    if (!permission.canUpdate) return;

    setEditingRow(row);
    setFieldErrors({});
    setFormOpen(true);
  };

  const bulkDelete = () => {
    if (!permission.canDelete) return;

    selected.forEach((id) => removeMutation.mutate(id));
    setSelected([]);
  };

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

  return {
    schema,

    data: query.data?.content ?? [],
    total: query.data?.totalElements ?? 0,
    loading: query.isLoading,
    isFetching: query.isFetching,

    page: pagination.page,
    size: pagination.size,
    sortState,
    toggleSort,
    clearSort,
    setPage: (page: number) => setPagination((prev) => ({ ...prev, page })),
    setSize: (size: number) => setPagination((prev) => ({ ...prev, size })),

    filters,
    setFilters,
    clearFilters: () => setFilters({}),
    search,
    setSearch,

    selected,
    setSelected,

    editingRow,
    isFormOpen,
    setFormOpen,

    columnVisibility,
    visibleFields,
    toggleFieldVisibility,

    openCreate,
    openEdit,

    create,
    update,
    remove,
    patchField,
    bulkDelete,

    isSubmitting: createMutation.isPending || updateMutation.isPending,

    importFile,
    exportFile,

    fieldErrors,
    setFieldErrors,
    relationOptions,
    permission,
  };
}
