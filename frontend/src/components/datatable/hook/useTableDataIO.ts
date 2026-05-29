import { downloadBlob, getFilenameFromHeader } from "@/components/datatable/util/dataio.utils";
import type { FileFormat, ImportResult } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TablePermissions } from "./useTablePermissions";

interface Options {
    api: any;
    entityName: string;
    permission: TablePermissions;
}

const CONTENT_TYPE: Record<FileFormat, string> = {
    EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    CSV: "text/csv",
    PDF: "application/pdf",
};

/**
 * Import / Export handlers, factored out so they can be re-used independently
 * (e.g. an "import only" page).
 */
export function useTableDataIO({ api, entityName, permission }: Options) {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: [entityName] });

    const importMutation = useMutation<ImportResult, any, File>({
        mutationFn: api.import,
        onSuccess: invalidate,
    });

    const importFile = async (file: File) => {
        if (!permission.canImport) throw new Error("Missing import permission");
        return importMutation.mutateAsync(file);
    };

    const exportFile = async (format: FileFormat) => {
        if (!permission.canExport) throw new Error("Missing export permission");

        const res = await api.export(format);
        const filename = getFilenameFromHeader(res.headers["content-disposition"]);
        const blob = new Blob([res.data], { type: CONTENT_TYPE[format] });
        downloadBlob(blob, filename || undefined);
    };

    return { importFile, exportFile };
}
